/**
 * DeviceInventoryCard
 *
 * Displays a list of the user's registered devices and push token count.
 */

import { AppLogger } from '../core/AppLogger.js';

const PLATFORM_ICONS = {
  ios:     'fa-brands fa-apple',
  android: 'fa-brands fa-android',
  web:     'fa-solid fa-globe',
};

export class DeviceInventoryCard {
  /**
   * @param {import('../api/models/UserProfile.js').UserProfile} profile
   */
  constructor(profile) {
    this.profile = profile;
    this.el      = document.createElement('div');
    this.el.className = 'card';
  }

  /**
   * @returns {HTMLElement}
   */
  render() {
    const p = this.profile;

    const devicesHTML = p.devices.length
      ? p.devices.map(d => `
        <div style="display:flex; align-items:center; gap:10px; padding:8px 0; border-bottom:1px solid rgba(107,114,128,0.08);">
          <div style="width:32px; height:32px; border-radius:8px; background:rgba(107,114,128,0.08);
            display:flex; align-items:center; justify-content:center; flex-shrink:0;">
            <i class="${PLATFORM_ICONS[d.platform] || 'fa-solid fa-mobile'}" aria-hidden="true"
              style="font-size:14px; color:var(--color-text-secondary);"></i>
          </div>
          <div style="flex:1; min-width:0;">
            <div style="font-size:12px; font-weight:600; color:var(--color-text-primary); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${d.model || 'Unknown Device'}</div>
            <div style="font-size:11px; color:var(--color-text-secondary);">${d.os || ''} ${d.carrier ? '· ' + d.carrier : ''}</div>
          </div>
        </div>
      `).join('')
      : `<div class="empty-state" style="padding:20px 0;">
          <div class="empty-state-icon" style="font-size:24px;"><i class="fa-solid fa-mobile" aria-hidden="true"></i></div>
          <div class="empty-state-title">No devices registered</div>
        </div>`;

    this.el.innerHTML = `
      <div class="card-header">
        <span class="card-title" style="display:flex;align-items:center;gap:6px;">
          <i class="fa-solid fa-mobile-screen" aria-hidden="true" style="color:var(--color-primary);"></i>
          Devices
        </span>
        <div style="display:flex; align-items:center; gap:6px;">
          <i class="fa-solid fa-bell" aria-hidden="true" style="font-size:11px; color:var(--color-text-secondary);"></i>
          <span style="font-size:12px; font-weight:700; color:var(--color-text-primary);">${p.pushTokens.length}</span>
          <span style="font-size:11px; color:var(--color-text-secondary);">push token${p.pushTokens.length !== 1 ? 's' : ''}</span>
        </div>
      </div>
      <div>${devicesHTML}</div>
    `;

    AppLogger.debug('[UI]', `DeviceInventoryCard rendered — ${p.devices.length} devices`);
    return this.el;
  }
}
