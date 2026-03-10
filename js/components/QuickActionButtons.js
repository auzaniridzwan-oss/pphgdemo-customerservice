/**
 * QuickActionButtons
 *
 * A 2×N grid of action buttons allowing CS agents to fire predefined
 * Braze Custom Events with a single click.
 *
 * Each action:
 *  - Fires a `cs_quick_action_triggered` event via UserRepository.trackEvent()
 *  - Shows a success/error toast
 *  - Logs via AppLogger
 */

import { AppLogger }      from '../core/AppLogger.js';
import { UserRepository } from '../api/UserRepository.js';
import { Toast }          from './Toast.js';

/** @type {Array<{ id: string, label: string, icon: string, color: string, eventProps: object }>} */
const ACTIONS = [
  {
    id:         'send_offer',
    label:      'Send Offer',
    icon:       'fa-solid fa-gift',
    color:      '#612BBD',
    bg:         'rgba(97,43,189,0.1)',
    eventProps: { action: 'send_offer' },
  },
  {
    id:         'flag_review',
    label:      'Flag Review',
    icon:       'fa-solid fa-flag',
    color:      '#F59E0B',
    bg:         'rgba(245,158,11,0.1)',
    eventProps: { action: 'flag_for_review' },
  },
  {
    id:         'escalate',
    label:      'Escalate',
    icon:       'fa-solid fa-arrow-up-right-dots',
    color:      '#EF4444',
    bg:         'rgba(239,68,68,0.1)',
    eventProps: { action: 'escalate' },
  },
  {
    id:         'loyalty_upgrade',
    label:      'Loyalty Upgrade',
    icon:       'fa-solid fa-trophy',
    color:      '#10B981',
    bg:         'rgba(16,185,129,0.1)',
    eventProps: { action: 'loyalty_upgrade_triggered' },
  },
  {
    id:         'send_survey',
    label:      'Send Survey',
    icon:       'fa-solid fa-clipboard-list',
    color:      '#00D1FF',
    bg:         'rgba(0,209,255,0.1)',
    eventProps: { action: 'send_survey' },
  },
  {
    id:         'request_callback',
    label:      'Callback',
    icon:       'fa-solid fa-phone-arrow-up-right',
    color:      '#8B5CF6',
    bg:         'rgba(139,92,246,0.1)',
    eventProps: { action: 'request_callback' },
  },
];

export class QuickActionButtons {
  /**
   * @param {{ externalId: string, onAction?: Function }} options
   */
  constructor({ externalId, onAction }) {
    this.externalId = externalId;
    this.onAction   = onAction || (() => {});

    this.el         = document.createElement('div');
    this.el.className = 'card';
  }

  /**
   * @returns {HTMLElement}
   */
  render() {
    this.el.innerHTML = `
      <div class="card-header" style="margin-bottom:10px;">
        <span class="card-title" style="display:flex;align-items:center;gap:6px;">
          <i class="fa-solid fa-bolt" aria-hidden="true" style="color:var(--color-warning);"></i>
          Quick Actions
        </span>
      </div>
      <div class="quick-action-grid">
        ${ACTIONS.map(a => `
          <button
            class="quick-action-btn"
            data-action-id="${a.id}"
            title="${a.label}"
            aria-label="${a.label}"
          >
            <div class="quick-action-icon" style="background:${a.bg};">
              <i class="${a.icon}" aria-hidden="true" style="color:${a.color};"></i>
            </div>
            <span class="quick-action-label">${a.label}</span>
          </button>
        `).join('')}
      </div>
    `;

    this._bindActions();
    AppLogger.debug('[UI]', 'QuickActionButtons rendered');
    return this.el;
  }

  /**
   * Wires click handlers on all action buttons.
   */
  _bindActions() {
    this.el.querySelectorAll('.quick-action-btn').forEach(btn => {
      btn.addEventListener('click', () => this._trigger(btn));
    });
  }

  /**
   * Fires the Braze event for the clicked action.
   * @param {HTMLElement} btn
   */
  async _trigger(btn) {
    const actionId = btn.dataset.actionId;
    const action   = ACTIONS.find(a => a.id === actionId);
    if (!action) return;

    btn.disabled = true;
    const icon = btn.querySelector('i');
    const prevClass = icon?.className || '';
    if (icon) icon.className = 'fa-solid fa-circle-notch fa-spin';

    try {
      await UserRepository.trackEvent(
        this.externalId,
        'cs_quick_action_triggered',
        { ...action.eventProps, timestamp: new Date().toISOString() }
      );

      Toast.show(`${action.label} triggered`, 'success', 2000);
      AppLogger.info('[UI]', `Quick action triggered: ${actionId}`, action.eventProps);
      this.onAction(action);

    } catch (err) {
      Toast.show(`${action.label} failed. Please try again.`, 'error');
      AppLogger.error('[UI]', `Quick action failed: ${actionId}`, err);
    } finally {
      btn.disabled = false;
      if (icon) icon.className = prevClass;
    }
  }
}
