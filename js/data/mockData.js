/**
 * mockData.js
 *
 * Realistic seeded data for Pan Pacific Hotel Group demo mode.
 * Used by UserRepository when no Braze API key is present.
 *
 * Includes:
 *  - Full user profile (maps to Braze /users/export/ids response shape)
 *  - Unified timeline events across WhatsApp, Email, SMS, Push, Notes, Events
 */

import { UserProfile }    from '../api/models/UserProfile.js';
import { TimelineEvent }  from '../api/models/TimelineEvent.js';
import { normalizeNotes } from '../api/models/CustomerNote.js';

/* ============================================================
   User Profiles Store
   ============================================================ */

/** @type {Record<string, object>} */
const RAW_PROFILES = {
  'DEMO-001': {
    external_id:   'DEMO-001',
    braze_id:      'brz_abc123def456',
    first_name:    'Amara',
    last_name:     'Tan',
    email:         'amara.tan@email.com',
    phone:         '+65 9123 4567',
    home_city:     'Singapore',
    country:       'SG',
    language:      'en',
    gender:        'F',
    dob:           '1988-04-12',
    email_subscribe: 'opted_in',
    created_at:    '2021-03-15T08:22:00Z',
    updated_at:    '2026-03-09T14:45:00Z',
    last_used_app: '2026-03-09T14:45:00Z',
    total_session_count: 147,
    custom_attributes: {
      loyalty_tier:       'Gold',
      account_status:     'Active',
      total_stays:        23,
      last_stay_property: 'Pan Pacific Singapore',
      preferred_language: 'English',
      membership_since:   '2021-03-15',
      total_nights:       61,
      room_preference:    'High Floor, Sea View',
      dietary_preference: 'Halal',
      vip_flag:           true,
      notes: [
        {
          note_id:     'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
          created_at:  '2026-03-08T10:30:00.000Z',
          body_text:   'VIP guest — requested high floor for next stay.',
          is_internal: true,
          author:      'Sarah Lim',
        },
      ],
    },
    devices: [
      { model: 'iPhone 15 Pro', os: 'iOS 17.3', platform: 'ios',     carrier: 'Singtel' },
      { model: 'MacBook Pro',   os: 'macOS 14', platform: 'web',     carrier: '' },
    ],
    push_tokens: [
      { app_id: 'app_pan_pacific_ios', token: 'mock_push_token_abc123' },
    ],
    apps: [
      { name: 'Pan Pacific Hotels', total_sessions: 112, last_session: '2026-03-09T14:45:00Z' },
    ],
  },

  'DEMO-002': {
    external_id:   'DEMO-002',
    braze_id:      'brz_xyz789uvw012',
    first_name:    'Hiroshi',
    last_name:     'Yamamoto',
    email:         'h.yamamoto@outlook.jp',
    phone:         '+81 80-1234-5678',
    home_city:     'Tokyo',
    country:       'JP',
    language:      'ja',
    gender:        'M',
    dob:           '1975-09-28',
    email_subscribe: 'subscribed',
    created_at:    '2019-11-02T10:00:00Z',
    updated_at:    '2026-02-20T09:15:00Z',
    last_used_app: '2026-02-20T09:15:00Z',
    total_session_count: 389,
    custom_attributes: {
      loyalty_tier:       'Platinum',
      account_status:     'Active',
      total_stays:        67,
      last_stay_property: 'Pan Pacific Osaka',
      preferred_language: 'Japanese',
      total_nights:       203,
      room_preference:    'Suite, Non-Smoking',
      dietary_preference: 'No Restrictions',
      vip_flag:           true,
      notes: [
        {
          note_id:     'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e',
          created_at:  '2026-02-18T14:00:00.000Z',
          body_text:   'Prefers quiet room away from elevator.',
          is_internal: true,
          author:      'David Chen',
        },
      ],
    },
    devices: [
      { model: 'Samsung Galaxy S24', os: 'Android 14', platform: 'android', carrier: 'SoftBank' },
    ],
    push_tokens: [
      { app_id: 'app_pan_pacific_android', token: 'mock_push_token_xyz789' },
    ],
    apps: [
      { name: 'Pan Pacific Hotels', total_sessions: 389, last_session: '2026-02-20T09:15:00Z' },
    ],
  },
};

