// Immediate tab switch fallback for zero-latency response
window.switchTab = window.switchTab || function(e) {
    if (!e) return;
    document.querySelectorAll('.aff-menu-item').forEach(item => {
        item.classList.remove('active');
        item.setAttribute('aria-selected', 'false');
    });
    const o = document.querySelector('.aff-menu-item[onclick*="' + e + '"]');
    if (o) {
        o.classList.add('active');
        o.setAttribute('aria-selected', 'true');
    }
    const uCard = document.getElementById('sidebar-user-card');
    if (uCard) {
        if (e === 'settings') uCard.classList.add('active');
        else uCard.classList.remove('active');
    }
    const i = document.getElementById('breadcrumb-current');
    if (i) {
        const titles = {
            'overview': 'Overview',
            'referral': 'Referral Center',
            'commissions': 'Commissions',
            'withdrawals': 'Payouts',
            'marketing': 'Marketing Center',
            'campaigns': 'Bonus Campaigns',
            'achievements': 'Achievements',
            'announcements': 'Broadcast Updates',
            'settings': 'Profile & Settings'
        };
        i.textContent = titles[e] || (e.charAt(0).toUpperCase() + e.slice(1));
    }
    document.querySelectorAll('.aff-tab-pane').forEach(pane => {
        pane.classList.remove('active');
        pane.setAttribute('aria-hidden', 'true');
    });
    const a = document.getElementById('tab-' + e);
    if (a) {
        a.classList.add('active');
        a.setAttribute('aria-hidden', 'false');
    }
};
document.addEventListener("DOMContentLoaded",async()=>{const e=window.AmieleSanitize?window.AmieleSanitize.escapeHtml:function(e){return null==e?"":String(e)},t=await(window.AuthGuard?window.AuthGuard.protectPage({allowedRoles:['affiliate','admin']}):window.getCurrentUser());if(!t)return void(window.location.href="login.html?redirect=affiliate-dashboard.html");if("affiliate"!==t.role&&"admin"!==t.role){let e=null;if(window.AffiliateService)try{e=await window.AffiliateService.getUserApplication(t.id)}catch(e){console.error("[Amiele:Auth] Error fetching app review state:",e)}return e&&"pending"===e.status?void(document.body.innerHTML='\n                <div style="padding:4rem 2rem; text-align:center; font-family:\'Outfit\',sans-serif; background:#f9f8f4; min-height:100vh; display:flex; flex-direction:column; justify-content:center; align-items:center;">\n                    <div style="font-size:3rem; margin-bottom:1rem; animation: pulse 2s infinite;">🎻</div>\n                    <h2 style="color:#14231b; font-family:Georgia,serif; font-size:1.8rem; margin-bottom:0.5rem;">Your application is under review</h2>\n                    <p style="color:#555; max-width:420px; margin:0.5rem auto 2.5rem; line-height:1.6; font-size:0.95rem;">\n                        Our curation team is currently reviewing your partnership request. We will notify you as soon as your account is approved.\n                    </p>\n                    <a href="account.html" class="aff-btn" style="text-decoration:none; display:inline-block; padding:0.8rem 1.6rem; background:#14231b; color:white; border-radius:8px; font-weight:600; transition: background 0.2s;">Back to Account</a>\n                </div>\n            '):void(window.location.href="affiliate-apply.html")}function n(){document.getElementById("sidebar-user-name").textContent=t.name,document.getElementById("sidebar-user-email").textContent=t.email,document.getElementById("avatar-letter").textContent=t.name.charAt(0).toUpperCase()}window.AmieleDB&&window.AmieleDB.ready&&await window.AmieleDB.ready,window.AmieleDB&&"function"==typeof window.AmieleDB.resetAffiliateData&&window.AmieleDB.resetAffiliateData(),n(),window.handleLogout=async function(e){e&&e.preventDefault();try{window.AuthService&&"function"==typeof window.AuthService.signOut?await window.AuthService.signOut():window.AmieleDB&&"function"==typeof window.AmieleDB.logout?window.AmieleDB.logout():localStorage.removeItem("amiele_current_user"),"function"==typeof showToast&&showToast("Logged out successfully. / በሰላም ወጥተዋል።","success"),setTimeout(()=>{window.location.href="login.html"},800)}catch(e){console.error("[Amiele:Logout] Error:",e),window.location.href="login.html"}};const o=document.getElementById("hamburger-btn"),i=document.querySelector(".aff-sidebar");let a=document.querySelector(".aff-sidebar-overlay");function s(e){(void 0!==e?e:!i.classList.contains("mobile-open"))?(i.classList.add("mobile-open"),a.classList.add("active"),document.body.classList.add("sidebar-open")):(i.classList.remove("mobile-open"),a.classList.remove("active"),document.body.classList.remove("sidebar-open"))}a||(a=document.createElement("div"),a.className="aff-sidebar-overlay",document.body.appendChild(a)),o&&i&&(o.onclick=e=>{e.stopPropagation(),s()}),a&&(a.onclick=()=>s(!1)),document.querySelectorAll(".aff-sidebar-menu .aff-menu-item, .aff-sidebar a").forEach(e=>{e.addEventListener("click",()=>{window.innerWidth<=1024&&s(!1)})});let r=null;if(window.AffiliateService)try{r=await window.AffiliateService.getAffiliateMetadata(t.id)}catch(e){console.warn("[Amiele:Affiliate] Supabase metadata fetch failed, using fallback:",e)}if(!r&&window.AmieleDB&&(r=AmieleDB.getAffiliateMetadata(t.id)),!r)return console.error("[Amiele:Affiliate] No affiliate metadata found for user."),void(document.body.innerHTML='<div style="padding:3rem;text-align:center;font-family:sans-serif"><h2>Affiliate data not found</h2><p>Your affiliate account may not be fully provisioned yet.</p><a href="account.html" style="color:#2e7d32">Back to Account</a></div>');async function l(){if(window.AffiliateService)try{const e=await window.AffiliateService.getAffiliateMetadata(t.id);e&&(r=e)}catch(e){console.warn("[Amiele:Affiliate] Metadata refresh failed:",e)}!r&&window.AmieleDB&&(r=AmieleDB.getAffiliateMetadata(t.id)),r&&(r.balance=r.balance||0,r.totalEarnings=r.totalEarnings||0,r.pendingCommission=r.pendingCommission||0,r.totalPaid=r.totalPaid||0,r.sales=r.sales||0,r.clicks=r.clicks||0,r.totalOrders=r.totalOrders||0),r&&(f(),y(),w(),u(),k())}window.addSimulatedCommission=async function(){try{const e=JSON.parse(localStorage.getItem("amiele_commissions"))||[],n="#HA-"+Math.floor(1e3+9e3*Math.random()),o={id:"comm_sim_"+Date.now()+"_"+Math.random().toString(36).substring(2,6),affiliateId:t.id,orderId:n,productName:"Ethiopian Begena Instrument (Handcrafted)",orderAmount:12e3,commissionAmount:1200,status:"approved",createdAt:(new Date).toISOString(),approvedAt:(new Date).toISOString()};if(e.push(o),localStorage.setItem("amiele_commissions",JSON.stringify(e)),window.AmieleDB){const e=window.AmieleDB.getAffiliates(),n=e.find(e=>e.userId===t.id);n&&(n.sales=(n.sales||0)+1,n.totalEarnings=(n.totalEarnings||0)+1200,n.balance=(n.balance||0)+1200,window.AmieleDB.saveAffiliates(e))}window.showToast&&showToast(`New Approved Order (${n}) Credited! +ETB 1,200`,"success"),await l()}catch(e){console.error("[Amiele:Affiliate] Error adding test commission:",e)}},f(),y(),u(),initSettingsForm(),k(),window.addEventListener("focus",()=>{l()}),window.addEventListener("storage",()=>{l()}),window.addEventListener("amiele-commission-updated",()=>{l()}),document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible")l()}),window.AffiliateService&&"function"==typeof window.AffiliateService.subscribeToAffiliateUpdates&&t&&t.id&&window.AffiliateService.subscribeToAffiliateUpdates(t.id,()=>{l()}),window.toggleNotifDropdown=function(e){e&&e.stopPropagation();const t=document.getElementById("notif-dropdown");t&&t.classList.toggle("show")},document.addEventListener("click",()=>{const e=document.getElementById("notif-dropdown");e&&e.classList.remove("show")});const d=document.getElementById("notif-dropdown");function c(){const e=AmieleDB.getNotifications(t.id).filter(e=>e.unread).length,n=document.getElementById("notif-badge-count");n&&(e>0?(n.textContent=e,n.style.display="flex"):n.style.display="none")}function m(){const n=document.getElementById("notif-list-container");if(!n)return;const o=AmieleDB.getNotifications(t.id);n.innerHTML="",0!==o.length?o.forEach(i=>{const a=document.createElement("div");a.className="notif-item "+(i.unread?"unread":"");let s="fa-bell";"commission"===i.type&&(s="fa-wallet"),"payout"===i.type&&(s="fa-hand-holding-usd"),"campaign"===i.type&&(s="fa-trophy"),"announcement"===i.type&&(s="fa-bullhorn");const r=new Date(i.time).toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"})+" • "+new Date(i.time).toLocaleDateString("en-US",{month:"short",day:"numeric"});a.innerHTML=`\n                <div class="notif-icon-circle ${e(i.type)}">\n                    <i class="fas ${e(s)}"></i>\n                </div>\n                <div class="notif-item-body">\n                    <div class="notif-item-title">${e(i.title)}</div>\n                    <div class="notif-item-text">${e(i.text)}</div>\n                    <div class="notif-item-time">${r}</div>\n                </div>\n            `,a.addEventListener("click",()=>{i.unread=!1;const e="amiele_notifications_"+t.id;localStorage.setItem(e,JSON.stringify(o)),c(),m()}),n.appendChild(a)}):n.innerHTML='\n                <div style="padding: 2rem; text-align: center; color: var(--aff-text-muted); font-size: 0.88rem;">\n                    No notifications yet. / ምንም አዲስ ማሳወቂያ የለም።\n                </div>\n            '}function f(){if(!r)return;console.log("=== AFFILIATE DASHBOARD METRICS AUDIT ==="),console.log("1. Total Clicks:",r.clicks),console.log("2. Total Referrals:",r.totalOrders||0),console.log("3. All Orders:",r.totalOrders||0),console.log("4. Gross Volume:",r.grossVolume||0),console.log("5. Paid Orders:",r.sales),console.log("6. Clicks Today:",r.clicksToday||0),console.log("7. Clicks This Week:",r.clicksWeek||0),console.log("8. Clicks This Month:",r.clicksMonth||0),console.log("9. Clicks This Year:",r.clicksYear||0),console.log("10. Total Earnings:",r.totalEarnings),console.log("11. Available Balance:",r.balance),console.log("=========================================");const e=document.getElementById("stat-balance");e&&(e.textContent=`ETB ${r.balance.toLocaleString()}`);const t=document.getElementById("stat-earnings");t&&(t.textContent=`ETB ${r.totalEarnings.toLocaleString()}`);const n=document.getElementById("stat-pending");n&&(n.textContent=`ETB ${r.pendingCommission.toLocaleString()}`);const o=document.getElementById("stat-paid");o&&(o.textContent=`ETB ${r.totalPaid.toLocaleString()}`);const i=document.getElementById("stat-clicks");i&&(i.textContent=r.clicks);const a=document.getElementById("stat-orders");a&&(a.textContent=r.totalOrders||r.sales||0);const s=document.getElementById("stat-sales");s&&(s.textContent=r.sales);const l=r.clicks>0?(r.sales/r.clicks*100).toFixed(1):"0.0",d=document.getElementById("stat-conversion");d&&(d.textContent=`${l}%`);const c=document.getElementById("funnel-clicks");if(c){c.textContent=r.clicks;const e=document.getElementById("funnel-unique");e&&(e.textContent=r.uniqueClicks||0);const t=document.getElementById("funnel-orders");t&&(t.textContent=r.totalOrders||r.sales||0);const n=document.getElementById("funnel-paid-orders");n&&(n.textContent=r.sales);const o=document.getElementById("funnel-conv");o&&(o.textContent=`${l}%`);const i=document.getElementById("funnel-comm");i&&(i.textContent=`ETB ${r.totalEarnings.toLocaleString()}`);const a=document.getElementById("stat-clicks-today");a&&(a.textContent=r.clicksToday||0);const s=document.getElementById("stat-clicks-week");s&&(s.textContent=r.clicksWeek||0);const d=document.getElementById("stat-clicks-month");d&&(d.textContent=r.clicksMonth||0);const m=document.getElementById("stat-clicks-year");m&&(m.textContent=r.clicksYear||0);const perfCl=document.getElementById("perf-clicks");perfCl&&(perfCl.textContent=r.clicks||0);const perfSa=document.getElementById("perf-sales");perfSa&&(perfSa.textContent=r.sales||0);const perfCo=document.getElementById("perf-conversions");perfCo&&(perfCo.textContent=`${l}%`);const perfCm=document.getElementById("perf-commission");perfCm&&(perfCm.textContent=`ETB ${(r.totalEarnings||0).toLocaleString()}`);const perfRv=document.getElementById("perf-revenue");perfRv&&(perfRv.textContent=`ETB ${(10*(r.totalEarnings||0)).toLocaleString()}`)}}async function u(){const e=document.getElementById("earningsChart");if(!e)return;const n=e.getContext("2d");n.clearRect(0,0,e.width,e.height);let o=[0,0,0,0,0,r.totalEarnings];if(window.AffiliateService)try{o=await window.AffiliateService.getEarningsChartData(t.id,r.totalEarnings)}catch(e){console.error("[Amiele:Chart] Error resolving earnings chart:",e)}const i=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],a=[],s=new Date;for(let e=5;e>=0;e--){const t=new Date(s.getFullYear(),s.getMonth()-e,1);a.push(i[t.getMonth()])}const l=1.2*Math.max(...o,100),d=e.width,c=e.height,m=40,f=c-80,u=d-80;n.strokeStyle="rgba(20, 35, 27, 0.05)",n.lineWidth=1;for(let e=0;e<=4;e++){const t=m+f/4*e;n.beginPath(),n.moveTo(m,t),n.lineTo(d-m,t),n.stroke(),n.fillStyle="#666",n.font="10px Outfit";const o=l-l/4*e;n.fillText(Math.round(o),5,t+4)}n.fillStyle="rgba(20, 35, 27, 0.05)",n.strokeStyle="#14231b",n.lineWidth=3;const g=u/o.length;n.beginPath(),o.forEach((e,t)=>{const o=m+g*t+g/2,i=m+f-e/l*f;0===t?n.moveTo(o,i):n.lineTo(o,i)}),n.stroke(),n.fillStyle="#14231b",n.font="11px Outfit",o.forEach((e,t)=>{const o=m+g*t+g/2,i=m+f-e/l*f;n.beginPath(),n.arc(o,i,5,0,2*Math.PI),n.fillStyle="#ffd700",n.fill(),n.stroke(),n.fillStyle="#555",n.fillText(a[t],o-10,c-15)})}d&&d.addEventListener("click",e=>e.stopPropagation()),window.markAllNotificationsAsRead=function(e){e&&e.stopPropagation(),AmieleDB.markNotificationsAsRead(t.id),c(),m(),showToast("All notifications marked as read. / ሁሉም ማሳወቂያዎች ተነበዋል ተብለዋል።","info")},c(),m(),window.switchTab = function(e) {
    if (!e) return;
    document.querySelectorAll('.aff-menu-item').forEach(item => {
        item.classList.remove('active');
        item.setAttribute('aria-selected', 'false');
    });
    const o = document.querySelector('.aff-menu-item[onclick*="' + e + '"]');
    if (o) {
        o.classList.add('active');
        o.setAttribute('aria-selected', 'true');
    }
    const uCard = document.getElementById('sidebar-user-card');
    if (uCard) {
        if (e === 'settings') uCard.classList.add('active');
        else uCard.classList.remove('active');
    }
    const i = document.getElementById('breadcrumb-current');
    if (i) {
        const titles = {
            'overview': 'Overview',
            'referral': 'Referral Center',
            'commissions': 'Commissions',
            'withdrawals': 'Payouts',
            'marketing': 'Marketing Center',
            'campaigns': 'Bonus Campaigns',
            'achievements': 'Achievements',
            'announcements': 'Broadcast Updates',
            'settings': 'Profile & Settings'
        };
        i.textContent = titles[e] || (e.charAt(0).toUpperCase() + e.slice(1));
    }
    document.querySelectorAll('.aff-tab-pane').forEach(pane => {
        pane.classList.remove('active');
        pane.setAttribute('aria-hidden', 'true');
    });
    const a = document.getElementById('tab-' + e);
    if (a) {
        a.classList.add('active');
        a.setAttribute('aria-hidden', 'false');
    }
    if (window.AuthGuard && window.AuthGuard.syncTabToUrl) {
        window.AuthGuard.syncTabToUrl(e, 'tab');
    }
    try {
        if (e === 'overview') {
            if (typeof f === 'function') f();
            if (typeof y === 'function') y();
            if (typeof u === 'function') u();
        } else if (e === 'referral') {
            if (typeof renderReferralQR === 'function') renderReferralQR();
        } else if (e === 'commissions') {
            if (typeof w === 'function') w();
        } else if (e === 'withdrawals') {
            if (typeof v === 'function') v();
            if (typeof b === 'function') b();
            const el = document.getElementById('wth-avail-balance');
            if (el && typeof r !== 'undefined' && r) el.textContent = 'ETB ' + (r.balance || 0).toLocaleString();
        } else if (e === 'campaigns') {
            if (typeof x === 'function') x();
        } else if (e === 'achievements') {
            if (typeof renderAchievements === 'function') renderAchievements();
        } else if (e === 'announcements') {
            if (typeof E === 'function') E();
        } else if (e === 'settings') {
            if (typeof k === 'function') k();
            if (typeof initSettingsForm === 'function') initSettingsForm();
            if (typeof f === 'function') f();
        }
    } catch(err) {
        console.warn('[Amiele:TabSwitch] Error loading tab data:', err);
    }
};

