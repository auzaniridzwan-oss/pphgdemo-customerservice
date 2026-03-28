/**
 * CustomerNote — Braze `notes` array-of-objects item
 *
 * Stored under custom attribute `notes` per
 * @see https://www.braze.com/docs/api/objects_filters/user_attributes_object/#object-body
 *
 * Use `note_id` as $identifier_key for $remove / $update operations.
 */

import { TimelineEvent } from './TimelineEvent.js';

/**
 * @typedef {Object} CustomerNote
 * @property {string}  note_id     - Stable UUID for Braze array-of-objects identity
 * @property {string}  created_at  - ISO 8601
 * @property {string}  body_text   - Plain text body
 * @property {boolean} is_internal - Agent-only visibility flag
 * @property {string}  author      - Agent display name
 */

const NOTE_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * @param {string} id
 * @returns {boolean}
 */
function _isUuidLike(id) {
  return typeof id === 'string' && NOTE_ID_RE.test(id.trim());
}

/**
 * Generates a new note_id (UUID v4).
 * @returns {string}
 */
export function generateNoteId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // RFC 4122 v4 fallback
  const bytes = new Uint8Array(16);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map(b => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/**
 * Coerces an unknown export value into a clean CustomerNote or null.
 * @param {object} row
 * @returns {CustomerNote|null}
 */
function _coerceNote(row) {
  if (!row || typeof row !== 'object') return null;
  const noteId = row.note_id;
  if (!_isUuidLike(String(noteId || ''))) return null;
  const body = row.body_text;
  if (typeof body !== 'string' || !body.trim()) return null;
  const created = row.created_at;
  if (typeof created !== 'string' || !created.trim()) return null;
  return {
    note_id:     String(noteId).trim(),
    created_at:  created.trim(),
    body_text:   body.trim(),
    is_internal: Boolean(row.is_internal),
    author:      typeof row.author === 'string' && row.author.trim()
      ? row.author.trim()
      : 'CS Agent',
  };
}

/**
 * Normalises Braze `custom_attributes.notes` export value to CustomerNote[].
 * Invalid entries are dropped. Newest first by created_at.
 *
 * @param {unknown} raw
 * @returns {CustomerNote[]}
 */
export function normalizeNotes(raw) {
  if (!Array.isArray(raw)) return [];
  const out = [];
  for (const item of raw) {
    const n = _coerceNote(item);
    if (n) out.push(n);
  }
  out.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  return out;
}

/**
 * Builds one Braze-ready note object for /users/track ($add or full array).
 *
 * @param {Object} opts
 * @param {string} opts.bodyText
 * @param {boolean} [opts.isInternal=true]
 * @param {string} [opts.author='CS Agent']
 * @returns {CustomerNote}
 */
export function buildNoteForTrack({ bodyText, isInternal = true, author = 'CS Agent' }) {
  const text = typeof bodyText === 'string' ? bodyText.trim() : '';
  if (!text) {
    throw new Error('buildNoteForTrack: bodyText is required');
  }
  return {
    note_id:     generateNoteId(),
    created_at:  new Date().toISOString(),
    body_text:   text,
    is_internal: Boolean(isInternal),
    author:      typeof author === 'string' && author.trim() ? author.trim() : 'CS Agent',
  };
}

/**
 * Maps a CustomerNote to a UnifiedTimeline event.
 *
 * @param {CustomerNote} note
 * @returns {TimelineEvent}
 */
export function customerNoteToTimelineEvent(note) {
  return new TimelineEvent({
    id:        note.note_id,
    type:      'agent_note',
    channel:   'note',
    timestamp: note.created_at,
    sender:    note.author,
    content:   note.body_text,
    metadata:  { internal: note.is_internal, source: 'braze_notes' },
  });
}
