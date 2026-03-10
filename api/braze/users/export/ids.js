/**
 * Vercel Serverless Function — POST /api/braze/users/export/ids
 *
 * Proxies the Braze /users/export/ids endpoint server-side so the
 * API key is never exposed in the browser.
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
    console.error('[braze-proxy] Missing env vars for users/export/ids');
    return res.status(503).json({
      error: 'Proxy not configured. Set BRAZE_API_KEY and BRAZE_REST_ENDPOINT in Vercel environment variables.',
    });
  }

  const targetUrl = `${BRAZE_REST_ENDPOINT.replace(/\/$/, '')}/users/export/ids`;

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
    console.error('[braze-proxy] Network error on users/export/ids:', err.message);
    return res.status(502).json({
      error: 'Bad gateway — failed to reach the Braze REST API.',
      detail: err.message,
    });
  }
}