function renderReferralQR() {
    const e = document.getElementById("qrCanvas");
    if (!e) return;
    const refUrl = typeof g !== 'undefined' ? g : window.location.origin + '/index.html';
    function t(t) {
        const n = 40, o = (e.width - n) / 2;
        t.fillStyle = "#ffd700";
        t.fillRect(o, o, n, n);
        t.fillStyle = "#14231b";
        t.font = "bold 12px Outfit, sans-serif";
        t.textAlign = "center";
        t.textBaseline = "middle";
        t.fillText("AM", e.width / 2, e.height / 2);
    }
    if ("undefined" != typeof QRious) {
        try {
            new QRious({
                element: e,
                value: refUrl,
                size: e.width || 240,
                background: "#ffffff",
                foreground: "#14231b",
                level: "H"
            });
            return void t(e.getContext("2d"));
        } catch(err) {
            console.warn("[Amiele:QR] QRious failed:", err);
        }
    }
    const n = new Image();
    n.crossOrigin = "Anonymous";
    n.onload = function() {
        const o = e.getContext("2d");
        o.clearRect(0, 0, e.width, e.height);
        o.drawImage(n, 0, 0, e.width, e.height);
        t(o);
    };
    n.src = "https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=" + encodeURIComponent(refUrl);
}

function initSettingsForm() {
    const profileForm = document.getElementById("settings-form");
    const pwdForm = document.getElementById("password-form");
    if (typeof t !== 'undefined' && t) {
        const nameEl = document.getElementById("set-name");
        const emailEl = document.getElementById("set-email");
        const phoneEl = document.getElementById("set-phone");
        const countryEl = document.getElementById("set-country");
        if (nameEl && !nameEl.dataset.userEdited) nameEl.value = t.name || "";
        if (emailEl && !emailEl.dataset.userEdited) emailEl.value = t.email || "";
        if (phoneEl && !phoneEl.dataset.userEdited) phoneEl.value = t.phone || "";
        if (countryEl && !countryEl.dataset.userEdited) countryEl.value = t.country || "Ethiopia";
        const pref = t.notifPreferences || { email: true, push: false };
        const prefEmail = document.getElementById("set-pref-email");
        const prefPush = document.getElementById("set-pref-push");
        if (prefEmail) prefEmail.checked = pref.email;
        if (prefPush) prefPush.checked = pref.push;
    }
    if (profileForm && !profileForm.dataset.initialized) {
        profileForm.dataset.initialized = "true";
        ["set-name", "set-email", "set-phone", "set-country"].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.addEventListener("input", () => { el.dataset.userEdited = "true"; });
        });
        profileForm.onsubmit = async (evt) => {
            evt.preventDefault();
            const nameVal = document.getElementById("set-name") ? document.getElementById("set-name").value.trim() : "";
            const emailVal = document.getElementById("set-email") ? document.getElementById("set-email").value.trim() : "";
            const phoneVal = document.getElementById("set-phone") ? document.getElementById("set-phone").value.trim() : "";
            const countryVal = document.getElementById("set-country") ? document.getElementById("set-country").value : "Ethiopia";
            const notifEmail = document.getElementById("set-pref-email") ? document.getElementById("set-pref-email").checked : true;
            const notifPush = document.getElementById("set-pref-push") ? document.getElementById("set-pref-push").checked : false;
            const btn = profileForm.querySelector('button[type="submit"]');
            const origText = btn ? btn.innerHTML : "";
            if (btn) {
                btn.disabled = true;
                btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
            }
            const uData = {
                name: nameVal || t.name,
                email: emailVal || t.email,
                phone: phoneVal,
                country: countryVal,
                notifPreferences: { email: notifEmail, push: notifPush }
            };
            try {
                if (window.AuthService && typeof window.AuthService.updateProfile === "function") {
                    await window.AuthService.updateProfile(t.id, uData);
                } else if (window.AffiliateService && typeof window.AffiliateService.updateProfile === "function") {
                    await window.AffiliateService.updateProfile(t.id, uData);
                } else if (window.AmieleDB && typeof window.AmieleDB.updateUserSettings === "function") {
                    window.AmieleDB.updateUserSettings(t.id, uData);
                }
                t.name = uData.name;
                t.email = uData.email;
                t.phone = uData.phone;
                t.country = uData.country;
                t.notifPreferences = uData.notifPreferences;
                localStorage.setItem("amiele_current_user", JSON.stringify(t));
                localStorage.setItem("amiele_current_session", JSON.stringify(t));
                localStorage.setItem("userName", uData.name);
                localStorage.setItem("userEmail", uData.email);
                localStorage.setItem("userPhone", uData.phone);
                ["set-name", "set-email", "set-phone", "set-country"].forEach(id => {
                    const el = document.getElementById(id);
                    if (el) delete el.dataset.userEdited;
                });
                if (typeof n === 'function') n();
                if (typeof k === 'function') k();
                showToast("Profile changes saved successfully! / መገለጫዎ በተሳካ ሁኔታ ተቀምጧል።", "success");
            } catch(err) {
                console.error("[Amiele:Settings] Save error:", err);
                showToast(err.message || "Error saving profile settings.", "error");
            } finally {
                if (btn) {
                    btn.disabled = false;
                    btn.innerHTML = origText;
                }
            }
        };
    }

    if (pwdForm && !pwdForm.dataset.initialized) {
        pwdForm.dataset.initialized = "true";
        const pwdInput = document.getElementById("set-password");
        const confirmInput = document.getElementById("set-password-confirm");
        const strengthFill = document.getElementById("pwd-strength-fill");
        const strengthText = document.getElementById("pwd-strength-text");
        const matchBadge = document.getElementById("pwd-match-badge");

        function evalStrength(val) {
            if (!val) {
                if (strengthFill) { strengthFill.className = "pwd-strength-fill"; strengthFill.style.width = "0%"; }
                if (strengthText) { strengthText.textContent = ""; strengthText.className = "pwd-feedback-text"; }
                return;
            }
            if (val.length < 6) {
                if (strengthFill) { strengthFill.className = "pwd-strength-fill weak"; strengthFill.style.width = "33%"; }
                if (strengthText) { strengthText.className = "pwd-feedback-text weak"; strengthText.textContent = "Too short (min. 6 chars required)"; }
            } else if (val.length >= 8 && /[A-Z]/.test(val) && /[0-9]/.test(val)) {
                if (strengthFill) { strengthFill.className = "pwd-strength-fill strong"; strengthFill.style.width = "100%"; }
                if (strengthText) { strengthText.className = "pwd-feedback-text strong"; strengthText.textContent = "Strong password! 🔒"; }
            } else {
                if (strengthFill) { strengthFill.className = "pwd-strength-fill medium"; strengthFill.style.width = "66%"; }
                if (strengthText) { strengthText.className = "pwd-feedback-text medium"; strengthText.textContent = "Good password"; }
            }
        }

        function checkMatch() {
            const p1 = pwdInput ? pwdInput.value : "";
            const p2 = confirmInput ? confirmInput.value : "";
            if (!matchBadge) return;
            if (!p2) { matchBadge.textContent = ""; matchBadge.className = "pwd-match-badge"; return; }
            if (p1 === p2) {
                matchBadge.className = "pwd-match-badge match";
                matchBadge.innerHTML = '<i class="fas fa-check-circle"></i> Passwords match';
            } else {
                matchBadge.className = "pwd-match-badge mismatch";
                matchBadge.innerHTML = '<i class="fas fa-times-circle"></i> Passwords do not match';
            }
        }

        if (pwdInput) pwdInput.oninput = () => { evalStrength(pwdInput.value); checkMatch(); };
        if (confirmInput) confirmInput.oninput = () => checkMatch();

        pwdForm.onsubmit = async (evt) => {
            evt.preventDefault();
            const p1 = pwdInput ? pwdInput.value : "";
            const p2 = confirmInput ? confirmInput.value : "";
            if (!p1 || p1.length < 6) return void showToast("Password must be at least 6 characters. / የይለፍ ቃል ቢያንስ 6 ፊደላት መሆን አለበት።", "error");
            if (p1 !== p2) return void showToast("Passwords do not match. / የይለፍ ቃላት አይዛመዱም።", "error");
            const btn = pwdForm.querySelector('button[type="submit"]');
            const orig = btn ? btn.innerHTML : "";
            if (btn) {
                btn.disabled = true;
                btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating...';
            }
            try {
                window.AffiliateService && typeof window.AffiliateService.updatePassword === "function"
                    ? await window.AffiliateService.updatePassword(p1)
                    : window.AmieleSupabase && window.AmieleSupabase.getClient()
                        ? await window.AmieleSupabase.getClient().auth.updateUser({ password: p1 })
                        : AmieleDB.updateUserSettings(t.id, { password: p1 });
                if (pwdInput) pwdInput.value = "";
                if (confirmInput) confirmInput.value = "";
                evalStrength("");
                checkMatch();
                showToast("Password updated successfully! / የይለፍ ቃልዎ በተሳካ ሁኔታ ተቀይሯል።", "success");
            } catch(err) {
                console.error("[Amiele:Password] Error updating password:", err);
                showToast(err.message || "Failed to update password.", "error");
            } finally {
                if (btn) {
                    btn.disabled = false;
                    btn.innerHTML = orig;
                }
            }
        };
    }
}

