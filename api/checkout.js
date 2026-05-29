import crypto from 'node:crypto';
import { veloryFetch, isTestMode } from '../lib/velory.js';
import { validateCheckout } from '../lib/validate.js';

// Preço FIXADO no servidor — o navegador nunca decide o valor.
const PRICE_CENTS = 7990; // R$ 79,90
const PRODUCT_NAME = 'Caixa Cooler Térmico Trailmate 66L Igloo Cinza';

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
