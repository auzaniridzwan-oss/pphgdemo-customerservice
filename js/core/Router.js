/**
 * Router
 *
 * Minimal hash-based SPA router.
 * Routes are defined as `{ pattern: RegExp, handler: Function }` objects.
 * The handler receives named capture groups from the pattern.
 *
 * Supported routes:
 *   #/users/:userId   → UserProfilePage
 *   #/               → redirects to default demo user
 */

import { AppLogger }       from './AppLogger.js';
import { UserProfilePage } from '../pages/UserProfilePage.js';

/** Default demo user surfaced when no userId is in the hash. */
const DEFAULT_USER_ID = 'DEMO-001';

/** @type {Array<{ pattern: RegExp, handler: (groups: object) => void }>} */
const routes = [
  {
    pattern: /^#\/users\/(?<userId>[^/]+)$/,
    handler: ({ userId }) => {
      AppLogger.info('[SYSTEM]', `Route → /users/${userId}`);
      UserProfilePage.render(decodeURIComponent(userId));
    },
  },
];

/** Fallback handler — redirects to the demo profile. */
const fallbackHandler = () => {
  AppLogger.warn('[SYSTEM]', 'No matching route — redirecting to default user');
  window.location.hash = `#/users/${DEFAULT_USER_ID}`;
};

/**
 * Resolves the current window.location.hash against the registered routes.
 * Calls the matching handler or the fallback.
 */
function resolve() {
  const hash = window.location.hash || '';

  // Normalise bare '#' or empty hash to root
  if (!hash || hash === '#' || hash === '#/') {
    fallbackHandler();
    return;
  }

  for (const route of routes) {
    const match = hash.match(route.pattern);
    if (match) {
      route.handler(match.groups || {});
      return;
    }
  }

  fallbackHandler();
}

export const Router = {
  /**
   * Initialises the router by resolving the current hash and attaching a
   * hashchange listener for subsequent navigations.
   */
  init() {
    AppLogger.info('[SYSTEM]', 'Router initialised');
    window.addEventListener('hashchange', resolve);
    resolve();
  },

  /**
   * Programmatically navigates to a user profile.
   * @param {string} userId
   */
  navigateToUser(userId) {
    window.location.hash = `#/users/${encodeURIComponent(userId)}`;
  },
};
