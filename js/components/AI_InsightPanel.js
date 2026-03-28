/**
 * AI_InsightPanel
 *
 * Renders predictive analytics and AI-generated recommendations for the right column.
 *
 * Elements:
 *  - Sentiment Meter (gradient bar + indicator pin)
 *  - Churn Propensity Score (SVG donut ring)
 *  - Next Best Action card with CTA button
 *  - Predicted LTV and next stay
 *
 * @param {object} insights - Insight payload from a real AI endpoint or static fixture
 * @param {string} externalId
 * @param {Function} onCtaClick - Callback when the NBA CTA is triggered
 */

import { AppLogger }      from '../core/AppLogger.js';
import { UserRepository } from '../api/UserRepository.js';
import { Toast }          from './Toast.js';

const SENTIMENT_POSITIONS = {
  'Frustrated': 8,
  'Neutral':    50,
  'Satisfied':  92,
};

const CHURN_COLORS = {
  'Low':    'var(--color-success)',
  'Medium': 'var(--color-warning)',
  'High':   'var(--color-error)',
};

export class AI_InsightPanel {
  /**
   * @param {{ insights: object, externalId: string, onCtaClick?: Function }} options
   */
  constructor({ insights, externalId, onCtaClick }) {
    this.insights    = insights;
    this.externalId  = externalId;
    this.onCtaClick  = onCtaClick || (() => {});

    this.el          = document.createElement('div');
    this.el.className = 'card';
  }

  /**
   * Renders the panel and returns the element.
   * @returns {HTMLElement}
   */
  render() {
    const ins      = this.insights;
    const sentPos  = SENTIMENT_POSITIONS[ins.sentiment] ?? 50;
    const churnClr = CHURN_COLORS[ins.churnRisk] || 'var(--color-warning)';

    this.el.innerHTML = `
      <div class="card-header">
        <span class="card-title" style="display:flex; align-items:center; gap:6px;">
          <i class="fa-solid fa-brain" aria-hidden="true" style="color:var(--color-ai-insight);"></i>
          AI Insights
        </span>
        <span style="font-size:10px; font-weight:600; padding:2px 7px; border-radius:5px;
          background:rgba(139,92,246,0.1); color:var(--color-ai-insight); border:1px solid rgba(139,92,246,0.2);">
          Powered by Braze AI
        </span>
      </div>

      <!-- Sentiment Meter -->
      <div style="margin-bottom:16px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
          <span style="font-size:12px; font-weight:600; color:var(--color-text-primary);">Guest Sentiment</span>
          <span style="font-size:12px; font-weight:700; color:var(--color-ai-insight);">${ins.sentiment}</span>
        </div>
        <div class="sentiment-bar">
          <div class="sentiment-indicator" id="sentiment-pin" style="left:${sentPos}%;"></div>
        </div>
        <div style="display:flex; justify-content:space-between; margin-top:4px;">
          <span style="font-size:10px; color:var(--color-error);">Frustrated</span>
          <span style="font-size:10px; color:var(--color-text-secondary);">Neutral</span>
          <span style="font-size:10px; color:var(--color-success);">Satisfied</span>
        </div>
      </div>

      <div class="divider"></div>

      <!-- Churn Score -->
      <div style="margin-bottom:16px;">
        <div style="font-size:12px; font-weight:600; color:var(--color-text-primary); margin-bottom:10px;">Churn Propensity</div>
        <div style="display:flex; align-items:center; gap:16px;">
          <!-- Donut Ring -->
          <div class="churn-ring-container">
            ${_donutSVG(ins.churnScore, churnClr)}
            <div class="churn-label-center">
              <span>${ins.churnScore}%</span>
              <small>${ins.churnRisk}</small>
            </div>
          </div>
          <!-- Context -->
          <div style="flex:1;">
            <div style="font-size:11px; color:var(--color-text-secondary); line-height:1.5;">
              ${_churnContext(ins.churnRisk)}
            </div>
            ${ins.predictedLtv ? `
              <div style="margin-top:6px; font-size:11px; color:var(--color-text-secondary);">
                Predicted LTV: <strong style="color:var(--color-text-primary);">${ins.predictedLtv}</strong>
              </div>
            ` : ''}
            ${ins.predictedNextStay ? `
              <div style="margin-top:3px; font-size:11px; color:var(--color-text-secondary);">
                Next stay: <strong style="color:var(--color-text-primary);">${ins.predictedNextStay}</strong>
              </div>
            ` : ''}
          </div>
        </div>
      </div>

      <div class="divider"></div>

      <!-- Next Best Action -->
      <div>
        <div style="font-size:12px; font-weight:600; color:var(--color-text-primary); margin-bottom:8px; display:flex; align-items:center; gap:6px;">
          <i class="fa-solid fa-lightbulb" aria-hidden="true" style="color:var(--color-warning);"></i>
          Next Best Action
        </div>
        <div class="nba-card">
          <p style="font-size:12px; color:var(--color-text-primary); line-height:1.6; margin:0 0 10px;">
            ${ins.nextBestAction.recommendation}
          </p>
          <button class="btn-primary" id="nba-cta-btn" style="width:100%; font-size:12px; padding:8px 12px; min-height:38px;">
            <i class="fa-solid fa-bolt" aria-hidden="true"></i>
            ${ins.nextBestAction.cta}
          </button>
        </div>
      </div>
    `;

    this._bindCta();
    AppLogger.debug('[UI]', `AI_InsightPanel rendered — sentiment: ${ins.sentiment}, churn: ${ins.churnScore}%`);
    return this.el;
  }