window.togglePasswordVisibility = function(inputId, btn) {
    const input = document.getElementById(inputId);
    if (!input) return;
    const icon = btn.querySelector("i");
    if (input.type === "password") {
        input.type = "text";
        if (icon) icon.className = "fas fa-eye-slash";
    } else {
        input.type = "password";
        if (icon) icon.className = "fas fa-eye";
    }
};
const g=`${"localhost"===window.location.hostname||"127.0.0.1"===window.location.hostname||window.location.hostname.includes("192.168.")?"https://amielestore-web.vercel.app":window.location.origin}/index.html?ref=${r.code}`,p=document.getElementById("referral-link");p&&(p.value=g);const h=document.getElementById("coupon-code-display");async function y(){const n=document.getElementById("commissions-table-body");if(!n)return;let o=[];if(window.AffiliateService)try{o=await window.AffiliateService.getCommissionsLedger(t.id)}catch(e){console.warn(e)}if(0===o.length&&window.AmieleDB&&(o=AmieleDB.getAffiliateCommissions(t.id)),n.innerHTML="",0===o.length)return n.innerHTML='<tr><td colspan="6" style="padding:0;"><div id="empty-overview-commissions"></div></td></tr>',void renderEmptyState("empty-overview-commissions","No commissions tracked yet","Share your referral code to begin earning rewards.");o.sort((e,t)=>new Date(t.createdAt)-new Date(e.createdAt)).slice(0,5).forEach(t=>{const o=new Date(t.createdAt).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}),i=document.createElement("tr");i.innerHTML=`\n                <td>${o}</td>\n                <td><strong>${e(t.orderId)}</strong></td>\n                <td>${e(t.productName)}</td>\n                <td>ETB ${t.orderAmount.toLocaleString()}</td>\n                <td style="color:var(--aff-primary); font-weight:600;">ETB ${t.commissionAmount.toLocaleString()}</td>\n                <td><span class="aff-badge ${e(t.status)}">${e(t.status)}</span></td>\n            `,n.appendChild(i)})}async function w(){const n=document.getElementById("commissions-table-body-full");if(!n)return;let o=[];if(window.AffiliateService)try{o=await window.AffiliateService.getCommissionsLedger(t.id)}catch(e){console.warn(e)}if(0===o.length&&window.AmieleDB&&(o=AmieleDB.getAffiliateCommissions(t.id)),n.innerHTML="",0===o.length)return n.innerHTML='<tr><td colspan="6" style="padding:0;"><div id="empty-full-commissions"></div></td></tr>',void renderEmptyState("empty-full-commissions","Ledger is currently empty","Your completed referral sales commissions will be logged here.");o.sort((e,t)=>new Date(t.createdAt)-new Date(e.createdAt)).forEach(t=>{const o=new Date(t.createdAt).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}),i=document.createElement("tr");i.innerHTML=`\n                <td>${o}</td>\n                <td><strong>${e(t.orderId)}</strong></td>\n                <td>${e(t.productName)}</td>\n                <td>ETB ${t.orderAmount.toLocaleString()}</td>\n                <td style="color:var(--aff-primary); font-weight:600;">ETB ${t.commissionAmount.toLocaleString()}</td>\n                <td><span class="aff-badge ${e(t.status)}">${e(t.status)}</span></td>\n            `,n.appendChild(i)})}async function v(){const n=document.getElementById("withdrawals-table-body");if(!n)return;let o=[];if(window.AffiliateService)try{o=await window.AffiliateService.getWithdrawals(t.id)}catch(e){console.error("[Amiele:Withdrawals] Error loading withdrawals history:",e)}if(n.innerHTML="",0===o.length)return n.innerHTML='<tr><td colspan="5" style="padding:0;"><div id="empty-withdrawals"></div></td></tr>',void renderEmptyState("empty-withdrawals","No withdrawals requested","Submit a withdrawal request using the balance request form.");o.sort((e,t)=>new Date(t.createdAt)-new Date(e.createdAt)).forEach(t=>{const o=new Date(t.createdAt).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}),i=document.createElement("tr");i.innerHTML=`\n                <td>${o}</td>\n                <td><strong>${e(t.id)}</strong></td>\n                <td style="font-weight:600;">ETB ${t.amount.toLocaleString()}</td>\n                <td>${e(t.method)}</td>\n                <td><span class="aff-badge ${e(t.status)}">${e(t.status)}</span></td>\n            `,n.appendChild(i)})}function b(){const e=document.getElementById("withdrawal-form");if(!e)return;const methodSelect=document.getElementById("wth-method"),dynDetails=document.getElementById("wth-dynamic-details"),badgeIcon=document.getElementById("wth-badge-icon"),badgeText=document.getElementById("wth-badge-text"),accLabel=document.getElementById("wth-acc-label"),accInput=document.getElementById("wth-account-number"),accHint=document.getElementById("wth-acc-hint"),nameLabel=document.getElementById("wth-name-label"),nameInput=document.getElementById("wth-account-name"),nameHint=document.getElementById("wth-name-hint");function updateFields(){if(!methodSelect||!dynDetails)return;const val=methodSelect.value;if(!val){dynDetails.style.display="none";if(accInput)accInput.required=false;if(nameInput)nameInput.required=false;return;}dynDetails.style.display="block";if(accInput)accInput.required=true;if(nameInput)nameInput.required=true;if(val.includes("Telebirr")){badgeIcon&&(badgeIcon.className="fas fa-mobile-alt");badgeText&&(badgeText.textContent="Telebirr Mobile Wallet Transfer");accLabel&&(accLabel.textContent="Telebirr Phone / Account Number *");accInput&&(accInput.placeholder="e.g. 0911223344 or +251911223344",accInput.type="tel");accHint&&(accHint.textContent="Direct automated transfer to your Telebirr wallet.");nameLabel&&(nameLabel.textContent="Telebirr Account Holder Full Name *");nameInput&&(nameInput.placeholder="e.g. Abebe Balcha");nameHint&&(nameHint.textContent="Must match your verified Telebirr registered name.");}else if(val.includes("CBE")){badgeIcon&&(badgeIcon.className="fas fa-building-columns");badgeText&&(badgeText.textContent="Commercial Bank of Ethiopia (CBE)");accLabel&&(accLabel.textContent="CBE Account Number (13 Digits) *");accInput&&(accInput.placeholder="e.g. 1000123456789",accInput.type="text");accHint&&(accHint.textContent="Standard 13-digit CBE savings or checking account number.");nameLabel&&(nameLabel.textContent="CBE Account Holder Full Name *");nameInput&&(nameInput.placeholder="e.g. Abebe Balcha");nameHint&&(nameHint.textContent="Must exactly match the name registered on your CBE passbook or CBE Birr.");}else if(val.includes("Abyssinia")){badgeIcon&&(badgeIcon.className="fas fa-university");badgeText&&(badgeText.textContent="Bank of Abyssinia (BoA)");accLabel&&(accLabel.textContent="Bank of Abyssinia Account Number *");accInput&&(accInput.placeholder="e.g. 12345678",accInput.type="text");accHint&&(accHint.textContent="Direct deposit into your Bank of Abyssinia account.");nameLabel&&(nameLabel.textContent="BoA Account Holder Full Name *");nameInput&&(nameInput.placeholder="e.g. Abebe Balcha");nameHint&&(nameHint.textContent="Must match your registered name at Bank of Abyssinia.");}else if(val.includes("Awash")){badgeIcon&&(badgeIcon.className="fas fa-university");badgeText&&(badgeText.textContent="Awash International Bank");accLabel&&(accLabel.textContent="Awash Bank Account Number *");accInput&&(accInput.placeholder="e.g. 01320123456700",accInput.type="text");accHint&&(accHint.textContent="Direct transfer to your Awash Bank account.");nameLabel&&(nameLabel.textContent="Awash Bank Account Holder Full Name *");nameInput&&(nameInput.placeholder="e.g. Abebe Balcha");nameHint&&(nameHint.textContent="Must match your registered Awash Bank account holder name.");}else if(val.includes("Dashen")){badgeIcon&&(badgeIcon.className="fas fa-university");badgeText&&(badgeText.textContent="Dashen Bank / Amole");accLabel&&(accLabel.textContent="Dashen Bank Account Number *");accInput&&(accInput.placeholder="e.g. 5123456789012",accInput.type="text");accHint&&(accHint.textContent="Direct transfer to your Dashen Bank account.");nameLabel&&(nameLabel.textContent="Dashen Bank Account Holder Full Name *");nameInput&&(nameInput.placeholder="e.g. Abebe Balcha");nameHint&&(nameHint.textContent="Must match your registered Dashen Bank name.");}else if(val.includes("PayPal")){badgeIcon&&(badgeIcon.className="fab fa-paypal");badgeText&&(badgeText.textContent="PayPal (Diaspora Transfer)");accLabel&&(accLabel.textContent="PayPal Email Address / ID *");accInput&&(accInput.placeholder="e.g. yourname@gmail.com",accInput.type="email");accHint&&(accHint.textContent="International payout via PayPal transfer.");nameLabel&&(nameLabel.textContent="Legal Name on PayPal Account *");nameInput&&(nameInput.placeholder="e.g. Abebe Balcha");nameHint&&(nameHint.textContent="Verified legal name registered with PayPal.");}}methodSelect&&methodSelect.addEventListener("change",updateFields);e.addEventListener("submit",async n=>{n.preventDefault();const o=parseFloat(document.getElementById("wth-amount").value),i=document.getElementById("wth-method").value,accNum=document.getElementById("wth-account-number")?document.getElementById("wth-account-number").value.trim():"",accName=document.getElementById("wth-account-name")?document.getElementById("wth-account-name").value.trim():"",a=document.getElementById("wth-phone").value.trim(),s=document.getElementById("wth-feedback");if(s&&s.classList.add("hidden"),o>r.balance)return void showToast("Insufficient balance for this request. / በቂ ሂሳብ የሎትም።","error");if(!accNum||!accName)return void showToast("Please fill in your account/wallet number and account holder name. / እባክዎን የሂሳብ ቁጥር እና ሙሉ ስም ያስገቡ።","warning");const methodDisplay=`${i} (Acc: ${accNum}, Name: ${accName})`;const l=`\n                You are submitting a payout request for:<br>\n                <strong>ETB ${o.toLocaleString()}</strong> via <strong>${i}</strong>.<br>\n                Account / Wallet: <strong>${accNum}</strong><br>\n                Account Holder: <strong>${accName}</strong><br>\n                Notification Phone: <strong>${a}</strong><br><br>\n                Would you like to proceed?\n            `;if(!await showConfirmModal("Request Withdrawal Payout",l,!1,"Confirm Request"))return void showToast("Withdrawal request cancelled. / ክፍያው ተሰርዟል።","warning");const d=e.querySelector('button[type="submit"]'),u=d.textContent;d.disabled=!0,d.innerHTML='<i class="fas fa-spinner fa-spin"></i> Processing Request...';try{window.AffiliateService?await window.AffiliateService.requestWithdrawal(t.id,o,methodDisplay,a):AmieleDB.requestWithdrawal(o,methodDisplay,a),window.AmieleDB&&AmieleDB.addNotification(t.id,"Withdrawal Requested",`Payout of ETB ${o.toLocaleString()} requested via ${methodDisplay}. Status: pending.`,"payout"),c(),m(),showToast("Request submitted! Redirecting to WhatsApp...","success");const n=`Hello Amiele,\n\nI would like to request my affiliate commission payout.\n\n👤 Affiliate: ${t.name}\n🆔 Affiliate ID: ${t.id}\n💰 Requested Amount: ETB ${o.toLocaleString()}\n🏦 Payment Method: ${i}\n💳 Account / Wallet: ${accNum}\n✍️ Account Holder: ${accName}\n📞 Contact Phone: ${a}\n\nThank you.`,s=`https://wa.me/251969189470?text=${encodeURIComponent(n)}`;setTimeout(()=>{window.open(s,"_blank"),e.reset(),dynDetails&&(dynDetails.style.display="none"),d.disabled=!1,d.textContent=u,setTimeout(async()=>{window.AffiliateService&&(r=await window.AffiliateService.getAffiliateMetadata(t.id)),f(),v();const e=document.getElementById("wth-avail-balance");e&&(e.textContent=`ETB ${r.balance.toLocaleString()}`)},1e3)},1e3)}catch(e){d.disabled=!1,d.textContent=u,s&&(s.textContent=e.message,s.className="form-feedback error",s.classList.remove("hidden")),showToast(e.message,"error")}})}async function x(){let t=[];if(window.AffiliateService)try{t=await window.AffiliateService.getCampaigns()}catch(e){console.error("[Amiele:Campaigns] Error loading active campaigns:",e)}0===t.length&&window.AmieleDB&&(t=AmieleDB.getCampaigns());const n=document.getElementById("campaigns-container");if(!n)return;if(n.innerHTML="",0===t.length)return n.innerHTML='<div id="empty-campaigns"></div>',void renderEmptyState("empty-campaigns","No campaigns active","Challenges will appear here when active. Check back soon!");const o=r.sales;t.forEach(t=>{const i=Math.min(o,t.targetSales),a=(i/t.targetSales*100).toFixed(0),s=document.createElement("div");s.className="campaign-card",s.innerHTML=`\n                <div class="campaign-card-header">\n                    <h3>${e(t.title)}</h3>\n                    <span class="campaign-reward">+ETB ${t.reward.toLocaleString()} Reward</span>\n                </div>\n                <p class="campaign-desc">${e(t.description)}</p>\n                <div class="campaign-progress-bar">\n                    <div class="campaign-progress-fill" style="width: ${a}%"></div>\n                </div>\n                <div class="campaign-progress-text">\n                    <span>Progress: ${i} / ${e(t.targetSales)} sold (${a}%)</span>\n                    <span>${e(t.daysRemaining)} days remaining</span>\n                </div>\n            `,n.appendChild(s)})}async function E(){const t=document.getElementById("announcements-container");if(!t)return;let n=[];if(window.AffiliateService)try{n=await window.AffiliateService.getAnnouncements()}catch(e){console.error("[Amiele:Announcements] Error loading bulletins:",e)}if(0===n.length&&window.AmieleDB&&(n=AmieleDB.getAnnouncements()),t.innerHTML="",0===n.length)return t.innerHTML='<div id="empty-announcements"></div>',void renderEmptyState("empty-announcements","No announcements","The announcement bulletin is currently clear.");n.forEach(n=>{const o=new Date(n.createdAt).toLocaleDateString("en-US",{month:"short",day:"numeric"}),i=document.createElement("div");i.className=`announcement-item ${n.urgency}`,i.innerHTML=`\n                <div class="announcement-meta">${o} • ${e(n.type.toUpperCase())}</div>\n                <h3>${e(n.title)}</h3>\n                <p>${e(n.content)}</p>\n            `,t.appendChild(i)})}function k(){const e=document.getElementById("profile-avatar-img"),n=document.getElementById("profile-card-name"),o=document.getElementById("profile-card-tier"),i=document.getElementById("profile-card-id"),a=document.getElementById("profile-card-joined"),s=document.getElementById("profile-card-earnings"),l=document.getElementById("profile-card-sales");if(!n)return;n.textContent=t.name,t.photoUrl?(e.innerHTML="",e.style.backgroundImage=`url('${t.photoUrl}')`,e.style.backgroundSize="cover",e.style.backgroundPosition="center"):(e.innerHTML=t.name.charAt(0).toUpperCase(),e.style.backgroundImage="none");const d=r.tier.toUpperCase();o.textContent=`${d} PARTNER`,o.className=`profile-tier-badge ${r.tier}`,i.textContent=`AFF-${t.id.toUpperCase()}`;const c=t.joinedAt?new Date(t.joinedAt).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}):"Jan 10, 2026";a.textContent=`Joined: ${c}`,s.textContent=`ETB ${r.totalEarnings.toLocaleString()}`,l.textContent=r.sales;const m=document.getElementById("tier-progress-fill"),f=document.getElementById("tier-progress-explanation"),u=document.getElementById("tier-progress-start"),g=document.getElementById("tier-progress-target"),p=r.sales;let h=0,y=10,w=0,v="";p<10?(h=0,y=10,w=p/10*100,v="Standard to Silver Rank (10 sales required)"):p<50?(h=10,y=50,w=(p-10)/40*100,v="Silver to Gold Rank (50 sales required)"):(h=50,y=100,w=Math.min((p-50)/50*100,100),v="Gold to Maestro elite Rank (100 sales required)"),m.style.width=`${w}%`,f.textContent=v,u.textContent=`${h} Sales`,g.textContent=`${y} Sales`;const b=document.getElementById("profile-badges-summary");if(b){b.innerHTML="";let e=!1;[{threshold:1,icon:"🌟",title:"First Sale"},{threshold:10,icon:"🎻",title:"Craftsman"},{threshold:50,icon:"🎼",title:"Maestro"},{threshold:100,icon:"👑",title:"Guardian"}].forEach(t=>{if(p>=t.threshold){e=!0;const n=document.createElement("span");n.style.fontSize="1.3rem",n.style.padding="4px",n.title=t.title,n.textContent=t.icon,b.appendChild(n)}}),e||(b.innerHTML='<span style="font-size:0.78rem; color:var(--aff-text-muted);">No badges unlocked yet.</span>')}const compPctEl=document.getElementById("profile-completion-pct"),compCircle=document.getElementById("profile-completion-svg-circle"),compText=document.getElementById("profile-completion-svg-text"),compStatus=document.getElementById("profile-completion-status-text"),compList=document.getElementById("profile-completion-checklist");if(compPctEl||compList){const checks=[{label:"Full Name",done:!(!t||!t.name||!t.name.trim())},{label:"Email Address",done:!(!t||!t.email||!t.email.trim())},{label:"Phone Number",done:!(!t||!t.phone||!t.phone.trim())},{label:"Country Selected",done:!(!t||!t.country||!t.country.trim())},{label:"Payout Method Configured",done:!(!r||(!r.paymentMethod&&!r.withdrawalMethod&&!t.paymentMethod))}];const doneCount=checks.filter(c=>c.done).length,totalCount=checks.length,pct=Math.round((doneCount/totalCount)*100);compPctEl&&(compPctEl.textContent=`${pct}%`),compText&&(compText.textContent=`${pct}%`);if(compCircle){const circumference=2*Math.PI*18,offset=circumference-(pct/100)*circumference;compCircle.style.strokeDasharray=`${circumference}`,compCircle.style.strokeDashoffset=`${offset}`,compCircle.style.stroke=100===pct?"#10b981":"#D4AF37"}compStatus&&(compStatus.textContent=100===pct?"Profile 100% Complete! 🎉":`${doneCount} of ${totalCount} details completed`,compStatus.style.color=100===pct?"#10b981":"var(--aff-primary)");if(compList){compList.innerHTML=checks.map(c=>`<div style="display:flex; align-items:center; justify-content:space-between; color:${c.done?"#14231b":"var(--aff-text-muted)"};"><span><i class="fas ${c.done?"fa-check-circle":"fa-circle-notch"}" style="margin-right:6px; color:${c.done?"#10b981":"#9ca3af"};"></i>${c.label}</span><span style="font-weight:600; font-size:0.75rem; color:${c.done?"#10b981":"#d97706"};">${c.done?"Completed":"Missing"}</span></div>`).join("")}}}h&&(h.textContent=r.couponCode),window.copyReferralLink=function(){p&&(p.select(),document.execCommand("copy"),showToast("Referral link copied to clipboard! / የማጣቀሻ ሊንኩ ተገልብጧል!","success"))},window.shareWhatsApp=function(){const e=`Buy authentic handcrafted Ethiopian musical instruments (Begena, Krar) from Amiele Begena! Use my referral link: ${g}`;window.open(`https://wa.me/?text=${encodeURIComponent(e)}`,"_blank"),showToast("WhatsApp sharing window launched. / የዋትስአፕ ማጋሪያ ተከፍቷል።","info")},window.shareTelegram=function(){const e=`Buy authentic handcrafted Ethiopian musical instruments (Begena, Krar) from Amiele Begena! Use my referral link: ${g}`;window.open(`https://t.me/share/url?url=${encodeURIComponent(g)}&text=${encodeURIComponent(e)}`,"_blank"),showToast("Telegram sharing window launched. / የቴሌግራም ማጋሪያ ተከፍቷል።","info")},window.downloadQRCode=function(){const e=document.getElementById("qrCanvas");if(!e)return;const t=document.createElement("a");t.download=`amiele_qr_${r.code}.png`,t.href=e.toDataURL(),t.click(),showToast("QR Code graphics download started. / የQR ኮድ ምስል መጫን ጀምሯል።","success")},window.downloadPerformancePDF=function(){const e=document.createElement("canvas");e.width=800,e.height=1e3;const n=e.getContext("2d");n.fillStyle="#14231b",n.fillRect(0,0,800,200),n.fillStyle="#ffd700",n.font="bold 32px Georgia",n.fillText("AMIELE BEGENA",50,80),n.fillStyle="#ffffff",n.font="20px Outfit",n.fillText("Affiliate Monthly Performance Certificate",50,120),n.font="12px Outfit",n.fillStyle="#aebdb4",n.fillText(`Generated Date: ${(new Date).toLocaleDateString()}`,50,160),n.fillStyle="#f9f8f4",n.fillRect(0,200,800,800),n.fillStyle="#111111",n.font="bold 20px Georgia",n.fillText("Partner Information",50,260),n.font="14px Outfit",n.fillText(`Partner Name: ${t.name}`,50,300),n.fillText(`Affiliate Code: ${r.code}`,50,330),n.fillText(`Tier Level: ${r.tier.toUpperCase()}`,50,360),n.fillText("Key Metrics",450,260),n.font="14px Outfit",n.fillText(`Total Referrals Clicks: ${r.clicks}`,450,300),n.fillText(`Successful Sales: ${r.sales}`,450,330);const o=r.clicks>0?(r.sales/r.clicks*100).toFixed(1):"0.0";n.fillText(`Conversion Rate: ${o}%`,450,360),n.fillText(`Commission Balance: ETB ${r.totalEarnings.toLocaleString()}`,450,390),n.strokeStyle="#14231b",n.lineWidth=1,n.beginPath(),n.moveTo(50,450),n.lineTo(750,450),n.stroke(),n.fillStyle="#14231b",n.font="bold 24px Georgia",n.fillText("OFFICIAL CULTURAL PARTNER",250,520),n.font="14px Outfit",n.fillStyle="#555",n.fillText("Recognized for contribution to the preservation and development of ancient string strings heritage.",100,560),n.strokeStyle="#ffd700",n.lineWidth=6,n.strokeRect(30,220,740,740);const i=e.toDataURL("image/png"),a=document.createElement("a");a.download=`amiele_report_${(new Date).getMonth()+1}_2026.png`,a.href=i,a.click(),showToast("Monthly performance report downloaded successfully. / ሪፖርቱ ወርዷል።","success")},window.downloadCertificate=function(e){const n=document.createElement("canvas");n.width=1100,n.height=800;const o=n.getContext("2d");o.fillStyle="#f9f8f4",o.fillRect(0,0,1100,800),o.strokeStyle="#14231b",o.lineWidth=15,o.strokeRect(30,30,1040,740),o.strokeStyle="#ffd700",o.lineWidth=4,o.strokeRect(55,55,990,690),o.fillStyle="rgba(20, 35, 27, 0.02)",o.font="bold 150px Georgia",o.fillText("AMIELE",280,480),o.textAlign="center",o.fillStyle="#14231b",o.font="bold 36px Georgia",o.fillText("CERTIFICATE OF RECOGNITION",550,160),o.font="italic 18px Georgia",o.fillText("This prestigious milestone certificate is proudly presented to",550,240),o.font="bold 42px Georgia",o.fillStyle="#ffd700",o.fillText(t.name,550,330),o.fillStyle="#14231b",o.font="italic 18px Georgia",o.fillText("for successfully reaching the milestone of",550,400),o.font="bold 28px Georgia",o.fillText(`"${e}"`,550,460),o.font="15px Outfit",o.fillStyle="#555",o.fillText("in recognition of your dedicated partnership, outreach, and impact in sharing Ethiopian musical instruments.",550,520),o.fillText("Your commitment helps sustain traditional artisans and craftsmanship of Addis Ababa.",550,545),o.strokeStyle="#14231b",o.lineWidth=1,o.beginPath(),n.moveTo(400,660),o.lineTo(700,660),o.stroke(),o.font="bold 14px Outfit",o.fillStyle="#14231b",o.fillText("Amiele Begena Curation Team",550,680),o.font="12px Outfit",o.fillStyle="#777",o.fillText("Authorized Representative",550,700);const i=n.toDataURL("image/png"),a=document.createElement("a");a.download=`amiele_cert_${e.replace(/\s+/g,"_")}.png`,a.href=i,a.click(),showToast(`Congratulations on unlocking your ${e} certificate! / የእንኳን ደስ አሎት ምስክር ወረቀት ወርዷል።`,"success")},window.addEventListener("offline",()=>{const e=document.getElementById("offline-banner");e&&e.classList.add("active"),showToast("Your browser has disconnected from the internet. Showing cached profile details. / በይነመረብ ተቋርጧል።","warning")}),window.addEventListener("online",()=>{const e=document.getElementById("offline-banner");e&&e.classList.remove("active"),showToast("You are back online! Connection synced. / በይነመረብ ተመልሷል።","success")}),f(),y(),v(),b(),function(){const e=r.sales,t=document.getElementById("achievements-container");t&&(t.innerHTML="",[{id:"first_sale",title:"First Sale",desc:"Refer 1 successful sale",threshold:1,icon:"🌟"},{id:"10_sales",title:"Craftsman Rank",desc:"Refer 10 successful sales",threshold:10,icon:"🎻"},{id:"50_sales",title:"Maestro Rank",desc:"Refer 50 successful sales",threshold:50,icon:"🎼"},{id:"100_sales",title:"Guardian Elite",desc:"Refer 100 successful sales",threshold:100,icon:"👑"},{id:"top_affiliate",title:"Top Ambassador",desc:"Ranked in the top 3 ambassadors",threshold:250,icon:"🎭"}].forEach(n=>{const o=e>=n.threshold,i=document.createElement("div");i.className="achievement-badge-card "+(o?"unlocked":"");const a=o?`<button class="btn-light-green" style="margin-top: 1rem; width:100%;" onclick="downloadCertificate('${n.title}')">Get Certificate</button>`:"";i.innerHTML=`\n                <span class="achievement-icon">${n.icon}</span>\n                <h3>${n.title}</h3>\n                <p>${n.desc}</p>\n                <div style="font-size:0.75rem; font-weight:600; margin-top:0.5rem; color:var(--aff-primary);">${e}/${n.threshold}</div>\n                ${a}\n            `,t.appendChild(i)}))}(),window.switchTab(window.AuthGuard?window.AuthGuard.getInitialTab("overview"):"overview"),window.addEventListener("popstate",function(){window.switchTab(window.AuthGuard?window.AuthGuard.getInitialTab("overview"):"overview")}),document.addEventListener("keydown",e=>{const t=document.activeElement?document.activeElement.tagName.toLowerCase():"";if("input"===t||"textarea"===t||"select"===t)return;const n={1:"overview",2:"referral",3:"commissions",4:"withdrawals",5:"performance",6:"marketing",7:"campaigns",8:"achievements",9:"announcements",0:"settings"};if(n[e.key])return e.preventDefault(),void window.switchTab(n[e.key]);if("n"===e.key.toLowerCase())return e.preventDefault(),void window.toggleNotifDropdown();if("?"===e.key){e.preventDefault();return void showConfirmModal("Keyboard Shortcut Directory",'\n                <div style="display:flex; flex-direction:column; gap:0.8rem; font-family:\'Outfit\',sans-serif; text-align:left;">\n                    <p style="margin:0 0 1rem; color:var(--aff-text-muted);">Use these quick keys to browse through components rapidly:</p>\n                    <div style="display:flex; justify-content:space-between; border-bottom:1px solid var(--aff-card-border); padding-bottom:6px;">\n                        <span><kbd style="background:var(--aff-bg); padding:2px 6px; border-radius:4px; border:1px solid #ccc; font-weight:600;">1</kbd> to <kbd style="background:var(--aff-bg); padding:2px 6px; border-radius:4px; border:1px solid #ccc; font-weight:600;">0</kbd></span>\n                        <span style="color:var(--aff-text-muted);">Navigate Portal Tabs</span>\n                    </div>\n                    <div style="display:flex; justify-content:space-between; border-bottom:1px solid var(--aff-card-border); padding-bottom:6px;">\n                        <span><kbd style="background:var(--aff-bg); padding:2px 6px; border-radius:4px; border:1px solid #ccc; font-weight:600;">Ctrl + K</kbd></span>\n                        <span style="color:var(--aff-text-muted);">Launch Search Command Palette</span>\n                    </div>\n                    <div style="display:flex; justify-content:space-between; border-bottom:1px solid var(--aff-card-border); padding-bottom:6px;">\n                        <span><kbd style="background:var(--aff-bg); padding:2px 6px; border-radius:4px; border:1px solid #ccc; font-weight:600;">N</kbd></span>\n                        <span style="color:var(--aff-text-muted);">Toggle Inbox Alerts Drawer</span>\n                    </div>\n                    <div style="display:flex; justify-content:space-between; border-bottom:1px solid var(--aff-card-border); padding-bottom:6px;">\n                        <span><kbd style="background:var(--aff-bg); padding:2px 6px; border-radius:4px; border:1px solid #ccc; font-weight:600;">Esc</kbd></span>\n                        <span style="color:var(--aff-text-muted);">Close Open Panels / Dialogs</span>\n                    </div>\n                </div>\n            ',!1,"Close Helper")}if("Escape"===e.key){const e=document.getElementById("notif-dropdown");e&&e.classList.remove("show");const t=document.getElementById("custom-modal-backdrop");if(t&&t.classList.contains("show")){const e=document.getElementById("modal-btn-cancel");e&&e.click()}}});if(window.AmieleTour){window.AmieleTour.autoStart(t?t.id:"anon");}});