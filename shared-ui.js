/**
 * Amiele Begena — Shared UI Utilities
 * Reusable toast, modal, and empty-state helpers used across dashboard and admin.
 * Load this script BEFORE page-specific scripts (affiliate.js, admin.js).
 *
 * @module shared-ui
 */

/* =========================================================================
   1. TOAST NOTIFICATION ENGINE
   ========================================================================= */

/**
 * Display a slide-in toast notification.
 * @param {string} message — The message text (supports HTML entities).
 * @param {'success'|'error'|'info'|'warning'} [type='success'] — Visual variant.
 * @param {number} [duration=4500] — Auto-dismiss delay in ms.
 */
window.showToast = function (message, type = 'success', duration = 4500) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');

    const icons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        info: 'fa-info-circle',
        warning: 'fa-exclamation-triangle',
    };

    toast.innerHTML = `
        <i class="fas ${icons[type] || icons.success} toast-icon"></i>
        <div class="toast-body">${message}</div>
        <button class="toast-close" aria-label="Dismiss notification" onclick="this.parentElement.remove()">&times;</button>
    `;

    container.appendChild(toast);

    // Animate in
    requestAnimationFrame(() => {
        requestAnimationFrame(() => toast.classList.add('show'));
    });

    // Auto-dismiss
    const timer = setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400);
    }, duration);

    // Allow manual close to cancel timer
    toast.querySelector('.toast-close').addEventListener('click', () => clearTimeout(timer));
};

/* =========================================================================
   2. PROMISE-BASED CONFIRMATION MODAL
   ========================================================================= */

/**
 * Show a custom confirmation modal and return a promise.
 * @param {string} title — Modal heading text.
 * @param {string} body — Modal body (supports HTML).
 * @param {boolean} [isDanger=false] — Use red/danger styling.
 * @param {string} [confirmText='Confirm'] — Confirm button label.
 * @param {string} [cancelText='Cancel'] — Cancel button label.
 * @returns {Promise<boolean>} Resolves true on confirm, false on cancel.
 */
window.showConfirmModal = function (title, body, isDanger = false, confirmText = 'Confirm', cancelText = 'Cancel') {
    return new Promise((resolve) => {
        const backdrop = document.getElementById('custom-modal-backdrop');
        const header = document.getElementById('modal-header');
        const titleEl = document.getElementById('modal-title');
        const bodyEl = document.getElementById('modal-body');
        const confirmBtn = document.getElementById('modal-btn-confirm');
        const cancelBtn = document.getElementById('modal-btn-cancel');

        // Fallback to native confirm if DOM elements missing
        if (!backdrop || !confirmBtn || !cancelBtn) {
            resolve(confirm(body));
            return;
        }

        titleEl.textContent = title;
        bodyEl.innerHTML = body;
        confirmBtn.textContent = confirmText;
        cancelBtn.textContent = cancelText;

        if (isDanger) {
            header.classList.add('danger');
            confirmBtn.className = 'custom-modal-btn danger';
        } else {
            header.classList.remove('danger');
            confirmBtn.className = 'custom-modal-btn confirm';
        }

        backdrop.classList.add('show');
        confirmBtn.focus();

        const cleanup = (value) => {
            backdrop.classList.remove('show');
            confirmBtn.removeEventListener('click', onConfirm);
            cancelBtn.removeEventListener('click', onCancel);
            document.removeEventListener('keydown', onKey);
            resolve(value);
        };

        function onConfirm() { cleanup(true); }
        function onCancel() { cleanup(false); }
        function onKey(e) {
            if (e.key === 'Escape') cleanup(false);
        }

        confirmBtn.addEventListener('click', onConfirm);
        cancelBtn.addEventListener('click', onCancel);
        document.addEventListener('keydown', onKey);
    });
};

/* =========================================================================
   3. EMPTY STATE RENDERER
   ========================================================================= */

/**
 * Render a beautiful SVG-illustrated empty state inside a container.
 * @param {string} containerId — ID of the target DOM element.
 * @param {string} title — Heading text.
 * @param {string} desc — Description text.
 */
window.renderEmptyState = function (containerId, title, desc) {
    const el = document.getElementById(containerId);
    if (!el) return;

    const esc = window.AmieleSanitize ? window.AmieleSanitize.escapeHtml : function(v) { return v == null ? '' : String(v); };

    el.innerHTML = `
        <div class="empty-state-container">
            <svg class="empty-state-svg" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <circle cx="100" cy="100" r="80" fill="currentColor" opacity="0.06"/>
                <path d="M70 120H130M70 100H130M70 80H100" stroke="currentColor" stroke-width="6" stroke-linecap="round" opacity="0.4"/>
                <rect x="50" y="50" width="100" height="100" rx="12" stroke="currentColor" stroke-width="8" stroke-linejoin="round" opacity="0.3"/>
            </svg>
            <h3>${esc(title)}</h3>
            <p>${esc(desc)}</p>
        </div>
    `;
};

/* =========================================================================
   4. DARK MODE TOGGLE
   ========================================================================= */

/**
 * Toggle dark mode and persist preference.
 */
window.toggleDarkMode = function () {
    const html = document.documentElement;
    const isDark = html.getAttribute('data-theme') === 'dark';
    const newTheme = isDark ? 'light' : 'dark';
    html.setAttribute('data-theme', newTheme);
    localStorage.setItem('amiele_theme', newTheme);

    // Update toggle icon if present
    const icon = document.getElementById('theme-toggle-icon');
    if (icon) {
        icon.className = newTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    }

    showToast(newTheme === 'dark' ? 'Dark mode enabled' : 'Light mode enabled', 'info', 2000);
};

/**
 * Apply saved theme preference on page load.
 */
window.applySavedTheme = function () {
    const saved = localStorage.getItem('amiele_theme');
    if (saved === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        const icon = document.getElementById('theme-toggle-icon');
        if (icon) icon.className = 'fas fa-sun';
    }
};

// Auto-apply on script load
window.applySavedTheme();