  /**
   * Wires the NBA CTA button to fire a Braze event and call the callback.
   */
  _bindCta() {
    const btn = this.el.querySelector('#nba-cta-btn');
    if (!btn) return;

    btn.addEventListener('click', async () => {
      btn.disabled = true;
      btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin" aria-hidden="true"></i> Sending…';

      try {
        const { ctaEvent, ctaParams } = this.insights.nextBestAction;
        await UserRepository.trackEvent(this.externalId, ctaEvent || 'cs_quick_action_triggered', ctaParams || {});
        Toast.show(`Action triggered: ${this.insights.nextBestAction.cta}`, 'success');
        AppLogger.info('[UI]', `NBA CTA triggered: ${ctaEvent}`, ctaParams);
        this.onCtaClick(this.insights.nextBestAction);
      } catch (err) {
        Toast.show('Action failed. Please try again.', 'error');
        AppLogger.error('[UI]', 'NBA CTA failed', err);
      } finally {
        btn.disabled = false;
        btn.innerHTML = `<i class="fa-solid fa-bolt" aria-hidden="true"></i> ${this.insights.nextBestAction.cta}`;
      }
    });
  }
}

/**
 * Returns an SVG donut chart for the churn score.
 * @param {number} pct   - 0–100
 * @param {string} color - CSS color value
 * @returns {string}
 */
function _donutSVG(pct, color) {
  const r     = 30;
  const circ  = 2 * Math.PI * r;
  const fill  = circ * (pct / 100);
  const gap   = circ - fill;
  return `
    <svg width="80" height="80" viewBox="0 0 80 80" aria-label="Churn propensity ${pct}%">
      <circle cx="40" cy="40" r="${r}" fill="none" stroke="rgba(107,114,128,0.12)" stroke-width="8"/>
      <circle cx="40" cy="40" r="${r}" fill="none" stroke="${color}" stroke-width="8"
        stroke-dasharray="${fill} ${gap}" stroke-linecap="round"/>
    </svg>
  `;
}

/**
 * Returns contextual copy based on churn risk level.
 * @param {'Low'|'Medium'|'High'} risk
 * @returns {string}
 */
function _churnContext(risk) {
  switch (risk) {
    case 'Low':    return 'Guest is highly engaged and likely to return. Focus on loyalty deepening.';
    case 'Medium': return 'Engagement declining. A personalised outreach could re-activate this guest.';
    case 'High':   return 'High risk of churning. Immediate win-back action recommended.';
    default:       return 'Insufficient data to compute churn risk.';
  }
}
