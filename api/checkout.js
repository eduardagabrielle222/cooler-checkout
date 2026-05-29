import crypto from 'node:crypto';
import { veloryFetch, isTestMode } from '../lib/velory.js';
import { validateCheckout } from '../lib/validate.js';
import { notifyUtmify } from '../lib/utmify.js';
import { sendCapi } from '../lib/fb.js';

// Preço FIXADO no servidor — o navegador nunca decide o valor.
const PRICE_CENTS = 7990; // R$ 79,90
const PRODUCT_NAME = 'Caixa Cooler Térmico Trailmate 66L Igloo Cinza';
const CONTENT_ID = 'cooler-trailmate-66l';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Método não permitido.' });
  }

  const body = typeof req.body === 'string' ? safeParse(req.body) : (req.body || {});
  const { valid, errors, clean } = validateCheckout(body);
  if (!valid) {
    return res.status(400).json({ error: 'Confira os campos destacados.', fields: errors });
  }

  const orderId = `cooler_${Date.now().toString(36)}_${crypto.randomBytes(3).toString('hex')}`;

  // UTMs do anúncio (capturados no navegador) — guardados pra atribuição na UTMify
  const utm = cleanUtm(body.utm);

  const charge = {
    amount: PRICE_CENTS,
    method: 'pix',
    description: `${PRODUCT_NAME} (1un) — Frete grátis`,
    pix: { expires_in_days: 1 },
    customer: {
      name: clean.name,
      email: clean.email,
      phone: clean.phone,
      document: clean.document,
    },
    // O endereço de entrega vive no metadata — aparece atrelado à venda no painel Velory.
    metadata: {
      order_id: orderId,
      produto: PRODUCT_NAME,
      quantidade: '1',
      frete: 'gratis',
      entrega_cep: clean.cep,
      entrega_rua: clean.street,
      entrega_numero: clean.number,
      entrega_complemento: clean.complement,
      entrega_bairro: clean.neighborhood,
      entrega_cidade: clean.city,
      entrega_uf: clean.state,
      ...(utm ? { utm } : {}),
    },
  };

  const { ok, status, data } = await veloryFetch('/charges', {
    method: 'POST',
    body: charge,
    idempotencyKey: orderId, // evita cobrança duplicada em retry
  });

  if (!ok) {
    const msg = data?.error?.message || 'Não foi possível gerar o PIX. Tente novamente.';
    return res.status(status >= 400 && status < 600 ? status : 502).json({ error: msg });
  }

  // No PIX gerado (em paralelo, sem segurar o checkout — falhas nunca quebram):
  //  • UTMify "venda pendente" (waiting_payment)
  //  • Facebook Purchase via CAPI (só live; mesmo event_id 'pur_'+id que o Pixel → dedup)
  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || (req.socket && req.socket.remoteAddress) || '0.0.0.0';
  const isLive = data.live_mode !== false;
  const value = (typeof data.amount === 'number' ? data.amount : PRICE_CENTS) / 100;
  await Promise.all([
    notifyUtmify(data, 'waiting_payment', ip),
    isLive ? sendCapi('Purchase', {
      eventId: 'pur_' + data.id,
      eventSourceUrl: body.event_source_url,
      clientIp: ip,
      userAgent: req.headers['user-agent'],
      fbp: body.fbp,
      fbc: body.fbc,
      customer: { email: clean.email, phone: clean.phone, document: clean.document, name: clean.name, city: clean.city, state: clean.state, zip: clean.cep },
      customData: {
        value: value, currency: 'BRL',
        content_ids: [CONTENT_ID], content_name: PRODUCT_NAME, content_type: 'product',
        contents: [{ id: CONTENT_ID, quantity: 1, item_price: value }],
      },
    }) : Promise.resolve(),
  ]);

  const pix = data.pix || {};
  return res.status(201).json({
    id: data.id,
    order_id: orderId,
    amount: data.amount ?? PRICE_CENTS,
    status: data.status,
    qr_code: pix.qr_code || null, // copia-e-cola EMV
    qr_code_base64: pix.qr_code_base64 || null, // imagem do QR
    expires_at: pix.expires_at || null,
    test_mode: isTestMode(),
  });
}

function safeParse(s) {
  try { return JSON.parse(s); } catch { return {}; }
}

// Sanitiza os UTMs e devolve uma string JSON compacta (1 chave no metadata) ou null.
function cleanUtm(u) {
  if (!u || typeof u !== 'object') return null;
  const allow = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'src', 'sck'];
  const out = {};
  let any = false;
  for (const k of allow) {
    const v = u[k];
    if (typeof v === 'string' && v.trim()) { out[k] = v.trim().slice(0, 200); any = true; }
  }
  return any ? JSON.stringify(out) : null;
}
