import { veloryFetch } from '../lib/velory.js';
import { notifyUtmifyPaid } from '../lib/utmify.js';

// Registra a "venda paga" na UTMify — SÓ depois de confirmar na API que a cobrança
// foi paga (não dá pra forjar). É um backup do webhook (caso o cliente ainda esteja
// na página quando o pagamento confirma). O Facebook Purchase já disparou no PIX gerado.
export default async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ error: 'Método não permitido.' }); }
  const body = typeof req.body === 'string' ? safeParse(req.body) : (req.body || {});
  const id = String(body.charge_id || '').trim();
  if (!/^[A-Za-z0-9_\-]+$/.test(id)) return res.status(400).json({ tracked: false });

  const { ok, data } = await veloryFetch(`/charges/${encodeURIComponent(id)}`);
  if (!ok || data.status !== 'paid') return res.status(200).json({ tracked: false });

  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || (req.socket && req.socket.remoteAddress) || '0.0.0.0';
  const utmify = await notifyUtmifyPaid(data, ip);

  return res.status(200).json({ tracked: true, utmify: utmify.ok === true });
}

function safeParse(s) { try { return JSON.parse(s); } catch { return {}; } }
