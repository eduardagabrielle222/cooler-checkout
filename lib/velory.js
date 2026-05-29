// Cliente mínimo da API Velory. Roda SOMENTE no servidor (funções serverless).
// A chave secreta nunca é exposta ao navegador.

const VELORY_BASE = process.env.VELORY_BASE_URL || 'https://api.velorybrasil.com/v1';

export function getKey() {
  const key = process.env.VELORY_SECRET_KEY;
  if (!key) {
    throw new Error('VELORY_SECRET_KEY não configurada no ambiente.');
  }
  return key;
}

// sk_test_ = sandbox (dinheiro fake) | sk_live_ = produção (PIX real)
export function isTestMode() {
  return (process.env.VELORY_SECRET_KEY || '').startsWith('sk_test_');
}

/**
 * Faz uma chamada autenticada à API Velory.
 * @returns {Promise<{ok:boolean,status:number,data:any}>}
 */
export async function veloryFetch(path, { method = 'GET', body, idempotencyKey } = {}) {
  const headers = {
    Authorization: `Bearer ${getKey()}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
  if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;

  let res;
  try {
    res = await fetch(`${VELORY_BASE}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    // Falha de rede ao alcançar a Velory
    return { ok: false, status: 0, data: { error: { message: 'Não foi possível contatar o provedor de pagamento.' } } };
  }

  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }
  return { ok: res.ok, status: res.status, data };
}
