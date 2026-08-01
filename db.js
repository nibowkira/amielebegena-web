/**
 * Amiele Begena - Database & Data Layer Wrapper
 * Frontend-only state management using localStorage.
 */

const DB_PREFIX = 'amiele_';

// Core Schema structure and seed helper
window.AmieleDB = {

    cache: {
        users: [],
        applications: [],
        affiliates: [],
        clicks: [],
        commissions: [],
        withdrawals: [],
        campaigns: [],
        announcements: [],
        notifications: []
    },

    // ── WISHLIST API ──────────────────────────────────────────────────────────
    getWishlist() {
        try {
            const raw = localStorage.getItem(DB_PREFIX + 'wishlist');
            return raw ? JSON.parse(raw) : [];
        } catch (e) {
            return [];
        }
    },

    addToWishlist(productId) {
        if (!productId) return this.getWishlist();
        const list = this.getWishlist();
        const strId = String(productId);
        if (!list.includes(strId)) {
            list.push(strId);
            localStorage.setItem(DB_PREFIX + 'wishlist', JSON.stringify(list));
        }
        return list;
    },

    removeFromWishlist(productId) {
        if (!productId) return this.getWishlist();
        const strId = String(productId);
        let list = this.getWishlist();
        list = list.filter(id => id !== strId);
        localStorage.setItem(DB_PREFIX + 'wishlist', JSON.stringify(list));
        return list;
    },

    toggleWishlist(productId) {
        const list = this.getWishlist();
        const strId = String(productId);
        if (list.includes(strId)) {
            return this.removeFromWishlist(strId);
        } else {
            return this.addToWishlist(strId);
        }
    },

    async init() {
        if (!localStorage.getItem(DB_PREFIX + 'initialized')) {
            this.seedDemoData();
        }
        // One-time migration: move legacy 'saved_X' keys into unified wishlist array
        if (!localStorage.getItem(DB_PREFIX + 'wishlist_migrated')) {
            const currentList = this.getWishlist();
            const keysToRemove = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith('saved_') && localStorage.getItem(key) === 'true') {
                    const productId = key.replace('saved_', '');
                    if (!currentList.includes(productId)) {
                        currentList.push(productId);
                    }
                    keysToRemove.push(key);
                }
            }
            if (currentList.length > 0) {
                localStorage.setItem(DB_PREFIX + 'wishlist', JSON.stringify(currentList));
            }
            keysToRemove.forEach(k => localStorage.removeItem(k));
            localStorage.setItem(DB_PREFIX + 'wishlist_migrated', 'true');
        }
    },

    seedDemoData() {
        // 1. Users list - Managed via Supabase Auth/Profiles. Kept empty locally.
        localStorage.setItem(DB_PREFIX + 'users', JSON.stringify([]));

        // 2. Affiliate Applications - Managed via Supabase affiliate_applications. Kept empty locally.
        localStorage.setItem(DB_PREFIX + 'applications', JSON.stringify([]));

        // 3. Affiliates Metadata - Managed via Supabase affiliates. Kept empty locally.
        localStorage.setItem(DB_PREFIX + 'affiliates', JSON.stringify([]));

        // 4. Click Logs - Managed via Supabase.
        localStorage.setItem(DB_PREFIX + 'clicks', JSON.stringify([]));

        // 5. Commissions (Earnings) - Managed via Supabase.
        localStorage.setItem(DB_PREFIX + 'commissions', JSON.stringify([]));

        // 6. Withdrawals - Simulating empty state locally.
        localStorage.setItem(DB_PREFIX + 'withdrawals', JSON.stringify([]));

        // 7. Campaigns (Bonus Challenges)
        const campaigns = [
            {
                id: 'cmp_1',
                title: 'Heritage Campaign: Sell 5 Kirars',
                description: 'Promote our authentic horse-hair Kirars. Refer 5 sales to earn an additional bonus.',
                targetSales: 5,
                currentSales: 3,
                reward: 1500, // ETB
                daysRemaining: 12,
                status: 'active', // active, completed, expired
                createdAt: '2026-06-20T00:00:00Z'
            },
            {
                id: 'cmp_2',
                title: 'Begena Mastery Challenge',
                description: 'Sell 3 Master Begena Harps of David in a single month.',
                targetSales: 3,
                currentSales: 1,
                reward: 3000,
                daysRemaining: 22,
                status: 'active',
                createdAt: '2026-07-01T00:00:00Z'
            }
        ];
        localStorage.setItem(DB_PREFIX + 'campaigns', JSON.stringify(campaigns));

        // 8. Announcements
        const announcements = [
            {
                id: 'ann_1',
                title: 'New Product Drop: Traditional Kebero Drums',
                content: 'We have added authentic Ceremonial Kebero drums to our online registry. Direct your audience to the percussion tab! High demand expected.',
                type: 'product', // product, discount, campaign, update
                urgency: 'normal',
                createdAt: '2026-05-07T00:00:00Z'
            },
            {
                id: 'ann_2',
                title: '+1500 ETB Bonus Campaign Launched!',
                content: 'Refer 5 Kirar sales by July 20th and receive a flat bonus reward of 1,500 ETB directly into your balance.',
                type: 'campaign',
                urgency: 'high',
                createdAt: '2026-06-20T00:00:00Z'
            },
            {
                id: 'ann_3',
                title: 'Shipping Network Extended Globally',
                content: 'Good news for international buyers: our shipping network now fully supports transit to Europe and North America with complete customs handling.',
                type: 'update',
                urgency: 'normal',
                createdAt: '2026-07-04T00:00:00Z'
            }
        ];
        localStorage.setItem(DB_PREFIX + 'announcements', JSON.stringify(announcements));

        localStorage.setItem(DB_PREFIX + 'initialized', 'true');
    },

    // ----------------------------------------
    // USER MODULE
    // ----------------------------------------
    getUsers() {
        return JSON.parse(localStorage.getItem(DB_PREFIX + 'users')) || [];
    },

    saveUsers(users) {
        localStorage.setItem(DB_PREFIX + 'users', JSON.stringify(users));
    },

    register(name, email, password) {
        const users = this.getUsers();
        if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
            throw new Error('An account with this email already exists.');
        }

        const newUser = {
            id: 'usr_' + Date.now(),
            name: name,
            email: email,
            password: btoa(password), // Obfuscated for local demo fallback
            role: 'user', // Default role
            joinedAt: new Date().toISOString()
        };

        users.push(newUser);
        this.saveUsers(users);

        // Auto login
        this.setSession(newUser);
        return newUser;
    },

    login(email, password) {
        const users = this.getUsers();
        const user = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === btoa(password));
        if (!user) {
            throw new Error('Invalid email or password.');
        }

        this.setSession(user);
        return user;
    },

    logout() {
        localStorage.removeItem(DB_PREFIX + 'current_session');
        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('userName');
    },

    setSession(user) {
        localStorage.setItem(DB_PREFIX + 'current_session', JSON.stringify(user));
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('userName', user.name);
    },

    getCurrentUser() {
        try {
            return JSON.parse(localStorage.getItem(DB_PREFIX + 'current_session')) || null;
        } catch (e) {
            return null;
        }
    },

    updateUserProfile(name, email, bio) {
        const currentUser = this.getCurrentUser();
        if (!currentUser) return;

        const users = this.getUsers();
        const userIndex = users.findIndex(u => u.id === currentUser.id);

        if (userIndex !== -1) {
            users[userIndex].name = name;
            users[userIndex].email = email;
            users[userIndex].bio = bio;
            this.saveUsers(users);
            
            // Update session
            currentUser.name = name;
            currentUser.email = email;
            currentUser.bio = bio;
            this.setSession(currentUser);
        }
    },

    updateUserSettings(userId, data) {
        const users = this.getUsers();
        const userIndex = users.findIndex(u => u.id === userId);
        if (userIndex === -1) throw new Error('User not found.');

        // Verify email uniqueness if email is changing
        const emailLower = data.email.toLowerCase();
        if (users[userIndex].email.toLowerCase() !== emailLower) {
            if (users.find(u => u.email.toLowerCase() === emailLower)) {
                throw new Error('This email address is already in use.');
            }
        }

        // Apply changes
        users[userIndex].name = data.name;
        users[userIndex].email = data.email;
        users[userIndex].phone = data.phone;
        users[userIndex].country = data.country;
        
        if (data.password) {
            users[userIndex].password = data.password;
        }
        
        if (data.photoUrl !== undefined) {
            users[userIndex].photoUrl = data.photoUrl;
        }

        users[userIndex].notifPreferences = data.notifPreferences || {
            email: true,
            push: false
        };

        this.saveUsers(users);

        // Sync session if updating current logged in user
        const currentSession = this.getCurrentUser();
        if (currentSession && currentSession.id === userId) {
            const updatedUser = users[userIndex];
            this.setSession(updatedUser);
        }

        // Keep affiliate metadata names in sync for presentation
        const affiliates = this.getAffiliates();
        const aff = affiliates.find(a => a.userId === userId);
        if (aff) {
            // Can update sub-data here if needed
            this.saveAffiliates(affiliates);
        }
    },

    // ----------------------------------------
    // NOTIFICATIONS ENGINE
    // ----------------------------------------
    getNotifications(userId) {
        const notifKey = DB_PREFIX + 'notifications_' + userId;
        if (!localStorage.getItem(notifKey)) {
            // Seed default notifications
            const initialNotifs = [
                {
                    id: 'notif_1',
                    title: 'Commission Approved',
                    text: 'Your commission of ETB 1,020 for Order #HA-2035 has been approved.',
                    type: 'commission',
                    unread: true,
                    time: new Date(Date.now() - 3600000 * 2).toISOString() // 2 hours ago
                },
                {
                    id: 'notif_2',
                    title: 'Welcome to Partner Portal!',
                    text: 'Your application was accepted. Get your links in the Referral Center.',
                    type: 'announcement',
                    unread: true,
                    time: new Date(Date.now() - 3600000 * 24).toISOString() // 1 day ago
                },
                {
                    id: 'notif_3',
                    title: 'Telebirr Payout Completed',
                    text: 'Your withdrawal request of ETB 5,000 has been marked as PAID.',
                    type: 'payout',
                    unread: false,
                    time: new Date(Date.now() - 3600000 * 48).toISOString() // 2 days ago
                }
            ];
            localStorage.setItem(notifKey, JSON.stringify(initialNotifs));
            return initialNotifs;
        }
        return JSON.parse(localStorage.getItem(notifKey));
    },

    addNotification(userId, title, text, type) {
        const notifKey = DB_PREFIX + 'notifications_' + userId;
        const list = JSON.parse(localStorage.getItem(notifKey)) || [];
        list.unshift({
            id: 'notif_' + Date.now(),
            title,
            text,
            type,
            unread: true,
            time: new Date().toISOString()
        });
        localStorage.setItem(notifKey, JSON.stringify(list));
    },

    markNotificationsAsRead(userId) {
        const notifKey = DB_PREFIX + 'notifications_' + userId;
        const list = JSON.parse(localStorage.getItem(notifKey)) || [];
        list.forEach(n => { n.unread = false; });
        localStorage.setItem(notifKey, JSON.stringify(list));
    },

    // ----------------------------------------
    // AFFILIATE APPLICATION MODULE
    // ----------------------------------------
    getApplications() {
        return JSON.parse(localStorage.getItem(DB_PREFIX + 'applications')) || [];
    },

    saveApplications(apps) {
        localStorage.setItem(DB_PREFIX + 'applications', JSON.stringify(apps));
    },

    submitApplication(data) {
        const currentUser = this.getCurrentUser();
        if (!currentUser) throw new Error('You must be logged in to apply.');

        const apps = this.getApplications();
        // Check if already has application
        const existing = apps.find(a => a.userId === currentUser.id);
        if (existing) {
            throw new Error('You have already submitted an affiliate application.');
        }

        const newApp = {
            id: 'app_' + Date.now(),
            userId: currentUser.id,
            name: data.name,
            phone: data.phone,
            country: data.country,
            socials: data.socials || {},
            whyApply: data.whyApply,
            status: 'pending',
            submittedAt: new Date().toISOString(),
            reviewedAt: null
        };

        apps.push(newApp);
        this.saveApplications(apps);
        return newApp;
    },

    getUserApplication(userId) {
        const apps = this.getApplications();
        return apps.find(a => a.userId === userId);
    },



    // ----------------------------------------
    // AFFILIATE METADATA MODULE
    // ----------------------------------------
    getAffiliates() {
        return JSON.parse(localStorage.getItem(DB_PREFIX + 'affiliates')) || [];
    },

    saveAffiliates(affiliates) {
        localStorage.setItem(DB_PREFIX + 'affiliates', JSON.stringify(affiliates));
    },

    getAffiliateMetadata(userId) {
        const affiliates = this.getAffiliates();
        let aff = affiliates.find(a => a.userId === userId || a.id === userId);
        
        if (!aff) {
            const users = this.getUsers();
            const u = users.find(user => user.id === userId);
            const code = u ? (u.name ? u.name.toLowerCase().replace(/[^a-z0-9]/g, '') + '-3947' : 'alem-3947') : 'alem-3947';
            aff = {
                userId: userId,
                code: code,
                couponCode: code.toUpperCase() + '5',
                tier: 'bronze',
                balance: 0,
                totalEarnings: 0,
                pendingCommission: 0,
                totalPaid: 0,
                sales: 0,
                clicks: 0
            };
        }

        const localOrders = this.getOrders();
        const affCode = aff ? aff.code : '';
        const couponCode = aff ? aff.couponCode : '';
        
        let affOrders = localOrders.filter(o => {
            const rCode = String(o.referral_code || o.referralCode || '').toLowerCase();
            const aId = o.affiliate_id || o.affiliateId;
            const targetCode = affCode ? affCode.toLowerCase() : '';
            const targetCoupon = couponCode ? couponCode.toLowerCase() : '';

            return (aId && aId === userId) ||
                   (targetCode && rCode === targetCode) ||
                   (targetCoupon && rCode === targetCoupon) ||
                   (targetCode && targetCode.length > 2 && rCode.startsWith(targetCode)) ||
                   (rCode && rCode !== 'direct / none' && rCode !== 'none' && rCode !== '');
        });

        let sales = aff ? (aff.sales || 0) : 0;
        let totalEarnings = aff ? (aff.totalEarnings || 0) : 0;
        let pendingCommission = aff ? (aff.pendingCommission || 0) : 0;

        // Sum approved commissions from amiele_commissions storage
        try {
            const savedComms = JSON.parse(localStorage.getItem('amiele_commissions')) || [];
            const approvedComms = savedComms.filter(c => c.status === 'approved' || c.status === 'paid');
            if (approvedComms.length > 0) {
                const commSum = approvedComms.reduce((sum, c) => sum + (c.commissionAmount || c.amount || 0), 0);
                totalEarnings = Math.max(totalEarnings, commSum);
                sales = Math.max(sales, approvedComms.length);
            }
        } catch (e) {}

        let calculatedSales = 0;
        let calculatedEarnings = 0;

        affOrders.forEach(o => {
            const amount = o.amount || o.orderAmount || 12000;
            const commRate = (aff && aff.tier === 'gold') ? 0.15 : ((aff && aff.tier === 'silver') ? 0.12 : 0.10);
            const comm = amount * commRate;

            const payStatus = String(o.payment_status || o.paymentStatus || '').toLowerCase();
            const ordStatus = String(o.status || o.orderStatus || '').toLowerCase();

            if (payStatus === 'paid' || ordStatus === 'confirmed' || ordStatus === 'delivered') {
                calculatedSales += 1;
                calculatedEarnings += comm;
            } else if (payStatus === 'pending_payment' || payStatus === 'pending') {
                pendingCommission += comm;
            }
        });

        sales = Math.max(sales, calculatedSales);
        totalEarnings = Math.max(totalEarnings, calculatedEarnings);

        const totalPaid = aff ? (aff.totalPaid || 0) : 0;
        const balance = Math.max(0, totalEarnings - totalPaid);
        const clicks = aff ? (aff.clicks || 0) : 0;
        const totalOrders = affOrders.length;

        return {
            userId: (aff && aff.userId) || userId,
            code: aff ? aff.code : (affOrders[0] && affOrders[0].referral_code ? affOrders[0].referral_code : 'bonbe-7903'),
            couponCode: aff ? aff.couponCode : 'BONBE-79035',
            tier: (aff && aff.tier) || 'bronze',
            balance: balance,
            totalEarnings: totalEarnings,
            pendingCommission: pendingCommission,
            totalPaid: totalPaid,
            sales: sales,
            totalOrders: totalOrders,
            clicks: clicks,
            uniqueClicks: clicks,
            clicksToday: totalOrders,
            clicksWeek: totalOrders,
            clicksMonth: totalOrders,
            clicksYear: totalOrders
        };
    },

    // ----------------------------------------
    // TRACKING & ANALYTICS
    // ----------------------------------------
    trackClick(affCode) {
        const affiliates = this.getAffiliates();
        const aff = affiliates.find(a => a.code === affCode);
        if (!aff) return;

        // Log click
        const clicks = JSON.parse(localStorage.getItem(DB_PREFIX + 'clicks')) || [];
        clicks.push({
            affiliateId: aff.userId,
            timestamp: new Date().toISOString(),
            ip: 'simulated_ip_' + Math.floor(Math.random() * 255)
        });
        localStorage.setItem(DB_PREFIX + 'clicks', JSON.stringify(clicks));

        // Increment click count
        aff.clicks = (aff.clicks || 0) + 1;
        this.saveAffiliates(affiliates);
    },

    trackSale(refCode, orderId, orderAmount, productName) {
        const affiliates = this.getAffiliates();
        const aff = affiliates.find(a => a.code === refCode || a.couponCode === refCode);
        if (!aff) return;

        // Calculate commission based on tier
        let commRate = 0.10; // default 10%
        if (aff.tier === 'silver') commRate = 0.12;
        if (aff.tier === 'gold') commRate = 0.15;

        const commissionAmount = orderAmount * commRate;

        // Create commission log
        const commissions = JSON.parse(localStorage.getItem(DB_PREFIX + 'commissions')) || [];
        commissions.push({
            id: 'comm_' + Date.now(),
            affiliateId: aff.userId,
            orderId: orderId,
            productName: productName,
            orderAmount: orderAmount,
            commission_amount: commissionAmount,
            status: 'pending', // Requires admin approval
            createdAt: new Date().toISOString(),
            approvedAt: null
        });
        localStorage.setItem(DB_PREFIX + 'commissions', JSON.stringify(commissions));

        // Update Affiliate counters
        aff.sales = (aff.sales || 0) + 1;
        aff.pendingCommission = (aff.pendingCommission || 0) + commissionAmount;
        this.saveAffiliates(affiliates);
    },

    getAffiliateClicks(userId) {
        const clicks = JSON.parse(localStorage.getItem(DB_PREFIX + 'clicks')) || [];
        return clicks.filter(c => c.affiliateId === userId);
    },

    getAffiliateCommissions(userId) {
        const commissions = JSON.parse(localStorage.getItem(DB_PREFIX + 'commissions')) || [];
        return commissions.filter(c => c.affiliateId === userId);
    },

    getAffiliateWithdrawals(userId) {
        const withdrawals = JSON.parse(localStorage.getItem(DB_PREFIX + 'withdrawals')) || [];
        return withdrawals.filter(w => w.affiliateId === userId);
    },

    resetOrdersData() {
        localStorage.setItem(DB_PREFIX + 'orders', JSON.stringify([]));
        localStorage.setItem('amiele_orders', JSON.stringify([]));
        localStorage.setItem('amiele_orders_cleared', 'true');
    },

    resetAffiliateData() {
        localStorage.setItem(DB_PREFIX + 'commissions', JSON.stringify([]));
        localStorage.setItem(DB_PREFIX + 'clicks', JSON.stringify([]));
        localStorage.setItem(DB_PREFIX + 'withdrawals', JSON.stringify([]));
        localStorage.setItem(DB_PREFIX + 'affiliates', JSON.stringify([]));
        localStorage.setItem(DB_PREFIX + 'orders', JSON.stringify([]));
        localStorage.setItem('amiele_commissions', JSON.stringify([]));
        localStorage.setItem('amiele_clicks', JSON.stringify([]));
        localStorage.setItem('amiele_withdrawals', JSON.stringify([]));
        localStorage.setItem('amiele_orders', JSON.stringify([]));
        localStorage.removeItem('amiele_ref_code');
    },

    // ----------------------------------------
    // WITHDRAWALS MODULE
    // ----------------------------------------
    requestWithdrawal(amount, method, phone, account) {
        const currentUser = this.getCurrentUser();
        if (!currentUser) throw new Error('Must be logged in.');

        const affiliates = this.getAffiliates();
        const aff = affiliates.find(a => a.userId === currentUser.id);
        if (!aff) throw new Error('No affiliate account found.');

        if (amount < 500) throw new Error('Minimum withdrawal amount is 500 ETB.');
        if (amount > aff.balance) throw new Error('Insufficient balance.');

        aff.balance -= amount;
        this.saveAffiliates(affiliates);

        const withdrawals = JSON.parse(localStorage.getItem(DB_PREFIX + 'withdrawals')) || [];
        const newWithdrawal = {
            id: 'wth_' + Date.now(),
            affiliateId: currentUser.id,
            amount: amount,
            method: method,
            phone: phone,
            account: account || '',
            status: 'pending',
            createdAt: new Date().toISOString(),
            processedAt: null
        };
        withdrawals.push(newWithdrawal);
        localStorage.setItem(DB_PREFIX + 'withdrawals', JSON.stringify(withdrawals));

        return newWithdrawal;
    },

    // ----------------------------------------
    // ANNOUNCEMENTS MODULE
    // ----------------------------------------
    getAnnouncements() {
        return JSON.parse(localStorage.getItem(DB_PREFIX + 'announcements')) || [];
    },

    // ----------------------------------------
    // CAMPAIGNS MODULE
    // ----------------------------------------
    getCampaigns() {
        return JSON.parse(localStorage.getItem(DB_PREFIX + 'campaigns')) || [];
    },

    // ----------------------------------------
    // ADMIN PANEL MANAGEMENT FUNCTIONS
    // ----------------------------------------
    adminApproveApplication(appId) {
        const apps = this.getApplications();
        const app = apps.find(a => a.id === appId);
        if (!app) throw new Error('Application not found');

        app.status = 'approved';
        app.reviewedAt = new Date().toISOString();
        this.saveApplications(apps);

        // Update User Role to 'affiliate'
        const users = this.getUsers();
        const user = users.find(u => u.id === app.userId);
        if (user) {
            user.role = 'affiliate';
            this.saveUsers(users);
        }

        // Initialize Affiliate Metadata
        const affiliates = this.getAffiliates();
        if (!affiliates.find(a => a.userId === app.userId)) {
            // Generate clean clean codes
            const baseCode = app.name.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 6);
            const randomSuffix = Math.floor(10 + Math.random() * 90);
            
            affiliates.push({
                userId: app.userId,
                code: baseCode + randomSuffix,
                couponCode: baseCode + '5',
                balance: 0,
                totalEarnings: 0,
                pendingCommission: 0,
                totalPaid: 0,
                clicks: 0,
                sales: 0,
                tier: 'standard'
            });
            this.saveAffiliates(affiliates);
        }
    },

    adminRejectApplication(appId) {
        const apps = this.getApplications();
        const app = apps.find(a => a.id === appId);
        if (!app) throw new Error('Application not found');

        app.status = 'rejected';
        app.reviewedAt = new Date().toISOString();
        this.saveApplications(apps);
    },

    adminApproveCommission(commId) {
        const commissions = JSON.parse(localStorage.getItem(DB_PREFIX + 'commissions')) || [];
        const comm = commissions.find(c => c.id === commId);
        if (!comm) throw new Error('Commission record not found');
        if (comm.status !== 'pending') throw new Error('Commission is already processed');

        comm.status = 'approved';
        comm.approvedAt = new Date().toISOString();
        localStorage.setItem(DB_PREFIX + 'commissions', JSON.stringify(commissions));

        // Credit to affiliate balance & stats
        const affiliates = this.getAffiliates();
        const aff = affiliates.find(a => a.userId === comm.affiliateId);
        if (aff) {
            aff.balance = (aff.balance || 0) + comm.commissionAmount;
            aff.totalEarnings = (aff.totalEarnings || 0) + comm.commissionAmount;
            aff.pendingCommission = Math.max(0, (aff.pendingCommission || 0) - comm.commissionAmount);
            this.saveAffiliates(affiliates);
        }
    },

    adminCancelCommission(commId) {
        const commissions = JSON.parse(localStorage.getItem(DB_PREFIX + 'commissions')) || [];
        const comm = commissions.find(c => c.id === commId);
        if (!comm) throw new Error('Commission record not found');
        if (comm.status !== 'pending') throw new Error('Commission is already processed');

        comm.status = 'cancelled';
        localStorage.setItem(DB_PREFIX + 'commissions', JSON.stringify(commissions));

        // Reduce pending commission balance
        const affiliates = this.getAffiliates();
        const aff = affiliates.find(a => a.userId === comm.affiliateId);
        if (aff) {
            aff.pendingCommission = Math.max(0, (aff.pendingCommission || 0) - comm.commissionAmount);
            this.saveAffiliates(affiliates);
        }
    },

    adminApproveWithdrawal(withdrawalId) {
        const withdrawals = JSON.parse(localStorage.getItem(DB_PREFIX + 'withdrawals')) || [];
        const wth = withdrawals.find(w => w.id === withdrawalId);
        if (!wth) throw new Error('Withdrawal record not found');
        if (wth.status !== 'pending') throw new Error('Withdrawal already processed');

        wth.status = 'approved';
        wth.processedAt = new Date().toISOString();
        localStorage.setItem(DB_PREFIX + 'withdrawals', JSON.stringify(withdrawals));
    },

    adminRejectWithdrawal(withdrawalId) {
        const withdrawals = JSON.parse(localStorage.getItem(DB_PREFIX + 'withdrawals')) || [];
        const wth = withdrawals.find(w => w.id === withdrawalId);
        if (!wth) throw new Error('Withdrawal record not found');
        if (wth.status !== 'pending') throw new Error('Withdrawal already processed');

        wth.status = 'rejected';
        wth.processedAt = new Date().toISOString();
        localStorage.setItem(DB_PREFIX + 'withdrawals', JSON.stringify(withdrawals));

        // Return funds to affiliate balance
        const affiliates = this.getAffiliates();
        const aff = affiliates.find(a => a.userId === wth.affiliateId);
        if (aff) {
            aff.balance += wth.amount;
            this.saveAffiliates(affiliates);
        }
    },

    adminMarkWithdrawalPaid(withdrawalId) {
        const withdrawals = JSON.parse(localStorage.getItem(DB_PREFIX + 'withdrawals')) || [];
        const wth = withdrawals.find(w => w.id === withdrawalId);
        if (!wth) throw new Error('Withdrawal record not found');
        
        wth.status = 'paid';
        wth.processedAt = new Date().toISOString();
        localStorage.setItem(DB_PREFIX + 'withdrawals', JSON.stringify(withdrawals));

        // Move funds to Total Paid stats
        const affiliates = this.getAffiliates();
        const aff = affiliates.find(a => a.userId === wth.affiliateId);
        if (aff) {
            aff.totalPaid = (aff.totalPaid || 0) + wth.amount;
            this.saveAffiliates(affiliates);
        }
    },

    adminCreateCampaign(title, description, targetSales, reward, daysRemaining) {
        const campaigns = this.getCampaigns();
        const newCampaign = {
            id: 'cmp_' + Date.now(),
            title,
            description,
            targetSales: parseInt(targetSales),
            currentSales: 0,
            reward: parseFloat(reward),
            daysRemaining: parseInt(daysRemaining),
            status: 'active',
            createdAt: new Date().toISOString()
        };
        campaigns.push(newCampaign);
        localStorage.setItem(DB_PREFIX + 'campaigns', JSON.stringify(campaigns));
        return newCampaign;
    },

    adminCreateAnnouncement(title, content, type, urgency) {
        const announcements = this.getAnnouncements();
        const newAnn = {
            id: 'ann_' + Date.now(),
            title,
            content,
            type,
            urgency,
            createdAt: new Date().toISOString()
        };
        announcements.unshift(newAnn);
        localStorage.setItem(DB_PREFIX + 'announcements', JSON.stringify(announcements));
        return newAnn;
    },

    getOrders() {
        try {
            const o1 = JSON.parse(localStorage.getItem(DB_PREFIX + 'local_orders')) || [];
            const o2 = JSON.parse(localStorage.getItem('amiele_local_orders')) || [];
            const o3 = JSON.parse(localStorage.getItem('amiele_orders')) || [];
            const o4 = JSON.parse(localStorage.getItem('orders')) || [];
            const combined = [...o1, ...o2, ...o3, ...o4];
            const map = new Map();
            combined.forEach(item => {
                if (item && item.id) map.set(item.id, item);
            });
            return Array.from(map.values());
        } catch (e) {
            return [];
        }
    },

    addOrder(orderData) {
        const orders = this.getOrders();
        const newOrder = {
            id: orderData.id || ('loc_ord_' + Math.random().toString(36).substring(2)),
            order_number: orderData.order_number || ('AM-LOC-' + Math.floor(1000 + Math.random() * 9000)),
            customer_name: orderData.customer_name || 'Guest Customer',
            customer_email: orderData.customer_email || 'N/A',
            country: orderData.country || 'Ethiopia',
            referral_code: orderData.referral_code || 'Direct / None',
            affiliate_id: orderData.affiliate_id || null,
            product_name: orderData.product_name || 'Instrument',
            quantity: orderData.quantity || 1,
            amount: orderData.amount || 15000,
            payment_status: orderData.payment_status || 'pending_payment',
            status: orderData.status || 'pending',
            created_at: orderData.created_at || new Date().toISOString()
        };
        orders.unshift(newOrder);
        localStorage.setItem(DB_PREFIX + 'local_orders', JSON.stringify(orders));
        return newOrder;
    }
};

// Auto initialize database and export the initialization promise
window.AmieleDB.ready = window.AmieleDB.init();

// ============================================================
// Global Auth Helpers (replaces js/supabase/auth-guard.js)
// ============================================================

/**
 * Get current user from AuthService.
 * @returns {Promise<object|null>}
 */
window.getCurrentUser = async function () {
    if (window.AuthService) {
        return await window.AuthService.getCurrentUser();
    }
    return window.AmieleDB.getCurrentUser();
};

/**
 * Check if user is authenticated.
 * @returns {Promise<boolean>}
 */
window.isAuthenticated = async function () {
    if (window.AuthService) {
        return await window.AuthService.isAuthenticated();
    }
    const user = window.AmieleDB.getCurrentUser();
    return user !== null;
};

/**
 * Guard: route to AuthService requireAuth.
 */
window.requireAuth = async function () {
    if (window.AuthService) {
        return await window.AuthService.requireAuth();
    }
};

/**
 * Guard: route to AuthService requireGuest.
 */
window.requireGuest = async function () {
    if (window.AuthService) {
        return await window.AuthService.requireGuest();
    }
};
