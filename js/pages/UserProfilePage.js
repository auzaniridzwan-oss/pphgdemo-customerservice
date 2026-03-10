/**
 * UserProfilePage
 *
 * Orchestrates the three-column Customer Service Command Center layout.
 * Called by Router whenever the hash matches #/users/:userId.
 *
 * Render sequence:
 *  1. Inject skeleton loading state into #page-content immediately.
 *  2. Fire UserRepository.getProfile() + getMockTimeline() + getMockInsights() in parallel.
 *  3. Replace skeletons with fully populated column components.
 *  4. Track cs_profile_viewed event.
 *
 * Components mounted:
 *  Left   → UserIdentityCard, DemographicsEditableCard, CustomAttributesEditableCard
 *  Center → NoteComposer, UnifiedTimeline
 *  Right  → AI_InsightPanel, SessionOverviewCard, DeviceInventoryCard, QuickActionButtons
 */

import { AppLogger }             from '../core/AppLogger.js';
import { StorageManager }        from '../core/StorageManager.js';
import { UserRepository }        from '../api/UserRepository.js';
import { UserIdentityCard }      from '../components/UserIdentityCard.js';
import { EditableAttributeCard } from '../components/EditableAttributeCard.js';
import { UnifiedTimeline }       from '../components/UnifiedTimeline.js';
import { NoteComposer }          from '../components/NoteComposer.js';
import { AI_InsightPanel }       from '../components/AI_InsightPanel.js';
import { SessionOverviewCard }   from '../components/SessionOverviewCard.js';
import { DeviceInventoryCard }   from '../components/DeviceInventoryCard.js';
import { QuickActionButtons }    from '../components/QuickActionButtons.js';
import { GlobalHeader }          from '../components/GlobalHeader.js';
import { Toast }                 from '../components/Toast.js';
import { getMockTimeline, getMockInsights } from '../data/mockData.js';

export const UserProfilePage = {

  /** @type {UnifiedTimeline|null} */
  _timelineComponent: null,

  /**
   * Entry point called by the Router.
   * Renders the full three-column layout for the given userId.
   *
   * @param {string} userId
   */
  async render(userId) {
    AppLogger.info('[UI]', `UserProfilePage.render() → ${userId}`);

    const pageEl = document.getElementById('page-content');
    if (!pageEl) return;

    // 1. Skeleton loading state
    pageEl.innerHTML = _skeletonHTML();
    GlobalHeader.setBreadcrumb('Loading…');
    StorageManager.set('current_user_id', userId);

    try {
      // 2. Fetch data in parallel
      const [profile, timelineEvents, insights] = await Promise.all([
        UserRepository.getProfile(userId),
        Promise.resolve(getMockTimeline(userId)),
        Promise.resolve(getMockInsights(userId)),
      ]);

      GlobalHeader.setBreadcrumb(profile.displayName);

      // 3. Build columns
      const leftCol   = document.createElement('div');
      leftCol.className = 'col-left';

      const centerCol = document.createElement('div');
      centerCol.className = 'col-center';

      const rightCol  = document.createElement('div');
      rightCol.className = 'col-right';

      /* ---- LEFT COLUMN ---- */

      // Identity card
      const identityCard = new UserIdentityCard(profile);
      leftCol.appendChild(identityCard.render());

      // Demographics (standard Braze attributes)
      const demFields = _demographicsFields(profile);
      const demCard = new EditableAttributeCard({
        title: 'Demographics',
        fields: demFields,
        externalId: userId,
        onSave: (key, val) => {
          AppLogger.info('[UI]', `Demographics updated: ${key} = ${val}`);
        },
      });
      leftCol.appendChild(demCard.render());

      // Custom attributes
      const customFields = _customAttributeFields(profile);
      const customCard = new EditableAttributeCard({
        title: 'Hotel Preferences',
        fields: customFields,
        externalId: userId,
        onSave: (key, val) => {
          AppLogger.info('[UI]', `Custom attribute updated: ${key} = ${val}`);
        },
      });
      leftCol.appendChild(customCard.render());

      /* ---- CENTER COLUMN ---- */

      // Note Composer
      const noteComposer = new NoteComposer({
        externalId: userId,
        onNoteAdded: (note) => {
          if (this._timelineComponent) {
            const updated = [note, ...timelineEvents];
            this._timelineComponent.update(updated);
          }
        },
      });
      centerCol.appendChild(noteComposer.render());

      // Unified Timeline
      const timeline = new UnifiedTimeline(timelineEvents);
      this._timelineComponent = timeline;
      centerCol.appendChild(timeline.render());

      /* ---- RIGHT COLUMN ---- */

      const aiPanel = new AI_InsightPanel({
        insights,
        externalId: userId,
        onCtaClick: (action) => {
          Toast.show(`Action "${action.cta}" sent to Braze`, 'success');
        },
      });
      rightCol.appendChild(aiPanel.render());

      const sessionCard = new SessionOverviewCard(profile);
      rightCol.appendChild(sessionCard.render());

      const deviceCard = new DeviceInventoryCard(profile);
      rightCol.appendChild(deviceCard.render());

      const quickActions = new QuickActionButtons({
        externalId: userId,
        onAction: (action) => {
          AppLogger.info('[UI]', `Quick action: ${action.id}`);
        },
      });
      rightCol.appendChild(quickActions.render());

      // 4. Swap out skeletons
      pageEl.innerHTML = '';
      pageEl.appendChild(leftCol);
      pageEl.appendChild(centerCol);
      pageEl.appendChild(rightCol);

      // 5. Track page view
      await UserRepository.trackEvent(userId, 'cs_profile_viewed', {
        viewed_at: new Date().toISOString(),
      });

      AppLogger.info('[UI]', `UserProfilePage fully rendered for ${userId}`);

    } catch (err) {
      AppLogger.error('[UI]', `UserProfilePage.render() failed for ${userId}`, err);
      pageEl.innerHTML = _errorHTML(userId, err.message || 'Unknown error');
    }
  },
};

