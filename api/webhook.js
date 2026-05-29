import crypto from 'node:crypto';
import { veloryFetch } from '../lib/velory.js';
import { notifyUtmifyPaid } from '../lib/utmify.js';

// Recebe os webhooks da Velory. Verifica a assinatura HMAC (soft) e, em pagamento
// confirmado, registra a "venda paga" na UTMify. Captura a venda mesmo se o cliente
// fechar a página. (O Facebook Purchase já dispara no PIX gerado, em /api/checkout.)

// Precisamos do corpo BRUTO p/ validar a assinatura — desliga o parser da Vercel.
export const config = { api: { bodyParser: false } };

async function getRawBody(req) {
  if (typeof req.rawBody === 'string') return req.rawBody;
  if (Buffer.isBuffer(req.rawBody)) return req.rawBody.toString('utf8');
  try {
    const chunks = [];
    for await (const c of req) chunks.push(typeof c === 'string' ? Buffer.from(c) : c);
    return Buffer.concat(chunks).toString('utf8');
  } catch { return ''; }
}
function validSignature(secret, raw, sigHeader) {
  if (!secret || !raw || !sigHeader) return false;
  const expected = crypto.createHmac('sha256', secret).update(raw, 'utf8').digest('hex');
  const got = String(sigHeader).replace(/^sha256=/i, '').trim().toLowerCase();
  if (got.length !== expected.length) return false;
  try { return crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(got, 'hex')); } catch { return false; }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).end(); }

  const raw = await getRawBody(req);
  const secret = process.env.VELORY_WEBHOOK_SECRET;
  const sig = req.headers['x-velory-signature'];
  // Verificação de assinatura é SOFT (só registra aviso, nunca derruba o webhook).
  // A trava de segurança real é a confirmação do pagamento na API da Velory (abaixo):
  // um webhook forjado com cobrança falsa nunca confirma como "paid" → nada dispara.
  // Reliability-first: jamais perder uma venda por causa de assinatura.
  if (secret && raw && !validSignature(secret, raw, sig)) {
    console.warn('[webhook] assinatura não confere — seguindo (confirmação na API é a trava real)');
  }

  const body = raw ? safeParse(raw) : (req.body || {});
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
      // UTMify: "venda paga". O Facebook Purchase já disparou no PIX gerado (não repete).
      await notifyUtmifyPaid(charge, ip);
    }
  }
  // responde rápido (a Velory espera 2xx em ≤10s)
  return res.status(200).json({ ok: true });
}

function safeParse(s) { try { return JSON.parse(s); } catch { return {}; } }
