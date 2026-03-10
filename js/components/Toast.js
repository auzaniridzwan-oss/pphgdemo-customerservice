/**
 * Toast
 *
 * Utility for displaying transient notification toasts in #toast-container.
 * Supports success, error, warning, and info variants.
 * Auto-dismisses after `duration` ms (default 3500ms).
 */

import { AppLogger } from '../core/AppLogger.js';

export const Toast = {

  /**
   * Displays a toast notification.
   *
   * @param {string}  message          - Text to display
   * @param {'success'|'error'|'warning'|'info'} [type='info']
   * @param {number}  [duration=3500]  - Auto-dismiss delay in ms
   */
  show(message, type = 'info', duration = 3500) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const icons = {
      success: 'fa-circle-check',
      error:   'fa-circle-xmark',
      warning: 'fa-triangle-exclamation',
      info:    'fa-circle-info',
    };

    const toastEl = document.createElement('div');
    toastEl.className = `toast toast-${type}`;
    toastEl.setAttribute('role', 'alert');
    toastEl.innerHTML = `
      <i class="fa-solid ${icons[type] || icons.info}" aria-hidden="true"></i>
      <span style="flex:1;">${message}</span>
      <button onclick="this.parentElement.remove()" style="
        background:transparent; border:none; color:inherit;
        cursor:pointer; padding:0 4px; opacity:0.7; font-size:14px;
      " aria-label="Dismiss">
        <i class="fa-solid fa-xmark" aria-hidden="true"></i>
      </button>
    `;

    container.appendChild(toastEl);
    AppLogger.debug('[UI]', `Toast [${type}]: ${message}`);

    setTimeout(() => {
      toastEl.style.animation = 'slideInRight 0.3s ease reverse both';
      setTimeout(() => toastEl.remove(), 300);
    }, duration);
  },
};