/* ============================================================
   Field Definitions
   ============================================================ */

/**
 * Returns the field definition array for the Demographics editable card.
 * @param {import('../api/models/UserProfile.js').UserProfile} p
 * @returns {object[]}
 */
function _demographicsFields(p) {
  return [
    { key: 'firstName',   label: 'First Name',    value: p.firstName,   type: 'text',  editable: true },
    { key: 'lastName',    label: 'Last Name',     value: p.lastName,    type: 'text',  editable: true },
    { key: 'email',       label: 'Email',         value: p.email,       type: 'text',  editable: true },
    { key: 'phone',       label: 'Phone',         value: p.phone,       type: 'phone', editable: true },
    { key: 'homeCity',    label: 'City',          value: p.homeCity,    type: 'text',  editable: true },
    { key: 'country',     label: 'Country',       value: p.country,     type: 'text',  editable: false },
    { key: 'dateOfBirth', label: 'Date of Birth', value: p.dateOfBirth, type: 'date',  editable: true },
    { key: 'gender',      label: 'Gender',        value: p.gender,      type: 'select', editable: true,
      options: ['M', 'F', 'O', 'N', 'P'] },
  ];
}

/**
 * Returns the field definition array for the Custom Attributes editable card.
 * @param {import('../api/models/UserProfile.js').UserProfile} p
 * @returns {object[]}
 */
