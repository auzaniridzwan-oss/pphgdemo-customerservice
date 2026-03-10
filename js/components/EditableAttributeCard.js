/**
 * EditableAttributeCard
 *
 * A reusable card that renders a list of user attribute fields.
 * Each field switches from display mode to an inline input on click.
 * On confirm (blur or Enter), calls UserRepository.updateAttributes()
 * and reflects the saved value back in the UI.
 *
 * @param {object}   options
 * @param {string}   options.title          - Card heading text
 * @param {object[]} options.fields         - Field definitions (see below)
 * @param {object}   options.profile        - UserProfile domain model instance
 * @param {string}   options.externalId     - The user's external_id
 * @param {Function} options.onSave         - Callback(fieldKey, newValue) after successful save
 *
 * Field definition:
 *  { key: string, label: string, value: any, type: 'text'|'date'|'select'|'phone', options?: string[], editable: boolean }
 */

import { AppLogger }        from '../core/AppLogger.js';
import { UserRepository }   from '../api/UserRepository.js';
import { Toast }            from './Toast.js';

export class EditableAttributeCard {
  /**
   * @param {object} options
   */
  constructor({ title, fields, externalId, onSave }) {
    this.title      = title;
    this.fields     = fields;
    this.externalId = externalId;
    this.onSave     = onSave || (() => {});

    /** @type {HTMLElement} */
    this.el = document.createElement('div');
    this.el.className = 'card';
  }

  /**
   * Renders the card into its element and returns the element.
   * @returns {HTMLElement}
   */
  render() {
    this.el.innerHTML = `
      <div class="card-header">
        <span class="card-title">${this.title}</span>
      </div>
      <div class="fields-container">
        ${this.fields.map(f => this._fieldRowHTML(f)).join('')}
      </div>
    `;

    this._bindEvents();
    return this.el;
  }

  /**
   * Generates the HTML for a single field row.
   * @param {object} field
   * @returns {string}
   */
  _fieldRowHTML(field) {
    const displayValue = this._formatDisplay(field);
    return `
      <div class="field-row" data-key="${field.key}" data-editable="${field.editable}" tabindex="${field.editable ? '0' : '-1'}" role="${field.editable ? 'button' : 'presentation'}" aria-label="${field.editable ? `Edit ${field.label}` : field.label}">
        <span class="field-label">${field.label}</span>
        <div style="display:flex; align-items:center; gap:4px;">
          <span class="field-value" data-display="${field.key}">${displayValue}</span>
          ${field.editable ? `<i class="fa-solid fa-pencil field-edit-icon" aria-hidden="true"></i>` : ''}
        </div>
      </div>
    `;
  }

  /**
   * Wires click and keyboard events on editable field rows.
   */
  _bindEvents() {
    this.el.querySelectorAll('.field-row[data-editable="true"]').forEach(row => {
      const activate = () => this._activateEdit(row);
      row.addEventListener('click', activate);
      row.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') activate(); });
    });
  }

  /**
   * Switches a field row from display mode to edit mode.
   * @param {HTMLElement} row
   */
  _activateEdit(row) {
    const key   = row.dataset.key;
    const field = this.fields.find(f => f.key === key);
    if (!field) return;

    // Already in edit mode
    if (row.querySelector('.field-input, select')) return;

    const displayEl = row.querySelector(`[data-display="${key}"]`);
    const currentValue = field.currentValue ?? field.value;

    let inputEl;

    if (field.type === 'select' && field.options) {
      inputEl = document.createElement('select');
      inputEl.className = 'field-input';
      field.options.forEach(opt => {
        const o = document.createElement('option');
        o.value = opt;
        o.textContent = opt;
        if (opt === currentValue) o.selected = true;
        inputEl.appendChild(o);
      });
    } else {
      inputEl = document.createElement('input');
      inputEl.className = 'field-input';
      inputEl.type      = field.type === 'date' ? 'date' : (field.type === 'phone' ? 'tel' : 'text');
      inputEl.value     = currentValue ?? '';
    }

    // Hide display, show input
    displayEl.style.display = 'none';
    row.querySelector('.field-edit-icon')?.style && (row.querySelector('.field-edit-icon').style.display = 'none');
    row.appendChild(inputEl);
    inputEl.focus();

    const confirm = async () => {
      const newValue = inputEl.value.trim();
      inputEl.remove();
      displayEl.style.display = '';
      if (row.querySelector('.field-edit-icon')) row.querySelector('.field-edit-icon').style.display = '';

      if (newValue === String(currentValue ?? '')) return; // No change

      // Optimistic UI update
      field.currentValue    = newValue;
      displayEl.textContent = this._formatDisplay({ ...field, value: newValue });

      // Show saving indicator
      const saveIndicator = document.createElement('i');
      saveIndicator.className = 'fa-solid fa-circle-notch fa-spin';
      saveIndicator.style.cssText = 'color:var(--color-primary); font-size:11px; margin-left:4px;';
      row.querySelector('[style]')?.appendChild(saveIndicator);

      try {
        await UserRepository.updateAttributes(this.externalId, { [key]: newValue });
        saveIndicator.remove();
        Toast.show(`${field.label} updated successfully`, 'success', 2500);
        AppLogger.info('[UI]', `EditableAttributeCard: saved ${key} = "${newValue}" for ${this.externalId}`);
        this.onSave(key, newValue);
      } catch (err) {
        saveIndicator.remove();
        // Roll back on failure
        field.currentValue    = currentValue;
        displayEl.textContent = this._formatDisplay({ ...field, value: currentValue });
        Toast.show(`Failed to update ${field.label}. Please try again.`, 'error');
        AppLogger.error('[UI]', `EditableAttributeCard: save failed for ${key}`, err);
      }
    };

    inputEl.addEventListener('blur',    confirm);
    inputEl.addEventListener('keydown', e => {
      if (e.key === 'Enter')  { inputEl.blur(); }
      if (e.key === 'Escape') {
        inputEl.value = String(currentValue ?? '');
        inputEl.blur();
      }
    });
  }

  /**
   * Formats a field value for display (handles booleans, dates, etc.).
   * @param {object} field
   * @returns {string}
   */
  _formatDisplay(field) {
    const v = field.currentValue ?? field.value;
    if (v === null || v === undefined || v === '') return '—';
    if (typeof v === 'boolean') return v ? 'Yes' : 'No';
    return String(v);
  }

  /**
   * Updates field values after an external data refresh.
   * @param {object[]} updatedFields
   */
  updateFields(updatedFields) {
    this.fields = updatedFields;
    this.el.querySelector('.fields-container').innerHTML =
      updatedFields.map(f => this._fieldRowHTML(f)).join('');
    this._bindEvents();
  }
}
