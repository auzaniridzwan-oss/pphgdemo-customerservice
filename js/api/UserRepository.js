/**
 * UserRepository
 *
 * Repository pattern abstraction over Braze REST API calls.
 * Provides a clean interface that decouples page/component code from
 * both the HTTP transport layer and the mock data fallback.
 *
 * Methods:
 *  - getProfile(externalId)              → UserProfile
 *  - findByEmail(email)                  → UserProfile | null
 *  - updateAttributes(externalId, attrs) → boolean
 *  - trackEvent(externalId, name, props) → boolean
 *
 * The repository automatically detects live vs. demo mode via AppConfig
 * and routes calls accordingly.
 *
 * @see https://www.braze.com/docs/api/endpoints/export/user_data/post_users_identifier/
 * @see https://www.braze.com/docs/api/endpoints/user_data/post_user_track/
 */

import { BrazeClient, ApiError } from './BrazeClient.js';
import { UserProfile }           from './models/UserProfile.js';
import { AppLogger }             from '../core/AppLogger.js';
import { StorageManager }        from '../core/StorageManager.js';

/* ============================================================
   Internal helpers
   ============================================================ */

/**
 * Lazily imports AppConfig to avoid a circular dependency on StorageManager
 * being referenced before it is exposed on window.
 */
async function getConfig() {
  const mod = await import('../../config/app.config.js');
  return mod.default;
}

/**
 * Lazy-loads the mock data module (avoids loading a large JSON when live).
 * @returns {Promise<import('../data/mockData.js')>}
 */
async function getMock() {
  return import('../data/mockData.js');
}

/* ============================================================
   UserRepository
   ============================================================ */

