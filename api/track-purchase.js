import { veloryFetch } from '../lib/velory.js';
import { sendCapi } from '../lib/fb.js';
import { notifyUtmifyPaid } from '../lib/utmify.js';

// Dispara a Purchase na Conversions API — SÓ depois de confirmar na API que a
// cobrança foi paga (não dá pra forjar pelo navegador). event_id determinístico
// ('pur_'+id) garante deduplicação com o Pixel do navegador.
const CONTENT_ID = 'cooler-trailmate-66l';
const CONTENT_NAME = 'Caixa Cooler Térmico Trailmate 66L';

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ error: 'Método não permitido.' }); }
  const body = typeof req.body === 'string' ? safeParse(req.body) : (req.body || {});
  const id = String(body.charge_id || '').trim();
  if (!/^[A-Za-z0-9_\-]+$/.test(id)) return res.status(400).json({ tracked: false });

  const { ok, data } = await veloryFetch(`/charges/${encodeURIComponent(id)}`);
  if (!ok || data.status !== 'paid') return res.status(200).json({ tracked: false });

  const cust = data.customer || {};
  const md = data.metadata || {};
  const value = (typeof data.amount === 'number' ? data.amount : 7990) / 100;
  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || (req.socket && req.socket.remoteAddress) || '0.0.0.0';
  const isLive = data.live_mode !== false;

  // UTMify: notifica a venda (sandbox vai como isTest, não conta nos KPIs)
  const utmify = await notifyUtmifyPaid(data, ip);

  // Facebook CAPI: só em pagamento REAL (live) pra não sujar o pixel
  let fb = { ok: false, skipped: 'sandbox' };
  if (isLive) {
    fb = await sendCapi('Purchase', {
      eventId: 'pur_' + id,
      eventSourceUrl: body.event_source_url,
      clientIp: ip,
      userAgent: req.headers['user-agent'],
      fbp: body.fbp,
      fbc: body.fbc,
      customer: { email: cust.email, phone: cust.phone, document: cust.document, name: cust.name, city: md.entrega_cidade, state: md.entrega_uf, zip: md.entrega_cep },
      customData: {
        value: value, currency: 'BRL',
        content_ids: [CONTENT_ID], content_name: CONTENT_NAME, content_type: 'product',
        contents: [{ id: CONTENT_ID, quantity: 1, item_price: value }],
      },
    });
  }

  return res.status(200).json({ tracked: true, live: isLive, fb: fb.ok === true, utmify: utmify.ok === true });
}

function safeParse(s) { try { return JSON.parse(s); } catch { return {}; } }
