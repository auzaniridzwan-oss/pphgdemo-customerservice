/**
 * StorageManager
 *
 * Centralised singleton for all localStorage I/O.
 * All keys are namespaced under the `ar_app_` prefix to prevent collisions
 * with third-party scripts (Braze, Flowbite, etc.).
 *
 * Never call localStorage directly from UI components — always use this module.
 */
export const StorageManager = {
  PREFIX: 'ar_app_',

  /**
   * Persists a value under the given key.
   * @param {string} key   - Key name (without prefix).
   * @param {*}      value - Any JSON-serialisable value.
   */
  set(key, value) {
    try {
      localStorage.setItem(`${this.PREFIX}${key}`, JSON.stringify(value));
    } catch (e) {
      console.error('[Storage] Error saving to disk', e);
    }
  },

  /**
   * Retrieves a stored value, returning defaultValue if the key is absent
   * or the stored string is corrupted JSON.
   *
   * @param {string} key          - Key name (without prefix).
   * @param {*}      [defaultValue=null]
   * @returns {*}
   */
  get(key, defaultValue = null) {
    try {
      const item = localStorage.getItem(`${this.PREFIX}${key}`);
      return item !== null ? JSON.parse(item) : defaultValue;
    } catch (e) {
      return defaultValue;
    }
  },

  /**
   * Removes a single key from storage.
   * @param {string} key
   */
  remove(key) {
    localStorage.removeItem(`${this.PREFIX}${key}`);
  },

  /**
   * Clears only app-owned keys (those starting with the prefix).
   * Leaves Braze SDK and other third-party keys untouched.
   */
  clearSession() {
    Object.keys(localStorage)
      .filter(k => k.startsWith(this.PREFIX))
      .forEach(k => localStorage.removeItem(k));
  },
};

// Make available globally for non-module scripts (e.g. config/app.config.js)
window.StorageManager = StorageManager;
