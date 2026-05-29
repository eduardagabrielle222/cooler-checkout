import { veloryFetch } from '../lib/velory.js';
import { sendCapi } from '../lib/fb.js';
import { notifyUtmifyPaid } from '../lib/utmify.js';

// Recebe os webhooks da Velory. Em pagamento confirmado: notifica a UTMify (venda)
// e dispara a Purchase na Conversions API (mesmo event_id 'pur_'+id → deduplicado
// com o Pixel/navegador). Captura vendas mesmo se o cliente fechar a página.
const CONTENT_ID = 'cooler-trailmate-66l';
const CONTENT_NAME = 'Caixa Cooler Térmico Trailmate 66L';

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).end(); }
  const body = typeof req.body === 'string' ? safeParse(req.body) : (req.body || {});
  const event = String(body.event || '');
  const d = body.data || {};

  const isPaid = /paid/i.test(event) || String(d.status || '').toUpperCase() === 'PAID';
  if (!isPaid) return res.status(200).json({ ignored: true });

  const id = d.transactionId || d.id;
  if (id) {
    // confirma na API (defesa) e busca os dados completos; se falhar, usa os dados do webhook
    const { ok, data } = await veloryFetch(`/charges/${encodeURIComponent(id)}`);
    const charge = ok && data ? data : {
      id: id, status: 'paid',
      amount: Number(d.amountCents || d.amount || 7990),
      customer: d.customer || {}, metadata: d.metadata || {},
      created_at: d.createdAt, paid_at: d.paidAt,
      live_mode: d.liveMode === false ? false : true,
    };

    if (charge.status === 'paid') {
      const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || '0.0.0.0';

      // UTMify: notifica a venda (sandbox → isTest)
      await notifyUtmifyPaid(charge, ip);

      // Facebook CAPI: só em pagamento REAL (live)
      if (charge.live_mode !== false) {
        const cust = charge.customer || {};
        const md = charge.metadata || {};
        const value = (typeof charge.amount === 'number' ? charge.amount : 7990) / 100;
        await sendCapi('Purchase', {
          eventId: 'pur_' + id,
          customer: { email: cust.email, phone: cust.phone, document: cust.document, name: cust.name, city: md.entrega_cidade, state: md.entrega_uf, zip: md.entrega_cep },
          customData: {
            value: value, currency: 'BRL',
            content_ids: [CONTENT_ID], content_name: CONTENT_NAME, content_type: 'product',
            contents: [{ id: CONTENT_ID, quantity: 1, item_price: value }],
          },
        });
      }
    }
  }
  // responde rápido (a Velory espera 2xx em ≤10s)
  return res.status(200).json({ ok: true });
}

function safeParse(s) { try { return JSON.parse(s); } catch { return {}; } }
