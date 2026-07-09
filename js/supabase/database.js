/**
 * ============================================================
 * Amiele Begena — Supabase Database Module
 * ============================================================
 *
 * PURPOSE:
 *   Handles Supabase CRUD operations and maps localStorage-based
 *   AmieleDB calls to PostgREST queries against Supabase tables.
 *
 * DEPENDENCIES:
 *   - client.js (loaded before this file)
 *
 * ============================================================
 */

(function () {
    'use strict';

    window.AmieleSupabase = window.AmieleSupabase || {};

    window.AmieleSupabase.database = {

        // ========================================================
        // GENERIC CRUD METHODS
        // ========================================================

        fetchRows: async function (table, columns = '*', filters = {}) {
            const client = window.AmieleSupabase.getClient();
            if (!client) {
                return { data: null, error: 'Supabase client not initialized.' };
            }
            try {
                let query = client.from(table).select(columns);
                for (const [key, val] of Object.entries(filters)) {
                    query = query.eq(key, val);
                }
                const response = await query;
                return window.AmieleSupabase.helpers.formatResponse(response);
            } catch (err) {
                const msg = window.AmieleSupabase.helpers.handleError(`database.fetchRows(${table})`, err);
                return { data: null, error: msg };
            }
        },

        insertRow: async function (table, rowData) {
            const client = window.AmieleSupabase.getClient();
            if (!client) {
                return { data: null, error: 'Supabase client not initialized.' };
            }
            try {
                const response = await client.from(table).insert(rowData).select();
                const formatted = window.AmieleSupabase.helpers.formatResponse(response);
                if (formatted.success && Array.isArray(formatted.data) && formatted.data.length > 0) {
                    return { success: true, data: formatted.data[0], error: null };
                }
                return formatted;
            } catch (err) {
                const msg = window.AmieleSupabase.helpers.handleError(`database.insertRow(${table})`, err);
                return { success: false, data: null, error: msg };
            }
        },

        updateRow: async function (table, updates, filters) {
            const client = window.AmieleSupabase.getClient();
            if (!client) {
                return { data: null, error: 'Supabase client not initialized.' };
            }
            try {
                let query = client.from(table).update(updates);
                for (const [key, val] of Object.entries(filters)) {
                    query = query.eq(key, val);
                }
                const response = await query.select();
                return window.AmieleSupabase.helpers.formatResponse(response);
            } catch (err) {
                const msg = window.AmieleSupabase.helpers.handleError(`database.updateRow(${table})`, err);
                return { data: null, error: msg };
            }
        },

        deleteRow: async function (table, filters) {
            const client = window.AmieleSupabase.getClient();
            if (!client) {
                return { data: null, error: 'Supabase client not initialized.' };
            }
            try {
                let query = client.from(table).delete();
                for (const [key, val] of Object.entries(filters)) {
                    query = query.eq(key, val);
                }
                const response = await query;
                return window.AmieleSupabase.helpers.formatResponse(response);
            } catch (err) {
                const msg = window.AmieleSupabase.helpers.handleError(`database.deleteRow(${table})`, err);
                return { data: null, error: msg };
            }
        },

        // ========================================================
        // HIGH-LEVEL REVENUE & USER PROFILE ACTIONS
        // ========================================================

        updateUserProfile: async function (name, email, bio) {
            const currentUser = await window.getCurrentUser();
            if (!currentUser) return;
            const client = window.AmieleSupabase.getClient();
            if (!client) return;

            await client.auth.updateUser({
                data: { name: name }
            });
            await this.updateRow('profiles', { name, email, bio }, { id: currentUser.id });
            await window.getCurrentUser(true);
        },

        updateUserSettings: async function (userId, data) {
            const client = window.AmieleSupabase.getClient();
            if (!client) return;

            const authUpdates = { data: { name: data.name } };
            if (data.password) {
                authUpdates.password = data.password;
            }
            if (data.email) {
                authUpdates.email = data.email;
            }
            await client.auth.updateUser(authUpdates);

            const profileUpdates = {
                name: data.name,
                email: data.email,
                phone: data.phone,
                country: data.country
            };
            if (data.photoUrl !== undefined) {
                profileUpdates.photo_url = data.photoUrl;
            }
            if (data.notifPreferences) {
                profileUpdates.notif_preferences = data.notifPreferences;
            }

            await this.updateRow('profiles', profileUpdates, { id: userId });
            await window.getCurrentUser(true);
        },

        // ========================================================
        // AFFILIATE APPLICATION FLOWS
        // ========================================================

        getApplications: async function () {
            const res = await this.fetchRows('applications');
            return res.data || [];
        },

        submitApplication: async function (data) {
            const currentUser = await window.getCurrentUser();
            if (!currentUser) throw new Error('You must be logged in to apply.');
            const rowData = {
                user_id: currentUser.id,
                name: data.name,
                phone: data.phone,
                country: data.country,
                socials: data.socials || {},
                why_apply: data.whyApply,
                status: 'pending'
            };
            const res = await this.insertRow('applications', rowData);
            if (res.error) throw new Error(res.error);
            return res.data;
        },

        getUserApplication: async function (userId) {
            const res = await this.fetchRows('applications', '*', { user_id: userId });
            return res.data && res.data.length > 0 ? res.data[0] : null;
        },

        // ========================================================
        // AFFILIATES METADATA & CAMPAIGNS
        // ========================================================

        getAffiliates: async function () {
            const res = await this.fetchRows('affiliates');
            return res.data || [];
        },

        getAffiliateMetadata: async function (userId) {
            const res = await this.fetchRows('affiliates', '*', { user_id: userId });
            return res.data && res.data.length > 0 ? res.data[0] : null;
        },

        trackClick: async function (affCode) {
            const client = window.AmieleSupabase.getClient();
            if (!client) return;

            const { data: affs } = await client.from('affiliates').select('user_id, clicks').eq('code', affCode);
            if (!affs || affs.length === 0) return;
            const aff = affs[0];

            await this.insertRow('clicks', {
                affiliate_id: aff.user_id,
                ip: 'simulated_ip_' + Math.floor(Math.random() * 255)
            });

            await this.updateRow('affiliates', { clicks: (aff.clicks || 0) + 1 }, { user_id: aff.user_id });
        },

        trackSale: async function (refCode, orderId, orderAmount, productName) {
            const client = window.AmieleSupabase.getClient();
            if (!client) return;

            const { data: affs } = await client.from('affiliates')
                .select('user_id, tier, sales, pending_commission')
                .or(`code.eq.${refCode},coupon_code.eq.${refCode}`);

            if (!affs || affs.length === 0) return;
            const aff = affs[0];

            let commRate = 0.10;
            if (aff.tier === 'silver') commRate = 0.12;
            if (aff.tier === 'gold') commRate = 0.15;
            const commissionAmount = orderAmount * commRate;

            await this.insertRow('commissions', {
                affiliate_id: aff.user_id,
                order_id: orderId,
                product_name: productName,
                order_amount: orderAmount,
                commission_amount: commissionAmount,
                status: 'pending'
            });

            await this.updateRow('affiliates', {
                sales: (aff.sales || 0) + 1,
                pending_commission: (aff.pending_commission || 0) + commissionAmount
            }, { user_id: aff.user_id });
        },

        getAffiliateClicks: async function (userId) {
            const res = await this.fetchRows('clicks', '*', { affiliate_id: userId });
            return res.data || [];
        },

        getAffiliateCommissions: async function (userId) {
            const res = await this.fetchRows('commissions', '*', { affiliate_id: userId });
            return res.data || [];
        },

        getAffiliateWithdrawals: async function (userId) {
            const res = await this.fetchRows('withdrawals', '*', { affiliate_id: userId });
            return res.data || [];
        },

        requestWithdrawal: async function (amount, method, phone) {
            const currentUser = await window.getCurrentUser();
            if (!currentUser) throw new Error('Must be logged in.');

            const aff = await this.getAffiliateMetadata(currentUser.id);
            if (!aff) throw new Error('No affiliate account found.');

            if (amount <= 0) throw new Error('Withdrawal amount must be greater than zero.');
            if (amount > aff.balance) throw new Error('Insufficient balance.');

            await this.updateRow('affiliates', { balance: aff.balance - amount }, { user_id: currentUser.id });

            const res = await this.insertRow('withdrawals', {
                affiliate_id: currentUser.id,
                amount: amount,
                method: method,
                phone: phone,
                status: 'pending'
            });

            if (res.error) throw new Error(res.error);
            return res.data;
        },

        getCampaigns: async function () {
            const res = await this.fetchRows('campaigns');
            return res.data || [];
        },

        getAnnouncements: async function () {
            const res = await this.fetchRows('announcements');
            return res.data || [];
        },

        // ========================================================
        // USER NOTIFICATIONS UTILS
        // ========================================================

        getNotifications: async function (userId) {
            const res = await this.fetchRows('notifications', '*', { user_id: userId });
            return res.data || [];
        },

        addNotification: async function (userId, title, text, type) {
            const res = await this.insertRow('notifications', {
                user_id: userId,
                title: title,
                text: text,
                type: type,
                unread: true
            });
            return res.data;
        },

        markNotificationsAsRead: async function (userId) {
            await this.updateRow('notifications', { unread: false }, { user_id: userId });
        },

        // ========================================================
        // ADMIN APPROVAL PORTALS
        // ========================================================

        adminApproveApplication: async function (appId) {
            const client = window.AmieleSupabase.getClient();
            if (!client) return;

            const { data: apps } = await client.from('applications').select('*').eq('id', appId);
            if (!apps || apps.length === 0) return;
            const app = apps[0];

            await this.updateRow('applications', {
                status: 'approved',
                reviewed_at: new Date().toISOString()
            }, { id: appId });

            await this.updateRow('profiles', { role: 'affiliate' }, { id: app.user_id });

            const { data: affs } = await client.from('affiliates').select('*').eq('user_id', app.user_id);
            if (!affs || affs.length === 0) {
                const baseCode = app.name.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 6);
                const randomSuffix = Math.floor(10 + Math.random() * 90);

                await this.insertRow('affiliates', {
                    user_id: app.user_id,
                    code: baseCode + randomSuffix,
                    coupon_code: baseCode + '5',
                    balance: 0,
                    total_earnings: 0,
                    pending_commission: 0,
                    total_paid: 0,
                    clicks: 0,
                    sales: 0,
                    tier: 'standard'
                });
            }
        },

        adminRejectApplication: async function (appId) {
            await this.updateRow('applications', {
                status: 'rejected',
                reviewed_at: new Date().toISOString()
            }, { id: appId });
        },

        adminApproveCommission: async function (commId) {
            const client = window.AmieleSupabase.getClient();
            if (!client) return;

            const { data: comms } = await client.from('commissions').select('*').eq('id', commId);
            if (!comms || comms.length === 0) return;
            const comm = comms[0];
            if (comm.status !== 'pending') return;

            await this.updateRow('commissions', {
                status: 'approved',
                approved_at: new Date().toISOString()
            }, { id: commId });

            const { data: affs } = await client.from('affiliates').select('*').eq('user_id', comm.affiliate_id);
            if (affs && affs.length > 0) {
                const aff = affs[0];
                await this.updateRow('affiliates', {
                    balance: (aff.balance || 0) + comm.commission_amount,
                    total_earnings: (aff.total_earnings || 0) + comm.commission_amount,
                    pending_commission: Math.max(0, (aff.pending_commission || 0) - comm.commission_amount)
                }, { user_id: comm.affiliate_id });
            }
        },

        adminCancelCommission: async function (commId) {
            const client = window.AmieleSupabase.getClient();
            if (!client) return;

            const { data: comms } = await client.from('commissions').select('*').eq('id', commId);
            if (!comms || comms.length === 0) return;
            const comm = comms[0];
            if (comm.status !== 'pending') return;

            await this.updateRow('commissions', { status: 'cancelled' }, { id: commId });

            const { data: affs } = await client.from('affiliates').select('*').eq('user_id', comm.affiliate_id);
            if (affs && affs.length > 0) {
                const aff = affs[0];
                await this.updateRow('affiliates', {
                    pending_commission: Math.max(0, (aff.pending_commission || 0) - comm.commission_amount)
                }, { user_id: comm.affiliate_id });
            }
        },

        adminApproveWithdrawal: async function (withdrawalId) {
            await this.updateRow('withdrawals', {
                status: 'approved',
                processed_at: new Date().toISOString()
            }, { id: withdrawalId });
        },

        adminRejectWithdrawal: async function (withdrawalId) {
            const client = window.AmieleSupabase.getClient();
            if (!client) return;

            const { data: wths } = await client.from('withdrawals').select('*').eq('id', withdrawalId);
            if (!wths || wths.length === 0) return;
            const wth = wths[0];
            if (wth.status !== 'pending') return;

            await this.updateRow('withdrawals', {
                status: 'rejected',
                processed_at: new Date().toISOString()
            }, { id: withdrawalId });

            const { data: affs } = await client.from('affiliates').select('*').eq('user_id', wth.affiliate_id);
            if (affs && affs.length > 0) {
                const aff = affs[0];
                await this.updateRow('affiliates', { balance: (aff.balance || 0) + wth.amount }, { user_id: wth.affiliate_id });
            }
        },

        adminMarkWithdrawalPaid: async function (withdrawalId) {
            const client = window.AmieleSupabase.getClient();
            if (!client) return;

            const { data: wths } = await client.from('withdrawals').select('*').eq('id', withdrawalId);
            if (!wths || wths.length === 0) return;
            const wth = wths[0];

            await this.updateRow('withdrawals', { status: 'paid' }, { id: withdrawalId });

            const { data: affs } = await client.from('affiliates').select('*').eq('user_id', wth.affiliate_id);
            if (affs && affs.length > 0) {
                const aff = affs[0];
                await this.updateRow('affiliates', { total_paid: (aff.total_paid || 0) + wth.amount }, { user_id: wth.affiliate_id });
            }
        },

        adminCreateCampaign: async function (title, description, targetSales, reward, daysRemaining) {
            const res = await this.insertRow('campaigns', {
                title,
                description,
                target_sales: parseInt(targetSales),
                current_sales: 0,
                reward: parseFloat(reward),
                days_remaining: parseInt(daysRemaining),
                status: 'active'
            });
            if (res.error) throw new Error(res.error);
            return res.data;
        },

        adminCreateAnnouncement: async function (title, content, type, urgency) {
            const res = await this.insertRow('announcements', {
                title,
                content,
                type,
                urgency
            });
            if (res.error) throw new Error(res.error);
            return res.data;
        }
    };
})();
