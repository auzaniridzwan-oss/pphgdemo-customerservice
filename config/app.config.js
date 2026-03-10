/**
 * Application Configuration
 *
 * Environment variables are injected by Vercel at build time into
 * window.__APP_CONFIG__ via a <script> block in index.html.
 * When the key is absent or empty, the app transparently falls back
 * to mock data so demos run without a live Braze connection.
 *
 * Security note: BRAZE_API_KEY is intentionally absent here.
 * It lives exclusively in Vercel's server-side environment variables
 * and is accessed only by the serverless proxy (api/braze/[...path].js).
 * Exposing it in window.__APP_CONFIG__ would make it visible in page source.
 *
 * Live mode is detected by the presence of BRAZE_REST_ENDPOINT alone,
 * which is not sensitive (it is the public Braze cluster URL).
 */

import { StorageManager } from '../js/core/StorageManager.js';

const env = (typeof window !== 'undefined' && window.__APP_CONFIG__) ? window.__APP_CONFIG__ : {};

const BRAZE_REST_ENDPOINT = env.BRAZE_REST_ENDPOINT || '';

const AppConfig = {
  BRAZE_REST_ENDPOINT,
  APP_VERSION: '1.0.0',

  /**
   * Returns true when the app should use real Braze REST API calls via the
   * serverless proxy. Requires BRAZE_REST_ENDPOINT to be configured and the
   * user must not have manually enabled mock mode in storage.
   *
   * @returns {boolean}
   */
  isLiveMode() {
    const manualMock = StorageManager.get('mock_mode', false);
    if (manualMock) return false;
    return !!BRAZE_REST_ENDPOINT;
  },
};

export default AppConfig;