/* ============================================================
   Timeline Events Store
   ============================================================ */

const NOW = Date.now();

/** @param {number} hoursAgo */
const ts = (hoursAgo) => new Date(NOW - hoursAgo * 3_600_000).toISOString();

/** @type {Record<string, object[]>} */
const RAW_TIMELINE = {
  'DEMO-001': [
    {
      id: 'evt-001', type: 'message', channel: 'push',
      timestamp: ts(0.5),
      sender: 'Pan Pacific Hotels App',
      content: 'Your upcoming stay at Pan Pacific Singapore is confirmed for 15 Mar 2026. Check-in starts at 3:00 PM. We look forward to welcoming you!',
      metadata: { campaign: 'Pre-Arrival Confirmation', status: 'Delivered', open_rate: null },
    },
    {
      id: 'evt-002', type: 'agent_note', channel: 'note',
      timestamp: ts(1.2),
      sender: 'Agent Sarah Lim',
      content: 'Guest called regarding room upgrade request. Noted preference for sea-view suite. Escalated to Rooms Division — ref #RD-29471.',
      metadata: { internal: true, agentId: 'agent-sarah-lim' },
      agentId: 'agent-sarah-lim',
    },
    {
      id: 'evt-003', type: 'message', channel: 'whatsapp',
      timestamp: ts(3),
      sender: 'Pan Pacific Singapore',
      content: 'Hi Amara 👋 Your exclusive Gold Member offer: enjoy complimentary breakfast for 2 during your stay (15–18 Mar). Reply YES to confirm.',
      metadata: { campaign: 'Gold Member Pre-Arrival Perk', status: 'Read' },
    },
    {
      id: 'evt-004', type: 'system_event', channel: 'event',
      timestamp: ts(5),
      sender: 'Braze Platform',
      content: 'Custom event fired: room_upgrade_requested — property: Pan Pacific Singapore, room_type: Deluxe Sea View',
      metadata: { event_name: 'room_upgrade_requested', property: 'Pan Pacific Singapore' },
    },
    {
      id: 'evt-005', type: 'message', channel: 'email',
      timestamp: ts(24),
      sender: 'Pan Pacific Hotels',
      content: 'Thank you for choosing Pan Pacific Hotels, Amara. Your booking summary is attached. Manage your reservation at panpacific.com.',
      metadata: { campaign: 'Booking Confirmation', status: 'Opened', subject: 'Your Booking is Confirmed — Pan Pacific Singapore' },
    },
    {
      id: 'evt-006', type: 'message', channel: 'sms',
      timestamp: ts(48),
      sender: 'PP-HOTELS',
      content: '[Pan Pacific] Your reservation SIN-2603-AMT is confirmed. Check-in: 15 Mar 2026. Need help? Reply HELP.',
      metadata: { campaign: 'SMS Booking Confirmation', status: 'Delivered' },
    },
    {
      id: 'evt-007', type: 'message', channel: 'email',
      timestamp: ts(72),
      sender: 'Pan Pacific Hotels',
      content: 'Amara, as a valued Gold Member, we have a special offer for your upcoming visit: complimentary spa access (worth SGD 120). Book your slot now.',
      metadata: { campaign: 'Gold Pre-Stay Spa Offer', status: 'Clicked', subject: 'Exclusive: Complimentary Spa Access — Just for You' },
    },
    {
      id: 'evt-008', type: 'system_event', channel: 'event',
      timestamp: ts(120),
      sender: 'Braze Platform',
      content: 'Custom event fired: loyalty_tier_upgraded — new_tier: Gold, previous_tier: Silver, nights_qualifying: 45',
      metadata: { event_name: 'loyalty_tier_upgraded', new_tier: 'Gold', previous_tier: 'Silver' },
    },
    {
      id: 'evt-009', type: 'message', channel: 'push',
      timestamp: ts(168),
      sender: 'Pan Pacific Hotels App',
      content: 'Congratulations! 🌟 You\'ve reached Gold status. Enjoy priority check-in, complimentary room upgrades (subject to availability), and exclusive dining privileges.',
      metadata: { campaign: 'Gold Tier Welcome', status: 'Opened' },
    },
    {
      id: 'evt-010', type: 'message', channel: 'whatsapp',
      timestamp: ts(360),
      sender: 'Pan Pacific Hotels',
      content: 'Dear Amara, we hope you enjoyed your recent stay at Pan Pacific KL. Your feedback helps us serve you better — tap the link to share your experience.',
      metadata: { campaign: 'Post-Stay Survey', status: 'Read' },
    },
  ],

  'DEMO-002': [
    {
      id: 'evt-101', type: 'message', channel: 'email',
      timestamp: ts(2),
      sender: 'Pan Pacific Hotels',
      content: 'Dear Hiroshi-san, your Platinum member rate for Pan Pacific Osaka has been secured. Complimentary airport transfer included.',
      metadata: { campaign: 'Platinum Booking Confirmation', status: 'Opened' },
    },
  ],
};

