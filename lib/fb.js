// Conversions API (CAPI) do Facebook — roda SOMENTE no servidor.
// O access token nunca vai ao navegador. PII é enviada com hash SHA-256.
import crypto from 'node:crypto';

const PIXEL_ID = process.env.FB_PIXEL_ID || '892365253404482';
const GRAPH = 'https://graph.facebook.com/v21.0';

function sha256(value) {
  if (value === undefined || value === null || value === '') return undefined;
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}
// normalizações recomendadas pelo Facebook
function normEmail(v) { return sha256(String(v || '').trim().toLowerCase()); }
function normText(v) { return sha256(String(v || '').trim().toLowerCase()); }
function normPhone(v) {
  let d = String(v || '').replace(/\D/g, '');
  if (!d) return undefined;
  if (d.length <= 11) d = '55' + d; // adiciona DDI Brasil
  return sha256(d);
}
function normZip(v) { const d = String(v || '').replace(/\D/g, ''); return d ? sha256(d) : undefined; }
function deburr(v) { return String(v || '').normalize('NFD').replace(/[̀-ͯ]/g, ''); }
// cidade/estado: minúsculo, sem acento, só letras/números (recomendação do Facebook)
function normGeo(v) { const s = deburr(v).toLowerCase().replace(/[^a-z0-9]/g, ''); return s ? sha256(s) : undefined; }

/**
 * Envia um evento para a Conversions API. Silencioso se faltar token.
 */
export async function sendCapi(eventName, opts = {}) {
  const token = process.env.FB_ACCESS_TOKEN;
  if (!token) return { ok: false, skipped: 'no_token' };

  const user = {};
  if (opts.clientIp) user.client_ip_address = opts.clientIp;
  if (opts.userAgent) user.client_user_agent = opts.userAgent;
  if (opts.fbp) user.fbp = opts.fbp;
  if (opts.fbc) user.fbc = opts.fbc;

  const c = opts.customer || {};
  if (c.email) user.em = [normEmail(c.email)];
  if (c.phone) user.ph = [normPhone(c.phone)];
  if (c.document) user.external_id = [sha256(String(c.document).replace(/\D/g, ''))];
  if (c.name) {
    const parts = String(c.name).trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (parts[0]) user.fn = [normText(parts[0])];
    if (parts.length > 1) user.ln = [normText(parts[parts.length - 1])];
  }
  if (c.city) user.ct = [normGeo(c.city)];
  if (c.state) user.st = [normGeo(c.state)];
  if (c.zip) user.zp = [normZip(c.zip)];
  user.country = [normText('br')];

  const event = {
    event_name: eventName,
    event_time: Math.floor((opts.eventTime || Date.now()) / 1000),
    action_source: 'website',
    user_data: user,
  };
  if (opts.eventId) event.event_id = opts.eventId;
  if (opts.eventSourceUrl) event.event_source_url = opts.eventSourceUrl;
  if (opts.customData) event.custom_data = opts.customData;

  try {
    const res = await fetch(`${GRAPH}/${PIXEL_ID}/events?access_token=${encodeURIComponent(token)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: [event] }),
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}
