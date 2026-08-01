/**
 * Amiele Begena — Universal Notification Bell Component
 * Handles live unread badge, dropdown center, real-time WebSocket listening,
 * and automated click-to-navigate action flows.
 */

(function () {
    'use strict';

    /* ── Relative Time Formatter ─────────────────────────────────── */
    function formatRelativeTime(dateStr) {
        if (!dateStr) return '';
        try {
            const date = new Date(dateStr);
            const now = new Date();
            const diffSec = Math.floor((now - date) / 1000);

            if (diffSec < 60) return 'Just now';
            const diffMin = Math.floor(diffSec / 60);
            if (diffMin < 60) return `${diffMin} min ago`;
            const diffHr = Math.floor(diffMin / 60);
            if (diffHr < 24) return `${diffHr} ${diffHr === 1 ? 'hour' : 'hours'} ago`;
            const diffDays = Math.floor(diffHr / 24);
            if (diffDays === 1) return 'Yesterday';
            if (diffDays < 7) return `${diffDays} days ago`;

            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        } catch {
            return '';
        }
    }

    /* ── Type Icon Mapping ───────────────────────────────────────── */
    function getNotificationIcon(type) {
        const t = (type || '').toLowerCase();
        if (t.includes('order_created')) return 'fa-shopping-bag';
        if (t.includes('payment')) return 'fa-check-circle';
        if (t.includes('preparing')) return 'fa-scissors';
        if (t.includes('crafting')) return 'fa-hammer';
        if (t.includes('packed')) return 'fa-box';
        if (t.includes('shipped')) return 'fa-plane-departure';
        if (t.includes('delivered')) return 'fa-box-open';
        if (t.includes('commission')) return 'fa-coins';
        if (t.includes('withdrawal')) return 'fa-wallet';
        if (t.includes('affiliate')) return 'fa-user-check';
        if (t.includes('warning') || t.includes('stock')) return 'fa-exclamation-triangle';
        return 'fa-bell';
    }

    /* ── Click Navigation Target ─────────────────────────────────── */
    function getNavigationTarget(item) {
        const refType = (item.reference_type || '').toLowerCase();
        const type = (item.type || '').toLowerCase();
        const role = item.user_role || 'customer';

        if (refType === 'order') {
            if (role === 'admin' || window.location.pathname.includes('admin')) {
                return 'admin.html#orders';
            }
            return `track-order.html?order=${encodeURIComponent(item.reference_id || '')}`;
        }
        if (refType === 'withdrawal' || type.includes('withdrawal')) {
            if (role === 'admin' || window.location.pathname.includes('admin')) {
                return 'admin.html#withdrawals';
            }
            return 'affiliate-dashboard.html#withdrawals';
        }
        if (refType === 'commission' || type.includes('commission')) {
            return 'affiliate-dashboard.html#commissions';
        }
        if (refType === 'application' || type.includes('affiliate')) {
            return 'admin.html#affiliates';
        }
        return 'notifications.html';
    }

    /* ── Injected CSS Styles ──────────────────────────────────────── */
    function injectBellStyles() {
        if (document.getElementById('amiele-notif-bell-styles')) return;

        const style = document.createElement('style');
        style.id = 'amiele-notif-bell-styles';
        style.textContent = `
            .notif-bell-wrapper {
                position: relative;
                display: inline-block;
            }

            .notif-bell-btn {
                background: transparent;
                border: none;
                color: inherit;
                font-size: 1.15rem;
                cursor: pointer;
                padding: 8px;
                border-radius: 50%;
                position: relative;
                transition: background-color 0.2s, transform 0.2s;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .notif-bell-btn:hover {
                background: rgba(20, 35, 27, 0.08);
                transform: scale(1.05);
            }

            .notif-badge {
                position: absolute;
                top: 2px;
                right: 2px;
                background: linear-gradient(135deg, #D4AF37, #C49B2F);
                color: #FFFFFF;
                font-family: 'Outfit', sans-serif;
                font-size: 0.68rem;
                font-weight: 700;
                min-width: 18px;
                height: 18px;
                border-radius: 9px;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 0 4px;
                box-shadow: 0 2px 6px rgba(212, 175, 55, 0.4);
                border: 1.5px solid #FFFFFF;
                animation: notifPulse 2s infinite;
            }

            .notif-badge.hidden {
                display: none !important;
            }

            @keyframes notifPulse {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.1); }
            }

            /* Dropdown Menu */
            .notif-dropdown {
                display: none;
                position: absolute;
                top: calc(100% + 10px);
                right: -10px;
                width: 360px;
                max-width: 90vw;
                background: #FFFFFF;
                border-radius: 16px;
                box-shadow: 0 12px 40px rgba(20, 35, 27, 0.15), 0 4px 12px rgba(20, 35, 27, 0.08);
                border: 1px solid #eeebe1;
                z-index: 9999;
                overflow: hidden;
                animation: notifSlideDown 0.25s cubic-bezier(0.16, 1, 0.3, 1);
            }

            .notif-dropdown.show {
                display: block;
            }

            @keyframes notifSlideDown {
                from { opacity: 0; transform: translateY(-8px); }
                to { opacity: 1; transform: translateY(0); }
            }

            .notif-dropdown-header {
                padding: 16px 20px;
                background: linear-gradient(135deg, #14231b, #1e3328);
                color: #FFFFFF;
                display: flex;
                align-items: center;
                justify-content: space-between;
            }

            .notif-dropdown-header h3 {
                font-family: 'Benaiah', 'Cormorant Garamond', serif;
                font-size: 1.15rem;
                font-weight: 500;
                margin: 0;
                color: #FFFFFF;
            }

            .notif-header-actions {
                display: flex;
                align-items: center;
                gap: 12px;
            }

            .notif-btn-text {
                background: none;
                border: none;
                color: rgba(255, 255, 255, 0.75);
                font-family: 'Outfit', sans-serif;
                font-size: 0.72rem;
                font-weight: 600;
                cursor: pointer;
                text-decoration: none;
                padding: 0;
                transition: color 0.2s;
            }

            .notif-btn-text:hover {
                color: #FFFFFF;
                text-decoration: underline;
            }

            .notif-btn-text.gold {
                color: #D4AF37;
            }

            .notif-dropdown-body {
                max-height: 380px;
                overflow-y: auto;
            }

            .notif-dropdown-body::-webkit-scrollbar {
                width: 5px;
            }

            .notif-dropdown-body::-webkit-scrollbar-thumb {
                background: #eeebe1;
                border-radius: 3px;
            }

            .notif-item {
                padding: 14px 18px;
                border-bottom: 1px solid #f4f2ea;
                display: flex;
                align-items: flex-start;
                gap: 12px;
                cursor: pointer;
                transition: background-color 0.2s;
                position: relative;
                text-decoration: none;
                color: inherit;
            }

            .notif-item:last-child {
                border-bottom: none;
            }

            .notif-item:hover {
                background: #F9F8F4;
            }

            .notif-item.unread {
                background: rgba(212, 175, 55, 0.04);
            }

            .notif-item.unread::before {
                content: '';
                position: absolute;
                left: 6px;
                top: 18px;
                width: 7px;
                height: 7px;
                border-radius: 50%;
                background: #D4AF37;
            }

            .notif-item.read::before {
                content: '';
                position: absolute;
                left: 6px;
                top: 18px;
                width: 7px;
                height: 7px;
                border-radius: 50%;
                background: #d0cece;
            }

            .notif-item-icon {
                width: 36px;
                height: 36px;
                border-radius: 50%;
                background: #F9F8F4;
                color: #14231b;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 0.85rem;
                flex-shrink: 0;
                border: 1px solid #eeebe1;
            }

            .notif-item.unread .notif-item-icon {
                background: rgba(212, 175, 55, 0.12);
                color: #D4AF37;
                border-color: rgba(212, 175, 55, 0.3);
            }

            .notif-item-content {
                flex: 1;
                min-width: 0;
            }

            .notif-item-title {
                font-family: 'Benaiah', 'Outfit', sans-serif;
                font-size: 0.92rem;
                font-weight: 600;
                color: #14231b;
                margin-bottom: 3px;
                line-height: 1.3;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }

            .notif-item-msg {
                font-family: 'Outfit', sans-serif;
                font-size: 0.78rem;
                color: #6a6e6b;
                margin-bottom: 4px;
                line-height: 1.4;
                display: -webkit-box;
                -webkit-line-clamp: 2;
                -webkit-box-orient: vertical;
                overflow: hidden;
            }

            .notif-item-time {
                font-family: 'Outfit', sans-serif;
                font-size: 0.7rem;
                color: #9a9d96;
            }

            .notif-dropdown-footer {
                padding: 12px;
                text-align: center;
                background: #F9F8F4;
                border-top: 1px solid #eeebe1;
            }

            .notif-dropdown-footer a {
                font-family: 'Benaiah', 'Outfit', sans-serif;
                font-size: 0.85rem;
                font-weight: 600;
                color: #14231b;
                text-decoration: none;
                transition: color 0.2s;
            }

            .notif-dropdown-footer a:hover {
                color: #D4AF37;
            }

            .notif-empty {
                padding: 36px 20px;
                text-align: center;
                color: #9a9d96;
            }

            .notif-empty i {
                font-size: 2rem;
                color: #d0cece;
                margin-bottom: 8px;
            }

            .notif-empty p {
                font-family: 'Outfit', sans-serif;
                font-size: 0.82rem;
                margin: 0;
            }
        `;
        document.head.appendChild(style);
    }

    /* ── Notification Bell Component Class ───────────────────────── */
    class NotificationBellComponent {
        constructor(containerEl) {
            this.container = containerEl;
            this.unreadCount = 0;
            this.notifications = [];
            this.isOpen = false;
            this._unsubscribeRealtime = null;

            this.init();
        }

        async init() {
            injectBellStyles();

            // Build DOM structure
            this.container.innerHTML = `
                <div class="notif-bell-wrapper" id="notif-bell-wrapper">
                    <button class="notif-bell-btn" id="notif-bell-btn" aria-label="Notifications" aria-expanded="false" aria-haspopup="dialog" title="Notifications">
                        <i class="fas fa-bell"></i>
                        <span class="notif-badge hidden" id="notif-badge">0</span>
                    </button>
                    <div class="notif-dropdown" id="notif-dropdown" role="dialog" aria-label="Notifications" aria-hidden="true">
                        <div class="notif-dropdown-header">
                            <h3>Notifications</h3>
                            <div class="notif-header-actions">
                                <button class="notif-btn-text" id="notif-mark-all">Mark all read</button>
                                <a href="notifications.html" class="notif-btn-text gold">Notification Center &rarr;</a>
                            </div>
                        </div>
                        <div class="notif-dropdown-body" id="notif-dropdown-list">
                            <div class="notif-empty">
                                <i class="fas fa-spinner fa-spin"></i>
                                <p>Loading notifications...</p>
                            </div>
                        </div>
                        <div class="notif-dropdown-footer">
                            <a href="notifications.html">View All Notifications</a>
                        </div>
                    </div>
                </div>
            `;

            this.bellBtn = this.container.querySelector('#notif-bell-btn');
            this.badgeEl = this.container.querySelector('#notif-badge');
            this.dropdownEl = this.container.querySelector('#notif-dropdown');
            this.listEl = this.container.querySelector('#notif-dropdown-list');
            this.markAllBtn = this.container.querySelector('#notif-mark-all');

            // Attach event listeners
            this.bellBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleDropdown();
            });

            this.markAllBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                if (window.NotificationsService) {
                    await window.NotificationsService.markAllAsRead();
                    this.refresh();
                }
            });

            // Close on click outside
            document.addEventListener('click', (e) => {
                if (this.isOpen && !this.container.contains(e.target)) {
                    this.closeDropdown();
                }
            });

            // ESC key to close
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && this.isOpen) {
                    this.closeDropdown();
                }
            });

            // Initial fetch
            await this.refresh();

            // Subscribe to Supabase Realtime
            if (window.NotificationsService) {
                this._unsubscribeRealtime = window.NotificationsService.subscribeToRealtime(() => {
                    this.refresh();
                });
            }
        }

        toggleDropdown() {
            if (this.isOpen) {
                this.closeDropdown();
            } else {
                this.openDropdown();
            }
        }

        openDropdown() {
            this.isOpen = true;
            this.dropdownEl.classList.add('show');
            this.bellBtn.setAttribute('aria-expanded', 'true');
            this.dropdownEl.setAttribute('aria-hidden', 'false');
            this.refresh();
            // Trap focus inside the dropdown
            this._trapFocus();
        }

        closeDropdown() {
            this.isOpen = false;
            this.dropdownEl.classList.remove('show');
            this.bellBtn.setAttribute('aria-expanded', 'false');
            this.dropdownEl.setAttribute('aria-hidden', 'true');
            // Return focus to bell
            this.bellBtn.focus();
            this._releaseFocus();
        }

        _trapFocus() {
            this._focusHandler = (e) => {
                if (e.key !== 'Tab') return;
                const focusable = this.dropdownEl.querySelectorAll(
                    'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
                );
                if (!focusable.length) return;
                const first = focusable[0];
                const last = focusable[focusable.length - 1];
                if (e.shiftKey && document.activeElement === first) {
                    e.preventDefault();
                    last.focus();
                } else if (!e.shiftKey && document.activeElement === last) {
                    e.preventDefault();
                    first.focus();
                }
            };
            document.addEventListener('keydown', this._focusHandler);
        }

        _releaseFocus() {
            if (this._focusHandler) {
                document.removeEventListener('keydown', this._focusHandler);
                this._focusHandler = null;
            }
        }

        async refresh() {
            if (!window.NotificationsService) return;

            const res = await window.NotificationsService.getNotifications({ page: 1, limit: 10 });
            if (res.success) {
                this.notifications = res.notifications || [];
                this.unreadCount = res.unreadCount || 0;
                this.updateBadge();
                this.renderList();
            }
        }

        updateBadge() {
            if (this.unreadCount > 0) {
                this.badgeEl.textContent = this.unreadCount > 99 ? '99+' : this.unreadCount;
                this.badgeEl.classList.remove('hidden');
            } else {
                this.badgeEl.classList.add('hidden');
            }
        }

        renderList() {
            if (!this.notifications.length) {
                this.listEl.innerHTML = `
                    <div class="notif-empty">
                        <i class="fas fa-bell-slash"></i>
                        <p>No notifications yet</p>
                    </div>
                `;
                return;
            }

            const esc = window.AmieleSanitize
                ? window.AmieleSanitize.escapeHtml
                : function (v) { return v == null ? '' : String(v).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); };

            this.listEl.innerHTML = this.notifications.map((item) => {
                const isUnread = !item.is_read;
                const iconClass = getNotificationIcon(item.type);
                const relTime = formatRelativeTime(item.created_at);

                return `
                    <div class="notif-item ${isUnread ? 'unread' : 'read'}" data-id="${item.id}">
                        <div class="notif-item-icon">
                            <i class="fas ${iconClass}"></i>
                        </div>
                        <div class="notif-item-content">
                            <div class="notif-item-title">${esc(item.title)}</div>
                            <div class="notif-item-msg">${esc(item.message)}</div>
                            <div class="notif-item-time">${relTime}</div>
                        </div>
                    </div>
                `;
            }).join('');

            // Add click listeners to items
            this.listEl.querySelectorAll('.notif-item').forEach((el) => {
                el.addEventListener('click', async () => {
                    const id = el.getAttribute('data-id');
                    const item = this.notifications.find(n => n.id === id);

                    if (item && window.NotificationsService) {
                        await window.NotificationsService.markAsRead(id);
                    }

                    this.closeDropdown();

                    if (item) {
                        const targetUrl = getNavigationTarget(item);
                        window.location.href = targetUrl;
                    }
                });
            });
        }
    }

    /**
     * Auto-mount bell into `.nav-right` or `#notification-bell-mount` on DOMContentLoaded.
     */
    function autoMountNotificationBell() {
        const mount = document.getElementById('notification-bell-mount');
        if (mount) {
            window.amieleNotifBell = new NotificationBellComponent(mount);
            return;
        }

        // Search for .nav-right or header navbar
        const navRight = document.querySelector('.nav-right, .aff-header-right');
        if (navRight && !document.getElementById('notif-bell-wrapper')) {
            const wrapper = document.createElement('div');
            wrapper.id = 'notification-bell-mount';

            // Insert before cart button or user icon if exists
            const cartBtn = navRight.querySelector('#cart-button, .hamburger-btn');
            if (cartBtn) {
                navRight.insertBefore(wrapper, cartBtn);
            } else {
                navRight.appendChild(wrapper);
            }

            window.amieleNotifBell = new NotificationBellComponent(wrapper);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', autoMountNotificationBell);
    } else {
        autoMountNotificationBell();
    }

    window.NotificationBellComponent = NotificationBellComponent;
})();
