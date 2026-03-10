/**
 * Sidebar
 *
 * Manages the left navigation sidebar behaviour:
 *  - Active tab highlighting based on current hash route
 *  - Mock mode toggle button (flask icon at the bottom)
 *  - Tooltips via title attributes (native browser) for accessibility
 */

import { AppLogger }     from '../core/AppLogger.js';
import { StorageManager } from '../core/StorageManager.js';
import { GlobalHeader }  from './GlobalHeader.js';
import { Toast }         from './Toast.js';

export const Sidebar = {

  /**
   * Initialises the sidebar: sets the active state from the current hash
   * and wires the mock-mode toggle button.
   */
  init() {
    this._setActive();
    this._bindMockToggle();

    window.addEventListener('hashchange', () => this._setActive());

    AppLogger.info('[UI]', 'Sidebar initialised');
  },

  /**
   * Highlights the sidebar item matching the current hash route.
   */
  _setActive() {
    const hash = window.location.hash || '';
    document.querySelectorAll('[data-nav]').forEach(el => {
      el.classList.remove('active');
    });

    if (hash.startsWith('#/users')) {
      document.querySelector('[data-nav="users"]')?.classList.add('active');
    } else if (hash.startsWith('#/campaigns')) {
      document.querySelector('[data-nav="campaigns"]')?.classList.add('active');
    }
  },

  /**
   * Wires the demo/live mode toggle button.
   * Flips the `ar_app_mock_mode` storage flag and refreshes the header badge.
   */
  _bindMockToggle() {
    const btn = document.getElementById('toggle-mock-btn');
    if (!btn) return;

    btn.addEventListener('click', () => {
      const current = StorageManager.get('mock_mode', false);
      const next    = !current;

      StorageManager.set('mock_mode', next);
      GlobalHeader.refreshBadge();

      const label = next ? 'Demo Mode' : 'Live Mode';
      Toast.show(`Switched to ${label}. Reload the profile to see changes.`, next ? 'warning' : 'success');

      AppLogger.info('[UI]', `Mock mode toggled → ${next}`);
    });
  },
};
