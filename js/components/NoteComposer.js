/**
 * NoteComposer
 *
 * Rich-text note input for CS agents.
 *
 * Features:
 *  - ContentEditable rich text area with bold/italic/underline toolbar
 *  - @mention trigger (typing '@' shows a simple agent dropdown)
 *  - Internal visibility toggle (note visible to agents only vs. all)
 *  - AI Rewrite button (stub — logs intent and simulates a rewrite in demo mode)
 *  - On submit: persists to Braze `notes` (array of objects) via UserRepository.addNote,
 *    tracks `cs_note_saved`, and adds the note to the timeline
 *
 * @param {object}   options
 * @param {string}   options.externalId   - The customer's external_id
 * @param {Function} options.onNoteAdded  - Callback(TimelineEvent) when a note is saved
 */

import { AppLogger }      from '../core/AppLogger.js';
import { UserRepository } from '../api/UserRepository.js';
import { customerNoteToTimelineEvent } from '../api/models/CustomerNote.js';
import { Toast }          from './Toast.js';

const MOCK_AGENTS = ['Sarah Lim', 'David Chen', 'Priya Nair', 'James Tan', 'Maria Santos'];

export class NoteComposer {
  /**
   * @param {{ externalId: string, onNoteAdded: Function }} options
   */
  constructor({ externalId, onNoteAdded }) {
    this.externalId  = externalId;
    this.onNoteAdded = onNoteAdded || (() => {});
    this.isInternal  = true;
    this.isSaving    = false;

    this.el = document.createElement('div');
    this.el.className = 'card';
  }

  /**
   * Renders the composer and returns the element.
   * @returns {HTMLElement}
   */
  render() {
    this.el.innerHTML = `
      <div class="card-header" style="margin-bottom:0;">
        <span class="card-title">Add Note</span>
        <label style="display:flex; align-items:center; gap:6px; cursor:pointer; user-select:none;">
          <span style="font-size:11px; color:var(--color-text-secondary);">Internal only</span>
          <div class="toggle-switch" id="internal-toggle" aria-label="Internal note toggle" role="switch" aria-checked="true">
            <div class="toggle-knob"></div>
          </div>
        </label>
      </div>

      <!-- Toolbar -->
      <div class="composer-toolbar" id="composer-toolbar">
        <button class="toolbar-btn" data-cmd="bold"          title="Bold (Ctrl+B)"      aria-label="Bold">         <i class="fa-solid fa-bold"          aria-hidden="true"></i></button>
        <button class="toolbar-btn" data-cmd="italic"        title="Italic (Ctrl+I)"    aria-label="Italic">       <i class="fa-solid fa-italic"        aria-hidden="true"></i></button>
        <button class="toolbar-btn" data-cmd="underline"     title="Underline (Ctrl+U)" aria-label="Underline">    <i class="fa-solid fa-underline"     aria-hidden="true"></i></button>
        <div style="width:1px; height:18px; background:rgba(107,114,128,0.2); margin:0 4px;"></div>
        <button class="toolbar-btn" data-cmd="insertUnorderedList" title="Bullet list"  aria-label="Bullet list">  <i class="fa-solid fa-list-ul"       aria-hidden="true"></i></button>
        <button class="toolbar-btn" id="ai-rewrite-btn"      title="AI Rewrite"         aria-label="AI Rewrite" style="margin-left:auto; gap:4px;">
          <i class="fa-solid fa-wand-magic-sparkles" aria-hidden="true" style="color:var(--color-ai-insight);"></i>
          <span style="font-size:11px; font-weight:600; color:var(--color-ai-insight);">AI Rewrite</span>
        </button>
      </div>

      <!-- Editable area -->
      <div
        id="note-body"
        class="composer-body"
        contenteditable="true"
        data-placeholder="Type your note here… use @ to mention an agent"
        role="textbox"
        aria-multiline="true"
        aria-label="Note content"
        style="min-height:90px;"
      ></div>

      <!-- @mention dropdown -->
      <div id="mention-dropdown" style="
        display:none;
        position:absolute;
        background:var(--color-surface);
        border:1px solid rgba(107,114,128,0.15);
        border-radius:8px;
        box-shadow:0 4px 16px rgba(0,0,0,0.1);
        z-index:200;
        min-width:160px;
        overflow:hidden;
      "></div>

      <!-- Footer -->
      <div class="composer-footer">
        <div style="display:flex; align-items:center; gap:6px;">
          <span id="internal-label" style="font-size:11px; font-weight:600;
            color:var(--color-text-secondary);
            background:rgba(107,114,128,0.08);
            padding:3px 8px; border-radius:5px;">
            <i class="fa-solid fa-lock" aria-hidden="true" style="font-size:10px;"></i>
            Internal
          </span>
        </div>
        <div style="display:flex; gap:8px;">
          <button class="btn-ghost" id="clear-note-btn" style="padding:6px 12px; min-height:36px; font-size:12px;">
            Clear
          </button>
          <button class="btn-primary" id="save-note-btn" style="padding:6px 16px; min-height:36px; font-size:12px;">
            <i class="fa-solid fa-paper-plane" aria-hidden="true"></i>
            Save Note
          </button>
        </div>
      </div>
    `;

    this.el.style.position = 'relative'; // for mention dropdown positioning

    this._injectToggleStyles();
    this._bindEvents();
    AppLogger.debug('[UI]', 'NoteComposer rendered');
    return this.el;
  }

