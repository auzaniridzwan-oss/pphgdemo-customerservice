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