function _customAttributeFields(p) {
  return [
    { key: 'loyaltyTier',       label: 'Loyalty Tier',    value: p.loyaltyTier,       type: 'select', editable: true,
      options: ['Standard', 'Silver', 'Gold', 'Platinum'] },
    { key: 'accountStatus',     label: 'Account Status',  value: p.accountStatus,     type: 'select', editable: true,
      options: ['Active', 'Suspended', 'Closed'] },
    { key: 'totalStays',        label: 'Total Stays',     value: p.totalStays,        type: 'text',   editable: false },
    { key: 'lastStayProperty',  label: 'Last Property',   value: p.lastStayProperty,  type: 'text',   editable: false },
    { key: 'preferredLanguage', label: 'Pref. Language',  value: p.preferredLanguage, type: 'select', editable: true,
      options: ['English', 'Mandarin', 'Japanese', 'Malay', 'Thai', 'Indonesian'] },
    {
      key: 'room_preference',  label: 'Room Preference',
      value: p.customAttributes.room_preference || '—',  type: 'text', editable: true,
    },
    {
      key: 'dietary_preference', label: 'Dietary Pref.',
      value: p.customAttributes.dietary_preference || '—', type: 'select', editable: true,
      options: ['No Restrictions', 'Vegetarian', 'Vegan', 'Halal', 'Kosher', 'Gluten-Free'],
    },
    {
      key: 'vip_flag', label: 'VIP Flag',
      value: p.customAttributes.vip_flag ?? false, type: 'select', editable: true,
      options: ['true', 'false'],
    },
  ];
}

/* ============================================================
   Skeleton & Error HTML
   ============================================================ */

/**
 * Returns a full-width skeleton loading state that matches the
 * three-column layout proportions.
 * @returns {string}
 */
function _skeletonHTML() {
  const skCard = (lines = 3) => `
    <div class="card">
      <div class="skeleton" style="height:14px; width:40%; margin-bottom:14px;"></div>
      ${Array.from({ length: lines }, () => `
        <div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid rgba(107,114,128,0.07);">
          <div class="skeleton" style="height:12px; width:30%;"></div>
          <div class="skeleton" style="height:12px; width:40%;"></div>
        </div>
      `).join('')}
    </div>
  `;

  return `
    <div class="col-left">
      <div class="card">
        <div style="display:flex; gap:14px; margin-bottom:16px;">
          <div class="skeleton" style="width:56px; height:56px; border-radius:50%; flex-shrink:0;"></div>
          <div style="flex:1; display:flex; flex-direction:column; gap:8px; padding-top:4px;">
            <div class="skeleton" style="height:16px; width:60%;"></div>
            <div class="skeleton" style="height:12px; width:40%;"></div>
          </div>
        </div>
        ${Array.from({ length: 4 }, () => `<div class="skeleton" style="height:12px; width:90%; margin-bottom:10px;"></div>`).join('')}
      </div>
      ${skCard(5)}
      ${skCard(6)}
    </div>

    <div class="col-center">
      <div class="card">
        <div class="skeleton" style="height:80px; border-radius:8px;"></div>
      </div>
      <div class="card" style="flex:1;">
        <div class="skeleton" style="height:14px; width:30%; margin-bottom:14px;"></div>
        ${Array.from({ length: 4 }, () => `
          <div style="display:flex; gap:12px; padding:12px 0; border-bottom:1px solid rgba(107,114,128,0.08);">
            <div class="skeleton" style="width:36px; height:36px; border-radius:50%; flex-shrink:0;"></div>
            <div style="flex:1; display:flex; flex-direction:column; gap:7px; padding-top:4px;">
              <div class="skeleton" style="height:12px; width:55%;"></div>
              <div class="skeleton" style="height:11px; width:80%;"></div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>

    <div class="col-right">
      ${skCard(4)}
      ${skCard(3)}
      ${skCard(2)}
    </div>
  `;
}

/**
 * Returns an error state HTML to show when data fetching fails.
 * @param {string} userId
 * @param {string} message
 * @returns {string}
 */
function _errorHTML(userId, message) {
  return `
    <div style="flex:1; display:flex; align-items:center; justify-content:center; padding:40px;">
      <div style="text-align:center; max-width:380px;">
        <div style="font-size:48px; margin-bottom:16px; opacity:0.3;">
          <i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i>
        </div>
        <h2 style="font-size:18px; font-weight:700; margin:0 0 8px;">Failed to load profile</h2>
        <p style="font-size:14px; color:var(--color-text-secondary); margin:0 0 20px;">
          Could not fetch data for user <code>${userId}</code>.<br />
          ${message}
        </p>
        <button class="btn-primary" onclick="window.location.reload()">
          <i class="fa-solid fa-arrows-rotate" aria-hidden="true"></i>
          Retry
        </button>
      </div>
    </div>
  `;
}
