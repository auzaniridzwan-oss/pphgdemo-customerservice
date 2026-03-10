/**
 * UserIdentityCard
 *
 * Renders the top of the left column: avatar, full name, Braze ID,
 * loyalty tier badge, account status badge, and contact quick-links.
 *
 * @param {import('../api/models/UserProfile.js').UserProfile} profile
 */

import { AppLogger } from '../core/AppLogger.js';

const TIER_CLASS = {
  'Platinum': 'tier-platinum',
  'Gold':     'tier-gold',
  'Silver':   'tier-silver',
};

export class UserIdentityCard {
  /**
   * @param {import('../api/models/UserProfile.js').UserProfile} profile
   */
  constructor(profile) {
    this.profile = profile;
    this.el      = document.createElement('div');
    this.el.className = 'card';
  }

  /**
   * Renders the card and returns the element.
   * @returns {HTMLElement}
   */
  render() {
    const p = this.profile;
    const tierClass = TIER_CLASS[p.loyaltyTier] || 'tier-silver';

    this.el.innerHTML = `
      <!-- Avatar + Name -->
      <div style="display:flex; align-items:flex-start; gap:14px; margin-bottom:14px;">
        <div class="avatar" aria-label="${p.displayName} avatar">${p.initials}</div>
        <div style="flex:1; min-width:0;">
          <h2 style="font-size:16px; font-weight:700; color:var(--color-text-primary); margin:0 0 4px; line-height:1.2; word-break:break-word;">${p.displayName}</h2>
          <div style="display:flex; flex-wrap:wrap; gap:5px; align-items:center;">
            <span class="tier-badge ${tierClass}">
              <i class="fa-solid fa-star" aria-hidden="true"></i>
              ${p.loyaltyTier}
            </span>
            <span style="padding:2px 8px; border-radius:6px; font-size:11px; font-weight:600;
              background:rgba(16,185,129,0.1); color:var(--color-success);
              border:1px solid rgba(16,185,129,0.25);">
              ${p.accountStatus}
            </span>
          </div>
        </div>
      </div>

      <!-- ID Fields -->
      <div style="display:flex; flex-direction:column; gap:6px; margin-bottom:14px;">
        ${_idRow('External ID', p.externalId, 'fa-id-badge')}
        ${_idRow('Braze ID',    p.brazeId,    'fa-database')}
        ${p.email ? _idRow('Email', p.email, 'fa-envelope') : ''}
        ${p.phone ? _idRow('Phone', p.phone, 'fa-phone') : ''}
      </div>

      <!-- Opt-in Status -->
      <div style="display:flex; gap:8px; flex-wrap:wrap;">
        ${_optBadge('Email', p.emailOptIn)}
        ${_optBadge('Push',  p.pushOptIn)}
      </div>
    `;

    AppLogger.debug('[UI]', `UserIdentityCard rendered for ${p.externalId}`);
    return this.el;
  }

  /**
   * Updates the card with a new profile (used after attribute edits).
   * @param {import('../api/models/UserProfile.js').UserProfile} profile
   */
  update(profile) {
    this.profile = profile;
    this.render();
  }
}

/**
 * Returns HTML for a read-only identity row with an icon.
 * @param {string} label
 * @param {string} value
 * @param {string} iconClass - FontAwesome class (without 'fa-solid')
 * @returns {string}
 */
function _idRow(label, value, iconClass) {
  return `
    <div style="display:flex; align-items:center; gap:8px; padding:4px 0;">
      <i class="fa-solid ${iconClass}" aria-hidden="true" style="width:14px; text-align:center; color:var(--color-text-secondary); font-size:12px; flex-shrink:0;"></i>
      <span style="font-size:11px; color:var(--color-text-secondary); flex-shrink:0; min-width:68px;">${label}</span>
      <span style="font-size:12px; font-weight:600; color:var(--color-text-primary); word-break:break-all; font-family: 'SF Mono', monospace;">${value || '—'}</span>
    </div>
  `;
}

/**
 * Returns HTML for a subscription opt-in status badge.
 * @param {string}  label
 * @param {boolean} optedIn
 * @returns {string}
 */
function _optBadge(label, optedIn) {
  const color = optedIn ? 'var(--color-success)' : 'var(--color-error)';
  const bg    = optedIn ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)';
  const icon  = optedIn ? 'fa-circle-check' : 'fa-circle-xmark';
  const text  = optedIn ? 'Opted In' : 'Opted Out';
  return `
    <div style="display:flex; align-items:center; gap:5px; padding:4px 8px; border-radius:6px;
      background:${bg}; border:1px solid ${color}30; font-size:11px; font-weight:600; color:${color};">
      <i class="fa-solid ${icon}" aria-hidden="true"></i>
      ${label}: ${text}
    </div>
  `;
}
