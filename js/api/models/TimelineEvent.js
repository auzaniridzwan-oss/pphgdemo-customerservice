/**
 * TimelineEvent — Domain Model
 *
 * Normalises heterogeneous interaction data (Braze message sends, CS agent notes,
 * custom events) into a unified shape for the UnifiedTimeline component.
 */

/** @typedef {'message'|'system_event'|'agent_note'} EventType */
/** @typedef {'whatsapp'|'email'|'sms'|'push'|'note'|'event'} EventChannel */

export class TimelineEvent {
  /**
   * @param {object} options
   * @param {string}       options.id
   * @param {EventType}    options.type
   * @param {EventChannel} options.channel
   * @param {string}       options.timestamp   - ISO 8601
   * @param {string}       options.sender      - Display name of sender/system
   * @param {string}       options.content     - Main text body
   * @param {object}       [options.metadata]  - Supplementary info (campaign name, status, etc.)
   * @param {string}       [options.agentId]   - For agent_note type
   */
  constructor({ id, type, channel, timestamp, sender, content, metadata = {}, agentId = '' }) {
    this.id        = id;
    this.type      = type;
    this.channel   = channel;
    this.timestamp = timestamp;
    this.sender    = sender;
    this.content   = content;
    this.metadata  = metadata;
    this.agentId   = agentId;
  }

  /**
   * Returns a human-friendly relative timestamp (e.g. "2 hours ago").
   * @returns {string}
   */
  get relativeTime() {
    const now   = Date.now();
    const then  = new Date(this.timestamp).getTime();
    const diffMs = now - then;
    const diffMin = Math.floor(diffMs / 60_000);
    const diffH   = Math.floor(diffMin / 60);
    const diffD   = Math.floor(diffH   / 24);

    if (diffMin < 1)  return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffH   < 24) return `${diffH}h ago`;
    if (diffD   < 7)  return `${diffD}d ago`;

    return new Date(this.timestamp).toLocaleDateString('en-SG', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  }

  /**
   * Returns the FontAwesome icon class appropriate for this channel.
   * @returns {string}
   */
  get iconClass() {
    const map = {
      whatsapp: 'fa-brands fa-whatsapp',
      email:    'fa-solid fa-envelope',
      sms:      'fa-solid fa-comment-sms',
      push:     'fa-solid fa-mobile-screen-button',
      note:     'fa-solid fa-note-sticky',
      event:    'fa-solid fa-bolt',
    };
    return map[this.channel] || 'fa-solid fa-circle-dot';
  }

  /**
   * Returns the CSS modifier class for the timeline icon container.
   * @returns {string}
   */
  get iconModifier() {
    const map = {
      whatsapp: 'ti-whatsapp',
      email:    'ti-email',
      sms:      'ti-sms',
      push:     'ti-push',
      note:     'ti-note',
      event:    'ti-event',
    };
    return map[this.channel] || 'ti-event';
  }

  /**
   * Returns the CSS tag modifier class for the channel badge.
   * @returns {string}
   */
  get tagModifier() {
    return `tag-${this.channel}`;
  }

  /**
   * Friendly label for the channel.
   * @returns {string}
   */
  get channelLabel() {
    const labels = {
      whatsapp: 'WhatsApp',
      email:    'Email',
      sms:      'SMS',
      push:     'Push',
      note:     'Note',
      event:    'Event',
    };
    return labels[this.channel] || this.channel;
  }
}
