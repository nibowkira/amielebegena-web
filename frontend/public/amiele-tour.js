/**
 * ==============================================================================
 * Amiele Begena (ዓሚኤል በገና) - Premium Affiliate Dashboard Onboarding Tour
 * ==============================================================================
 * Zero-dependency, accessible, collision-aware product tour system crafted
 * specifically for the Amiele Begena affiliate portal experience.
 *
 * Features:
 *  - Spotlight cutout with smooth SVG path masking & pulsating gold halo ring
 *  - Floating luxury glassmorphism card with dynamic pointer arrow
 *  - Collision-aware auto-positioning (flips & clamps within viewport)
 *  - Keyboard navigation (ArrowRight/Enter: next, ArrowLeft: back, Esc: exit)
 *  - LocalStorage persistence with auto-start for new affiliates
 *  - Resilient target resolver with robust cascading fallbacks
 *  - Full ARIA accessibility attributes and focus management
 * ==============================================================================
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.AmieleTour = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // ----------------------------------------------------------------------------
  // 1. TOUR CONFIGURATION & DEFAULT STEPS
  // ----------------------------------------------------------------------------
  var DEFAULT_STEPS = [
    {
      id: 'dashboard',
      badge: 'Welcome to Amiele Begena',
      title: 'Your Affiliate Hub',
      description:
        'Welcome to your ambassador command center. Monitor real-time clicks, total earnings, active orders, and live performance metrics at a single glance.',
      selectors: [
        '.aff-menu-item.active',
        '[data-tour="dashboard"]',
        '[data-tab="dashboard"]',
        'button:has(svg):has-text("Dashboard")',
        'aside nav button:first-child',
        'aside'
      ],
      preferredPosition: 'right'
    },
    {
      id: 'referrals',
      badge: 'Share & Grow',
      title: 'Referral Center',
      description:
        'Generate custom referral links and branded QR codes. Track which instruments your audience loves and convert sacred music enthusiasts effortlessly.',
      selectors: [
        '.aff-menu-item[onclick*="referral"]',
        '[data-tour="referrals"]',
        '[data-tab="referrals"]',
        'aside nav button:nth-child(2)',
        'aside'
      ],
      preferredPosition: 'right'
    },
    {
      id: 'commissions',
      badge: 'Transparent Earnings',
      title: 'Commissions',
      description:
        'Review transparent commission breakdowns per verified sale with automated commission rate tiers (up to 15%) as your sales volume climbs.',
      selectors: [
        '.aff-menu-item[onclick*="commissions"]',
        '[data-tour="commissions"]',
        '[data-tab="commissions"]',
        'aside nav button:nth-child(3)',
        'aside'
      ],
      preferredPosition: 'right'
    },
    {
      id: 'payouts',
      badge: 'Flexible Cash Out',
      title: 'Payouts',
      description:
        'Withdraw your earned Birr securely through Telebirr, CBE Birr, Awash, or direct wire transfer with real-time audit logging.',
      selectors: [
        '.aff-menu-item[onclick*="withdrawals"]',
        '.aff-menu-item[onclick*="payouts"]',
        '[data-tour="payouts"]',
        '[data-tab="payouts"]',
        'aside nav button:nth-child(4)',
        'aside'
      ],
      preferredPosition: 'right'
    },
    {
      id: 'performance',
      badge: 'Certified Statements',
      title: 'Performance Report',
      description:
        'Download certified monthly PDF statements complete with the Amiele Begena Cultural Committee digital seal to verify your status.',
      selectors: [
        '.aff-menu-item[onclick*="performance"]',
        '.aff-menu-item[onclick*="report"]',
        '[data-tour="performance"]',
        '[data-tab="performance"]',
        'aside nav button:nth-child(5)',
        'aside'
      ],
      preferredPosition: 'right'
    },
    {
      id: 'marketing',
      badge: 'Official Media Kit',
      title: 'Marketing Center',
      description:
        'Access pre-designed social banners, authentic sound clips, Master Workshop photography, and product stories to elevate your content.',
      selectors: [
        '.aff-menu-item[onclick*="marketing"]',
        '[data-tour="marketing"]',
        '[data-tab="marketing"]',
        'aside nav button:nth-child(5)',
        'aside'
      ],
      preferredPosition: 'right'
    },
    {
      id: 'campaigns',
      badge: 'Seasonal Accelerators',
      title: 'Bonus Campaigns',
      description:
        'Participate in cultural holiday accelerators (Meskel, Timket, Enkutatash) to unlock bonus commission multipliers and exclusive artisan instruments.',
      selectors: [
        '.aff-menu-item[onclick*="campaigns"]',
        '[data-tour="campaigns"]',
        '[data-tab="campaigns"]',
        'aside nav button:nth-child(6)',
        'aside'
      ],
      preferredPosition: 'right'
    },
    {
      id: 'settings',
      badge: 'Identity & Payout Info',
      title: 'Settings',
      description:
        'Configure your public partner bio, update notification channels, and link your verified disbursement details to ensure timely payouts.',
      selectors: [
        '.aff-menu-item[onclick*="settings"]',
        '[data-tour="settings"]',
        '[data-tab="settings"]',
        'aside .pt-2:last-child > div:first-child',
        'aside [title*="Settings"]',
        'aside'
      ],
      preferredPosition: 'right'
    }
  ];

  // ----------------------------------------------------------------------------
  // 2. EMBEDDED STYLES (Self-injected)
  // ----------------------------------------------------------------------------
  var TOUR_STYLES = `
    /* ========================================================================== */
    /* AMIELE BEGENA ONBOARDING TOUR STYLES                                       */
    /* Brand: Dark Forest (#07150d / #0a1c12) & Warm Gold (#f5c518)              */
    /* ========================================================================== */

    /* Overlay Root */
    .amiele-tour-root {
      position: fixed;
      inset: 0;
      z-index: 99999;
      pointer-events: none;
      font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #ffffff;
      opacity: 0;
      transition: opacity 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .amiele-tour-root.active {
      opacity: 1;
      pointer-events: auto;
    }

    /* Fullscreen SVG Spotlight Overlay */
    .amiele-tour-overlay {
      position: fixed;
      inset: 0;
      width: 100vw;
      height: 100vh;
      pointer-events: auto;
      transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1);
    }

    /* Pulsating Spotlight Halo */
    .amiele-tour-spotlight-ring {
      position: fixed;
      border-radius: 18px;
      border: 2px solid #f5c518;
      box-shadow: 0 0 0 4px rgba(245, 197, 24, 0.2), 0 0 35px rgba(245, 197, 24, 0.45);
      pointer-events: none;
      transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1);
      z-index: 100000;
      box-sizing: border-box;
      animation: amieleTourGlow 2.4s ease-in-out infinite alternate;
    }

    @keyframes amieleTourGlow {
      0% {
        box-shadow: 0 0 0 2px rgba(245, 197, 24, 0.15), 0 0 20px rgba(245, 197, 24, 0.3);
      }
      100% {
        box-shadow: 0 0 0 6px rgba(245, 197, 24, 0.35), 0 0 40px rgba(245, 197, 24, 0.6);
      }
    }

    /* Floating Card */
    .amiele-tour-card {
      position: fixed;
      width: 380px;
      max-width: calc(100vw - 32px);
      background: linear-gradient(135deg, rgba(14, 34, 23, 0.96) 0%, rgba(7, 21, 13, 0.98) 100%);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid rgba(245, 197, 24, 0.3);
      border-radius: 24px;
      padding: 24px;
      box-shadow: 0 20px 50px -10px rgba(0, 0, 0, 0.7), 0 0 30px rgba(245, 197, 24, 0.15);
      z-index: 100001;
      pointer-events: auto;
      box-sizing: border-box;
      transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      will-change: transform, left, top;
    }

    /* Pointer Arrow */
    .amiele-tour-arrow {
      position: absolute;
      width: 14px;
      height: 14px;
      background: #0d2217;
      border: 1px solid rgba(245, 197, 24, 0.3);
      transform: rotate(45deg);
      pointer-events: none;
      z-index: 1;
    }
    .amiele-tour-card[data-placement="right"] > .amiele-tour-arrow {
      left: -8px;
      border-right: none;
      border-top: none;
    }
    .amiele-tour-card[data-placement="left"] > .amiele-tour-arrow {
      right: -8px;
      border-left: none;
      border-bottom: none;
    }
    .amiele-tour-card[data-placement="bottom"] > .amiele-tour-arrow {
      top: -8px;
      border-bottom: none;
      border-right: none;
    }
    .amiele-tour-card[data-placement="top"] > .amiele-tour-arrow {
      bottom: -8px;
      border-top: none;
      border-left: none;
    }

    /* Header & Badges */
    .amiele-tour-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 12px;
    }

    .amiele-tour-badge-wrap {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: rgba(245, 197, 24, 0.12);
      border: 1px solid rgba(245, 197, 24, 0.35);
      padding: 4px 10px;
      border-radius: 9999px;
    }

    .amiele-tour-badge-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #f5c518;
      box-shadow: 0 0 8px #f5c518;
    }

    .amiele-tour-badge-text {
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      color: #f5c518;
    }

    .amiele-tour-close-btn {
      background: transparent;
      border: none;
      color: #7b9484;
      cursor: pointer;
      width: 28px;
      height: 28px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
      padding: 0;
    }
    .amiele-tour-close-btn:hover {
      background: rgba(255, 255, 255, 0.1);
      color: #ffffff;
      transform: scale(1.08);
    }
    .amiele-tour-close-btn:focus-visible {
      outline: 2px solid #f5c518;
      outline-offset: 2px;
    }

    /* Title & Description */
    .amiele-tour-title {
      font-size: 19px;
      font-weight: 800;
      color: #ffffff;
      margin: 0 0 8px 0;
      letter-spacing: -0.02em;
      line-height: 1.25;
    }

    .amiele-tour-desc {
      font-size: 13px;
      line-height: 1.6;
      color: #a1b8aa;
      margin: 0 0 18px 0;
    }

    /* Animated Progress Track */
    .amiele-tour-progress-wrap {
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin-bottom: 20px;
    }

    .amiele-tour-progress-meta {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 11px;
      font-weight: 700;
      color: #7b9484;
    }

    .amiele-tour-progress-bar {
      width: 100%;
      height: 5px;
      background: rgba(255, 255, 255, 0.08);
      border-radius: 9999px;
      overflow: hidden;
      position: relative;
    }

    .amiele-tour-progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #f5c518 0%, #ffd952 100%);
      border-radius: 9999px;
      transition: width 0.35s cubic-bezier(0.16, 1, 0.3, 1);
      box-shadow: 0 0 10px rgba(245, 197, 24, 0.5);
    }

    /* Action Buttons */
    .amiele-tour-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
    }

    .amiele-tour-actions-left {
      display: flex;
      align-items: center;
    }

    .amiele-tour-actions-right {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .amiele-tour-btn {
      font-family: inherit;
      font-size: 12px;
      font-weight: 700;
      border-radius: 9999px;
      padding: 9px 18px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      text-decoration: none;
      border: 1px solid transparent;
      user-select: none;
    }

    .amiele-tour-btn:focus-visible {
      outline: 2px solid #f5c518;
      outline-offset: 2px;
    }

    .amiele-tour-btn-primary {
      background: #f5c518;
      color: #07150d;
      border-color: #f5c518;
      box-shadow: 0 4px 18px rgba(245, 197, 24, 0.4);
    }
    .amiele-tour-btn-primary:hover {
      background: #ffd333;
      transform: translateY(-1px);
      box-shadow: 0 6px 22px rgba(245, 197, 24, 0.55);
    }
    .amiele-tour-btn-primary:active {
      transform: translateY(0);
    }

    .amiele-tour-btn-secondary {
      background: rgba(255, 255, 255, 0.06);
      color: #ffffff;
      border-color: rgba(255, 255, 255, 0.15);
    }
    .amiele-tour-btn-secondary:hover {
      background: rgba(255, 255, 255, 0.12);
      border-color: rgba(255, 255, 255, 0.3);
    }

    .amiele-tour-btn-skip {
      background: transparent;
      color: #7b9484;
      padding: 8px 10px;
    }
    .amiele-tour-btn-skip:hover {
      color: #d1ded6;
      background: transparent;
    }

    /* Small Screen Optimization */
    @media (max-width: 640px) {
      .amiele-tour-card {
        width: calc(100vw - 28px);
        left: 14px !important;
        right: 14px !important;
        padding: 20px;
      }
      .amiele-tour-arrow {
        display: none;
      }
    }
  `;

  // ----------------------------------------------------------------------------
  // 3. CORE AMIELE TOUR CLASS
  // ----------------------------------------------------------------------------
  function AmieleTourSystem(options) {
    options = options || {};

    this.steps = options.steps || DEFAULT_STEPS;
    this.storageKey = options.storageKey || 'amiele_affiliate_tour_completed_v1';
    this.padding = typeof options.padding === 'number' ? options.padding : 10;
    this.autoStart = typeof options.autoStart === 'boolean' ? options.autoStart : true;
    this.onComplete = typeof options.onComplete === 'function' ? options.onComplete : null;
    this.onSkip = typeof options.onSkip === 'function' ? options.onSkip : null;

    this.currentStepIndex = -1;
    this.isActive = false;

    // DOM References
    this.rootEl = null;
    this.svgEl = null;
    this.maskPathEl = null;
    this.spotlightRingEl = null;
    this.cardEl = null;
    this.arrowEl = null;

    // Bound listeners for clean detachment
    this._handleKeyDown = this._handleKeyDown.bind(this);
    this._handleResize = this._handleResize.bind(this);
  }

  /**
   * Initializes the tour DOM, injects styles, and triggers auto-start if eligible.
   */
  AmieleTourSystem.prototype.initTour = function () {
    this._injectStyles();
    this._buildDOM();
    this._bindEvents();

    if (this.autoStart && !this.isCompleted()) {
      // Small timeout to allow dashboard DOM, charts, and fonts to paint
      var self = this;
      setTimeout(function () {
        self.startTour();
      }, 700);
    }

    return this;
  };

  /**
   * Injects CSS into the document <head>.
   */
  AmieleTourSystem.prototype._injectStyles = function () {
    if (document.getElementById('amiele-tour-styles')) return;
    var styleEl = document.createElement('style');
    styleEl.id = 'amiele-tour-styles';
    styleEl.textContent = TOUR_STYLES;
    document.head.appendChild(styleEl);
  };

  /**
   * Builds the SVG spotlight overlay and luxury tour card.
   */
  AmieleTourSystem.prototype._buildDOM = function () {
    if (document.getElementById('amiele-tour-root')) {
      this.rootEl = document.getElementById('amiele-tour-root');
      this.svgEl = this.rootEl.querySelector('.amiele-tour-overlay');
      this.maskPathEl = this.rootEl.querySelector('#amiele-tour-mask-cutout');
      this.spotlightRingEl = this.rootEl.querySelector('.amiele-tour-spotlight-ring');
      this.cardEl = this.rootEl.querySelector('.amiele-tour-card');
      this.arrowEl = this.rootEl.querySelector('.amiele-tour-arrow');
      return;
    }

    var root = document.createElement('div');
    root.id = 'amiele-tour-root';
    root.className = 'amiele-tour-root';
    root.setAttribute('aria-hidden', 'true');

    root.innerHTML = `
      <!-- Fullscreen SVG Mask Cutout -->
      <svg class="amiele-tour-overlay" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <mask id="amiele-tour-mask">
            <!-- Full solid white canvas keeps everything dark -->
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            <!-- Transparent cutout around the active target element -->
            <path id="amiele-tour-mask-cutout" fill="black" d="" />
          </mask>
        </defs>
        <!-- Overlay rect filled with deep Ethiopian forest tone -->
        <rect x="0" y="0" width="100%" height="100%" fill="rgba(4, 12, 7, 0.78)" mask="url(#amiele-tour-mask)" />
      </svg>

      <!-- Pulsating Golden Spotlight Ring -->
      <div class="amiele-tour-spotlight-ring" style="display: none;"></div>

      <!-- Floating Tour Card -->
      <section
        class="amiele-tour-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="amiele-tour-title"
        aria-describedby="amiele-tour-desc"
        tabindex="-1"
        style="display: none;"
      >
        <div class="amiele-tour-arrow"></div>

        <div class="amiele-tour-header">
          <div class="amiele-tour-badge-wrap">
            <span class="amiele-tour-badge-dot"></span>
            <span class="amiele-tour-badge-text" id="amiele-tour-badge">Affiliate Hub</span>
          </div>
          <button type="button" class="amiele-tour-close-btn" aria-label="Close tour" title="Close tour (Esc)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <h3 class="amiele-tour-title" id="amiele-tour-title"></h3>
        <p class="amiele-tour-desc" id="amiele-tour-desc"></p>

        <!-- Progress Tracker -->
        <div class="amiele-tour-progress-wrap">
          <div class="amiele-tour-progress-meta">
            <span id="amiele-tour-step-counter">Step 1 of 8</span>
            <span id="amiele-tour-step-percent">12%</span>
          </div>
          <div class="amiele-tour-progress-bar">
            <div class="amiele-tour-progress-fill" style="width: 12.5%;"></div>
          </div>
        </div>

        <!-- Controls -->
        <div class="amiele-tour-footer">
          <div class="amiele-tour-actions-left">
            <button type="button" class="amiele-tour-btn amiele-tour-btn-skip">Skip Tour</button>
          </div>
          <div class="amiele-tour-actions-right">
            <button type="button" class="amiele-tour-btn amiele-tour-btn-secondary amiele-tour-btn-back">Back</button>
            <button type="button" class="amiele-tour-btn amiele-tour-btn-primary amiele-tour-btn-next">Next</button>
          </div>
        </div>
      </section>
    `;

    document.body.appendChild(root);

    this.rootEl = root;
    this.svgEl = root.querySelector('.amiele-tour-overlay');
    this.maskPathEl = root.querySelector('#amiele-tour-mask-cutout');
    this.spotlightRingEl = root.querySelector('.amiele-tour-spotlight-ring');
    this.cardEl = root.querySelector('.amiele-tour-card');
    this.arrowEl = root.querySelector('.amiele-tour-arrow');

    // Button Listeners
    var self = this;
    root.querySelector('.amiele-tour-close-btn').addEventListener('click', function () {
      self.endTour(false);
    });
    root.querySelector('.amiele-tour-btn-skip').addEventListener('click', function () {
      self.endTour(false);
    });
    root.querySelector('.amiele-tour-btn-back').addEventListener('click', function () {
      self.prevStep();
    });
    root.querySelector('.amiele-tour-btn-next').addEventListener('click', function () {
      self.nextStep();
    });
  };

  /**
   * Binds global keyboard & window resize events.
   */
  AmieleTourSystem.prototype._bindEvents = function () {
    window.addEventListener('keydown', this._handleKeyDown);
    window.addEventListener('resize', this._handleResize);
    window.addEventListener('scroll', this._handleResize, true);
  };

  AmieleTourSystem.prototype._handleKeyDown = function (e) {
    if (!this.isActive) return;

    if (e.key === 'Escape') {
      e.preventDefault();
      this.endTour(false);
    } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
      // Don't intercept Enter if focused on another actionable tour button
      if (document.activeElement && document.activeElement.classList.contains('amiele-tour-btn-back')) {
        return;
      }
      e.preventDefault();
      this.nextStep();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      this.prevStep();
    }
  };

  AmieleTourSystem.prototype._handleResize = function () {
    if (!this.isActive || this.currentStepIndex < 0) return;
    this.renderStep(this.currentStepIndex);
  };

  /**
   * Starts or restarts the tour.
   */
  AmieleTourSystem.prototype.startTour = function (force) {
    if (!force && this.isCompleted()) return;

    this.isActive = true;
    this.rootEl.classList.add('active');
    this.rootEl.setAttribute('aria-hidden', 'false');

    this.goToStep(0);
  };

  /**
   * Transitions to a specific step by index.
   */
  AmieleTourSystem.prototype.goToStep = function (index) {
    if (index < 0 || index >= this.steps.length) return;

    this.currentStepIndex = index;
    this.renderStep(index);
  };

  /**
   * Advances to the next onboarding step.
   */
  AmieleTourSystem.prototype.nextStep = function () {
    if (this.currentStepIndex < this.steps.length - 1) {
      this.goToStep(this.currentStepIndex + 1);
    } else {
      this.endTour(true);
    }
  };

  /**
   * Goes back to the previous step.
   */
  AmieleTourSystem.prototype.prevStep = function () {
    if (this.currentStepIndex > 0) {
      this.goToStep(this.currentStepIndex - 1);
    }
  };

  /**
   * Concludes the tour, updates storage, and dispatches callbacks.
   */
  AmieleTourSystem.prototype.endTour = function (completed) {
    this.isActive = false;
    this.rootEl.classList.remove('active');
    this.rootEl.setAttribute('aria-hidden', 'true');

    this.spotlightRingEl.style.display = 'none';
    this.cardEl.style.display = 'none';
    this.maskPathEl.setAttribute('d', '');

    if (completed) {
      this.saveTourState(true);
      if (typeof this.onComplete === 'function') {
        this.onComplete();
      }
    } else {
      // Mark as skipped so it does not annoy user on reload
      this.saveTourState(true);
      if (typeof this.onSkip === 'function') {
        this.onSkip();
      }
    }
  };

  /**
   * Finds the DOM target matching the step selectors with cascading fallbacks.
   */
  AmieleTourSystem.prototype.resolveTarget = function (step) {
    if (!step || !step.selectors) return null;

    for (var i = 0; i < step.selectors.length; i++) {
      var sel = step.selectors[i];
      try {
        // Handle :has-text() pseudo-selector gracefully for vanilla JS
        if (sel.indexOf(':has-text(') !== -1) {
          var match = sel.match(/:has-text\("([^"]+)"\)/);
          if (match) {
            var rawText = match[1];
            var baseSel = sel.replace(match[0], '');
            var candidates = document.querySelectorAll(baseSel || '*');
            for (var c = 0; c < candidates.length; c++) {
              if (candidates[c].textContent.trim().indexOf(rawText) !== -1) {
                return candidates[c];
              }
            }
          }
        } else {
          var el = document.querySelector(sel);
          if (el && this._isVisible(el)) {
            return el;
          }
        }
      } catch (e) {
        // Selector syntax not supported by browser, continue to next fallback
      }
    }

    // Ultimate fallback: first visible sidebar navigation element or document body
    return (
      document.querySelector('.aff-menu-item') ||
      document.querySelector('aside button') ||
      document.querySelector('aside') ||
      document.body
    );
  };

  AmieleTourSystem.prototype._isVisible = function (el) {
    if (!el) return false;
    var rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0 && window.getComputedStyle(el).visibility !== 'hidden';
  };

  /**
   * Renders the active step's content, spotlight, and collision-aware card placement.
   */
  AmieleTourSystem.prototype.renderStep = function (index) {
    var step = this.steps[index];
    if (!step) return;

    var targetEl = this.resolveTarget(step);
    if (!targetEl) return;

    // Smooth scroll target into view if outside the visible screen
    var targetRect = targetEl.getBoundingClientRect();
    var isOffscreen =
      targetRect.top < 0 ||
      targetRect.bottom > window.innerHeight ||
      targetRect.left < 0 ||
      targetRect.right > window.innerWidth;

    if (isOffscreen && targetEl !== document.body) {
      targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      var self = this;
      setTimeout(function () {
        self._applyPositioning(targetEl, step, index);
      }, 300);
    } else {
      this._applyPositioning(targetEl, step, index);
    }
  };

  AmieleTourSystem.prototype._applyPositioning = function (targetEl, step, index) {
    var rawRect = targetEl.getBoundingClientRect();
    var pad = this.padding;

    // Expand bounding box with generous padding
    var targetRect = {
      top: Math.max(0, rawRect.top - pad),
      left: Math.max(0, rawRect.left - pad),
      width: rawRect.width + pad * 2,
      height: rawRect.height + pad * 2
    };
    targetRect.right = targetRect.left + targetRect.width;
    targetRect.bottom = targetRect.top + targetRect.height;

    // 1. Update SVG Cutout Mask
    this._updateMaskCutout(targetRect);

    // 2. Position the pulsating Golden Halo Ring
    this.spotlightRingEl.style.display = 'block';
    this.spotlightRingEl.style.top = targetRect.top + 'px';
    this.spotlightRingEl.style.left = targetRect.left + 'px';
    this.spotlightRingEl.style.width = targetRect.width + 'px';
    this.spotlightRingEl.style.height = targetRect.height + 'px';

    // 3. Update Text & Meta
    document.getElementById('amiele-tour-badge').textContent = step.badge || 'Onboarding Guide';
    document.getElementById('amiele-tour-title').textContent = step.title;
    document.getElementById('amiele-tour-desc').textContent = step.description;

    var stepNumber = index + 1;
    var totalSteps = this.steps.length;
    var percent = Math.round((stepNumber / totalSteps) * 100);

    document.getElementById('amiele-tour-step-counter').textContent =
      'Step ' + stepNumber + ' of ' + totalSteps;
    document.getElementById('amiele-tour-step-percent').textContent = percent + '%';
    this.cardEl.querySelector('.amiele-tour-progress-fill').style.width = percent + '%';

    // Back & Next Button States
    var backBtn = this.cardEl.querySelector('.amiele-tour-btn-back');
    var nextBtn = this.cardEl.querySelector('.amiele-tour-btn-next');

    backBtn.style.display = index === 0 ? 'none' : 'inline-flex';
    nextBtn.textContent = index === totalSteps - 1 ? 'Finish Tour ✦' : 'Next Step →';

    // 4. Collision-Aware Card Positioning
    this.cardEl.style.display = 'block';
    this.positionTourCard(targetRect, step.preferredPosition || 'right');

    // Focus card for accessible keyboard reader focus
    this.cardEl.focus();
  };

  /**
   * Generates rounded-rectangle SVG path string for the mask cutout.
   */
  AmieleTourSystem.prototype._updateMaskCutout = function (rect) {
    var x = rect.left;
    var y = rect.top;
    var w = rect.width;
    var h = rect.height;
    var r = 16; // border radius of cutout

    // Smooth rounded rect path
    var pathStr =
      'M' + (x + r) + ',' + y +
      ' h' + (w - 2 * r) +
      ' a' + r + ',' + r + ' 0 0 1 ' + r + ',' + r +
      ' v' + (h - 2 * r) +
      ' a' + r + ',' + r + ' 0 0 1 -' + r + ',' + r +
      ' h-' + (w - 2 * r) +
      ' a' + r + ',' + r + ' 0 0 1 -' + r + ',-' + r +
      ' v-' + (h - 2 * r) +
      ' a' + r + ',' + r + ' 0 0 1 ' + r + ',-' + r +
      ' z';

    this.maskPathEl.setAttribute('d', pathStr);
  };

  /**
   * Computes collision-aware coordinates so the tour card never clips offscreen.
   */
  AmieleTourSystem.prototype.positionTourCard = function (targetRect, preferred) {
    var cardRect = this.cardEl.getBoundingClientRect();
    var cardWidth = cardRect.width || 380;
    var cardHeight = cardRect.height || 260;
    var gap = 18; // clearance distance between spotlight and card
    var viewportMargin = 16;

    var vw = window.innerWidth;
    var vh = window.innerHeight;

    var placement = preferred || 'right';
    var top = 0;
    var left = 0;

    // Check availability in all 4 cardinal directions
    var spaceRight = vw - targetRect.right;
    var spaceLeft = targetRect.left;
    var spaceBottom = vh - targetRect.bottom;
    var spaceTop = targetRect.top;

    // Flip side if requested position doesn't have sufficient space
    if (placement === 'right' && spaceRight < cardWidth + gap + viewportMargin) {
      placement = spaceLeft > cardWidth + gap + viewportMargin ? 'left' : 'bottom';
    } else if (placement === 'left' && spaceLeft < cardWidth + gap + viewportMargin) {
      placement = spaceRight > cardWidth + gap + viewportMargin ? 'right' : 'bottom';
    }

    if (placement === 'bottom' && spaceBottom < cardHeight + gap + viewportMargin) {
      placement = spaceTop > cardHeight + gap + viewportMargin ? 'top' : 'right';
    } else if (placement === 'top' && spaceTop < cardHeight + gap + viewportMargin) {
      placement = spaceBottom > cardHeight + gap + viewportMargin ? 'bottom' : 'right';
    }

    // Compute coordinates based on chosen placement
    if (placement === 'right') {
      left = targetRect.right + gap;
      top = targetRect.top + (targetRect.height - cardHeight) / 2;
    } else if (placement === 'left') {
      left = targetRect.left - cardWidth - gap;
      top = targetRect.top + (targetRect.height - cardHeight) / 2;
    } else if (placement === 'bottom') {
      left = targetRect.left + (targetRect.width - cardWidth) / 2;
      top = targetRect.bottom + gap;
    } else {
      // top
      left = targetRect.left + (targetRect.width - cardWidth) / 2;
      top = targetRect.top - cardHeight - gap;
    }

    // Clamp coordinates strictly within viewport bounds
    left = Math.max(viewportMargin, Math.min(left, vw - cardWidth - viewportMargin));
    top = Math.max(viewportMargin, Math.min(top, vh - cardHeight - viewportMargin));

    this.cardEl.setAttribute('data-placement', placement);
    this.cardEl.style.left = Math.round(left) + 'px';
    this.cardEl.style.top = Math.round(top) + 'px';

    // Position pointer arrow aligned towards the center of the target element
    this._positionArrow(placement, targetRect, top, left, cardWidth, cardHeight);
  };

  /**
   * Adjusts the pointer arrow along the card's edge.
   */
  AmieleTourSystem.prototype._positionArrow = function (
    placement,
    targetRect,
    cardTop,
    cardLeft,
    cardWidth,
    cardHeight
  ) {
    if (!this.arrowEl) return;

    var targetCenterY = targetRect.top + targetRect.height / 2;
    var targetCenterX = targetRect.left + targetRect.width / 2;

    if (placement === 'right' || placement === 'left') {
      var arrowTop = targetCenterY - cardTop - 7;
      // Clamp arrow inside the rounded corners of the card
      arrowTop = Math.max(18, Math.min(arrowTop, cardHeight - 32));
      this.arrowEl.style.top = arrowTop + 'px';
      this.arrowEl.style.left = placement === 'right' ? '-7px' : 'auto';
      this.arrowEl.style.right = placement === 'left' ? '-7px' : 'auto';
    } else {
      var arrowLeft = targetCenterX - cardLeft - 7;
      arrowLeft = Math.max(18, Math.min(arrowLeft, cardWidth - 32));
      this.arrowEl.style.left = arrowLeft + 'px';
      this.arrowEl.style.top = placement === 'bottom' ? '-7px' : 'auto';
      this.arrowEl.style.bottom = placement === 'top' ? '-7px' : 'auto';
    }
  };

  /**
   * Persists completion state to localStorage.
   */
  AmieleTourSystem.prototype.saveTourState = function (completed) {
    try {
      localStorage.setItem(this.storageKey, completed ? 'true' : 'false');
    } catch (e) {
      console.warn('AmieleTour: localStorage unavailable', e);
    }
  };

  /**
   * Checks whether the user has previously completed the tour.
   */
  AmieleTourSystem.prototype.isCompleted = function () {
    try {
      return localStorage.getItem(this.storageKey) === 'true';
    } catch (e) {
      return false;
    }
  };

  /**
   * Resets tour progress in localStorage (useful for replay buttons).
   */
  AmieleTourSystem.prototype.resetTourState = function () {
    try {
      localStorage.removeItem(this.storageKey);
    } catch (e) {}
  };

  // ----------------------------------------------------------------------------
  // 4. FACTORY & GLOBAL SINGLETON
  // ----------------------------------------------------------------------------
  var instance = null;

  return {
    /**
     * Initializes and returns the tour singleton instance.
     */
    init: function (options) {
      if (!instance) {
        instance = new AmieleTourSystem(options);
        instance.initTour();
      }
      return instance;
    },

    /**
     * Triggers the tour manually (e.g. from a "Take Tour" or "Help" button).
     */
    start: function (force) {
      if (!instance) {
        this.init({ autoStart: false });
      }
      instance.startTour(typeof force === 'boolean' ? force : true);
    },

    /**
     * Resets completion state and restarts from step 1.
     */
    restart: function () {
      if (instance) {
        instance.resetTourState();
        instance.startTour(true);
      }
    },

    getInstance: function () {
      return instance;
    }
  };
});

