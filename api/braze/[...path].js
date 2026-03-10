/**
 * Vercel Serverless Proxy — Braze REST API
 *
 * Catch-all handler for all /api/braze/* routes.
 * Forwards permitted requests to the Braze REST API, injecting the
 * secret API key server-side so it is never exposed in the browser.
 *
 * Permitted endpoints (allowlist):
 *   POST /api/braze/users/export/ids  → Braze POST /users/export/ids
 *   POST /api/braze/users/track       → Braze POST /users/track
 *
 * Environment variables (set in Vercel Project → Settings → Environment Variables):
 *   BRAZE_API_KEY       — Braze REST API secret key (server-only, never client-exposed)
 *   BRAZE_REST_ENDPOINT — Base URL, e.g. https://rest.iad-03.braze.com
 *
 * @param {import('@vercel/node').VercelRequest}  req
 * @param {import('@vercel/node').VercelResponse} res
 */
export default async function handler(req, res) {
  // #region agent log
  fetch('http://127.0.0.1:7806/ingest/e6e7e66d-84dd-40c9-a626-095e58f23f82',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'1f530b'},body:JSON.stringify({sessionId:'1f530b',location:'[...path].js:19',message:'FUNCTION INVOKED',data:{method:req.method,url:req.url,path:req.query?.path,hasApiKey:!!process.env.BRAZE_API_KEY,hasEndpoint:!!process.env.BRAZE_REST_ENDPOINT},timestamp:Date.now(),hypothesisId:'H-A,H-B,H-C,H-D',runId:'run1'})}).catch(()=>{});
  // #endregion

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  const BRAZE_API_KEY       = process.env.BRAZE_API_KEY;
  const BRAZE_REST_ENDPOINT = process.env.BRAZE_REST_ENDPOINT;

  if (!BRAZE_API_KEY || !BRAZE_REST_ENDPOINT) {
    console.error('[braze-proxy] Missing BRAZE_API_KEY or BRAZE_REST_ENDPOINT env vars');
    return res.status(503).json({
      error: 'Proxy not configured. Set BRAZE_API_KEY and BRAZE_REST_ENDPOINT in Vercel environment variables.',
    });
  }

  // req.query.path is the catch-all segments array, e.g. ['users', 'export', 'ids']
  const pathSegments = req.query.path ?? [];
  const brazeEndpoint = Array.isArray(pathSegments)
    ? pathSegments.join('/')
    : pathSegments;

  // #region agent log
  fetch('http://127.0.0.1:7806/ingest/e6e7e66d-84dd-40c9-a626-095e58f23f82',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'1f530b'},body:JSON.stringify({sessionId:'1f530b',location:'[...path].js:46',message:'ENDPOINT RESOLVED',data:{brazeEndpoint,pathSegments},timestamp:Date.now(),hypothesisId:'H-A,H-C',runId:'run1'})}).catch(()=>{});
  // #endregion

  const ALLOWED_ENDPOINTS = ['users/export/ids', 'users/track'];
  if (!ALLOWED_ENDPOINTS.includes(brazeEndpoint)) {
    return res.status(400).json({
      error: `Endpoint '${brazeEndpoint}' is not permitted. Allowed: ${ALLOWED_ENDPOINTS.join(', ')}.`,
    });
  }

  const targetUrl = `${BRAZE_REST_ENDPOINT.replace(/\/$/, '')}/${brazeEndpoint}`;

  try {
    const brazeResponse = await fetch(targetUrl, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${BRAZE_API_KEY}`,
      },
      body: JSON.stringify(req.body),
    });

    const responseBody = await brazeResponse.text();

    res.status(brazeResponse.status);
    res.setHeader('Content-Type', 'application/json');

    const traceId = brazeResponse.headers.get('x-request-id');
    if (traceId) res.setHeader('x-request-id', traceId);

    return res.send(responseBody);

  } catch (err) {
    console.error('[braze-proxy] Network error contacting Braze:', err.message);
    return res.status(502).json({
      error: 'Bad gateway — failed to reach the Braze REST API.',
      detail: err.message,
    });
  }
}
