// Diagnóstico: mostra QUAIS integrações estão configuradas (presença das envs),
// SEM expor nenhum valor secreto. Útil pra confirmar o setup na Vercel.
export default function handler(req, res) {
  const v = process.env.VELORY_SECRET_KEY || '';
  const veloryMode = v.startsWith('sk_live_') ? 'live' : v.startsWith('sk_test_') ? 'test' : (v ? 'set' : 'MISSING');
  res.status(200).json({
    ok: true,
    velory_key: veloryMode,
    fb_pixel_id: process.env.FB_PIXEL_ID ? 'set' : 'default',
    fb_access_token: process.env.FB_ACCESS_TOKEN ? 'set' : 'MISSING',
    utmify_token: process.env.UTMIFY_API_TOKEN ? 'set' : 'MISSING',
    webhook_secret: process.env.VELORY_WEBHOOK_SECRET ? 'set' : 'not_set',
    time: new Date().toISOString(),
  });
}