export const UserRepository = {

  /* ----------------------------------------------------------
     READ — Fetch full user profile
     ---------------------------------------------------------- */

  /**
   * Fetches the full Braze user profile for the given external_id.
   * In demo mode, returns the seeded mock profile.
   *
   * @param {string} externalId - The user's external_id in Braze
   * @returns {Promise<UserProfile>}
   * @throws {ApiError} on HTTP or network failure in live mode
   */
  async getProfile(externalId) {
    const config = await getConfig();

    if (!config.isLiveMode()) {
      AppLogger.info('[API]', `Demo mode — returning mock profile for ${externalId}`);
      const { getMockProfile } = await getMock();
      return getMockProfile(externalId);
    }

    try {
      AppLogger.info('[API]', `Fetching profile for ${externalId}`);

      const client = BrazeClient.getInstance(config.BRAZE_API_KEY, config.BRAZE_REST_ENDPOINT);

      const response = await client.post('users/export/ids', {
        json: {
          external_ids: [externalId],
          fields_to_export: [
            'external_id', 'braze_id', 'first_name', 'last_name', 'email', 'phone',
            'home_city', 'country', 'language', 'gender', 'dob',
            'custom_attributes', 'devices', 'push_tokens',
            'total_session_count', 'apps', 'created_at', 'updated_at',
            'last_used_app', 'email_subscribe',
          ],
        },
      }).json();

      const raw = response.users?.[0];
      if (!raw) {
        AppLogger.warn('[API]', `No user found for external_id: ${externalId}`);
        const { getMockProfile } = await getMock();
        return getMockProfile(externalId);
      }

      AppLogger.info('[API]', `Profile loaded for ${externalId}`);
      StorageManager.set('current_user_id', externalId);
      return new UserProfile(raw);

    } catch (err) {
      AppLogger.error('[API]', `getProfile failed for ${externalId}`, err);
      throw _toApiError(err, `Network error fetching profile: ${err.message}`);
    }
  },

  /* ----------------------------------------------------------
     READ — Find user by email address
     ---------------------------------------------------------- */

  /**
   * Looks up a Braze user profile by email address.
   * In demo mode, searches the seeded mock profiles for an email match.
   * In live mode, calls POST /users/export/ids with the email_address field.
   *
   * @param {string} email - The email address to search for
   * @returns {Promise<UserProfile|null>} The matching profile, or null if not found
   * @throws {ApiError} on HTTP or network failure in live mode
   */
  async findByEmail(email) {
    const config = await getConfig();

    if (!config.isLiveMode()) {
      AppLogger.info('[API]', `Demo mode — searching mock profiles for email: ${email}`);
      const { getDemoUserIds, getMockProfile } = await getMock();
      for (const id of getDemoUserIds()) {
        const profile = getMockProfile(id);
        if (profile.email.toLowerCase() === email.toLowerCase()) {
          AppLogger.info('[API]', `Demo mode — found mock profile for email: ${email}`);
          return profile;
        }
      }
      AppLogger.warn('[API]', `Demo mode — no mock profile found for email: ${email}`);
      return null;
    }

    try {
      AppLogger.info('[API]', `Searching Braze for email: ${email}`);

      const client = BrazeClient.getInstance(config.BRAZE_API_KEY, config.BRAZE_REST_ENDPOINT);

      const response = await client.post('users/export/ids', {
        json: {
          email_address: email,
          fields_to_export: [
            'external_id', 'braze_id', 'first_name', 'last_name', 'email', 'phone',
            'home_city', 'country', 'language', 'gender', 'dob',
            'custom_attributes', 'devices', 'push_tokens',
            'total_session_count', 'apps', 'created_at', 'updated_at',
            'last_used_app', 'email_subscribe',
          ],
        },
      }).json();

      const raw = response.users?.[0];
      if (!raw) {
        AppLogger.warn('[API]', `No user found for email: ${email}`);
        return null;
      }

      AppLogger.info('[API]', `Profile found for email: ${email}`);
      return new UserProfile(raw);

    } catch (err) {
      AppLogger.error('[API]', `findByEmail failed for ${email}`, err);
      throw _toApiError(err, `Network error searching by email: ${err.message}`);
    }
  },

  /* ----------------------------------------------------------
     WRITE — Update user attributes
     ---------------------------------------------------------- */

  /**
   * Updates one or more user attributes on the Braze platform via /users/track.
   * In demo mode, logs the payload and returns true without making an HTTP call.
   *
   * @param {string} externalId - The user's external_id
   * @param {object} changes    - Domain-model key/value pairs (see UserProfile.toTrackPayload)
   * @returns {Promise<boolean>} True on success
   * @throws {ApiError} on HTTP failure in live mode
   */
  async updateAttributes(externalId, changes) {
    const config = await getConfig();
    const payload = UserProfile.toTrackPayload(externalId, changes);

    if (!config.isLiveMode()) {
      AppLogger.info('[API]', `Demo mode — simulated attribute update for ${externalId}`, payload);
      await _simulateLatency();
      return true;
    }

    try {
      AppLogger.info('[API]', `Updating attributes for ${externalId}`, payload);

      const client = BrazeClient.getInstance(config.BRAZE_API_KEY, config.BRAZE_REST_ENDPOINT);

      await client.post('users/track', {
        json: { attributes: [payload] },
      }).json();

      AppLogger.info('[API]', `Attributes updated for ${externalId}`);

      // Also track the CS agent action as a custom event
      await this.trackEvent(externalId, 'cs_attribute_updated', {
        changed_fields: Object.keys(changes),
      });

      return true;

    } catch (err) {
      AppLogger.error('[API]', `updateAttributes failed for ${externalId}`, err);
      throw _toApiError(err, `Network error updating attributes: ${err.message}`);
    }
  },

  /* ----------------------------------------------------------
     WRITE — Log a custom event
     ---------------------------------------------------------- */

  /**
   * Logs a Braze Custom Event for the given user.
   * In demo mode, logs to AppLogger only.
   *
   * @param {string} externalId  - The user's external_id
   * @param {string} eventName   - Custom event name (snake_case)
   * @param {object} [properties={}] - Event properties
   * @returns {Promise<boolean>} True on success
   */
  async trackEvent(externalId, eventName, properties = {}) {
    const config = await getConfig();
    const now    = new Date().toISOString();

    const eventPayload = {
      external_id: externalId,
      name:        eventName,
      time:        now,
      properties,
    };

    if (!config.isLiveMode()) {
      AppLogger.info('[API]', `Demo mode — simulated event: ${eventName}`, eventPayload);
      await _simulateLatency(200);
      return true;
    }

    try {
      const client = BrazeClient.getInstance(config.BRAZE_API_KEY, config.BRAZE_REST_ENDPOINT);

      await client.post('users/track', {
        json: { events: [eventPayload] },
      }).json();

      AppLogger.info('[API]', `Event tracked: ${eventName} for ${externalId}`);
      return true;

    } catch (err) {
      AppLogger.error('[API]', `trackEvent failed: ${eventName}`, err);
      // Non-critical — don't rethrow event tracking failures to prevent UI disruption
      return false;
    }
  },
};

/**
 * Simulates realistic network latency in demo mode so UI loading states are visible.
 * @param {number} [ms=600]
 */
function _simulateLatency(ms = 600) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Normalises a raw Ky/network error into a standardised ApiError.
 * Uses enriched properties attached by BrazeClient's beforeError hook.
 *
 * @param {Error} err
 * @param {string} fallbackMessage
 * @returns {ApiError}
 */
function _toApiError(err, fallbackMessage) {
  if (err instanceof ApiError) return err;
  return new ApiError({
    status:       err.response?.status || 0,
    brazeErrors:  err._brazeErrors    || [],
    traceId:      err._traceId        || '',
    humanMessage: err._humanMessage   || fallbackMessage,
  });
}