  /* ---- Private ---- */

  _injectToggleStyles() {
    if (document.getElementById('toggle-switch-style')) return;
    const style = document.createElement('style');
    style.id = 'toggle-switch-style';
    style.textContent = `
      .toggle-switch {
        width:36px; height:20px; border-radius:10px;
        background:var(--color-primary); position:relative;
        cursor:pointer; transition:background 0.2s;
        flex-shrink:0;
      }
      .toggle-switch[aria-checked="false"] { background:rgba(107,114,128,0.25); }
      .toggle-knob {
        position:absolute; top:2px; left:2px;
        width:16px; height:16px; border-radius:50%;
        background:#fff; box-shadow:0 1px 3px rgba(0,0,0,0.2);
        transition:transform 0.2s;
      }
      .toggle-switch[aria-checked="true"]  .toggle-knob { transform:translateX(16px); }
      .toggle-switch[aria-checked="false"] .toggle-knob { transform:translateX(0); }
    `;
    document.head.appendChild(style);
  }

  _bindEvents() {
    const body        = this.el.querySelector('#note-body');
    const toolbar     = this.el.querySelector('#composer-toolbar');
    const saveBtn     = this.el.querySelector('#save-note-btn');
    const clearBtn    = this.el.querySelector('#clear-note-btn');
    const aiBtn       = this.el.querySelector('#ai-rewrite-btn');
    const toggle      = this.el.querySelector('#internal-toggle');
    const mention     = this.el.querySelector('#mention-dropdown');

    // Toolbar formatting
    toolbar?.querySelectorAll('[data-cmd]').forEach(btn => {
      btn.addEventListener('mousedown', e => {
        e.preventDefault(); // prevent losing focus from body
        document.execCommand(btn.dataset.cmd, false, null);
      });
    });

    // Internal toggle
    toggle?.addEventListener('click', () => {
      this.isInternal = !this.isInternal;
      toggle.setAttribute('aria-checked', this.isInternal ? 'true' : 'false');
      const label = this.el.querySelector('#internal-label');
      if (label) {
        label.innerHTML = this.isInternal
          ? '<i class="fa-solid fa-lock" aria-hidden="true" style="font-size:10px;"></i> Internal'
          : '<i class="fa-solid fa-globe" aria-hidden="true" style="font-size:10px;"></i> Public';
      }
    });

    // @mention trigger
    body?.addEventListener('input', () => {
      const sel = window.getSelection();
      if (!sel || !sel.rangeCount) return;
      const text = sel.getRangeAt(0).startContainer.textContent || '';
      const atIdx = text.lastIndexOf('@');

      if (atIdx !== -1) {
        const query = text.slice(atIdx + 1);
        this._showMentionDropdown(mention, query, body, sel);
      } else {
        mention && (mention.style.display = 'none');
      }
    });

    // AI Rewrite (stub)
    aiBtn?.addEventListener('click', async () => {
      const content = body?.innerText?.trim();
      if (!content) { Toast.show('Write a note first before rewriting.', 'warning'); return; }
      aiBtn.disabled = true;
      aiBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin" aria-hidden="true"></i> Rewriting…';
      AppLogger.info('[UI]', 'AI Rewrite requested', { original: content });
      await _sleep(1500);
      const rewritten = `${content}\n\n[AI-enhanced] Ensure follow-up within 24 hours. Guest is a ${this.isInternal ? 'high-value' : ''} loyalty member — prioritise resolution.`;
      if (body) body.innerText = rewritten;
      aiBtn.disabled = false;
      aiBtn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles" aria-hidden="true" style="color:var(--color-ai-insight);"></i> <span style="font-size:11px;font-weight:600;color:var(--color-ai-insight);">AI Rewrite</span>';
      Toast.show('Note enhanced by AI', 'success', 2000);
    });

    // Save
    saveBtn?.addEventListener('click', () => this._saveNote(body));

    // Clear
    clearBtn?.addEventListener('click', () => {
      if (body) body.innerHTML = '';
    });

    // Keyboard shortcut — Ctrl+Enter to save
    body?.addEventListener('keydown', e => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') this._saveNote(body);
    });
  }

  /**
   * Renders the @mention autocomplete dropdown.
   */
  _showMentionDropdown(dropdown, query, body, sel) {
    if (!dropdown) return;
    const matches = MOCK_AGENTS.filter(a => a.toLowerCase().includes(query.toLowerCase())).slice(0, 5);
    if (!matches.length) { dropdown.style.display = 'none'; return; }

    // Position near cursor
    const range = sel.getRangeAt(0).cloneRange();
    range.collapse(true);
    const rect = range.getBoundingClientRect();
    const containerRect = this.el.getBoundingClientRect();
    dropdown.style.top  = `${rect.bottom - containerRect.top + 4}px`;
    dropdown.style.left = `${rect.left - containerRect.left}px`;
    dropdown.style.display = 'block';

    dropdown.innerHTML = matches.map(agent => `
      <div class="mention-item" data-agent="${agent}" style="
        padding:8px 12px; cursor:pointer; font-size:13px;
        display:flex; align-items:center; gap:8px;
        border-bottom:1px solid rgba(107,114,128,0.07);
      ">
        <div class="avatar-sm" style="width:24px;height:24px;font-size:10px;">${agent.split(' ').map(w => w[0]).join('')}</div>
        ${agent}
      </div>
    `).join('');

    dropdown.querySelectorAll('.mention-item').forEach(item => {
      item.addEventListener('mouseenter', () => item.style.background = 'rgba(97,43,189,0.06)');
      item.addEventListener('mouseleave', () => item.style.background = '');
      item.addEventListener('mousedown', e => {
        e.preventDefault();
        // Replace the @query with the mention tag
        const text = sel.getRangeAt(0).startContainer;
        const full = text.textContent || '';
        const atIdx = full.lastIndexOf('@');
        text.textContent = full.slice(0, atIdx) + `@${item.dataset.agent} `;
        dropdown.style.display = 'none';
        // Move cursor to end
        const newRange = document.createRange();
        newRange.selectNodeContents(text);
        newRange.collapse(false);
        sel.removeAllRanges();
        sel.addRange(newRange);
      });
    });

    // Close on click outside
    const close = e => {
      if (!dropdown.contains(e.target)) {
        dropdown.style.display = 'none';
        document.removeEventListener('mousedown', close);
      }
    };
    document.addEventListener('mousedown', close);
  }

  /**
   * Saves the note — tracks the event in Braze and calls onNoteAdded callback.
   * @param {HTMLElement} body
   */
  async _saveNote(body) {
    if (this.isSaving) return;

    const content = body?.innerText?.trim();
    if (!content) {
      Toast.show('Please write something before saving.', 'warning');
      return;
    }

    this.isSaving = true;
    const saveBtn = this.el.querySelector('#save-note-btn');
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin" aria-hidden="true"></i> Saving…';
    }

    try {
      const saved = await UserRepository.addNote(this.externalId, {
        bodyText:   content,
        isInternal: this.isInternal,
      });
      if (!saved) {
        Toast.show('Failed to save note. Please try again.', 'error');
        AppLogger.error('[UI]', 'Note save failed — addNote returned null');
        return;
      }

      await UserRepository.trackEvent(this.externalId, 'cs_note_saved', {
        internal: this.isInternal,
        length:   content.length,
        note_id:  saved.note_id,
      });

      const note = customerNoteToTimelineEvent(saved);

      if (body) body.innerHTML = '';
      Toast.show('Note saved successfully', 'success');
      AppLogger.info('[UI]', 'Note saved', { internal: this.isInternal, length: content.length, note_id: saved.note_id });
      this.onNoteAdded(note);

    } catch (err) {
      Toast.show('Failed to save note. Please try again.', 'error');
      AppLogger.error('[UI]', 'Note save failed', err);
    } finally {
      this.isSaving = false;
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.innerHTML = '<i class="fa-solid fa-paper-plane" aria-hidden="true"></i> Save Note';
      }
    }
  }
}

/** @param {number} ms */
const _sleep = ms => new Promise(r => setTimeout(r, ms));
