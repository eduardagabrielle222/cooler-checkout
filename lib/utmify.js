// Integração UTMify — envia o PEDIDO (venda) para a conta do seller.
// Apenas reporta vendas (notificação + valor); o tracking de front-end é 100% Facebook.
// Moeda fixa BRL (sem câmbio). Falhas nunca lançam — só logam.
const UTMIFY_ENDPOINT = 'https://api.utmify.com.br/api-credentials/orders';
const PLATFORM = 'Cooler Trailmate';
const CONTENT_ID = 'cooler-trailmate-66l';
const CONTENT_NAME = 'Caixa Cooler Térmico Trailmate 66L';

// UTMify espera "YYYY-MM-DD HH:mm:ss" em UTC.
function fmtDate(unix) {
  const d = new Date(unix * 1000);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())}`;
}

/**
 * Envia um pedido para a UTMify. Retorna {ok} e nunca lança.
 */
export async function sendUtmifyOrder(input) {
  const token = process.env.UTMIFY_API_TOKEN;
  if (!token) return { ok: false, reason: 'missing_token' };

  const t = input.tracking || {};
  const payload = {
    orderId: input.orderId,
    platform: PLATFORM,
    paymentMethod: input.paymentMethod || 'pix',
    status: input.status, // paid | waiting_payment | refused | refunded | chargedback
    currency: 'BRL',
    createdAt: fmtDate(input.createdAtUnix),
    approvedDate: input.approvedAtUnix ? fmtDate(input.approvedAtUnix) : null,
    refundedAt: input.refundedAtUnix ? fmtDate(input.refundedAtUnix) : null,
    customer: {
      name: input.customer.name || '',
      email: input.customer.email || '',
      phone: input.customer.phone || null,
      document: input.customer.document || null,
      country: (input.customer.country || 'BR').toUpperCase(),
      ip: input.customer.ip || '0.0.0.0', // UTMify rejeita ip null
    },
    products: (input.products || []).map((p) => ({
      id: p.id, name: p.name, planId: null, planName: null, quantity: p.quantity, priceInCents: p.priceInCents,
    })),
    trackingParameters: {
      src: t.src || null,
      sck: t.sck || null,
      utm_source: t.utm_source || null,
      utm_medium: t.utm_medium || null,
      utm_campaign: t.utm_campaign || null,
      utm_content: t.utm_content || null,
      utm_term: t.utm_term || null,
    },
    commission: {
      totalPriceInCents: input.totalInCents,
      gatewayFeeInCents: 0,
      userCommissionInCents: input.totalInCents,
    },
    isTest: Boolean(input.isTest),
  };

  try {
    const res = await fetch(UTMIFY_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-token': token },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(4000), // nunca segura o checkout
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.error(`[utmify] ${res.status} para ${input.orderId}:`, body.slice(0, 400));
      return { ok: false, reason: 'http_' + res.status };
    }
    return { ok: true, status: res.status };
  } catch (err) {
    console.error('[utmify] fetch falhou para', input.orderId, err && err.message);
    return { ok: false, reason: 'fetch_error' };
  }
}

/**
 * Constrói e envia um pedido à UTMify a partir de uma cobrança da Velory.
 * status: 'waiting_payment' (PIX gerado) ou 'paid' (pago).
 * Sandbox (live_mode === false) vai como isTest. Nunca lança.
 */
export async function notifyUtmify(charge, status, ip) {
  try {
    if (!charge) return { ok: false, reason: 'no_charge' };
    const md = charge.metadata || {};
    const cust = charge.customer || {};
    let utm = {};
    try { utm = md.utm ? JSON.parse(md.utm) : {}; } catch { utm = {}; }
    const created = charge.created_at ? Math.floor(Date.parse(charge.created_at) / 1000) : Math.floor(Date.now() / 1000);
    const approved = status === 'paid'
      ? (charge.paid_at ? Math.floor(Date.parse(charge.paid_at) / 1000) : Math.floor(Date.now() / 1000))
      : null;
    const cents = typeof charge.amount === 'number' ? charge.amount : 6790;

    return await sendUtmifyOrder({
      orderId: md.order_id || charge.id,
      status: status,
      paymentMethod: 'pix',
      totalInCents: cents,
      createdAtUnix: created,
      approvedAtUnix: approved,
      customer: { name: cust.name, email: cust.email, phone: cust.phone, document: cust.document, country: 'BR', ip: ip },
      products: [{ id: CONTENT_ID, name: CONTENT_NAME, quantity: 1, priceInCents: cents }],
      tracking: utm,
      isTest: charge.live_mode === false,
    });
  } catch (err) {
    console.error('[utmify] notifyUtmify erro:', err && err.message);
    return { ok: false, reason: 'exception' };
  }
}

// Atalho retrocompatível.
export async function notifyUtmifyPaid(charge, ip) { return notifyUtmify(charge, 'paid', ip); }
