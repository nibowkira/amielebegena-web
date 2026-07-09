document.addEventListener('DOMContentLoaded', async () => {
    // 1. Guard check
    const user = await window.getCurrentUser();
    if (!user || user.role !== 'admin') {
        window.location.href = 'login.html';
        return;
    }

    // Tab switcher
    window.switchAdminTab = function(tabName) {
        document.querySelectorAll('.aff-menu-item').forEach(item => {
            item.classList.remove('active');
        });
        const activeMenuItem = document.querySelector(`.aff-menu-item[onclick*="${tabName}"]`);
        if (activeMenuItem) activeMenuItem.classList.add('active');

        document.querySelectorAll('.aff-tab-pane').forEach(pane => {
            pane.classList.remove('active');
        });
        const activePane = document.getElementById(`tab-${tabName}`);
        if (activePane) activePane.classList.add('active');

        // Dynamic loads
        if (tabName === 'dashboard') renderDashboardStats();
        if (tabName === 'users') renderUsersList();
        if (tabName === 'applications') renderApplicationsQueue();
        if (tabName === 'commissions') renderCommissionsQueue();
        if (tabName === 'withdrawals') renderWithdrawalsQueue();
        if (tabName === 'campaigns') renderCampaignsList();
        if (tabName === 'announcements') renderAnnouncementsList();
    };

    // 2. Dashboard Analytics Overview
    function renderDashboardStats() {
        const users = AmieleDB.getUsers();
        const apps = AmieleDB.getApplications();
        const affiliates = AmieleDB.getAffiliates();
        const commissions = JSON.parse(localStorage.getItem('amiele_commissions')) || [];
        const withdrawals = JSON.parse(localStorage.getItem('amiele_withdrawals')) || [];

        document.getElementById('admin-stat-users').textContent = users.length;
        document.getElementById('admin-stat-apps').textContent = apps.filter(a => a.status === 'pending').length;
        document.getElementById('admin-stat-affiliates').textContent = affiliates.length;
        
        const totalEarnings = commissions.filter(c => c.status === 'approved' || c.status === 'paid').reduce((sum, c) => sum + c.commissionAmount, 0);
        document.getElementById('admin-stat-payouts').textContent = `ETB ${totalEarnings.toLocaleString()}`;
    }

    // 3. User Management
    function renderUsersList() {
        const tbody = document.getElementById('users-table-body');
        if (!tbody) return;

        const users = AmieleDB.getUsers();
        tbody.innerHTML = '';

        users.forEach(u => {
            const date = new Date(u.joinedAt).toLocaleDateString();
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><strong>${u.id}</strong></td>
                <td>${u.name}</td>
                <td>${u.email}</td>
                <td><span class="aff-badge ${u.role === 'admin' ? 'paid' : u.role === 'affiliate' ? 'approved' : 'pending'}">${u.role}</span></td>
                <td>${date}</td>
                <td>
                    <select class="aff-select" style="padding:0.4rem; font-size:0.8rem; width:auto;" onchange="changeUserRole('${u.id}', this.value)">
                        <option value="user" ${u.role === 'user' ? 'selected' : ''}>User</option>
                        <option value="affiliate" ${u.role === 'affiliate' ? 'selected' : ''}>Affiliate</option>
                        <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>Admin</option>
                    </select>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    window.changeUserRole = async function(userId, newRole) {
        const confirmed = await showConfirmModal('Modify User Role', `Are you sure you want to change this user's role to <strong>${newRole}</strong>?`);
        if (!confirmed) {
            renderUsersList(); // restore
            return;
        }

        const users = AmieleDB.getUsers();
        const u = users.find(user => user.id === userId);
        if (u) {
            u.role = newRole;
            AmieleDB.saveUsers(users);
            showToast(`User role updated to ${newRole}!`, 'success');
            renderUsersList();
        }
    };

    // 4. Affiliate Applications Queue
    function renderApplicationsQueue() {
        const tbody = document.getElementById('apps-table-body');
        if (!tbody) return;

        const apps = AmieleDB.getApplications();
        tbody.innerHTML = '';

        const pendingApps = apps.filter(a => a.status === 'pending');

        if (pendingApps.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding: 3rem 0; color: var(--aff-text-muted);">No pending applications in queue. / በመጠባበቅ ላይ ያለ ማመልከቻ የለም።</td></tr>';
            return;
        }

        pendingApps.forEach(a => {
            const date = new Date(a.submittedAt).toLocaleDateString();
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><strong>${a.id}</strong></td>
                <td>${a.name}</td>
                <td>${a.phone}<br>${a.country}</td>
                <td>
                    ${a.socials.instagram ? `<a href="${a.socials.instagram}" target="_blank">Insta</a><br>` : ''}
                    ${a.socials.tiktok ? `<a href="${a.socials.tiktok}" target="_blank">TikTok</a><br>` : ''}
                    ${a.socials.youtube ? `<a href="${a.socials.youtube}" target="_blank">YouTube</a>` : ''}
                </td>
                <td style="max-width:200px; font-size:0.8rem; color:#555;">${a.whyApply}</td>
                <td>${date}</td>
                <td>
                    <button class="aff-btn" style="padding:0.4rem 0.8rem; font-size:0.75rem; background-color:#2e7d32;" onclick="approveApp('${a.id}')">Approve</button>
                    <button class="aff-btn" style="padding:0.4rem 0.8rem; font-size:0.75rem; background-color:#c62828;" onclick="rejectApp('${a.id}')">Reject</button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    window.approveApp = async function(appId) {
        const apps = AmieleDB.getApplications();
        const app = apps.find(a => a.id === appId);
        if (!app) return;

        const confirmed = await showConfirmModal('Approve Affiliate Application', `Are you sure you want to approve the application for <strong>${app.name}</strong>?`);
        if (confirmed) {
            AmieleDB.adminApproveApplication(appId);
            AmieleDB.addNotification(
                app.userId, 
                'Partnership Approved! 🎉', 
                'Congratulations! Your partnership application has been approved. You are now an active Amiele affiliate.', 
                'announcement'
            );
            showToast('Application approved! User role upgraded to Affiliate.', 'success');
            renderApplicationsQueue();
            renderDashboardStats();
        }
    };

    window.rejectApp = async function(appId) {
        const apps = AmieleDB.getApplications();
        const app = apps.find(a => a.id === appId);
        if (!app) return;

        const confirmed = await showConfirmModal('Reject Affiliate Application', `Are you sure you want to reject the application for <strong>${app.name}</strong>?`, true);
        if (confirmed) {
            AmieleDB.adminRejectApplication(appId);
            AmieleDB.addNotification(
                app.userId, 
                'Application Declined', 
                'Your affiliate application has been declined at this time.', 
                'announcement'
            );
            showToast('Application declined.', 'warning');
            renderApplicationsQueue();
            renderDashboardStats();
        }
    };

    // 5. Commissions Queue
    function renderCommissionsQueue() {
        const tbody = document.getElementById('commissions-table-body');
        if (!tbody) return;

        const commissions = JSON.parse(localStorage.getItem('amiele_commissions')) || [];
        tbody.innerHTML = '';

        if (commissions.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding: 3rem 0; color: var(--aff-text-muted);">No commissions logged.</td></tr>';
            return;
        }

        commissions.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)).forEach(c => {
            const date = new Date(c.createdAt).toLocaleDateString();
            const actionBtns = c.status === 'pending' ? `
                <button class="aff-btn" style="padding:0.4rem 0.8rem; font-size:0.75rem; background-color:#2e7d32;" onclick="approveCommission('${c.id}')">Confirm Sale</button>
                <button class="aff-btn" style="padding:0.4rem 0.8rem; font-size:0.75rem; background-color:#c62828;" onclick="cancelCommission('${c.id}')">Cancel</button>
            ` : '-';

            const row = document.createElement('tr');
            row.innerHTML = `
                <td><strong>${c.id}</strong></td>
                <td>${c.affiliateId}</td>
                <td><strong>${c.orderId}</strong><br>${c.productName}</td>
                <td>ETB ${c.orderAmount.toLocaleString()}</td>
                <td style="color:#2e7d32; font-weight:600;">ETB ${c.commissionAmount.toLocaleString()}</td>
                <td><span class="aff-badge ${c.status}">${c.status}</span></td>
                <td>${actionBtns}</td>
            `;
            tbody.appendChild(row);
        });
    }

    window.approveCommission = async function(commId) {
        const commissions = JSON.parse(localStorage.getItem('amiele_commissions')) || [];
        const c = commissions.find(x => x.id === commId);
        if (!c) return;

        const confirmed = await showConfirmModal('Confirm Referral Sale', `Confirm commission payout of <strong>ETB ${c.commissionAmount.toLocaleString()}</strong> to partner for order reference <strong>${c.orderId}</strong>?`);
        if (confirmed) {
            AmieleDB.adminApproveCommission(commId);
            AmieleDB.addNotification(
                c.affiliateId, 
                'Commission Credited! 💰', 
                `Your commission of ETB ${c.commissionAmount.toLocaleString()} for order ${c.orderId} has been confirmed and added to your balance.`, 
                'commission'
            );
            showToast('Commission approved and credited to Affiliate balance!', 'success');
            renderCommissionsQueue();
            renderDashboardStats();
        }
    };

    window.cancelCommission = async function(commId) {
        const commissions = JSON.parse(localStorage.getItem('amiele_commissions')) || [];
        const c = commissions.find(x => x.id === commId);
        if (!c) return;

        const confirmed = await showConfirmModal('Cancel Referral Sale', `Are you sure you want to cancel the commission of <strong>ETB ${c.commissionAmount.toLocaleString()}</strong>?`, true);
        if (confirmed) {
            AmieleDB.adminCancelCommission(commId);
            AmieleDB.addNotification(
                c.affiliateId, 
                'Commission Declined', 
                `Your pending commission for order ${c.orderId} was declined/cancelled by administration.`, 
                'commission'
            );
            showToast('Commission cancelled.', 'warning');
            renderCommissionsQueue();
            renderDashboardStats();
        }
    };

    // 6. Withdrawals Queue
    function renderWithdrawalsQueue() {
        const tbody = document.getElementById('withdrawals-table-body');
        if (!tbody) return;

        const withdrawals = JSON.parse(localStorage.getItem('amiele_withdrawals')) || [];
        tbody.innerHTML = '';

        if (withdrawals.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding: 3rem 0; color: var(--aff-text-muted);">No withdrawal requests logs.</td></tr>';
            return;
        }

        withdrawals.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)).forEach(w => {
            const date = new Date(w.createdAt).toLocaleDateString();
            
            let actions = '-';
            if (w.status === 'pending') {
                actions = `
                    <button class="aff-btn" style="padding:0.4rem 0.8rem; font-size:0.75rem; background-color:#1565c0;" onclick="approveWithdrawal('${w.id}')">Approve</button>
                    <button class="aff-btn" style="padding:0.4rem 0.8rem; font-size:0.75rem; background-color:#c62828;" onclick="rejectWithdrawal('${w.id}')">Reject</button>
                `;
            } else if (w.status === 'approved') {
                actions = `
                    <button class="aff-btn" style="padding:0.4rem 0.8rem; font-size:0.75rem; background-color:#2e7d32;" onclick="markWithdrawalPaid('${w.id}')">Mark Paid</button>
                `;
            }

            const row = document.createElement('tr');
            row.innerHTML = `
                <td><strong>${w.id}</strong></td>
                <td>${w.affiliateId}</td>
                <td style="font-weight:600;">ETB ${w.amount.toLocaleString()}</td>
                <td>${w.method}<br>${w.phone}</td>
                <td>${date}</td>
                <td><span class="aff-badge ${w.status}">${w.status}</span></td>
                <td>${actions}</td>
            `;
            tbody.appendChild(row);
        });
    }

    window.approveWithdrawal = async function(wId) {
        const withdrawals = JSON.parse(localStorage.getItem('amiele_withdrawals')) || [];
        const w = withdrawals.find(x => x.id === wId);
        if (!w) return;

        const confirmed = await showConfirmModal('Approve Withdrawal Request', `Approve payout request for <strong>ETB ${w.amount.toLocaleString()}</strong> to phone number <strong>${w.phone}</strong>?`);
        if (confirmed) {
            AmieleDB.adminApproveWithdrawal(wId);
            AmieleDB.addNotification(
                w.affiliateId, 
                'Withdrawal Approved', 
                `Your withdrawal payout request of ETB ${w.amount.toLocaleString()} has been approved. Processing payment.`, 
                'payout'
            );
            showToast('Withdrawal request approved!', 'success');
            renderWithdrawalsQueue();
            renderDashboardStats();
        }
    };

    window.rejectWithdrawal = async function(wId) {
        const withdrawals = JSON.parse(localStorage.getItem('amiele_withdrawals')) || [];
        const w = withdrawals.find(x => x.id === wId);
        if (!w) return;

        const confirmed = await showConfirmModal('Reject Withdrawal Request', `Are you sure you want to decline this request for <strong>ETB ${w.amount.toLocaleString()}</strong>? Funds will return to affiliate balance.`, true);
        if (confirmed) {
            AmieleDB.adminRejectWithdrawal(wId);
            AmieleDB.addNotification(
                w.affiliateId, 
                'Withdrawal Request Declined', 
                `Your withdrawal request of ETB ${w.amount.toLocaleString()} was declined. Balance returned to account.`, 
                'payout'
            );
            showToast('Withdrawal rejected.', 'warning');
            renderWithdrawalsQueue();
            renderDashboardStats();
        }
    };

    window.markWithdrawalPaid = async function(wId) {
        const withdrawals = JSON.parse(localStorage.getItem('amiele_withdrawals')) || [];
        const w = withdrawals.find(x => x.id === wId);
        if (!w) return;

        const confirmed = await showConfirmModal('Mark Withdrawal as PAID', `Mark request for <strong>ETB ${w.amount.toLocaleString()}</strong> as successfully paid to partner?`);
        if (confirmed) {
            AmieleDB.adminMarkWithdrawalPaid(wId);
            AmieleDB.addNotification(
                w.affiliateId, 
                'Payout Transferred! CBE/Telebirr 💸', 
                `Your payout of ETB ${w.amount.toLocaleString()} has been marked as fully PAID and sent to your address.`, 
                'payout'
            );
            showToast('Withdrawal marked as PAID successfully.', 'success');
            renderWithdrawalsQueue();
            renderDashboardStats();
        }
    };

    // 7. Campaigns Challenge Creator
    function renderCampaignsList() {
        const tbody = document.getElementById('campaigns-table-body');
        if (!tbody) return;

        const campaigns = AmieleDB.getCampaigns();
        tbody.innerHTML = '';

        campaigns.forEach(c => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><strong>${c.id}</strong></td>
                <td>${c.title}</td>
                <td>${c.description}</td>
                <td>${c.targetSales} sales</td>
                <td>ETB ${c.reward.toLocaleString()}</td>
                <td>${c.daysRemaining} days</td>
                <td><span class="aff-badge active">${c.status}</span></td>
            `;
            tbody.appendChild(row);
        });
    }

    const campaignForm = document.getElementById('create-campaign-form');
    if (campaignForm) {
        campaignForm.addEventListener('submit', (e) => {
            e.preventDefault();

            const title = document.getElementById('cmp-title').value.trim();
            const desc = document.getElementById('cmp-desc').value.trim();
            const target = document.getElementById('cmp-target').value;
            const reward = document.getElementById('cmp-reward').value;
            const days = document.getElementById('cmp-days').value;

            AmieleDB.adminCreateCampaign(title, desc, target, reward, days);
            
            // Broadcast notification to all affiliates
            const affiliates = AmieleDB.getAffiliates();
            affiliates.forEach(aff => {
                AmieleDB.addNotification(
                    aff.userId,
                    'New Campaign Challenge! 🏆',
                    `Earn an extra ETB ${reward} with the new challenge: "${title}"`,
                    'campaign'
                );
            });

            showToast('Bonus campaign challenge created and broadcasted successfully!', 'success');
            campaignForm.reset();
            renderCampaignsList();
        });
    }

    // 8. Announcements Creator
    function renderAnnouncementsList() {
        const tbody = document.getElementById('ann-table-body');
        if (!tbody) return;

        const announcements = AmieleDB.getAnnouncements();
        tbody.innerHTML = '';

        announcements.forEach(a => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><strong>${a.id}</strong></td>
                <td>${a.title}</td>
                <td>${a.content}</td>
                <td><span class="aff-badge approved">${a.type}</span></td>
                <td><span class="aff-badge ${a.urgency === 'high' ? 'rejected' : 'pending'}">${a.urgency}</span></td>
            `;
            tbody.appendChild(row);
        });
    }

    const annForm = document.getElementById('create-ann-form');
    if (annForm) {
        annForm.addEventListener('submit', (e) => {
            e.preventDefault();

            const title = document.getElementById('ann-title').value.trim();
            const content = document.getElementById('ann-content').value.trim();
            const type = document.getElementById('ann-type').value;
            const urgency = document.getElementById('ann-urgency').value;

            AmieleDB.adminCreateAnnouncement(title, content, type, urgency);
            
            // Send dynamic notification to all active partners
            const affiliates = AmieleDB.getAffiliates();
            affiliates.forEach(aff => {
                AmieleDB.addNotification(
                    aff.userId,
                    `New Update: ${title}`,
                    content.substring(0, 80) + '...',
                    'announcement'
                );
            });

            showToast('Announcement broadcasted and notified successfully!', 'success');
            annForm.reset();
            renderAnnouncementsList();
        });
    }

    // Initial load
    renderDashboardStats();

    // Global Admin Keyboard shortcuts listener
    document.addEventListener('keydown', (e) => {
        const activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
        if (activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select') {
            return;
        }

        // 1-7 Tab Navigation Routing
        const tabRoutes = {
            '1': 'dashboard',
            '2': 'users',
            '3': 'applications',
            '4': 'commissions',
            '5': 'withdrawals',
            '6': 'campaigns',
            '7': 'announcements'
        };

        if (tabRoutes[e.key]) {
            e.preventDefault();
            window.switchAdminTab(tabRoutes[e.key]);
            return;
        }

        // Keyboard Shortcut Help overlay dialog
        if (e.key === '?') {
            e.preventDefault();
            const helperHtml = `
                <div style="display:flex; flex-direction:column; gap:0.8rem; font-family:'Outfit',sans-serif; text-align:left;">
                    <p style="margin:0 0 1rem; color:var(--aff-text-muted);">Use these quick keys to browse through admin queues rapidly:</p>
                    <div style="display:flex; justify-content:space-between; border-bottom:1px solid var(--aff-card-border); padding-bottom:6px;">
                        <span><kbd style="background:var(--aff-bg); padding:2px 6px; border-radius:4px; border:1px solid #ccc; font-weight:600;">1</kbd> to <kbd style="background:var(--aff-bg); padding:2px 6px; border-radius:4px; border:1px solid #ccc; font-weight:600;">7</kbd></span>
                        <span style="color:var(--aff-text-muted);">Navigate Admin Tabs</span>
                    </div>
                    <div style="display:flex; justify-content:space-between; border-bottom:1px solid var(--aff-card-border); padding-bottom:6px;">
                        <span><kbd style="background:var(--aff-bg); padding:2px 6px; border-radius:4px; border:1px solid #ccc; font-weight:600;">Ctrl + K</kbd></span>
                        <span style="color:var(--aff-text-muted);">Launch Command Palette</span>
                    </div>
                    <div style="display:flex; justify-content:space-between; border-bottom:1px solid var(--aff-card-border); padding-bottom:6px;">
                        <span><kbd style="background:var(--aff-bg); padding:2px 6px; border-radius:4px; border:1px solid #ccc; font-weight:600;">Esc</kbd></span>
                        <span style="color:var(--aff-text-muted);">Close Modal Backdrop</span>
                    </div>
                </div>
            `;
            showConfirmModal('Admin Shortcut Directory', helperHtml, false, 'Close Helper');
            return;
        }

        // Close active confirm modal backdrops with Escape
        if (e.key === 'Escape') {
            const backdrop = document.getElementById('custom-modal-backdrop');
            if (backdrop && backdrop.classList.contains('show')) {
                const cancelBtn = document.getElementById('modal-btn-cancel');
                if (cancelBtn) cancelBtn.click();
            }
        }
    });
});
