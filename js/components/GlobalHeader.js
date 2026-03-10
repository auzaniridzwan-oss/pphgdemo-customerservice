/**
 * GlobalHeader
 *
 * Renders the top application bar into `#global-header`.
 * Contains:
 *  - Customer search input with demo user quick-select
 *  - Breadcrumb trail (updated programmatically by pages)
 *  - LIVE / DEMO MODE data source badge
 *  - Agent session status (initials + name)
 */

import { AppLogger }      from '../core/AppLogger.js';
import { StorageManager }  from '../core/StorageManager.js';
import { getDemoUserIds }  from '../data/mockData.js';

/** @type {HTMLElement|null} */
let _headerEl = null;

export const GlobalHeader = {

  /**
   * Renders the header HTML into #global-header.
   * Called once from index.html bootstrap.
   */
  render() {
    _headerEl = document.getElementById('global-header');
    if (!_headerEl) return;

    const isLive = this._isLiveMode();

    _headerEl.innerHTML = `
      <!-- Breadcrumb -->
      <div id="header-breadcrumb" style="display:flex; align-items:center; gap:6px; flex-shrink:0;">
        <span style="font-weight:600; font-size:13px; color:var(--color-text-secondary);">CS Command Center</span>
        <i class="fa-solid fa-chevron-right" aria-hidden="true" style="font-size:10px; color:var(--color-text-secondary); opacity:0.5;"></i>
        <span id="breadcrumb-page" style="font-weight:600; font-size:13px; color:var(--color-text-primary);">
          Customer Profiles
        </span>
      </div>

      <!-- Search -->
      <div class="search-input-wrap">
        <i class="fa-solid fa-magnifying-glass search-icon" aria-hidden="true"></i>
        <input
          type="search"
          id="header-search"
          class="search-input"
          placeholder="Search by name, email or ID…"
          autocomplete="off"
          aria-label="Search customers"
        />
        <div id="search-dropdown" style="
          display:none;
          position:absolute;
          top:calc(100% + 6px);
          left:0; right:0;
          background:var(--color-surface);
          border:1px solid rgba(107,114,128,0.15);
          border-radius:10px;
          box-shadow:0 8px 24px rgba(0,0,0,0.1);
          overflow:hidden;
          z-index:100;
        "></div>
      </div>

      <!-- Right cluster -->
      <div style="display:flex; align-items:center; gap:12px; margin-left:auto; flex-shrink:0;">
        <!-- Data source badge -->
        <span id="mode-badge" class="${isLive ? 'badge-live' : 'badge-demo'}">
          ${isLive ? 'LIVE' : 'DEMO MODE'}
        </span>

        <!-- Notification bell -->
        <button class="sidebar-item" style="background:transparent; color:var(--color-text-secondary); width:36px; height:36px;" aria-label="Notifications">
          <i class="fa-solid fa-bell" aria-hidden="true" style="font-size:14px;"></i>
        </button>

        <!-- Agent avatar -->
        <div style="display:flex; align-items:center; gap:8px; cursor:pointer;">
          <div class="avatar-sm" aria-label="Agent Avatar">CS</div>
          <div style="display:flex; flex-direction:column; line-height:1.2;">
            <span style="font-size:12px; font-weight:600; color:var(--color-text-primary);">CS Agent</span>
            <span style="font-size:10px; color:var(--color-text-secondary);">Online</span>
          </div>
        </div>
      </div>
    `;

    this._bindSearch();
    AppLogger.info('[UI]', 'GlobalHeader rendered', { mode: isLive ? 'LIVE' : 'DEMO' });
  },

  /**
   * Updates the breadcrumb page label.
   * @param {string} label
   */
  setBreadcrumb(label) {
    const el = document.getElementById('breadcrumb-page');
    if (el) el.textContent = label;
  },

  /**
   * Updates the mode badge based on current config.
   */
  refreshBadge() {
    const badge  = document.getElementById('mode-badge');
    if (!badge) return;
    const isLive = this._isLiveMode();
    badge.className   = isLive ? 'badge-live' : 'badge-demo';
    badge.textContent = isLive ? 'LIVE' : 'DEMO MODE';
  },

  /* ---- Private ---- */

  /**
   * Reads live mode status from window config + StorageManager.
   * Mirrors the logic in AppConfig.isLiveMode() without importing it
   * to avoid a circular module dependency.
   * @returns {boolean}
   */
  _isLiveMode() {
    const cfg = window.__APP_CONFIG__ || {};
    const manualMock = StorageManager.get('mock_mode', false);
    if (manualMock) return false;
    return !!cfg.BRAZE_REST_ENDPOINT;
  },

  /**
   * Wires the search input. Behaviour differs based on live vs. demo mode:
   *  - Demo: filters the seeded mock user list client-side on focus/input.
   *  - Live: shows a hint on focus; on Enter searches Braze by email (contains '@')
   *          or navigates directly to the profile by external_id.
   */
  _bindSearch() {
    const input    = document.getElementById('header-search');
    const dropdown = document.getElementById('search-dropdown');
    if (!input || !dropdown) return;

    if (this._isLiveMode()) {
      input.placeholder = 'Enter external ID or email, then press Enter…';
      this._bindLiveSearch(input, dropdown);
    } else {
      this._bindDemoSearch(input, dropdown);
    }
  },

  /**
   * Demo mode search: filters the seeded mock user list by query string.
   * @param {HTMLInputElement} input
   * @param {HTMLElement} dropdown
   */
  _bindDemoSearch(input, dropdown) {
    const demoIds = getDemoUserIds();

    const showDropdown = (query = '') => {
      const filtered = demoIds.filter(id =>
        !query || id.toLowerCase().includes(query.toLowerCase())
      );

      if (!filtered.length) {
        dropdown.style.display = 'none';
        return;
      }

      dropdown.innerHTML = filtered.map(id => `
        <div class="search-result-item" data-userid="${id}" style="
          padding:10px 14px;
          cursor:pointer;
          display:flex;
          align-items:center;
          gap:10px;
          transition: background 0.1s;
          border-bottom: 1px solid rgba(107,114,128,0.08);
        ">
          <div class="avatar-sm" style="width:28px;height:28px;font-size:11px;">${id.slice(0, 2)}</div>
          <div>
            <div style="font-size:13px; font-weight:600; color:var(--color-text-primary);">Demo Guest ${id}</div>
            <div style="font-size:11px; color:var(--color-text-secondary);">ID: ${id}</div>
          </div>
        </div>
      `).join('');

      dropdown.style.display = 'block';

      dropdown.querySelectorAll('.search-result-item').forEach(item => {
        item.addEventListener('mouseenter', () => { item.style.background = 'rgba(97,43,189,0.05)'; });
        item.addEventListener('mouseleave', () => { item.style.background = ''; });
        item.addEventListener('click', () => {
          const userId = item.dataset.userid;
          input.value = '';
          dropdown.style.display = 'none';
          window.location.hash = `#/users/${encodeURIComponent(userId)}`;
        });
      });
    };

    input.addEventListener('focus', () => showDropdown(input.value));
    input.addEventListener('input', () => showDropdown(input.value));
    input.addEventListener('keydown', e => {
      if (e.key === 'Escape') dropdown.style.display = 'none';
    });

    document.addEventListener('click', e => {
      if (!_headerEl?.contains(e.target)) dropdown.style.display = 'none';
    });
  },

  /**
   * Live mode search: on Enter, routes to Braze by email or external_id.
   * @param {HTMLInputElement} input
   * @param {HTMLElement} dropdown
   */
  _bindLiveSearch(input, dropdown) {
    const showHint = () => {
      dropdown.innerHTML = `
        <div style="padding:12px 14px; display:flex; align-items:center; gap:10px;">
          <i class="fa-solid fa-circle-info" aria-hidden="true" style="font-size:13px; color:var(--color-text-secondary); opacity:0.6;"></i>
          <span style="font-size:12px; color:var(--color-text-secondary);">Type an external ID or email and press Enter to search.</span>
        </div>
      `;
      dropdown.style.display = 'block';
    };

    const showLoading = () => {
      dropdown.innerHTML = `
        <div style="padding:12px 14px; display:flex; align-items:center; gap:10px;">
          <i class="fa-solid fa-spinner fa-spin" aria-hidden="true" style="font-size:13px; color:var(--color-text-secondary);"></i>
          <span style="font-size:12px; color:var(--color-text-secondary);">Searching Braze…</span>
        </div>
      `;
      dropdown.style.display = 'block';
    };

    const showNotFound = (query) => {
      dropdown.innerHTML = `
        <div style="padding:12px 14px; display:flex; align-items:center; gap:10px;">
          <i class="fa-solid fa-circle-xmark" aria-hidden="true" style="font-size:13px; color:#ef4444; opacity:0.8;"></i>
          <span style="font-size:12px; color:var(--color-text-secondary);">No user found for <strong>${_escapeHtml(query)}</strong>.</span>
        </div>
      `;
      dropdown.style.display = 'block';
    };

    const showResult = (profile) => {
      dropdown.innerHTML = `
        <div class="search-result-item" data-userid="${_escapeHtml(profile.externalId)}" style="
          padding:10px 14px;
          cursor:pointer;
          display:flex;
          align-items:center;
          gap:10px;
          transition: background 0.1s;
        ">
          <div class="avatar-sm" style="width:28px;height:28px;font-size:11px;">${_escapeHtml(profile.initials)}</div>
          <div>
            <div style="font-size:13px; font-weight:600; color:var(--color-text-primary);">${_escapeHtml(profile.displayName)}</div>
            <div style="font-size:11px; color:var(--color-text-secondary);">${_escapeHtml(profile.email)} · ID: ${_escapeHtml(profile.externalId)}</div>
          </div>
        </div>
      `;
      dropdown.style.display = 'block';

      const item = dropdown.querySelector('.search-result-item');
      if (item) {
        item.addEventListener('mouseenter', () => { item.style.background = 'rgba(97,43,189,0.05)'; });
        item.addEventListener('mouseleave', () => { item.style.background = ''; });
        item.addEventListener('click', () => {
          input.value = '';
          dropdown.style.display = 'none';
          window.location.hash = `#/users/${encodeURIComponent(profile.externalId)}`;
        });
      }
    };

    input.addEventListener('focus', () => {
      if (!input.value.trim()) showHint();
    });

    input.addEventListener('input', () => {
      if (!input.value.trim()) {
        showHint();
      } else {
        dropdown.style.display = 'none';
      }
    });

    input.addEventListener('keydown', async e => {
      if (e.key === 'Escape') {
        dropdown.style.display = 'none';
        return;
      }

      if (e.key !== 'Enter') return;

      const query = input.value.trim();
      if (!query) return;

      if (query.includes('@')) {
        showLoading();
        try {
          const { UserRepository } = await import('../api/UserRepository.js');
          const profile = await UserRepository.findByEmail(query);
          if (profile) {
            showResult(profile);
          } else {
            showNotFound(query);
          }
        } catch (err) {
          AppLogger.error('[UI]', `Live email search failed for ${query}`, err);
          showNotFound(query);
        }
      } else {
        dropdown.style.display = 'none';
        input.value = '';
        window.location.hash = `#/users/${encodeURIComponent(query)}`;
      }
    });

    document.addEventListener('click', e => {
      if (!_headerEl?.contains(e.target)) dropdown.style.display = 'none';
    });
  },
};

/**
 * Escapes HTML special characters to prevent XSS in user-controlled strings
 * rendered into the dropdown.
 *
 * @param {string} str
 * @returns {string}
 */
function _escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