/* ============================================================
   Demo-mode notes overlay (persists across simulated /users/track)
   ============================================================ */

/** @type {Record<string, import('../api/models/CustomerNote.js').CustomerNote[]>} */
const _demoNotesOverlay = {};

/**
 * Returns raw `notes` array for a demo user: seeded profile data unless an overlay was applied.
 *
 * @param {string} externalId
 * @returns {object[]}
 */
function _effectiveMockNotesRaw(externalId) {
  if (Object.prototype.hasOwnProperty.call(_demoNotesOverlay, externalId)) {
    return _demoNotesOverlay[externalId];
  }
  const prof = RAW_PROFILES[externalId] || RAW_PROFILES['DEMO-001'];
  return prof.custom_attributes?.notes || [];
}

/**
 * Applies a Braze-style `notes` mutation in demo mode (full array or `{ $add: [...] }`).
 *
 * @param {string} externalId
 * @param {unknown[]|{ $add?: object[] }} value
 */
export function applyDemoNotesMutation(externalId, value) {
  if (Array.isArray(value)) {
    _demoNotesOverlay[externalId] = normalizeNotes(value);
    return;
  }
  if (value && typeof value === 'object' && Array.isArray(value.$add)) {
    const merged = [..._effectiveMockNotesRaw(externalId), ...value.$add];
    _demoNotesOverlay[externalId] = normalizeNotes(merged);
  }
}

/* ============================================================
   Public API
   ============================================================ */

/**
 * Returns a UserProfile domain model for the given external_id.
 * Falls back to DEMO-001 if the id is not found in the mock store.
 *
 * @param {string} externalId
 * @returns {UserProfile}
 */
export function getMockProfile(externalId) {
  const template = RAW_PROFILES[externalId] || RAW_PROFILES['DEMO-001'];
  const raw = {
    ...template,
    custom_attributes: { ...template.custom_attributes },
  };
  if (Object.prototype.hasOwnProperty.call(_demoNotesOverlay, externalId)) {
    raw.custom_attributes.notes = _demoNotesOverlay[externalId];
  }
  return new UserProfile(raw);
}

/**
 * Returns an array of TimelineEvent domain model objects for the user,
 * sorted newest-first.
 *
 * @param {string} externalId
 * @returns {TimelineEvent[]}
 */
export function getMockTimeline(externalId) {
  const raws = RAW_TIMELINE[externalId] || RAW_TIMELINE['DEMO-001'];
  return raws
    .map(r => new TimelineEvent(r))
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

/**
 * Returns all available demo user IDs for the search/switch UI.
 * @returns {string[]}
 */
export function getDemoUserIds() {
  return Object.keys(RAW_PROFILES);
}
