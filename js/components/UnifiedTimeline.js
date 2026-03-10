/**
 * UnifiedTimeline
 *
 * Chronological feed of all user interactions across channels.
 * Supports client-side filter tabs: All / Messages / Events / Notes.
 *
 * @param {import('../api/models/TimelineEvent.js').TimelineEvent[]} events
 */

import { AppLogger } from '../core/AppLogger.js';

const FILTER_TABS = [
  { id: 'all',      label: 'All' },
  { id: 'message',  label: 'Messages' },
  { id: 'system_event', label: 'Events' },
  { id: 'agent_note',   label: 'Notes' },
];

export class UnifiedTimeline {
  /**
   * @param {import('../api/models/TimelineEvent.js').TimelineEvent[]} events
   */
  constructor(events) {
    this.allEvents    = events;
    this.activeFilter = 'all';

    this.el = document.createElement('div');
    this.el.className = 'card';
    this.el.style.flex = '1';
    this.el.style.minHeight = '0';
    this.el.style.display = 'flex';
    this.el.style.flexDirection = 'column';
  }

  /**
   * Renders the component and returns the element.
   * @returns {HTMLElement}
   */
  render() {
    this.el.innerHTML = `
      <div class="card-header">
        <span class="card-title">Interaction Timeline</span>
        <span style="font-size:11px; color:var(--color-text-secondary);">${this.allEvents.length} events</span>
      </div>

      <!-- Filter Tabs -->
      <div class="filter-tabs" id="timeline-tabs" role="tablist" style="margin-bottom:12px;">
        ${FILTER_TABS.map(t => `
          <button
            class="filter-tab${t.id === this.activeFilter ? ' active' : ''}"
            data-filter="${t.id}"
            role="tab"
            aria-selected="${t.id === this.activeFilter}"
            aria-controls="timeline-list"
          >${t.label}</button>
        `).join('')}
      </div>

      <!-- Timeline List -->
      <div id="timeline-list" class="timeline" role="list" style="flex:1; overflow-y:auto;">
        ${this._renderItems()}
      </div>
    `;

    this._bindTabs();
    AppLogger.debug('[UI]', `UnifiedTimeline rendered — ${this.allEvents.length} events`);
    return this.el;
  }

  /**
   * Renders timeline item HTML for the currently active filter.
   * @returns {string}
   */
  _renderItems() {
    const filtered = this.activeFilter === 'all'
      ? this.allEvents
      : this.allEvents.filter(e => e.type === this.activeFilter);

    if (!filtered.length) {
      return `
        <div class="empty-state">
          <div class="empty-state-icon"><i class="fa-solid fa-timeline" aria-hidden="true"></i></div>
          <div class="empty-state-title">No interactions found</div>
          <div class="empty-state-desc">No ${this.activeFilter === 'all' ? '' : this.activeFilter.replace('_', ' ')} events to display.</div>
        </div>
      `;
    }

    return filtered.map((evt, i) => this._itemHTML(evt, i)).join('');
  }

  /**
   * Returns the HTML for a single timeline item.
   * @param {import('../api/models/TimelineEvent.js').TimelineEvent} evt
   * @param {number} index
   * @returns {string}
   */
  _itemHTML(evt, index) {
    const delay = Math.min(index * 40, 400);
    return `
      <div class="timeline-item" role="listitem" style="animation-delay:${delay}ms;">
        <div class="timeline-icon ${evt.iconModifier}" aria-hidden="true">
          <i class="${evt.iconClass}"></i>
        </div>
        <div class="timeline-body">
          <div class="timeline-meta">
            <span class="timeline-sender">${_escHtml(evt.sender)}</span>
            <span class="timeline-tag ${evt.tagModifier}">${evt.channelLabel}</span>
            <span class="timeline-ts" title="${evt.timestamp}">${evt.relativeTime}</span>
          </div>
          <div class="timeline-content">${_escHtml(evt.content)}</div>
          ${evt.metadata && Object.keys(evt.metadata).length ? _metaHTML(evt.metadata) : ''}
        </div>
      </div>
    `;
  }

  /**
   * Wires filter tab click handlers.
   */
  _bindTabs() {
    const tabsEl = this.el.querySelector('#timeline-tabs');
    if (!tabsEl) return;

    tabsEl.querySelectorAll('.filter-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        this.activeFilter = btn.dataset.filter;
        tabsEl.querySelectorAll('.filter-tab').forEach(b => {
          b.classList.toggle('active', b === btn);
          b.setAttribute('aria-selected', b === btn ? 'true' : 'false');
        });
        const list = this.el.querySelector('#timeline-list');
        if (list) list.innerHTML = this._renderItems();
        AppLogger.debug('[UI]', `Timeline filter: ${this.activeFilter}`);
      });
    });
  }

  /**
   * Replaces the event list (called after notes are added).
   * @param {import('../api/models/TimelineEvent.js').TimelineEvent[]} events
   */
  update(events) {
    this.allEvents = events;
    const list = this.el.querySelector('#timeline-list');
    if (list) list.innerHTML = this._renderItems();
    const countEl = this.el.querySelector('.card-header span:last-child');
    if (countEl) countEl.textContent = `${events.length} events`;
  }
}

/**
 * Returns HTML for the metadata sub-row under a timeline item.
 * @param {object} meta
 * @returns {string}
 */
function _metaHTML(meta) {
  const pairs = Object.entries(meta)
    .filter(([k]) => !['agentId', 'internal'].includes(k))
    .slice(0, 3)
    .map(([k, v]) => `<span style="font-size:10px; color:var(--color-text-secondary);">${k.replace(/_/g,' ')}: <strong>${v}</strong></span>`)
    .join('<span style="color:var(--color-text-secondary); opacity:0.3; margin:0 4px;">·</span>');

  if (!pairs) return '';
  return `<div style="display:flex; flex-wrap:wrap; gap:4px; margin-top:4px; align-items:center;">${pairs}</div>`;
}

/**
 * Escapes HTML special characters to prevent XSS.
 * @param {string} str
 * @returns {string}
 */
function _escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
