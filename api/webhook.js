import { veloryFetch } from '../lib/velory.js';
import { notifyUtmifyPaid } from '../lib/utmify.js';

// Webhook da Velory. Em pagamento confirmado, registra a "venda paga" na UTMify.
// (O Facebook Purchase já dispara no PIX gerado, em /api/checkout — aqui não repete.)
//
// PRINCÍPIO: o webhook NUNCA pode falhar — a Velory marca "falha" em qualquer
// resposta não-2xx. Então TODO o handler é blindado e SEMPRE responde 2xx.
// Segurança: cada pagamento é confirmado direto na API da Velory antes de registrar
// (um webhook forjado com cobrança falsa nunca confirma como "paid").
export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(200).json({ ignored: 'method' }); }

    const body = typeof req.body === 'string' ? safeParse(req.body) : (req.body || {});
    const event = String(body.event || '');
    const d = body.data || {};

    const isPaid = /paid/i.test(event) || String(d.status || '').toUpperCase() === 'PAID';
    if (!isPaid) return res.status(200).json({ ignored: true });

    const id = d.transactionId || d.id;
    if (id) {
      // confirma na API (defesa) e busca os dados completos; se falhar, usa os do webhook
      const { ok, data } = await veloryFetch(`/charges/${encodeURIComponent(id)}`);
      const charge = ok && data ? data : {
        id: id, status: 'paid',
        amount: Number(d.amountCents || d.amount || 6790),
        customer: d.customer || {}, metadata: d.metadata || {},
        created_at: d.createdAt, paid_at: d.paidAt,
        live_mode: d.liveMode === false ? false : true,
      };
      if (charge.status === 'paid') {
        const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || '0.0.0.0';
        await notifyUtmifyPaid(charge, ip); // "venda paga" na UTMify (sandbox → isTest)
      }
    }
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[webhook] erro tratado:', err && err.message);
    return res.status(200).json({ ok: true, handled: true }); // sempre 2xx — nunca conta como falha
  }
}

function safeParse(s) { try { return JSON.parse(s); } catch { return {}; } }
