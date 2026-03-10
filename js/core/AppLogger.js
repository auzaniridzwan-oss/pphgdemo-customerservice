/**
 * AppLogger
 *
 * Centralised singleton for all application logging.
 * Format: [TIMESTAMP] [CATEGORY] [LEVEL]: Message | Data
 *
 * Levels  : INFO, DEBUG, WARN, ERROR
 * Categories: [UI], [SDK], [AUTH], [STORAGE], [SYSTEM], [API]
 *
 * In production (non-localhost) only WARN and ERROR are printed to the
 * console. All entries are buffered in memory for the getLogs() export
 * and surfaced in the developer debug overlay.
 */
export const AppLogger = {
  /** @type {Array<{timestamp:string, level:string, category:string, message:string, data:*}>} */
  logs: [],

  MAX_LOGS: 100,

  /**
   * True when running on localhost or when the user has enabled verbose
   * logging via StorageManager.
   * @returns {boolean}
   */
  get DEBUG_MODE() {
    if (typeof window === 'undefined') return false;
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') return true;
    try {
      return !!(window.StorageManager && window.StorageManager.get('debug_mode', false));
    } catch {
      return false;
    }
  },

  /**
   * Core log method. Buffers the entry and conditionally prints to console.
   *
   * @param {'INFO'|'DEBUG'|'WARN'|'ERROR'} level
   * @param {string} category - e.g. '[UI]', '[API]'
   * @param {string} message
   * @param {*}      [data=null]
   */
  log(level, category, message, data = null) {
    const timestamp = new Date().toISOString();
    const logEntry  = { timestamp, level, category, message, data };

    this.logs.push(logEntry);
    if (this.logs.length > this.MAX_LOGS) this.logs.shift();

    // Dispatch a custom event so the debug overlay can react reactively
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('app:log', { detail: logEntry }));
    }

    const shouldPrint = this.DEBUG_MODE || level === 'ERROR' || level === 'WARN';
    if (!shouldPrint) return;

    const color = this._getColor(level);
    const label = `%c[${timestamp}] ${category} [${level}]: ${message}`;

    if (data !== null) {
      console.log(label, `color: ${color}; font-weight: bold;`, data);
    } else {
      console.log(label, `color: ${color}; font-weight: bold;`);
    }
  },

  /**
   * @param {'INFO'|'DEBUG'|'WARN'|'ERROR'} level
   * @returns {string} CSS colour string
   */
  _getColor(level) {
    switch (level) {
      case 'ERROR': return '#EF4444';
      case 'WARN':  return '#F59E0B';
      case 'DEBUG': return '#7f8c8d';
      default:      return '#10B981';
    }
  },

  /** @param {string} category @param {string} msg @param {*} [data] */
  info(category, msg, data)  { this.log('INFO',  category, msg, data); },

  /** @param {string} category @param {string} msg @param {*} [data] */
  debug(category, msg, data) { this.log('DEBUG', category, msg, data); },

  /** @param {string} category @param {string} msg @param {*} [data] */
  warn(category, msg, data)  { this.log('WARN',  category, msg, data); },

  /** @param {string} category @param {string} msg @param {*} [data] */
  error(category, msg, data) { this.log('ERROR', category, msg, data); },

  /**
   * Returns the last N log entries as a JSON-serialisable array.
   * Useful for exporting to support or a remote log viewer.
   *
   * @param {number} [n=50]
   * @returns {Array}
   */
  getLogs(n = 50) {
    return this.logs.slice(-n);
  },

  /** Clears the in-memory log buffer. */
  clear() {
    this.logs = [];
  },
};
