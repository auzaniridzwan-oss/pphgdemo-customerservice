/**
 * SessionOverviewCard
 *
 * Displays session statistics for the selected user:
 *  - Total sessions
 *  - Last seen date/time
 *  - Sessions per app
 */

import { AppLogger } from '../core/AppLogger.js';

export class SessionOverviewCard {
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
    const p       = this.profile;
    const lastSeen = p.lastActivity
      ? new Date(p.lastActivity).toLocaleString('en-SG', { dateStyle: 'medium', timeStyle: 'short' })
      : '—';

    this.el.innerHTML = `
      <div class="card-header">
        <span class="card-title" style="display:flex;align-items:center;gap:6px;">
          <i class="fa-solid fa-signal" aria-hidden="true" style="color:var(--color-accent);"></i>
          Sessions
        </span>
        <span style="font-size:18px; font-weight:700; color:var(--color-primary);">${p.totalSessions}</span>
      </div>

      <div style="display:flex; flex-direction:column; gap:8px;">
        <div class="field-row" style="cursor:default;">
          <span class="field-label">Last Active</span>
          <span class="field-value">${lastSeen}</span>
        </div>
        ${p.sessionsByApp.map(app => `
          <div class="field-row" style="cursor:default;">
            <span class="field-label" style="max-width:120px; white-space:normal;">${app.name || 'App'}</span>
            <span class="field-value">${app.total_sessions ?? 0} sessions</span>
          </div>
        `).join('')}
      </div>
    `;

    AppLogger.debug('[UI]', `SessionOverviewCard rendered — ${p.totalSessions} total sessions`);
    return this.el;
  }
}
