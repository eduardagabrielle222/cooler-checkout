import { veloryFetch, isTestMode } from '../lib/velory.js';

// SOMENTE SANDBOX: força o pagamento de um PIX de teste, pra validar o fluxo
// ponta a ponta sem dinheiro real. Em produção (sk_live_) responde 403.
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Método não permitido.' });
  }
  if (!isTestMode()) {
    return res.status(403).json({ error: 'Simulação disponível apenas em modo sandbox.' });
  }

  const id = (req.query?.id || '').toString().trim();
  if (!id || !/^[A-Za-z0-9_\-]+$/.test(id)) {
    return res.status(400).json({ error: 'ID de cobrança inválido.' });
  }

  const { ok, status, data } = await veloryFetch(`/charges/${encodeURIComponent(id)}/simulate`, {
    method: 'POST',
  });
  if (!ok) {
    const msg = data?.error?.message || 'Não foi possível simular o pagamento.';
    return res.status(status >= 400 && status < 600 ? status : 502).json({ error: msg });
  }
  return res.status(200).json({ id: data.id, status: data.status });
}
