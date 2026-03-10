/**
 * UserProfile — Domain Model
 *
 * Decouples the UI from the raw Braze /users/export/ids API response shape.
 * Maps the flat Braze response into a structured, typed object that components
 * can consume safely without knowing the API contract.
 *
 * @see https://www.braze.com/docs/api/endpoints/export/user_data/post_users_identifier/
 */

export class UserProfile {
  /**
   * @param {object} raw - Raw user object from Braze /users/export/ids response
   */
  constructor(raw = {}) {
    /* ---- Identity ---- */
    this.externalId   = raw.external_id     || '';
    this.brazeId      = raw.braze_id        || '';
    this.firstName    = raw.first_name      || '';
    this.lastName     = raw.last_name       || '';
    this.email        = raw.email           || '';
    this.phone        = raw.phone           || '';
    this.homeCity     = raw.home_city       || '';
    this.country      = raw.country         || '';
    this.language     = raw.language        || '';
    this.gender       = raw.gender          || '';
    this.dateOfBirth  = raw.dob             || '';

    /* ---- Engagement Metadata ---- */
    this.createdAt    = raw.created_at      || '';
    this.updatedAt    = raw.updated_at      || '';
    this.lastActivity = raw.last_used_app   || '';
    this.emailOptIn   = raw.email_subscribe === 'opted_in';
    this.pushOptIn    = !!(raw.push_tokens  && raw.push_tokens.length > 0);

    /* ---- Custom Attributes (flat map of key → value) ---- */
    this.customAttributes = raw.custom_attributes || {};

    /* ---- Convenience getters for common hotel attributes ---- */
    this.loyaltyTier       = this.customAttributes.loyalty_tier       || 'Standard';
    this.accountStatus     = this.customAttributes.account_status     || 'Active';
    this.totalStays        = this.customAttributes.total_stays        || 0;
    this.lastStayProperty  = this.customAttributes.last_stay_property || '';
    this.preferredLanguage = this.customAttributes.preferred_language || 'English';

    /* ---- Devices ---- */
    this.devices = Array.isArray(raw.devices) ? raw.devices.map(d => ({
      model:    d.model    || '',
      os:       d.os       || '',
      platform: d.platform || '',
      carrier:  d.carrier  || '',
    })) : [];

    /* ---- Sessions ---- */
    this.totalSessions = raw.total_session_count || 0;
    this.sessionsByApp = raw.apps                || [];

    /* ---- Push Tokens ---- */
    this.pushTokens = Array.isArray(raw.push_tokens) ? raw.push_tokens : [];
  }

  /**
   * Returns the user's display name, falling back gracefully.
   * @returns {string}
   */
  get displayName() {
    const full = `${this.firstName} ${this.lastName}`.trim();
    return full || this.email || this.externalId || 'Unknown Guest';
  }

  /**
   * Returns initials for the avatar (max 2 characters).
   * @returns {string}
   */
  get initials() {
    if (this.firstName && this.lastName) {
      return `${this.firstName[0]}${this.lastName[0]}`.toUpperCase();
    }
    if (this.firstName) return this.firstName.slice(0, 2).toUpperCase();
    if (this.email)     return this.email.slice(0, 2).toUpperCase();
    return '??';
  }

  /**
   * Serialises the profile back to the shape expected by Braze /users/track
   * for the attributes array. Only includes fields that have changed.
   *
   * @param {Partial<UserProfile>} changes - Key-value map of changed fields
   * @returns {object} Braze-compatible attributes object
   */
  static toTrackPayload(externalId, changes) {
    const payload = { external_id: externalId };

    /** Standard Braze attributes */
    const STANDARD_MAP = {
      firstName:  'first_name',
      lastName:   'last_name',
      email:      'email',
      phone:      'phone',
      homeCity:   'home_city',
      country:    'country',
      language:   'language',
      gender:     'gender',
      dateOfBirth: 'dob',
    };

    for (const [domainKey, brazeKey] of Object.entries(STANDARD_MAP)) {
      if (domainKey in changes) payload[brazeKey] = changes[domainKey];
    }

    /** Custom attributes — nested under _update_existing_only */
    const customChanges = {};
    const CUSTOM_MAP = {
      loyaltyTier:       'loyalty_tier',
      accountStatus:     'account_status',
      totalStays:        'total_stays',
      lastStayProperty:  'last_stay_property',
      preferredLanguage: 'preferred_language',
    };

    for (const [domainKey, attrKey] of Object.entries(CUSTOM_MAP)) {
      if (domainKey in changes) customChanges[attrKey] = changes[domainKey];
    }

    // Pass through any raw custom attribute keys
    if (changes.customAttributes) {
      Object.assign(customChanges, changes.customAttributes);
    }

    if (Object.keys(customChanges).length) {
      payload._update_existing_only = true;
      // Braze flattens custom attrs directly onto the attributes object
      Object.assign(payload, customChanges);
    }

    return payload;
  }
}
