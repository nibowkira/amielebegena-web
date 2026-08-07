/**
 * ═══════════════════════════════════════════════════════════════════════════════
 *   AMIELE BEGENA — Premium Affiliate Dashboard Onboarding Tour
 *   A refined, accessible, collision-aware product tour component.
 * ═══════════════════════════════════════════════════════════════════════════════
 */
(function () {
    'use strict';

    // ── CONFIGURATION ────────────────────────────────────────────────────────
    var STORAGE_KEY_PREFIX = 'amiele_affiliate_tour_completed_';
    var VIEWPORT_MARGIN = 20;
    var ARROW_SIZE = 12;
    var TRANSITION_MS = 220;
    var CARD_WIDTH = 390;

    var TOUR_STEPS = [
        {
            target: '.aff-menu-item.active',
            fallback: '.aff-sidebar-menu',
            title: 'Your Affiliate Hub',
            desc: 'See your earnings, referrals, clicks, paid orders, and overall performance from one place.',
            preferredPlacement: 'right'
        },
        {
            target: '.aff-menu-item[onclick*="referral"]',
            fallback: '.aff-sidebar-menu li:nth-child(2)',
            title: 'Referral Center',
            desc: 'Create and manage your referral links, QR codes, and share them with your audience.',
            preferredPlacement: 'right'
        },
        {
            target: '.aff-menu-item[onclick*="commissions"]',
            fallback: '.aff-sidebar-menu li:nth-child(3)',
            title: 'Commissions',
            desc: 'Track every commission generated from your successful referrals in real time.',
            preferredPlacement: 'right'
        },
        {
            target: '.aff-menu-item[onclick*="withdrawals"]',
            fallback: '.aff-sidebar-menu li:nth-child(4)',
            title: 'Payouts',
            desc: 'Request withdrawals and track payout history. Receive earnings via your preferred method.',
            preferredPlacement: 'right'
        },
        {
            target: '.aff-menu-item[onclick*="performance"]',
            fallback: '.aff-sidebar-menu li:nth-child(5)',
            title: 'Performance Report',
            desc: 'Analyze your conversion rates, click trends, and download monthly performance reports.',
            preferredPlacement: 'right'
        },
        {
            target: '.aff-menu-item[onclick*="marketing"]',
            fallback: '.aff-sidebar-menu li:nth-child(6)',
            title: 'Marketing Center',
            desc: 'Access branded banners, social media assets, and promotional materials to boost referrals.',
            preferredPlacement: 'right'
        },
        {
            target: '.aff-menu-item[onclick*="campaigns"]',
            fallback: '.aff-sidebar-menu li:nth-child(7)',
            title: 'Bonus Campaigns',
            desc: 'Join limited-time challenges and earn bonus rewards on top of your regular commissions.',
            preferredPlacement: 'right'
        },
        {
            target: '.aff-menu-item[onclick*="settings"]',
            fallback: '.aff-sidebar-menu li:nth-child(10)',
            title: 'Settings',
            desc: 'Update your profile, payment preferences, notification settings, and manage your account.',
            preferredPlacement: 'right'
        }
    ];

    // ── STATE ─────────────────────────────────────────────────────────────────
    var currentStep = 0;
    var totalSteps = TOUR_STEPS.length;
    var isActive = false;
    var triggerElement = null;
    var elements = {};

    // ── DOM CREATION ─────────────────────────────────────────────────────────
    function createTourDOM() {
        // Overlay
        var overlay = document.createElement('div');
        overlay.className = 'amiele-tour-overlay';
        overlay.id = 'amiele-tour-overlay';
        overlay.addEventListener('click', function (e) {
            if (e.target === overlay) endTour(true);
        });

        // Spotlight ring
        var ring = document.createElement('div');
        ring.className = 'amiele-tour-spotlight-ring';
        ring.id = 'amiele-tour-spotlight-ring';

        // Card
        var card = document.createElement('div');
        card.className = 'amiele-tour-card';
        card.id = 'amiele-tour-card';
        card.setAttribute('role', 'dialog');
        card.setAttribute('aria-modal', 'true');
        card.setAttribute('aria-labelledby', 'amiele-tour-title');
        card.setAttribute('aria-describedby', 'amiele-tour-desc');

        card.innerHTML =
            '<div class="amiele-tour-arrow" id="amiele-tour-arrow"></div>' +
            '<div class="amiele-tour-header">' +
                '<span class="amiele-tour-step-badge" id="amiele-tour-step-badge"></span>' +
                '<button class="amiele-tour-close-btn" id="amiele-tour-close-btn" aria-label="Close tour" title="Close tour">&times;</button>' +
            '</div>' +
            '<h3 class="amiele-tour-title" id="amiele-tour-title"></h3>' +
            '<p class="amiele-tour-desc" id="amiele-tour-desc"></p>' +
            '<div class="amiele-tour-progress-bar">' +
                '<div class="amiele-tour-progress-fill" id="amiele-tour-progress-fill"></div>' +
            '</div>' +
            '<div class="amiele-tour-footer">' +
                '<div class="amiele-tour-left-btns">' +
                    '<button class="amiele-tour-btn amiele-tour-btn-skip" id="amiele-tour-btn-skip">Skip Tour</button>' +
                    '<button class="amiele-tour-btn amiele-tour-btn-back" id="amiele-tour-btn-back"><i class="fas fa-arrow-left"></i> Back</button>' +
                '</div>' +
                '<button class="amiele-tour-btn amiele-tour-btn-next" id="amiele-tour-btn-next">Next <i class="fas fa-arrow-right"></i></button>' +
            '</div>';

        document.body.appendChild(overlay);
        document.body.appendChild(ring);
        document.body.appendChild(card);

        elements.overlay = overlay;
        elements.ring = ring;
        elements.card = card;
        elements.arrow = document.getElementById('amiele-tour-arrow');
        elements.badge = document.getElementById('amiele-tour-step-badge');
        elements.title = document.getElementById('amiele-tour-title');
        elements.desc = document.getElementById('amiele-tour-desc');
        elements.progress = document.getElementById('amiele-tour-progress-fill');
        elements.btnSkip = document.getElementById('amiele-tour-btn-skip');
        elements.btnBack = document.getElementById('amiele-tour-btn-back');
        elements.btnNext = document.getElementById('amiele-tour-btn-next');
        elements.closeBtn = document.getElementById('amiele-tour-close-btn');

        // Event listeners
        elements.btnNext.addEventListener('click', nextStep);
        elements.btnBack.addEventListener('click', prevStep);
        elements.btnSkip.addEventListener('click', function () { endTour(true); });
        elements.closeBtn.addEventListener('click', function () { endTour(true); });
    }

    // ── TARGET RESOLUTION ────────────────────────────────────────────────────
    function resolveTarget(step) {
        var el = document.querySelector(step.target);
        if (el && el.offsetParent !== null) return el;
        if (step.fallback) {
            el = document.querySelector(step.fallback);
            if (el && el.offsetParent !== null) return el;
        }
        return null;
    }

    // ── COLLISION-AWARE POSITIONING ──────────────────────────────────────────
    function computePlacement(targetRect, cardW, cardH, preferred) {
        var vw = window.innerWidth;
        var vh = window.innerHeight;
        var gap = ARROW_SIZE + 8;
        var placements = [];

        // Build candidates in preferred order
        var order = [preferred, 'right', 'left', 'bottom', 'top'];
        var seen = {};
        for (var i = 0; i < order.length; i++) {
            if (!seen[order[i]]) {
                placements.push(order[i]);
                seen[order[i]] = true;
            }
        }

        for (var p = 0; p < placements.length; p++) {
            var placement = placements[p];
            var top, left;

            if (placement === 'right') {
                left = targetRect.right + gap;
                top = targetRect.top + (targetRect.height / 2) - 40;
            } else if (placement === 'left') {
                left = targetRect.left - cardW - gap;
                top = targetRect.top + (targetRect.height / 2) - 40;
            } else if (placement === 'bottom') {
                top = targetRect.bottom + gap;
                left = targetRect.left + (targetRect.width / 2) - (cardW / 2);
            } else { // top
                top = targetRect.top - cardH - gap;
                left = targetRect.left + (targetRect.width / 2) - (cardW / 2);
            }

            // Clamp within viewport
            left = Math.max(VIEWPORT_MARGIN, Math.min(left, vw - cardW - VIEWPORT_MARGIN));
            top = Math.max(VIEWPORT_MARGIN, Math.min(top, vh - cardH - VIEWPORT_MARGIN));

            // Check if it fits without overlapping target
            var fits = true;
            if (placement === 'right' && targetRect.right + gap + cardW > vw - VIEWPORT_MARGIN) fits = false;
            if (placement === 'left' && targetRect.left - gap - cardW < VIEWPORT_MARGIN) fits = false;
            if (placement === 'bottom' && targetRect.bottom + gap + cardH > vh - VIEWPORT_MARGIN) fits = false;
            if (placement === 'top' && targetRect.top - gap - cardH < VIEWPORT_MARGIN) fits = false;

            if (fits) {
                return { top: top, left: left, placement: placement };
            }
        }

        // Last resort: bottom, clamped
        var fallbackTop = targetRect.bottom + gap;
        var fallbackLeft = Math.max(VIEWPORT_MARGIN, Math.min(targetRect.left, vw - cardW - VIEWPORT_MARGIN));
        fallbackTop = Math.max(VIEWPORT_MARGIN, Math.min(fallbackTop, vh - cardH - VIEWPORT_MARGIN));
        return { top: fallbackTop, left: fallbackLeft, placement: 'bottom' };
    }

    function positionArrow(placement, targetRect, cardRect) {
        var arrow = elements.arrow;
        // Reset
        arrow.style.top = '';
        arrow.style.bottom = '';
        arrow.style.left = '';
        arrow.style.right = '';

        if (placement === 'right') {
            arrow.style.left = '-7px';
            var arrowTop = targetRect.top + targetRect.height / 2 - cardRect.top;
            arrowTop = Math.max(16, Math.min(arrowTop, cardRect.height - 28));
            arrow.style.top = arrowTop + 'px';
        } else if (placement === 'left') {
            arrow.style.right = '-7px';
            var arrowTop2 = targetRect.top + targetRect.height / 2 - cardRect.top;
            arrowTop2 = Math.max(16, Math.min(arrowTop2, cardRect.height - 28));
            arrow.style.top = arrowTop2 + 'px';
        } else if (placement === 'bottom') {
            arrow.style.top = '-7px';
            var arrowLeft = targetRect.left + targetRect.width / 2 - cardRect.left;
            arrowLeft = Math.max(20, Math.min(arrowLeft, cardRect.width - 32));
            arrow.style.left = arrowLeft + 'px';
        } else { // top
            arrow.style.bottom = '-7px';
            var arrowLeft2 = targetRect.left + targetRect.width / 2 - cardRect.left;
            arrowLeft2 = Math.max(20, Math.min(arrowLeft2, cardRect.width - 32));
            arrow.style.left = arrowLeft2 + 'px';
        }
    }

    // ── SPOTLIGHT ─────────────────────────────────────────────────────────────
    var previousTarget = null;

    function highlightTarget(el) {
        // Clear previous
        if (previousTarget) {
            previousTarget.style.removeProperty('z-index');
            previousTarget.style.removeProperty('position');
        }

        if (!el) {
            elements.ring.classList.remove('active');
            previousTarget = null;
            return;
        }

        // Scroll into view if needed
        var elRect = el.getBoundingClientRect();
        if (elRect.top < 0 || elRect.bottom > window.innerHeight) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }

        // Slight delay for scroll
        setTimeout(function () {
            var rect = el.getBoundingClientRect();
            var pad = 6;

            elements.ring.style.top = (rect.top - pad) + 'px';
            elements.ring.style.left = (rect.left - pad) + 'px';
            elements.ring.style.width = (rect.width + pad * 2) + 'px';
            elements.ring.style.height = (rect.height + pad * 2) + 'px';
            elements.ring.classList.add('active');

            // Lift target above overlay
            var computedPos = window.getComputedStyle(el).position;
            if (computedPos === 'static') {
                el.style.position = 'relative';
            }
            el.style.zIndex = '100002';
            previousTarget = el;
        }, 60);
    }

    // ── SHOW STEP ────────────────────────────────────────────────────────────
    function showStep(index) {
        if (index < 0 || index >= totalSteps) return;
        currentStep = index;

        var step = TOUR_STEPS[index];
        var target = resolveTarget(step);

        // Skip missing targets gracefully
        if (!target) {
            if (index < totalSteps - 1) {
                showStep(index + 1);
            } else {
                endTour(false);
            }
            return;
        }

        // On mobile, ensure sidebar is visible for sidebar steps
        if (window.innerWidth <= 1024 && step.preferredPlacement === 'right') {
            var sidebar = document.querySelector('.aff-sidebar');
            if (sidebar && !sidebar.classList.contains('mobile-open')) {
                sidebar.classList.add('mobile-open');
                var sOverlay = document.querySelector('.aff-sidebar-overlay');
                if (sOverlay) sOverlay.classList.add('active');
            }
        }

        // Update card content
        elements.badge.textContent = 'STEP ' + (index + 1) + ' OF ' + totalSteps;
        elements.title.textContent = step.title;
        elements.desc.textContent = step.desc;

        // Progress bar
        var pct = ((index + 1) / totalSteps) * 100;
        elements.progress.style.width = pct + '%';

        // Back button visibility
        elements.btnBack.style.display = index === 0 ? 'none' : 'inline-flex';

        // Next/Finish button
        if (index === totalSteps - 1) {
            elements.btnNext.innerHTML = 'Finish Tour <i class="fas fa-check"></i>';
        } else {
            elements.btnNext.innerHTML = 'Next <i class="fas fa-arrow-right"></i>';
        }

        // Highlight
        highlightTarget(target);

        // Position card after highlight settles
        setTimeout(function () {
            positionCard(target, step);
        }, 100);
    }

    function positionCard(target, step) {
        var card = elements.card;
        var isMobile = window.innerWidth <= 767;

        // Temporarily show card to measure height
        card.style.visibility = 'hidden';
        card.style.opacity = '0';
        card.classList.add('active');

        var cardRect = card.getBoundingClientRect();
        var cardH = cardRect.height;
        var cardW = isMobile ? (window.innerWidth - 24) : Math.min(CARD_WIDTH, window.innerWidth - 32);

        card.style.width = cardW + 'px';

        if (isMobile) {
            // Mobile: position below or above target, centered horizontally
            var targetRect = target.getBoundingClientRect();
            var mTop = targetRect.bottom + 16;
            if (mTop + cardH > window.innerHeight - VIEWPORT_MARGIN) {
                mTop = Math.max(VIEWPORT_MARGIN, targetRect.top - cardH - 16);
            }
            card.style.top = mTop + 'px';
            card.style.left = '12px';
            card.setAttribute('data-placement', 'bottom');
            elements.arrow.style.display = 'none';
        } else {
            var targetRect2 = target.getBoundingClientRect();
            var pos = computePlacement(targetRect2, cardW, cardH, step.preferredPlacement);

            card.style.top = pos.top + 'px';
            card.style.left = pos.left + 'px';
            card.setAttribute('data-placement', pos.placement);
            elements.arrow.style.display = '';

            // Position arrow dynamically
            var newCardRect = { top: pos.top, left: pos.left, width: cardW, height: cardH };
            positionArrow(pos.placement, targetRect2, newCardRect);
        }

        // Animate in
        card.style.visibility = '';
        card.style.opacity = '';

        // Focus management
        elements.btnNext.focus();
    }

    // ── NAVIGATION ───────────────────────────────────────────────────────────
    function nextStep() {
        if (currentStep >= totalSteps - 1) {
            endTour(false);
        } else {
            showStep(currentStep + 1);
        }
    }

    function prevStep() {
        if (currentStep > 0) {
            showStep(currentStep - 1);
        }
    }

    // ── START / END ──────────────────────────────────────────────────────────
    function startTour() {
        if (isActive) return;
        isActive = true;
        currentStep = 0;

        triggerElement = document.activeElement;

        if (!elements.overlay) {
            createTourDOM();
        }

        elements.overlay.classList.add('active');
        elements.card.classList.add('active');

        // Bind keyboard
        document.addEventListener('keydown', handleKeyboard);

        showStep(0);
    }

    function endTour(skipped) {
        isActive = false;

        // Clear highlight
        highlightTarget(null);

        // Hide elements
        if (elements.overlay) elements.overlay.classList.remove('active');
        if (elements.card) elements.card.classList.remove('active');
        if (elements.ring) elements.ring.classList.remove('active');

        // Persist completion
        var userId = getStorageUserId();
        if (userId) {
            try {
                localStorage.setItem(STORAGE_KEY_PREFIX + userId, 'true');
            } catch (e) { /* storage full, silently ignore */ }
        }

        // Unbind keyboard
        document.removeEventListener('keydown', handleKeyboard);

        // Return focus
        if (triggerElement && typeof triggerElement.focus === 'function') {
            triggerElement.focus();
        }

        // Close mobile sidebar if we opened it
        if (window.innerWidth <= 1024) {
            var sidebar = document.querySelector('.aff-sidebar');
            if (sidebar) sidebar.classList.remove('mobile-open');
            var sOverlay = document.querySelector('.aff-sidebar-overlay');
            if (sOverlay) sOverlay.classList.remove('active');
            document.body.classList.remove('sidebar-open');
        }

        // Toast feedback
        if (!skipped && typeof window.showToast === 'function') {
            window.showToast('Welcome aboard! Explore your dashboard. Press ? for keyboard shortcuts.', 'success');
        }
    }

    // ── KEYBOARD ─────────────────────────────────────────────────────────────
    function handleKeyboard(e) {
        if (!isActive) return;

        if (e.key === 'Escape') {
            e.preventDefault();
            e.stopPropagation();
            endTour(true);
            return;
        }

        if (e.key === 'ArrowRight' || e.key === 'Enter') {
            e.preventDefault();
            nextStep();
            return;
        }

        if (e.key === 'ArrowLeft') {
            e.preventDefault();
            prevStep();
            return;
        }

        // Tab trap
        if (e.key === 'Tab') {
            var focusable = elements.card.querySelectorAll('button:not([style*="display: none"]):not([style*="display:none"])');
            if (focusable.length === 0) return;

            var first = focusable[0];
            var last = focusable[focusable.length - 1];

            if (e.shiftKey) {
                if (document.activeElement === first) {
                    e.preventDefault();
                    last.focus();
                }
            } else {
                if (document.activeElement === last) {
                    e.preventDefault();
                    first.focus();
                }
            }
        }
    }

    // ── RESIZE HANDLER ───────────────────────────────────────────────────────
    var resizeTimer;
    window.addEventListener('resize', function () {
        if (!isActive) return;
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(function () {
            showStep(currentStep);
        }, 150);
    });

    // ── STORAGE HELPERS ──────────────────────────────────────────────────────
    function getStorageUserId() {
        // Try to get user ID from the global scope
        if (window._amieleTourUserId) return window._amieleTourUserId;
        try {
            var user = JSON.parse(localStorage.getItem('amiele_current_user') || '{}');
            return user.id || 'anon';
        } catch (e) {
            return 'anon';
        }
    }

    function isTourCompleted() {
        var userId = getStorageUserId();
        try {
            return localStorage.getItem(STORAGE_KEY_PREFIX + userId) === 'true';
        } catch (e) {
            return false;
        }
    }

    // ── PUBLIC API ───────────────────────────────────────────────────────────
    window.AmieleTour = {
        start: function (userId) {
            if (userId) window._amieleTourUserId = userId;
            startTour();
        },
        restart: function (userId) {
            if (userId) {
                window._amieleTourUserId = userId;
                try { localStorage.removeItem(STORAGE_KEY_PREFIX + userId); } catch (e) {}
            }
            startTour();
        },
        isCompleted: isTourCompleted,
        autoStart: function (userId) {
            if (userId) window._amieleTourUserId = userId;
            if (!isTourCompleted()) {
                // Delay so dashboard fully renders
                setTimeout(function () { startTour(); }, 1200);
            }
        }
    };

    // Backward compat: expose globals for old tour references
    window._tourNext = nextStep;
    window._tourSkip = function () { endTour(true); };

})();
