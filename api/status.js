import { veloryFetch } from '../lib/velory.js';

// Consulta o estado de uma cobrança. O navegador chama isso em loop até "paid".
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Método não permitido.' });
  }

  const id = (req.query?.id || '').toString().trim();
  if (!id || !/^[A-Za-z0-9_\-]+$/.test(id)) {
    return res.status(400).json({ error: 'ID de cobrança inválido.' });
  }

  const { ok, status, data } = await veloryFetch(`/charges/${encodeURIComponent(id)}`);
  if (!ok) {
    const msg = data?.error?.message || 'Não foi possível consultar o pagamento.';
    return res.status(status === 404 ? 404 : 502).json({ error: msg });
  }

  // Evita cache de proxies/navegador no polling.
  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json({
    id: data.id,
    status: data.status, // pending | paid | expired | failed | ...
    paid: data.status === 'paid',
    paid_at: data.paid_at || null,
  });
}
