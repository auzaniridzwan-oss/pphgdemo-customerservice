/**
 * BrazeClient
 *
 * Singleton HTTP client for all Braze REST API interactions.
 * Built on top of Ky (https://github.com/sindresorhus/ky).
 *
 * All requests are routed through the Vercel serverless proxy at /api/braze/
 * so that the Braze API key never leaves the server. The Authorization header
 * is injected by the proxy function (api/braze/[...path].js), not here.
 *
 * Features:
 *  - Exponential backoff retry for 5xx / network errors (max 3 attempts)
 *  - Standardised ApiError wrapping for all non-2xx responses
 *  - A single Ky instance ensures global header/connection reuse
 */

import ky from 'ky';
import { AppLogger } from '../core/AppLogger.js';

/* ============================================================
   ApiError — standardised error object for all Braze failures
   ============================================================ */

/**
 * @typedef {Object} ApiErrorOptions
 * @property {number}   status       - HTTP status code
 * @property {string[]} brazeErrors  - Braze-specific error messages array
 * @property {string}   [traceId]    - Request trace ID (from response headers)
 * @property {string}   humanMessage - A human-readable description
 */

export class ApiError extends Error {
  /**
   * @param {ApiErrorOptions} options
   */
  constructor({ status, brazeErrors = [], traceId = '', humanMessage }) {
    super(humanMessage);
    this.name        = 'ApiError';
    this.status      = status;
    this.brazeErrors = brazeErrors;
    this.traceId     = traceId;
    this.humanMessage = humanMessage;
  }

  /** @returns {boolean} True for expected client errors (4xx) */
  isClientError() { return this.status >= 400 && this.status < 500; }

  /** @returns {boolean} True for server/infrastructure errors (5xx) */
  isServerError() { return this.status >= 500; }
}

/* ============================================================
   Retry hook — exponential backoff for 5xx / network failures
   ============================================================ */

/**
 * Determines the retry delay using exponential backoff with jitter.
 *
 * @param {number} attemptCount - 1-indexed retry attempt count
 * @returns {number} Delay in milliseconds
 */
function retryDelay(attemptCount) {
  const base  = 500;
  const jitter = Math.random() * 200;
  return Math.min(base * Math.pow(2, attemptCount - 1) + jitter, 8000);
}

/* ============================================================
   BrazeClient singleton factory
   ============================================================ */

let _instance = null;

export const BrazeClient = {
  /**
   * Returns (or creates) the singleton Ky instance configured to route
   * requests through the Vercel serverless proxy at /api/braze/.
   * No API key is needed here — the proxy injects it server-side.
   *
   * @returns {import('ky').KyInstance}
   */
  getInstance() {
    if (_instance) return _instance;

    _instance = ky.create({
      prefixUrl: '/api/braze/',
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 15_000,
      retry: {
        limit:    3,
        methods:  ['post', 'get'],
        statusCodes: [429, 500, 502, 503, 504],
        backoffLimit: 8_000,
        delay: retryDelay,
      },
      hooks: {
        beforeRequest: [
          request => {
            AppLogger.debug('[API]', `→ ${request.method} ${request.url}`);
          },
        ],
        afterResponse: [
          async (_req, _opts, response) => {
            AppLogger.debug('[API]', `← ${response.status} ${response.url}`);
            return response;
          },
        ],
        beforeError: [
          async error => {
            const { response } = error;
            if (response) {
              let body = {};
              try { body = await response.clone().json(); } catch { /* empty */ }

              error._brazeErrors  = body.errors || (body.message ? [body.message] : []);
              error._traceId      = response.headers.get('x-request-id') || '';
              error._humanMessage = _humanMessage(response.status, body);

              AppLogger.error('[API]', error._humanMessage, {
                status:  response.status,
                errors:  error._brazeErrors,
                traceId: error._traceId,
              });
            }
            return error;
          },
        ],
      },
    });

    AppLogger.info('[API]', 'BrazeClient instance created', { proxy: '/api/braze/' });
    return _instance;
  },

  /** Resets the singleton (useful for testing or config changes at runtime). */
  reset() {
    _instance = null;
    AppLogger.info('[API]', 'BrazeClient instance reset');
  },
};

/**
 * Generates a human-readable error message from an HTTP status + body.
 *
 * @param {number} status
 * @param {object} body
 * @returns {string}
 */
function _humanMessage(status, body) {
  if (status === 401) return 'Authentication failed — check your Braze API key.';
  if (status === 403) return 'Permission denied — ensure the API key has the required scopes.';
  if (status === 404) return 'Resource not found on the Braze platform.';
  if (status === 429) return 'Rate limit reached — the request will be retried automatically.';
  if (status >= 500)  return `Braze server error (${status}) — retrying automatically.`;
  return body?.message || body?.error || `Request failed with status ${status}.`;
}
