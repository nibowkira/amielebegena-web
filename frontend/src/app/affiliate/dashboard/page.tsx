"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "../../../context/AuthContext";
import { supabase } from "../../../lib/supabase";
import { fetchAffiliateStats, submitAffiliateWithdrawal } from "../../../lib/api";
import {
  LayoutGrid,
  Link2,
  FileText,
  CreditCard,
  ShoppingBag,
  Target,
  Award,
  Megaphone,
  Pencil,
  Settings,
  ArrowLeft,
  ArrowRight,
  Menu,
  Search,
  Moon,
  Sun,
  Bell,
  Copy,
  Check,
  TrendingUp,
  Percent,
  Wallet,
  MousePointerClick,
  Share2,
  QrCode,
  Download,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  Clock,
  Sparkles,
  X,
  Filter,
  Plus,
  ChevronDown,
  Info,
  Camera,
  Video,
  Quote,
  FileSignature,
  Scroll,
  Loader2,
  User,
  Shield,
  Key,
  Eye,
  EyeOff,
  Circle,
  ListChecks,
  MoreHorizontal,
  ArrowUpRight,
} from "lucide-react";
import NotificationFlyout from "../../../components/NotificationFlyout";
import AffiliateSidebar from "../../../components/affiliate/AffiliateSidebar";
import AffiliatePayoutModal from "../../../components/affiliate/AffiliatePayoutModal";

type NavTab =
  | "dashboard"
  | "referrals"
  | "commissions"
  | "payouts"
  | "marketing"
  | "campaigns"
  | "achievements"
  | "broadcasts"
  | "settings";

function AffiliatePortalContent() {
  const { user, profile, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Route protection & Application Review State
  const [checkingApp, setCheckingApp] = useState(true);
  const [userApplication, setUserApplication] = useState<any>(null);
  const [isApproved, setIsApproved] = useState(false);

  // Active navigation tab
  const [activeTab, setActiveTab] = useState<NavTab>("dashboard");

  const handleSelectTab = (tabId: NavTab) => {
    setActiveTab(tabId);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", tabId === "dashboard" ? "overview" : tabId);
      window.history.replaceState({}, "", url.toString());
    }
  };
  const [darkMode, setDarkMode] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [copied, setCopied] = useState(false);
  const [couponCopied, setCouponCopied] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [downloadToast, setDownloadToast] = useState<{ visible: boolean; title: string; meta: string } | null>(null);
  const [showCaptionsModal, setShowCaptionsModal] = useState(false);
  const [copiedCaptionIdx, setCopiedCaptionIdx] = useState<number | null>(null);
  const [showCertificateModal, setShowCertificateModal] = useState(false);

  // Profile Settings Form State
  const [profileName, setProfileName] = useState("jane");
  const [profilePhone, setProfilePhone] = useState("");
  const [profileEmail, setProfileEmail] = useState("punchesbox@gmail.com");
  const [profileCountry, setProfileCountry] = useState("Ethiopia");
  const [notificationReports, setNotificationReports] = useState(true);
  const [notificationPush, setNotificationPush] = useState(false);
  const [profileSavedToast, setProfileSavedToast] = useState(false);

  // Security & Password Form State
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordToast, setPasswordToast] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleSaveProfile = async () => {
    try {
      if (user?.id) {
        await supabase
          .from("profiles")
          .update({
            full_name: profileName,
            phone: profilePhone,
          })
          .eq("id", user.id);
      }
      setProfileSavedToast(true);
      setTimeout(() => setProfileSavedToast(false), 3000);
    } catch (err) {
      console.error(err);
      setProfileSavedToast(true);
      setTimeout(() => setProfileSavedToast(false), 3000);
    }
  };

  const handleUpdatePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      setPasswordToast({ type: "error", text: "Password must be at least 6 characters." });
      setTimeout(() => setPasswordToast(null), 3500);
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordToast({ type: "error", text: "Passwords do not match." });
      setTimeout(() => setPasswordToast(null), 3500);
      return;
    }
    try {
      if (supabase && user) {
        await supabase.auth.updateUser({ password: newPassword });
      }
      setPasswordToast({ type: "success", text: "Password updated successfully!" });
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setPasswordToast(null), 3500);
    } catch (err: any) {
      setPasswordToast({ type: "error", text: err?.message || "Failed to update password." });
      setTimeout(() => setPasswordToast(null), 3500);
    }
  };

  // Sync profile data when user/profile loads
  useEffect(() => {
    if (profile?.fullName) setProfileName(profile.fullName);
    else if (user?.user_metadata?.full_name) setProfileName(user.user_metadata.full_name);
    else setProfileName("jane");
    if (profile?.phone) setProfilePhone(profile.phone);
    if (user?.email) setProfileEmail(user.email);
    else setProfileEmail("punchesbox@gmail.com");
  }, [profile, user]);

  // Sync tab from query param if provided
  useEffect(() => {
    const tabParam = searchParams.get("tab") as string;
    if (tabParam === "overview" || tabParam === "dashboard") {
      setActiveTab("dashboard");
    } else if (tabParam === "referral" || tabParam === "referrals") {
      setActiveTab("referrals");
    } else if (tabParam === "withdrawals" || tabParam === "payouts") {
      setActiveTab("payouts");
    } else if (tabParam === "announcements" || tabParam === "broadcasts") {
      setActiveTab("broadcasts");
    } else if (tabParam === "settings" || tabParam === "profile") {
      setActiveTab("settings");
    } else if (
      tabParam &&
      [
        "dashboard",
        "referrals",
        "commissions",
        "marketing",
        "campaigns",
        "achievements",
        "broadcasts",
        "settings",
      ].includes(tabParam)
    ) {
      setActiveTab(tabParam as NavTab);
    }
  }, [searchParams]);

  // Real affiliate state from API - NO mock initial numbers
  const [activeCode, setActiveCode] = useState<string>("");
  const [stats, setStats] = useState<any>({
    availableBalance: 0,
    totalEarnings: 0,
    pendingCommissions: 0,
    totalPaidOut: 0,
    clicks: 0,
    referrals: 0,
    paidOrders: 0,
    conversionRate: 0,
  });

  const [commissions, setCommissions] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);

  // Withdrawal state
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
  const [hideBalance, setHideBalance] = useState(false);
  const [showQuickSendToast, setShowQuickSendToast] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawMethod, setWithdrawMethod] = useState("telebirr");
  const [contactPhone, setContactPhone] = useState("");
  const [payoutDetails, setPayoutDetails] = useState("");
  const [withdrawMsg, setWithdrawMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Campaign builder state
  const [campaignName, setCampaignName] = useState("");
  const [campaignChannel, setCampaignChannel] = useState("youtube");
  const [createdCampaigns, setCreatedCampaigns] = useState<any[]>([]);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Origin for links
  const [origin, setOrigin] = useState<string>("");
  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }
  }, []);

  // User display metadata matching screenshot defaults
  const displayName = profile?.fullName || user?.user_metadata?.full_name || (user?.email ? user.email.split("@")[0] : "jane");
  const displayEmail = user?.email || "punchesbox@gmail.com";
  const userInitial = displayName.charAt(0).toUpperCase() || "J";

  // Referral links & coupon codes matching screenshot format
  const referralCode = activeCode || "jane-1558";
  const baseUrl = origin || "https://amielebegena.vercel.app";
  const referralLink = `${baseUrl}/index.html?ref=${referralCode}`;
  const referralCouponCode = `${referralCode.toUpperCase()}5`;

  // Load backend stats
  const loadData = async (identifier: string) => {
    try {
      const data = await fetchAffiliateStats(identifier);
      if (data && data.success && data.affiliate) {
        setStats({
          availableBalance: data.affiliate.availableBalance ?? 0,
          totalEarnings: data.affiliate.totalEarnings ?? 0,
          pendingCommissions: data.affiliate.pendingCommissions ?? 0,
          totalPaidOut: data.affiliate.withdrawnBalance ?? 0,
          clicks: data.affiliate.clicks ?? 0,
          referrals: data.affiliate.conversions ?? 0,
          paidOrders: data.affiliate.conversions ?? 0,
          conversionRate:
            data.affiliate.clicks > 0
              ? Number(((data.affiliate.conversions / data.affiliate.clicks) * 100).toFixed(1))
              : 0,
        });
        if (data.commissions) {
          const formatted = data.commissions.map((comm: any) => ({
            id: comm.id,
            orderNumber: comm.order?.order_number || (comm.order_id ? `#${comm.order_id.slice(0, 8)}` : "Pending"),
            date: comm.created_at ? new Date(comm.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "N/A",
            productName: comm.order?.product?.name || "Handcrafted Begena / Kirar",
            saleAmount: comm.order?.product?.price ? parseFloat(comm.order.product.price) * (comm.order.quantity || 1) : (comm.amount ? parseFloat(comm.amount) / 0.08 : 0),
            commissionRate: `${Math.round((parseFloat(comm.rate || 0.08)) * 100)}%`,
            commissionAmount: parseFloat(comm.amount || 0),
            status: comm.status || "approved",
          }));
          setCommissions(formatted);
        }
        if (data.withdrawals) {
          const formattedWd = data.withdrawals.map((w: any) => ({
            id: w.id ? `WD-${w.id.slice(0, 6)}` : `WD-${Date.now().toString().slice(-6)}`,
            date: w.created_at ? new Date(w.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "N/A",
            amount: parseFloat(w.amount || 0),
            method: w.method || "telebirr",
            status: w.status || "pending",
          }));
          setWithdrawals(formattedWd);
        }
        if (data.affiliate.referral_code) {
          setActiveCode(data.affiliate.referral_code);
        }
      }
    } catch (err) {
      console.warn("Could not load affiliate records:", err);
    }
  };

  // Route Guard & Role Authorization
  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.replace("/login?redirect=/affiliate/dashboard");
      return;
    }

    const role = profile?.role;
    if (role === "affiliate" || role === "admin" || !role) {
      setIsApproved(true);
      setCheckingApp(false);
      loadData(user.id);
      return;
    }

    // Role is standard user: check for an existing application in Supabase
    let isMounted = true;
    const checkApp = async () => {
      setCheckingApp(true);
      try {
        const { data: appData, error } = await supabase
          .from("affiliate_applications")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .maybeSingle();

        if (isMounted) {
          if (appData) {
            setUserApplication(appData);
            if (appData.status === "approved") {
              setIsApproved(true);
              loadData(user.id);
            }
          } else {
            // No application found -> redirect to apply
            router.push("/affiliate/apply");
          }
          setCheckingApp(false);
        }
      } catch (err) {
        console.warn("Error fetching application status:", err);
        if (isMounted) setCheckingApp(false);
      }
    };

    checkApp();

    return () => {
      isMounted = false;
    };
  }, [user, profile, authLoading, router]);

  const handleCopyLink = (customUrl?: string) => {
    navigator.clipboard.writeText(customUrl || referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyCoupon = () => {
    navigator.clipboard.writeText(referralCouponCode);
    setCouponCopied(true);
    setTimeout(() => setCouponCopied(false), 2000);
  };

  const handleWhatsAppShare = () => {
    const text = encodeURIComponent(
      `Experience sacred handcrafted Ethiopian Begena, Kirar, and Masenko instruments from Amiele Begena! Order with my partner link for an exclusive discount:\n${referralLink}`
    );
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  const handleTelegramShare = () => {
    const url = encodeURIComponent(referralLink);
    const text = encodeURIComponent(
      `Explore authentic handcrafted Ethiopian liturgical instruments from Amiele Begena (Begena, Kirar, Masenko). Use coupon ${referralCouponCode} for a 5% discount!`
    );
    window.open(`https://t.me/share/url?url=${url}&text=${text}`, "_blank");
  };

  const handleWithdrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setWithdrawMsg(null);
    const amountNum = parseFloat(withdrawAmount);
    if (isNaN(amountNum) || amountNum < 1000) {
      setWithdrawMsg({
        type: "error",
        text: "Minimum withdrawal is 1,000 ETB. / ዝቅተኛው የማውጣት መጠን 1,000 ብር ነው።",
      });
      return;
    }
    if (!withdrawMethod) {
      setWithdrawMsg({
        type: "error",
        text: "Please select a payment payout method.",
      });
      return;
    }
    const targetDetails = contactPhone.trim() || payoutDetails.trim();
    if (!targetDetails) {
      setWithdrawMsg({
        type: "error",
        text: "Please provide your payout account details or phone number.",
      });
      return;
    }
    if (amountNum > (stats?.availableBalance || 0)) {
      setWithdrawMsg({
        type: "error",
        text: `Requested amount (ETB ${amountNum.toLocaleString()}) exceeds your verified available balance of ETB ${(stats?.availableBalance || 0).toLocaleString()}.`,
      });
      return;
    }

    try {
      const res = await submitAffiliateWithdrawal({
        affiliate_id: user?.id || "",
        amount: amountNum,
        method: withdrawMethod,
        payout_details: targetDetails,
      });

      if (res && res.success) {
        setWithdrawMsg({
          type: "success",
          text: `Withdrawal request for ETB ${amountNum.toLocaleString()} submitted successfully via ${withdrawMethod}.`,
        });
        setWithdrawAmount("");
        setContactPhone("");
        setPayoutDetails("");
        if (user?.id) {
          loadData(user.id);
        }
      } else {
        setWithdrawMsg({
          type: "error",
          text: res?.error || "Withdrawal submission failed. Please try again.",
        });
      }
    } catch {
      setWithdrawMsg({ type: "error", text: "Withdrawal submission failed. Please check your connection." });
    }
  };

  const triggerDownload = (title: string, format: string, size: string) => {
    setDownloadToast({ visible: true, title, meta: `${format} (${size})` });
    setTimeout(() => {
      setDownloadToast(null);
    }, 4000);
  };

  const captionTemplates = [
    {
      title: "Amharic Begena Spiritual Post (የዳዊት በገና)",
      category: "Amharic / Telegram & TikTok",
      text: `የዳዊት በገና መንፈሳዊ ዜማና ቅዱስ ድምፅ በቤትዎ! 🌿✨
በጥንታዊ ጥበብና በእጅ በጥንቃቄ የተሰሩ ኦሪጅናል 10-አውታር በገናዎች እና ክራሮች በዓሚኤል በገና ይዘዙ።
በቅናሽ ዋጋና ፈጣን አቅርቦት ለመግዛት ከታች ባለው ሊንክ ይመልከቱ 👇
${baseUrl}/products?ref=${activeCode}`,
    },
    {
      title: "Sacred Acoustic Heritage Post (English)",
      category: "English / Instagram & YouTube",
      text: `Immerse yourself in the sacred, meditative sound of King David's Harp (Begena). 🕊️
Handcrafted in Addis Ababa by master Ethiopian artisans using cured cedar and genuine oxhide resonance.
Explore the royal collection with our exclusive partner privilege:
👉 ${baseUrl}/products?ref=${activeCode}`,
    },
    {
      title: "Kirar & Folk Music Celebration (ክራር)",
      category: "Bilingual / Facebook & WhatsApp",
      text: `የኢትዮጵያ ባህላዊ ሙዚቃ መሳሪያዎች - ክራር እና መሰንቆ በከፍተኛ ጥራት! 🇪🇹
Rich acoustic tones tuned to perfection. Ready to ship worldwide.
Order today with coupon code ${activeCode ? activeCode.toUpperCase() : "PARTNER5"}:
${baseUrl}/?ref=${activeCode}`,
    },
  ];

  const handleCopyCaption = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedCaptionIdx(idx);
    setTimeout(() => {
      setCopiedCaptionIdx(null);
    }, 2500);
  };

  const navItems = [
    { id: "dashboard" as NavTab, label: "Dashboard", icon: LayoutGrid },
    { id: "referrals" as NavTab, label: "Referral Center", icon: Link2 },
    { id: "commissions" as NavTab, label: "Commissions", icon: FileText },
    { id: "payouts" as NavTab, label: "Payout Queue", icon: CreditCard },
    { id: "marketing" as NavTab, label: "Marketing Center", icon: ShoppingBag },
    { id: "campaigns" as NavTab, label: "Campaigns Creator", icon: Target },
    { id: "achievements" as NavTab, label: "Achievements", icon: Award },
    { id: "broadcasts" as NavTab, label: "Broadcast Updates", icon: Megaphone },
  ];

  // -------------------------------------------------------------
  // GUARD SCREEN 1: Loading state
  // -------------------------------------------------------------
  if (authLoading || !user || (checkingApp && !isApproved)) {
    return (
      <div className="w-full min-h-[85vh] flex flex-col items-center justify-center p-6 bg-[#FAF8F5]">
        <div className="w-16 h-16 rounded-2xl bg-[#14231b] flex items-center justify-center text-[#f3be3b] text-3xl shadow-lg animate-pulse mb-4">
          🎻
        </div>
        <h2 className="font-benaiah text-2xl font-bold text-[#14231b]">
          Amiele Begena Affiliate Portal
        </h2>
        <p className="text-sm text-[#5b615e] mt-2 flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-[#d4af37]" />
          Verifying partner credentials... / የአጋርነት ፍቃድ በመረጋገጥ ላይ...
        </p>
      </div>
    );
  }

  // -------------------------------------------------------------
  // GUARD SCREEN 2: Unauthenticated state
  // -------------------------------------------------------------
  if (!user) {
    return (
      <div className="w-full min-h-[85vh] flex flex-col items-center justify-center p-6 bg-[#FAF8F5]">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 sm:p-10 text-center border border-[#14231b]/10 shadow-md space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-[#14231b]/5 flex items-center justify-center text-[#14231b] mx-auto border border-[#14231b]/10">
            <ShieldCheck className="w-8 h-8 text-[#d4af37]" />
          </div>
          <div>
            <h2 className="font-benaiah text-2xl font-bold text-[#14231b]">
              Authentication Required
            </h2>
            <p className="text-xs text-[#8a928e] mt-1 uppercase tracking-wider font-semibold">
              የአጋርነት ፖርታል መግቢያ
            </p>
          </div>
          <p className="text-xs sm:text-sm text-[#5b615e] leading-relaxed">
            Please sign in with your verified Amiele Begena partner account to access the affiliate dashboard and earnings portal.
          </p>
          <div className="pt-2">
            <Link
              href="/login?redirect=/affiliate/dashboard"
              className="inline-flex items-center justify-center gap-2 w-full py-3.5 rounded-xl bg-[#14231b] hover:bg-[#1b4332] text-white font-bold text-xs uppercase tracking-wider transition-colors shadow-sm"
            >
              Sign In to Continue
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // GUARD SCREEN 3: Application Under Review
  // -------------------------------------------------------------
  if (!isApproved && userApplication?.status === "pending") {
    return (
      <div className="w-full min-h-[85vh] flex flex-col items-center justify-center p-6 bg-[#FAF8F5]">
        <div className="max-w-lg w-full bg-white rounded-3xl p-8 sm:p-11 text-center border border-[#14231b]/10 shadow-lg space-y-6">
          <div className="w-20 h-20 rounded-3xl bg-[#14231b] text-[#f3be3b] flex items-center justify-center text-4xl shadow-md border border-[#f3be3b]/30 mx-auto animate-pulse">
            🎻
          </div>

          <div>
            <h2 className="font-benaiah text-2xl sm:text-3xl font-extrabold text-[#14231b]">
              Your application is under review
            </h2>
            <p className="text-xs sm:text-sm text-[#b8860b] font-medium mt-1">
              የአጋርነት ማመልከቻዎ በግምገማ ላይ ነው
            </p>
          </div>

          <p className="text-xs sm:text-sm text-[#55645a] leading-relaxed max-w-md mx-auto">
            Our curation team is currently reviewing your partnership request. We inspect every application to ensure our sacred Begena and Kirar instruments are represented with cultural reverence and acoustic authenticity. We will notify you via email as soon as your account is approved.
          </p>

          {/* Application Details Card */}
          <div className="rounded-2xl p-4 sm:p-5 bg-[#FAF8F5] border border-[#14231b]/8 text-left space-y-3">
            <div className="flex items-center justify-between text-xs pb-2 border-b border-gray-200">
              <span className="text-gray-500 font-medium">Application Reference:</span>
              <span className="font-mono font-bold text-[#14231b]">
                #APP-{String(userApplication.user_id || userApplication.id || "REQ").slice(0, 8).toUpperCase()}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs pb-2 border-b border-gray-200">
              <span className="text-gray-500 font-medium">Applicant Name:</span>
              <span className="font-bold text-[#14231b]">
                {displayName || "Partner Applicant"}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs pb-2 border-b border-gray-200">
              <span className="text-gray-500 font-medium">Contact Email:</span>
              <span className="font-medium text-gray-700">
                {displayEmail || user?.email}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs pt-1">
              <span className="text-gray-500 font-medium">Status:</span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                Under Review / በግምገማ ላይ
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link
              href="/account"
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#14231b] hover:bg-[#1b4332] text-white font-bold text-xs uppercase tracking-wider transition-colors shadow-sm text-center"
            >
              Back to Account
            </Link>
            <Link
              href="/products"
              className="w-full sm:w-auto px-6 py-3 rounded-xl border border-gray-300 hover:border-[#14231b] text-gray-700 font-bold text-xs uppercase tracking-wider transition-colors text-center"
            >
              Browse Instruments
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // GUARD SCREEN 4: Application Rejected
  // -------------------------------------------------------------
  if (!isApproved && userApplication?.status === "rejected") {
    return (
      <div className="w-full min-h-[85vh] flex flex-col items-center justify-center p-6 bg-[#FAF8F5]">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 sm:p-10 text-center border border-[#14231b]/10 shadow-lg space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto border border-red-200">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <div>
            <h2 className="font-benaiah text-2xl font-bold text-[#14231b]">
              Application Status Update
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              የማመልከቻ ውጤት ማስታወቂያ
            </p>
          </div>
          <p className="text-xs sm:text-sm text-[#55645a] leading-relaxed">
            Thank you for your interest in the Amiele Begena partnership program. After review by our curation team, your application was not approved at this time.
          </p>
          {userApplication.rejection_reason && (
            <div className="p-3 bg-red-50 text-red-800 rounded-xl text-xs text-left border border-red-200">
              <span className="font-bold">Reason: </span>
              {userApplication.rejection_reason}
            </div>
          )}
          <div className="pt-2 flex flex-col gap-2">
            <Link
              href="/account"
              className="w-full py-3 rounded-xl bg-[#14231b] hover:bg-[#1b4332] text-white font-bold text-xs uppercase tracking-wider transition-colors text-center"
            >
              Back to Account
            </Link>
            <Link
              href="/contact"
              className="w-full py-2 text-xs font-semibold text-[#55645a] hover:text-[#14231b] text-center"
            >
              Contact Support Team
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // GUARD SCREEN 5: Standard user with no application redirecting
  // -------------------------------------------------------------
  if (!isApproved) {
    return (
      <div className="w-full min-h-[85vh] flex flex-col items-center justify-center p-6 bg-[#FAF8F5]">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 text-center border border-[#14231b]/10 shadow-md space-y-4">
          <div className="w-14 h-14 rounded-full bg-[#f3be3b]/20 flex items-center justify-center text-[#14231b] mx-auto">
            <Sparkles className="w-7 h-7 text-[#d4af37]" />
          </div>
          <h2 className="font-benaiah text-xl font-bold text-[#14231b]">
            Become an Amiele Begena Partner
          </h2>
          <p className="text-xs sm:text-sm text-[#5b615e] leading-relaxed">
            You do not currently have an active affiliate partnership. Apply now to earn 8% commissions representing sacred Ethiopian instruments worldwide.
          </p>
          <div className="pt-2">
            <Link
              href="/affiliate/apply"
              className="inline-flex items-center justify-center w-full py-3.5 rounded-xl bg-[#14231b] hover:bg-[#1b4332] text-white font-bold text-xs uppercase tracking-wider transition-colors"
            >
              Apply for Partnership
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen w-full flex flex-col md:flex-row font-sans transition-colors duration-200 ${
        darkMode ? "dark bg-[#080d0a] text-white" : "bg-[#FAF8F5] text-[#14231b]"
      }`}
    >
      {/* ========================================================= */}
      {/* 1. LEFT SIDEBAR COMPONENT (Cloned from Reference Image)   */}
      {/* ========================================================= */}
      <AffiliateSidebar
        activeTab={activeTab}
        onSelectTab={(tabId) => handleSelectTab(tabId as NavTab)}
        userProfile={{
          displayName,
          displayEmail,
          userInitial,
        }}
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
      />

      {/* ========================================================= */}
      {/* 2. MAIN CONTENT AREA (Ivory / Clean Off-White)            */}
      {/* ========================================================= */}
      <main className="flex-1 min-w-0 px-4 py-4 sm:px-6 sm:py-6 lg:px-12 lg:py-9 space-y-6 sm:space-y-8 w-full bg-[#FAF8F4] transition-colors duration-200 dark:bg-[#080d0a]">
        {/* Top Header Bar */}
        <div className="flex items-center justify-between pb-2 gap-3">
          <div className="flex items-center gap-3">
            {/* Mobile Menu Hamburger */}
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="md:hidden p-2 rounded-xl bg-white dark:bg-[#112419] border border-gray-200 dark:border-white/10 text-[#14231b] dark:text-white shadow-xs cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
              aria-label="Open Navigation"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Breadcrumb Navigation matching screenshot */}
            <div className="text-sm font-benaiah">
              <span className="text-[#8a928e] font-medium">Portal / </span>
              <span
                className={`font-bold capitalize ${
                  darkMode ? "text-white" : "text-[#14231b]"
                }`}
              >
                {activeTab === "dashboard"
                  ? "Overview"
                  : activeTab === "referrals"
                  ? "Referral Center"
                  : activeTab === "commissions"
                  ? "Commissions"
                  : activeTab === "payouts"
                  ? "Payouts"
                  : activeTab === "marketing"
                  ? "Marketing Center"
                  : activeTab === "campaigns"
                  ? "Bonus Campaigns"
                  : activeTab === "achievements"
                  ? "Achievements"
                  : activeTab === "broadcasts"
                  ? "Broadcast Updates"
                  : activeTab === "settings"
                  ? "Profile & Settings"
                  : activeTab}
              </span>
            </div>
          </div>

          {/* Top Controls: Search, Theme Toggle, Notifications */}
          <div className="flex items-center gap-3">
            {/* Search Pill */}
            <button
              onClick={() => setShowSearchModal(true)}
              className={`rounded-full px-4 py-1.5 flex items-center gap-2 text-xs font-medium shadow-xs transition-all cursor-pointer ${
                darkMode
                  ? "bg-[#112419] border border-white/10 text-gray-300 hover:border-white/20"
                  : "bg-white border border-[#E8E2D8] text-[#737874] hover:border-gray-300"
              }`}
            >
              <Search className="w-3.5 h-3.5 text-[#8a928e]" />
              <span className="hidden sm:inline">Search</span>
              <kbd
                className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                  darkMode ? "bg-white/10 text-gray-300" : "bg-[#f3f0e8] text-[#8a928e]"
                }`}
              >
                ⌘K
              </kbd>
            </button>

            {/* Dark Mode Moon / Sun */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-xs ${
                darkMode
                  ? "bg-[#112419] border border-white/10 text-yellow-400 hover:bg-white/10"
                  : "bg-white border border-[#E8E2D8] text-[#14231b] hover:bg-[#f8f5ee]"
              }`}
              title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Clean Bell Notification Flyout with amber badge matching design system */}
            <div className="relative">
              <NotificationFlyout
                triggerStyle="circle"
                buttonClassName={`w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-xs relative ${
                  darkMode
                    ? "bg-[#112419] border border-white/10 text-gray-300 hover:bg-white/10"
                    : "bg-white border border-[#E8E2D8] text-[#14231b] hover:bg-[#f8f5ee]"
                }`}
                iconClassName="w-4 h-4 text-[#14231b] dark:text-gray-300"
              />
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* VIEW 1: OVERVIEW DASHBOARD (activeTab === "dashboard")    */}
        {/* ========================================================= */}
        {activeTab === "dashboard" && (
          <div className="space-y-8 animate-in fade-in duration-200">
            {/* Page Heading matching screenshot */}
            <div className="pt-1">
              <p className="font-benaiah text-[11px] font-extrabold tracking-[0.2em] text-[#737874] uppercase mb-1.5">
                PARTNER PORTAL
              </p>
              <h1
                className={`font-benaiah text-3xl sm:text-[36px] font-bold tracking-tight leading-tight ${
                  darkMode ? "text-white" : "text-[#14231b]"
                }`}
              >
                Overview Dashboard
              </h1>
            </div>

            {/* 8 Stats Cards (Mobile: Compact 2-column grid, Desktop: 2 rows of 4 cards) */}
            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
              {/* Card 1: Available Balance (Yellow Left Accent Capsule) */}
              <div
                className={`relative rounded-2xl p-3 sm:p-5 md:p-6 lg:p-7 shadow-[0_2px_8px_rgba(20,35,27,0.04)] border border-[#E8E1D6] dark:border-white/10 flex flex-col justify-between min-h-[96px] md:min-h-[145px] transition-all hover:shadow-[0_6px_24px_rgba(20,35,27,0.08)] last:odd:col-span-2 ${
                  darkMode ? "bg-[#0d1a12]" : "bg-white"
                }`}
              >
                {/* Yellow Left Accent Capsule */}
                <span className="absolute left-0 top-3 bottom-3 md:top-6 md:bottom-6 w-[3px] md:w-[4.5px] rounded-r-full bg-[#f5c518]" />

                <span className="font-benaiah text-[10px] min-[380px]:text-[11px] font-bold tracking-[0.08em] min-[380px]:tracking-[0.12em] md:tracking-[0.14em] text-[#6b7280] dark:text-[#8ea396] uppercase block leading-tight truncate">
                  AVAILABLE BALANCE
                </span>
                <div className="mt-2 md:mt-5 flex items-baseline">
                  <span
                    className={`font-benaiah text-base min-[360px]:text-lg min-[390px]:text-xl md:text-[28px] lg:text-[30px] font-black tracking-tight truncate ${
                      darkMode ? "text-white" : "text-[#14231b]"
                    }`}
                  >
                    ETB {stats.availableBalance.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Card 2: Pending Commissions (Dark Left Accent Capsule) */}
              <div
                className={`relative rounded-2xl p-3 sm:p-5 md:p-6 lg:p-7 shadow-[0_2px_8px_rgba(20,35,27,0.04)] border border-[#E8E1D6] dark:border-white/10 flex flex-col justify-between min-h-[96px] md:min-h-[145px] transition-all hover:shadow-[0_6px_24px_rgba(20,35,27,0.08)] last:odd:col-span-2 ${
                  darkMode ? "bg-[#0d1a12]" : "bg-white"
                }`}
              >
                {/* Dark Left Accent Capsule */}
                <span className="absolute left-0 top-3 bottom-3 md:top-6 md:bottom-6 w-[3px] md:w-[4.5px] rounded-r-full bg-[#14231b] dark:bg-white/30" />

                <span className="font-benaiah text-[10px] min-[380px]:text-[11px] font-bold tracking-[0.08em] min-[380px]:tracking-[0.12em] md:tracking-[0.14em] text-[#6b7280] dark:text-[#8ea396] uppercase block leading-tight truncate">
                  PENDING COMMISSIONS
                </span>
                <div className="mt-2 md:mt-5 flex items-baseline">
                  <span
                    className={`font-benaiah text-base min-[360px]:text-lg min-[390px]:text-xl md:text-[28px] lg:text-[30px] font-black tracking-tight truncate ${
                      darkMode ? "text-white" : "text-[#14231b]"
                    }`}
                  >
                    ETB {stats.pendingCommissions.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Card 3: Total Earnings (Dark Left Accent Capsule) */}
              <div
                className={`relative rounded-2xl p-3 sm:p-5 md:p-6 lg:p-7 shadow-[0_2px_8px_rgba(20,35,27,0.04)] border border-[#E8E1D6] dark:border-white/10 flex flex-col justify-between min-h-[96px] md:min-h-[145px] transition-all hover:shadow-[0_6px_24px_rgba(20,35,27,0.08)] last:odd:col-span-2 ${
                  darkMode ? "bg-[#0d1a12]" : "bg-white"
                }`}
              >
                {/* Dark Left Accent Capsule */}
                <span className="absolute left-0 top-3 bottom-3 md:top-6 md:bottom-6 w-[3px] md:w-[4.5px] rounded-r-full bg-[#14231b] dark:bg-white/30" />

                <span className="font-benaiah text-[10px] min-[380px]:text-[11px] font-bold tracking-[0.08em] min-[380px]:tracking-[0.12em] md:tracking-[0.14em] text-[#6b7280] dark:text-[#8ea396] uppercase block leading-tight truncate">
                  TOTAL EARNINGS
                </span>
                <div className="mt-2 md:mt-5 flex items-baseline">
                  <span
                    className={`font-benaiah text-base min-[360px]:text-lg min-[390px]:text-xl md:text-[28px] lg:text-[30px] font-black tracking-tight truncate ${
                      darkMode ? "text-white" : "text-[#14231b]"
                    }`}
                  >
                    ETB {stats.totalEarnings.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Card 4: Total Paid Out (Dark Left Accent Capsule) */}
              <div
                className={`relative rounded-2xl p-3 sm:p-5 md:p-6 lg:p-7 shadow-[0_2px_8px_rgba(20,35,27,0.04)] border border-[#E8E1D6] dark:border-white/10 flex flex-col justify-between min-h-[96px] md:min-h-[145px] transition-all hover:shadow-[0_6px_24px_rgba(20,35,27,0.08)] last:odd:col-span-2 ${
                  darkMode ? "bg-[#0d1a12]" : "bg-white"
                }`}
              >
                {/* Dark Left Accent Capsule */}
                <span className="absolute left-0 top-3 bottom-3 md:top-6 md:bottom-6 w-[3px] md:w-[4.5px] rounded-r-full bg-[#14231b] dark:bg-white/30" />

                <span className="font-benaiah text-[10px] min-[380px]:text-[11px] font-bold tracking-[0.08em] min-[380px]:tracking-[0.12em] md:tracking-[0.14em] text-[#6b7280] dark:text-[#8ea396] uppercase block leading-tight truncate">
                  TOTAL PAID OUT
                </span>
                <div className="mt-2 md:mt-5 flex items-baseline">
                  <span
                    className={`font-benaiah text-base min-[360px]:text-lg min-[390px]:text-xl md:text-[28px] lg:text-[30px] font-black tracking-tight truncate ${
                      darkMode ? "text-white" : "text-[#14231b]"
                    }`}
                  >
                    ETB {stats.totalPaidOut.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Card 5: Total Clicks (Dark Left Accent Capsule) */}
              <div
                className={`relative rounded-2xl p-3 sm:p-5 md:p-6 lg:p-7 shadow-[0_2px_8px_rgba(20,35,27,0.04)] border border-[#E8E1D6] dark:border-white/10 flex flex-col justify-between min-h-[96px] md:min-h-[145px] transition-all hover:shadow-[0_6px_24px_rgba(20,35,27,0.08)] last:odd:col-span-2 ${
                  darkMode ? "bg-[#0d1a12]" : "bg-white"
                }`}
              >
                {/* Dark Left Accent Capsule */}
                <span className="absolute left-0 top-6 bottom-6 w-[3px] md:w-[4.5px] rounded-r-full bg-[#14231b] dark:bg-white/30" />

                <span className="font-benaiah text-[10px] min-[380px]:text-[11px] font-bold tracking-[0.08em] min-[380px]:tracking-[0.12em] md:tracking-[0.14em] text-[#6b7280] dark:text-[#8ea396] uppercase block leading-tight truncate">
                  TOTAL CLICKS
                </span>
                <div className="mt-2 md:mt-5 flex items-baseline">
                  <span
                    className={`font-benaiah text-base min-[360px]:text-lg min-[390px]:text-xl md:text-[28px] lg:text-[30px] font-black tracking-tight truncate ${
                      darkMode ? "text-white" : "text-[#14231b]"
                    }`}
                  >
                    {stats.clicks}
                  </span>
                </div>
              </div>

              {/* Card 6: Total Referrals (Dark Left Accent Capsule) */}
              <div
                className={`relative rounded-2xl p-3 sm:p-5 md:p-6 lg:p-7 shadow-[0_2px_8px_rgba(20,35,27,0.04)] border border-[#E8E1D6] dark:border-white/10 flex flex-col justify-between min-h-[96px] md:min-h-[145px] transition-all hover:shadow-[0_6px_24px_rgba(20,35,27,0.08)] last:odd:col-span-2 ${
                  darkMode ? "bg-[#0d1a12]" : "bg-white"
                }`}
              >
                {/* Dark Left Accent Capsule */}
                <span className="absolute left-0 top-3 bottom-3 md:top-6 md:bottom-6 w-[3px] md:w-[4.5px] rounded-r-full bg-[#14231b] dark:bg-white/30" />

                <span className="font-benaiah text-[10px] min-[380px]:text-[11px] font-bold tracking-[0.08em] min-[380px]:tracking-[0.12em] md:tracking-[0.14em] text-[#6b7280] dark:text-[#8ea396] uppercase block leading-tight truncate">
                  TOTAL REFERRALS
                </span>
                <div className="mt-2 md:mt-5 flex items-baseline">
                  <span
                    className={`font-benaiah text-base min-[360px]:text-lg min-[390px]:text-xl md:text-[28px] lg:text-[30px] font-black tracking-tight truncate ${
                      darkMode ? "text-white" : "text-[#14231b]"
                    }`}
                  >
                    {stats.referrals}
                  </span>
                </div>
              </div>

              {/* Card 7: Paid Orders (Dark Left Accent Capsule) */}
              <div
                className={`relative rounded-2xl p-3 sm:p-5 md:p-6 lg:p-7 shadow-[0_2px_8px_rgba(20,35,27,0.04)] border border-[#E8E1D6] dark:border-white/10 flex flex-col justify-between min-h-[96px] md:min-h-[145px] transition-all hover:shadow-[0_6px_24px_rgba(20,35,27,0.08)] last:odd:col-span-2 ${
                  darkMode ? "bg-[#0d1a12]" : "bg-white"
                }`}
              >
                {/* Dark Left Accent Capsule */}
                <span className="absolute left-0 top-3 bottom-3 md:top-6 md:bottom-6 w-[3px] md:w-[4.5px] rounded-r-full bg-[#14231b] dark:bg-white/30" />

                <span className="font-benaiah text-[10px] min-[380px]:text-[11px] font-bold tracking-[0.08em] min-[380px]:tracking-[0.12em] md:tracking-[0.14em] text-[#6b7280] dark:text-[#8ea396] uppercase block leading-tight truncate">
                  PAID ORDERS
                </span>
                <div className="mt-2 md:mt-5 flex items-baseline">
                  <span
                    className={`font-benaiah text-base min-[360px]:text-lg min-[390px]:text-xl md:text-[28px] lg:text-[30px] font-black tracking-tight truncate ${
                      darkMode ? "text-white" : "text-[#14231b]"
                    }`}
                  >
                    {stats.paidOrders}
                  </span>
                </div>
              </div>

              {/* Card 8: Conversion Rate (Dark Left Accent Capsule) */}
              <div
                className={`relative rounded-2xl p-3 sm:p-5 md:p-6 lg:p-7 shadow-[0_2px_8px_rgba(20,35,27,0.04)] border border-[#E8E1D6] dark:border-white/10 flex flex-col justify-between min-h-[96px] md:min-h-[145px] transition-all hover:shadow-[0_6px_24px_rgba(20,35,27,0.08)] last:odd:col-span-2 ${
                  darkMode ? "bg-[#0d1a12]" : "bg-white"
                }`}
              >
                {/* Dark Left Accent Capsule */}
                <span className="absolute left-0 top-3 bottom-3 md:top-6 md:bottom-6 w-[3px] md:w-[4.5px] rounded-r-full bg-[#14231b] dark:bg-white/30" />

                <span className="font-benaiah text-[10px] min-[380px]:text-[11px] font-bold tracking-[0.08em] min-[380px]:tracking-[0.12em] md:tracking-[0.14em] text-[#6b7280] dark:text-[#8ea396] uppercase block leading-tight truncate">
                  CONVERSION RATE
                </span>
                <div className="mt-2 md:mt-5 flex items-baseline">
                  <span
                    className={`font-benaiah text-base min-[360px]:text-lg min-[390px]:text-xl md:text-[28px] lg:text-[30px] font-black tracking-tight truncate ${
                      darkMode ? "text-white" : "text-[#14231b]"
                    }`}
                  >
                    {Number(stats.conversionRate || 0).toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>

            {/* Advanced Analytics & Sales Funnel Card */}
            <section
              className={`rounded-3xl p-6 sm:p-8 border shadow-sm space-y-6 ${
                darkMode ? "bg-[#0d1a12] border-white/10 text-white" : "bg-white border-gray-100 text-[#14231b]"
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5 border-gray-100 dark:border-white/10">
                <div>
                  <h3 className="font-benaiah text-xl font-bold tracking-tight">
                    Advanced Analytics & Sales Funnel
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Real-time tracking of visitor traffic, customer referrals, and 8% commission ledger.
                  </p>
                </div>

                <div className="flex items-center gap-2.5">
                  <button
                    onClick={() => setIsWithdrawOpen(true)}
                    className="font-benaiah px-4 py-2 rounded-xl bg-[#f5c518] text-[#14231b] font-bold text-xs uppercase tracking-wider hover:brightness-105 active:scale-95 transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                  >
                    <Wallet className="w-3.5 h-3.5" />
                    <span>Request Payout</span>
                  </button>
                </div>
              </div>

              {/* Referral Link Quick Bar */}
              <div
                className={`p-4 rounded-2xl border flex flex-col md:flex-row items-center justify-between gap-4 ${
                  darkMode ? "bg-[#14231b]/60 border-white/10" : "bg-[#faf8f5] border-gray-200/80"
                }`}
              >
                <div className="space-y-1 w-full md:w-auto">
                  <span className="text-[10px] font-bold tracking-widest text-[#52b788] uppercase">
                    YOUR EXCLUSIVE TRACKING LINK
                  </span>
                  <p className="font-mono text-xs sm:text-sm font-bold truncate max-w-xl text-[#b8860b]">
                    {referralLink}
                  </p>
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                  <button
                    onClick={() => handleCopyLink()}
                    className="px-4 py-2 rounded-xl bg-[#14231b] text-white hover:bg-[#1b4332] text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer shadow-xs"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-[#52b788]" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? "Link Copied!" : "Copy Link"}</span>
                  </button>
                  <button
                    onClick={() => setShowQrModal(true)}
                    className="p-2 rounded-xl border border-gray-300 dark:border-white/15 hover:bg-white/10 text-xs text-gray-600 dark:text-gray-300 transition-colors cursor-pointer"
                    title="View QR Code"
                  >
                    <QrCode className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Visual Funnel Pipeline */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
                <div
                  className={`p-4 rounded-2xl border ${
                    darkMode ? "bg-white/5 border-white/10" : "bg-gray-50/80 border-gray-100"
                  }`}
                >
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                    <span>1. Telemetry Clicks</span>
                    <MousePointerClick className="w-3.5 h-3.5 text-[#b8860b]" />
                  </div>
                  <p className="text-2xl font-extrabold">{stats.clicks}</p>
                  <div className="w-full bg-gray-200 dark:bg-white/10 h-1.5 rounded-full mt-3 overflow-hidden">
                    <div className="bg-[#f5c518] h-full rounded-full" style={{ width: "100%" }} />
                  </div>
                </div>

                <div
                  className={`p-4 rounded-2xl border ${
                    darkMode ? "bg-white/5 border-white/10" : "bg-gray-50/80 border-gray-100"
                  }`}
                >
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                    <span>2. Storefront Leads</span>
                    <Link2 className="w-3.5 h-3.5 text-[#52b788]" />
                  </div>
                  <p className="text-2xl font-extrabold">{stats.referrals}</p>
                  <div className="w-full bg-gray-200 dark:bg-white/10 h-1.5 rounded-full mt-3 overflow-hidden">
                    <div className="bg-[#52b788] h-full rounded-full" style={{ width: "33%" }} />
                  </div>
                </div>

                <div
                  className={`p-4 rounded-2xl border ${
                    darkMode ? "bg-white/5 border-white/10" : "bg-gray-50/80 border-gray-100"
                  }`}
                >
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                    <span>3. Paid Orders</span>
                    <ShoppingBag className="w-3.5 h-3.5 text-[#14231b] dark:text-white" />
                  </div>
                  <p className="text-2xl font-extrabold">{stats.paidOrders}</p>
                  <div className="w-full bg-gray-200 dark:bg-white/10 h-1.5 rounded-full mt-3 overflow-hidden">
                    <div className="bg-[#14231b] dark:bg-white h-full rounded-full" style={{ width: "33%" }} />
                  </div>
                </div>

                <div
                  className={`p-4 rounded-2xl border ${
                    darkMode ? "bg-white/5 border-white/10" : "bg-gray-50/80 border-gray-100"
                  }`}
                >
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                    <span>4. Conversion Rate</span>
                    <TrendingUp className="w-3.5 h-3.5 text-[#f5c518]" />
                  </div>
                  <p className="text-2xl font-extrabold text-[#52b788]">{stats.conversionRate}%</p>
                  <div className="w-full bg-gray-200 dark:bg-white/10 h-1.5 rounded-full mt-3 overflow-hidden">
                    <div className="bg-[#52b788] h-full rounded-full" style={{ width: "33.3%" }} />
                  </div>
                </div>
              </div>

              {/* Commission Ledger Table */}
              <div className="space-y-3 pt-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold">Commission Ledger & Attribution Log</h4>
                  <span className="text-xs text-gray-500 font-medium">
                    {commissions.length} Verified Attributions
                  </span>
                </div>

                <div
                  className={`rounded-2xl border overflow-hidden ${
                    darkMode ? "border-white/10" : "border-gray-100"
                  }`}
                >
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs min-w-[680px]">
                      <thead
                        className={`uppercase tracking-wider text-[10px] font-bold ${
                          darkMode ? "bg-[#112419] text-gray-300" : "bg-gray-50 text-gray-500"
                        }`}
                      >
                        <tr>
                          <th className="p-3.5">Order Ref</th>
                          <th className="p-3.5">Date</th>
                          <th className="p-3.5">Referred Instrument</th>
                          <th className="p-3.5">Order Total</th>
                          <th className="p-3.5">Commission (8%)</th>
                          <th className="p-3.5">Status</th>
                        </tr>
                      </thead>
                      <tbody
                        className={`divide-y ${
                          darkMode ? "divide-white/5 text-gray-200" : "divide-gray-100 text-gray-700"
                        }`}
                      >
                        {commissions.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="p-8 text-center text-gray-500 font-normal">
                              No recent referral commissions recorded.
                            </td>
                          </tr>
                        ) : (
                          commissions.slice(0, 5).map((comm) => (
                            <tr
                              key={comm.id}
                              className={`transition-colors ${
                                darkMode ? "hover:bg-white/5" : "hover:bg-gray-50/70"
                              }`}
                            >
                              <td className="p-3.5 font-mono font-bold text-[#b8860b]">
                                {comm.orderNumber}
                              </td>
                              <td className="p-3.5 text-gray-500">{comm.date}</td>
                              <td className="p-3.5 font-medium">{comm.productName}</td>
                              <td className="p-3.5 font-mono">
                                ETB {typeof comm.saleAmount === "number" ? comm.saleAmount.toLocaleString() : comm.saleAmount}
                              </td>
                              <td className="p-3.5 font-mono font-bold text-[#52b788]">
                                ETB {typeof comm.commissionAmount === "number" ? comm.commissionAmount.toLocaleString() : comm.commissionAmount}
                              </td>
                              <td className="p-3.5">
                                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#52b788]/15 text-[#52b788] border border-[#52b788]/30">
                                  {comm.status}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* ========================================================= */}
        {/* VIEW 2: REFERRAL CENTER (EXACT REPLICA OF USER SCREENSHOT) */}
        {/* ========================================================= */}
        {activeTab === "referrals" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Title: Referral Center */}
            <div>
              <h1
                className={`font-benaiah text-3xl sm:text-4xl font-black tracking-tight ${
                  darkMode ? "text-white" : "text-[#14231b]"
                }`}
              >
                Referral Center
              </h1>
            </div>

            {/* White Container Card: Your Personal Referral Assets */}
            <div
              className={`rounded-3xl p-6 sm:p-10 border shadow-xs space-y-8 ${
                darkMode
                  ? "bg-[#0d1a12] border-white/10 text-white"
                  : "bg-white border-black/5 text-[#14231b]"
              }`}
            >
              {/* Header inside Card */}
              <div>
                <h2
                  className={`font-benaiah text-xl sm:text-2xl font-black tracking-tight ${
                    darkMode ? "text-white" : "text-[#14231b]"
                  }`}
                >
                  Your Personal Referral Assets
                </h2>
              </div>

              {/* 1. YOUR REFERRAL LINK BLOCK */}
              <div className="space-y-1.5">
                <p className="text-xs font-black uppercase tracking-wider text-[#55645a]">
                  YOUR REFERRAL LINK
                </p>
                <p className="text-xs text-[#737874] font-medium">
                  Copy and paste this link on your social posts or email newsletter.
                </p>

                {/* Input Pill / Capsule matching screenshot */}
                <div
                  className={`rounded-2xl p-2.5 sm:p-3 flex items-center justify-between gap-3 border transition-colors mt-2 ${
                    darkMode
                      ? "bg-[#14231b]/60 border-white/10"
                      : "bg-[#F5F2EB] border-black/5"
                  }`}
                >
                  <span className="font-sans text-xs sm:text-sm text-[#14231b] dark:text-gray-200 px-3 truncate select-all font-medium">
                    {referralLink}
                  </span>
                  <button
                    onClick={() => handleCopyLink(referralLink)}
                    className="px-6 py-2.5 rounded-xl bg-[#14231b] hover:bg-[#1f372a] text-white font-bold text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer shrink-0 shadow-xs active:scale-95"
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4 text-[#52b788]" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <span>Copy Link</span>
                    )}
                  </button>
                </div>
              </div>

              {/* 2. YOUR REFERRAL COUPON CODE BLOCK */}
              <div className="space-y-1.5 pt-2">
                <p className="text-xs font-black uppercase tracking-wider text-[#55645a]">
                  YOUR REFERRAL COUPON CODE
                </p>
                <p className="text-xs text-[#737874] font-medium">
                  Customers get 5% discount at checkout; you receive commissions automatically.
                </p>

                {/* Big Coupon Code Display Box matching screenshot */}
                <div
                  onClick={handleCopyCoupon}
                  className={`rounded-2xl p-5 sm:p-6 inline-block border transition-all cursor-pointer group hover:border-[#14231b]/30 shadow-xs mt-2 ${
                    darkMode
                      ? "bg-[#14231b]/60 border-white/10"
                      : "bg-[#F5F2EB] border-black/5"
                  }`}
                  title="Click to copy coupon code"
                >
                  <div className="select-all">
                    <p className="text-2xl sm:text-3xl font-black text-[#14231b] dark:text-white tracking-widest leading-tight font-sans">
                      {referralCouponCode}
                    </p>
                  </div>
                  {couponCopied && (
                    <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#52b788]/15 text-[#52b788] text-xs font-bold animate-in fade-in">
                      <Check className="w-3.5 h-3.5" />
                      <span>Coupon Code Copied!</span>
                    </div>
                  )}
                </div>
              </div>

              {/* 3. TWO COLUMNS: QUICK SHARE + QR CODE GRAPHIC matching Screenshot 2 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 items-start border-t border-black/5">
                {/* Left Column: QUICK SHARE */}
                <div className="space-y-3">
                  <p className="text-xs font-black uppercase tracking-wider text-[#55645a]">
                    QUICK SHARE
                  </p>
                  <div className="flex items-center gap-3 flex-wrap">
                    {/* WhatsApp Button */}
                    <button
                      onClick={handleWhatsAppShare}
                      className="px-5 py-3 rounded-xl bg-[#25D366] hover:bg-[#20ba5a] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs cursor-pointer active:scale-95 transition-all"
                    >
                      <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24">
                        <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2M12.05 3.67C14.25 3.67 16.31 4.53 17.87 6.09C19.42 7.65 20.28 9.72 20.28 11.92C20.28 16.46 16.58 20.15 12.04 20.15C10.56 20.15 9.11 19.76 7.85 19L7.55 18.83L4.43 19.65L5.26 16.61L5.06 16.29C4.24 14.99 3.81 13.47 3.81 11.91C3.81 7.37 7.5 3.67 12.05 3.67M9.11 6.84C8.95 6.84 8.7 6.9 8.5 7.12C8.28 7.34 7.69 7.9 7.69 9.03C7.69 10.17 8.52 11.27 8.64 11.43C8.75 11.59 10.27 13.93 12.61 14.93C14.55 15.77 14.95 15.6 15.38 15.56C15.81 15.52 16.78 15 16.98 14.41C17.18 13.82 17.18 13.33 17.12 13.22C17.06 13.11 16.9 13.06 16.66 12.94C16.41 12.82 15.2 12.23 14.97 12.15C14.75 12.07 14.59 12.03 14.43 12.27C14.26 12.51 13.8 13.06 13.66 13.22C13.52 13.38 13.38 13.4 13.13 13.28C12.89 13.16 12.11 12.9 11.18 12.07C10.46 11.43 9.97 10.63 9.83 10.39C9.69 10.15 9.82 10.02 9.94 9.9C10.05 9.79 10.19 9.61 10.31 9.47C10.43 9.33 10.47 9.23 10.55 9.07C10.63 8.91 10.59 8.77 10.53 8.65C10.47 8.53 9.99 7.35 9.79 6.88C9.6 6.42 9.4 6.48 9.25 6.47C9.11 6.46 8.95 6.46 8.79 6.46L9.11 6.84Z" />
                      </svg>
                      <span>WhatsApp</span>
                    </button>

                    {/* Telegram Button */}
                    <button
                      onClick={handleTelegramShare}
                      className="px-5 py-3 rounded-xl bg-[#0088cc] hover:bg-[#0077b5] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs cursor-pointer active:scale-95 transition-all"
                    >
                      <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
                      </svg>
                      <span>Telegram</span>
                    </button>
                  </div>
                </div>

                {/* Right Column: QR CODE GRAPHIC */}
                <div className="space-y-3">
                  <p className="text-xs font-black uppercase tracking-wider text-[#55645a]">
                    QR CODE GRAPHIC
                  </p>

                  {/* Scannable QR Code matching Screenshot 2 */}
                  <div className="relative inline-block bg-white p-2 rounded-2xl border border-black/5 shadow-xs">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=0&ecc=H&data=${encodeURIComponent(
                        referralLink
                      )}`}
                      alt="Affiliate Referral QR Code"
                      className="w-52 h-52 sm:w-60 sm:h-60 object-contain rounded-lg"
                    />

                    {/* Centered Yellow "AM" Badge matching Screenshot 2 */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-10 h-10 rounded-md bg-[#f5c518] text-[#14231b] font-black text-xs flex items-center justify-center shadow-md border-2 border-white">
                        AM
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* VIEW 3: COMMISSIONS LEDGER (EXACT REPLICA OF USER SCREENSHOT) */}
        {/* ========================================================= */}
        {activeTab === "commissions" && (
          <div className="space-y-8 animate-in fade-in duration-200">
            {/* Title: Commissions Ledger */}
            <div>
              <h2
                className={`font-benaiah text-3xl sm:text-4xl font-extrabold tracking-tight ${
                  darkMode ? "text-white" : "text-[#111827]"
                }`}
              >
                Commissions Ledger
              </h2>
            </div>

            {/* White Container Card */}
            <div
              className={`rounded-3xl p-6 sm:p-8 border shadow-xs overflow-hidden ${
                darkMode
                  ? "bg-[#0d1a12] border-white/10 text-white"
                  : "bg-white border-gray-100 text-[#14231b]"
              }`}
            >
              <div className="overflow-x-auto">
                <table className="w-full text-left min-w-[700px]">
                  {/* Table Header with Warm Rounded Background */}
                  <thead>
                    <tr
                      className={`text-[11px] sm:text-xs font-bold uppercase tracking-wider ${
                        darkMode
                          ? "bg-[#14231b]/80 text-[#8fa295]"
                          : "bg-[#f9f8f5] text-[#55645a]"
                      }`}
                    >
                      <th className="py-4 px-6 rounded-l-2xl">DATE</th>
                      <th className="py-4 px-6">ORDER REFERENCE</th>
                      <th className="py-4 px-6">PRODUCT NAME</th>
                      <th className="py-4 px-6">ORDER AMOUNT</th>
                      <th className="py-4 px-6">COMMISSION EARNED</th>
                      <th className="py-4 px-6 rounded-r-2xl">STATUS</th>
                    </tr>
                  </thead>

                  {/* Table Body */}
                  <tbody className="divide-y divide-gray-100 dark:divide-white/5 text-xs sm:text-sm font-bold">
                    {commissions.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 px-6 text-center text-gray-500 font-normal">
                          <FileText className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                          <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                            No commissions recorded yet
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-sm mx-auto">
                            Referred customer orders will automatically appear here once confirmed. Share your referral link or coupon to get started.
                          </p>
                        </td>
                      </tr>
                    ) : (
                      commissions.map((comm) => (
                        <tr
                          key={comm.id}
                          className="hover:bg-gray-50/50 dark:hover:bg-white/5 transition-colors"
                        >
                          {/* Date */}
                          <td className="py-6 px-6 align-middle text-[#14231b] dark:text-white leading-snug">
                            {comm.date}
                          </td>

                          {/* Order Reference */}
                          <td className="py-6 px-6 align-middle text-[#14231b] dark:text-white leading-snug font-sans">
                            {comm.orderNumber}
                          </td>

                          {/* Product Name */}
                          <td className="py-6 px-6 align-middle text-[#14231b] dark:text-white leading-snug">
                            {comm.productName}
                          </td>

                          {/* Order Amount */}
                          <td className="py-6 px-6 align-middle text-[#14231b] dark:text-white font-extrabold whitespace-nowrap">
                            ETB {typeof comm.saleAmount === "number" ? comm.saleAmount.toLocaleString() : comm.saleAmount}
                          </td>

                          {/* Commission Earned */}
                          <td className="py-6 px-6 align-middle text-[#14231b] dark:text-white font-extrabold whitespace-nowrap">
                            ETB {typeof comm.commissionAmount === "number" ? comm.commissionAmount.toLocaleString() : comm.commissionAmount}
                          </td>

                          {/* Status Badge */}
                          <td className="py-6 px-6 align-middle whitespace-nowrap">
                            <span
                              className={`inline-flex items-center px-4 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                                comm.status === "approved"
                                  ? "bg-[#dcfce7] text-[#166534]"
                                  : comm.status === "rejected"
                                  ? "bg-red-100 text-red-700"
                                  : "bg-amber-100 text-amber-800"
                              }`}
                            >
                              {comm.status?.toUpperCase() || "PENDING"}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* VIEW 4: PAYOUT QUEUE & FINTECH LIQUID GLASS WALLET        */}
        {/* ========================================================= */}
        {activeTab === "payouts" && (
          <div className="space-y-10 animate-in fade-in duration-200">
            {/* Title */}
            <div>
              <h2
                className={`font-benaiah text-3xl sm:text-4xl font-extrabold tracking-tight ${
                  darkMode ? "text-white" : "text-[#111827]"
                }`}
              >
                Request Commission Withdrawal
              </h2>
            </div>

            {/* Liquid Glass Fintech App Card (Matching User Reference) */}
            <div className="relative max-w-xl mx-auto rounded-[40px] p-7 sm:p-9 bg-gradient-to-b from-white/95 via-[#f8f6f0]/85 to-white/90 dark:from-[#0d1a12]/95 dark:via-[#09150e]/90 dark:to-[#0d1a12]/95 backdrop-blur-2xl border border-white/80 dark:border-white/10 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.12)] space-y-6 overflow-hidden">
              {/* Subtle ambient lighting glows */}
              <div className="absolute -top-24 -right-24 w-64 h-64 bg-[#f5c518]/15 dark:bg-[#f5c518]/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-emerald-500/10 dark:bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

              {/* Top Navigation Bar inside Card */}
              <div className="flex items-center justify-between relative z-10">
                {/* User Profile Button */}
                <button
                  onClick={() => handleSelectTab("settings")}
                  className="w-12 h-12 rounded-full bg-white/90 dark:bg-white/10 shadow-[0_4px_12px_rgba(0,0,0,0.05)] border border-gray-100 dark:border-white/10 flex items-center justify-center text-gray-600 dark:text-gray-200 hover:scale-105 active:scale-95 transition-all cursor-pointer"
                  title="View Profile"
                >
                  <User className="w-5 h-5" />
                </button>

                {/* Center Overview Pill */}
                <div className="px-6 py-2 rounded-full bg-white/90 dark:bg-white/10 shadow-[0_4px_12px_rgba(0,0,0,0.05)] border border-gray-100 dark:border-white/10 text-xs font-bold text-gray-700 dark:text-gray-200 tracking-wide select-none">
                  Overview
                </div>

                {/* Notification Bell Flyout */}
                <NotificationFlyout
                  triggerStyle="circle"
                  buttonClassName="relative w-12 h-12 rounded-full bg-white/90 dark:bg-white/10 shadow-[0_4px_12px_rgba(0,0,0,0.05)] border border-gray-100 dark:border-white/10 flex items-center justify-center text-gray-600 dark:text-gray-200 hover:scale-105 active:scale-95 transition-all cursor-pointer"
                  iconClassName="w-5 h-5"
                />
              </div>

              {/* Inner Elevated Balance Card */}
              <div className="bg-white dark:bg-[#14231b] rounded-3xl p-6 sm:p-8 shadow-[0_12px_32px_rgba(0,0,0,0.06)] border border-gray-100/90 dark:border-white/10 space-y-6 relative z-10">
                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-400">
                  ACCOUNT BALANCE:
                </span>

                {/* Balance & Eye Privacy Toggle */}
                <div className="flex items-center justify-between gap-4">
                  <div className="text-3xl sm:text-4xl font-black tracking-tight text-[#111827] dark:text-white">
                    {hideBalance ? "ETB ••••••" : `ETB ${stats.availableBalance.toLocaleString()}`}
                  </div>
                  <button
                    onClick={() => setHideBalance(!hideBalance)}
                    className="w-10 h-10 rounded-full bg-gray-50 dark:bg-white/10 flex items-center justify-center text-gray-400 hover:text-[#14231b] dark:hover:text-white transition-all cursor-pointer shadow-xs active:scale-90"
                    title={hideBalance ? "Show balance" : "Hide balance"}
                  >
                    {hideBalance ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Three Action Buttons Row: Send, Withdraw, More */}
                <div className="flex items-center gap-3 pt-2">
                  {/* Send Button */}
                  <button
                    onClick={() => {
                      setShowQuickSendToast(true);
                      setTimeout(() => setShowQuickSendToast(false), 3500);
                    }}
                    className="flex-1 py-3 px-5 rounded-full bg-[#18181b] hover:bg-black dark:bg-black text-white font-bold text-xs sm:text-sm shadow-md active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <ArrowUpRight className="w-4 h-4" />
                    <span>Send</span>
                  </button>

                  {/* Withdraw Button (Triggers Centered Modal) */}
                  <button
                    onClick={() => setIsWithdrawOpen(true)}
                    className="flex-1 py-3 px-5 rounded-full bg-white dark:bg-white/15 hover:bg-gray-50 dark:hover:bg-white/20 text-[#14231b] dark:text-white font-extrabold text-xs sm:text-sm shadow-md hover:shadow-lg border border-gray-100 dark:border-white/10 active:scale-95 transition-all cursor-pointer flex items-center justify-center"
                  >
                    <span>Withdraw</span>
                  </button>

                  {/* More Options Button */}
                  <button
                    onClick={() =>
                      triggerDownload("Commission Statement", "CSV", "Official Record")
                    }
                    className="w-11 h-11 rounded-full bg-white dark:bg-white/15 hover:bg-gray-50 dark:hover:bg-white/20 text-gray-700 dark:text-gray-200 shadow-md border border-gray-100 dark:border-white/10 flex items-center justify-center active:scale-95 transition-all cursor-pointer shrink-0"
                    title="Export Statement"
                  >
                    <MoreHorizontal className="w-5 h-5" />
                  </button>
                </div>

                {/* Quick Send Feedback */}
                {showQuickSendToast && (
                  <div className="rounded-xl p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center justify-center gap-2 animate-in fade-in">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Peer-to-peer balance transfer ready. Connect with partner in Referral Center.</span>
                  </div>
                )}
              </div>

              {/* Bottom Jump Link: Transaction History */}
              <button
                onClick={() => {
                  const el = document.getElementById("payout-history");
                  if (el) el.scrollIntoView({ behavior: "smooth" });
                }}
                className="mx-auto flex items-center gap-1.5 px-6 py-2.5 rounded-full bg-white/80 dark:bg-white/10 hover:bg-white dark:hover:bg-white/15 text-xs font-bold text-gray-500 dark:text-gray-300 hover:text-[#14231b] dark:hover:text-white shadow-xs border border-gray-100 dark:border-white/5 transition-all cursor-pointer active:scale-95 relative z-10"
              >
                <span>Transaction History</span>
                <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
              </button>
            </div>

            {/* Withdrawal History / Status Table */}
            <div
              id="payout-history"
              className={`rounded-3xl p-8 sm:p-10 border shadow-xs space-y-6 scroll-mt-24 transition-all ${
                darkMode
                  ? "bg-[#0d1a12] border-white/10 text-white"
                  : "bg-white border-gray-100 text-[#14231b]"
              }`}
            >
              <div className="flex items-center justify-between">
                <h3
                  className={`text-xl sm:text-2xl font-bold tracking-tight ${
                    darkMode ? "text-white" : "text-[#111827]"
                  }`}
                >
                  Withdrawal History / Status
                </h3>
                <span className="text-xs text-gray-500 font-medium">
                  {withdrawals.length} transaction{withdrawals.length === 1 ? "" : "s"}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left min-w-[700px]">
                  <thead>
                    <tr
                      className={`text-[11px] sm:text-xs font-bold uppercase tracking-wider ${
                        darkMode
                          ? "bg-[#14231b]/80 text-[#8fa295]"
                          : "bg-[#f9f8f5] text-[#55645a]"
                      }`}
                    >
                      <th className="py-4 px-6 rounded-l-2xl">REQUESTED DATE</th>
                      <th className="py-4 px-6">REFERENCE ID</th>
                      <th className="py-4 px-6">AMOUNT</th>
                      <th className="py-4 px-6">PAYOUT METHOD</th>
                      <th className="py-4 px-6 rounded-r-2xl">STATUS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {withdrawals.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-16 text-center">
                          <div className="flex flex-col items-center justify-center space-y-3">
                            <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-white/10 flex items-center justify-center text-gray-400">
                              <FileText className="w-8 h-8" />
                            </div>
                            <p className="font-bold text-base sm:text-lg text-[#111827] dark:text-white">
                              No withdrawals requested
                            </p>
                            <p className="text-xs text-gray-500">
                              Click the &quot;Withdraw&quot; button above to submit a commission payout request.
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      withdrawals.map((w) => (
                        <tr
                          key={w.id}
                          className="border-b border-gray-100 dark:border-white/5 text-xs sm:text-sm font-semibold"
                        >
                          <td className="py-4 px-6">{w.date}</td>
                          <td className="py-4 px-6 font-mono text-[#b8860b]">{w.id}</td>
                          <td className="py-4 px-6 font-bold">ETB {w.amount.toLocaleString()}</td>
                          <td className="py-4 px-6">{w.method}</td>
                          <td className="py-4 px-6">
                            <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800">
                              {w.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* VIEW 5: MARKETING CENTER                                  */}
        {/* ========================================================= */}
        {activeTab === "marketing" && (
          <div className="space-y-8 animate-in fade-in duration-200">
            {/* Page Heading */}
            <div>
              <h2
                className={`font-benaiah text-3xl sm:text-4xl font-extrabold tracking-tight ${
                  darkMode ? "text-white" : "text-[#111827]"
                }`}
              >
                Marketing & Creative Resources
              </h2>
            </div>

            {/* 5 Resource Cards Grid matching reference screenshots */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
              {/* Card 1: Begena & Krar Studio Photos */}
              <div
                className={`rounded-3xl overflow-hidden border shadow-xs flex flex-col justify-between transition-all hover:shadow-md ${
                  darkMode ? "bg-[#0d1a12] border-white/10" : "bg-white border-gray-100"
                }`}
              >
                {/* Banner: Deep Forest Green */}
                <div className="h-44 sm:h-48 bg-[#182d22] flex items-center justify-center">
                  <svg className="w-14 h-14 text-white fill-current" viewBox="0 0 24 24">
                    <path
                      fillRule="evenodd"
                      clipRule="evenodd"
                      d="M4 6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-2.586a1 1 0 0 1-.707-.293l-.707-.707A2 2 0 0 0 14.586 4H9.414a2 2 0 0 0-1.414.586l-.707.707A1 1 0 0 1 6.586 6H4zm8 11a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9zm0-2a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zm5.5-6.5a1 1 0 1 0 0-2 1 1 0 0 0 0 2z"
                    />
                  </svg>
                </div>

                {/* Body */}
                <div className="p-6 sm:p-7 flex flex-col justify-between flex-1">
                  <div>
                    <h3
                      className={`text-base sm:text-lg font-bold ${
                        darkMode ? "text-white" : "text-[#111827]"
                      }`}
                    >
                      Begena & Krar Studio Photos
                    </h3>
                    <p className="mt-2 text-xs sm:text-[13px] text-gray-500 dark:text-gray-400 leading-relaxed font-normal">
                      High-resolution, professionally graded catalog images for social media posts or web features.
                    </p>
                  </div>

                  <button
                    onClick={() => triggerDownload("Begena & Krar Studio Photos", "ZIP", "15.4 MB")}
                    className="w-full mt-6 py-3.5 px-4 rounded-xl font-bold text-xs sm:text-sm text-[#14231b] dark:text-gray-100 bg-[#f7f6f2] hover:bg-[#edece6] dark:bg-white/5 dark:hover:bg-white/10 transition-colors text-center cursor-pointer shadow-xs active:scale-[0.99]"
                  >
                    Download ZIP (15.4 MB)
                  </button>
                </div>
              </div>

              {/* Card 2: Artisan Workshop Video Clips */}
              <div
                className={`rounded-3xl overflow-hidden border shadow-xs flex flex-col justify-between transition-all hover:shadow-md ${
                  darkMode ? "bg-[#0d1a12] border-white/10" : "bg-white border-gray-100"
                }`}
              >
                {/* Banner: Crimson Red */}
                <div className="h-44 sm:h-48 bg-[#cc2b2b] flex items-center justify-center">
                  <svg className="w-14 h-14 text-white fill-current" viewBox="0 0 24 24">
                    <path d="M4 6.5A2.5 2.5 0 0 0 1.5 9v6A2.5 2.5 0 0 0 4 17.5h10a2.5 2.5 0 0 0 2.5-2.5V9A2.5 2.5 0 0 0 14 6.5H4zm14 2.875 3.5-2.188A1 1 0 0 1 23 8.04v7.92a1 1 0 0 1-1.5.853l-3.5-2.188V9.375z" />
                  </svg>
                </div>

                {/* Body */}
                <div className="p-6 sm:p-7 flex flex-col justify-between flex-1">
                  <div>
                    <h3
                      className={`text-base sm:text-lg font-bold ${
                        darkMode ? "text-white" : "text-[#111827]"
                      }`}
                    >
                      Artisan Workshop Video Clips
                    </h3>
                    <p className="mt-2 text-xs sm:text-[13px] text-gray-500 dark:text-gray-400 leading-relaxed font-normal">
                      Raw footage showing master artisans carving, applying hides, and testing resonance strings.
                    </p>
                  </div>

                  <button
                    onClick={() => triggerDownload("Artisan Workshop Video Clips", "Reels", "42.1 MB")}
                    className="w-full mt-6 py-3.5 px-4 rounded-xl font-bold text-xs sm:text-sm text-[#14231b] dark:text-gray-100 bg-[#f7f6f2] hover:bg-[#edece6] dark:bg-white/5 dark:hover:bg-white/10 transition-colors text-center cursor-pointer shadow-xs active:scale-[0.99]"
                  >
                    Download Reels (42.1 MB)
                  </button>
                </div>
              </div>

              {/* Card 3: Amiele Official Branding Logos */}
              <div
                className={`rounded-3xl overflow-hidden border shadow-xs flex flex-col justify-between transition-all hover:shadow-md ${
                  darkMode ? "bg-[#0d1a12] border-white/10" : "bg-white border-gray-100"
                }`}
              >
                {/* Banner: Royal Blue */}
                <div className="h-44 sm:h-48 bg-[#1967d2] flex items-center justify-center">
                  <svg className="w-14 h-14 text-white fill-current" viewBox="0 0 24 24">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 2 4.5 4.5H13V4zM8 17.2c-.1 0-.2-.1-.2-.2 0-.2.2-.4.4-.4h2.1c.3 0 .5.1.7.3l.3.3c.2.2.3.5.3.7 0 .3-.1.5-.3.7l-1 1c-.2.2-.4.3-.7.3H8.5c-.3 0-.5-.1-.7-.3l-.3-.3c-.2-.2-.3-.5-.3-.7 0-.3.1-.5.3-.7l.5-.7zm6.7-6.9 1.4 1.4-6.4 6.4-1.4-1.4 6.4-6.4zm2.1-.7.7-.7c.4-.4 1-.4 1.4 0l.7.7c.4.4.4 1 0 1.4l-.7.7-2.1-2.1z" />
                  </svg>
                </div>

                {/* Body */}
                <div className="p-6 sm:p-7 flex flex-col justify-between flex-1">
                  <div>
                    <h3
                      className={`text-base sm:text-lg font-bold ${
                        darkMode ? "text-white" : "text-[#111827]"
                      }`}
                    >
                      Amiele Official Branding Logos
                    </h3>
                    <p className="mt-2 text-xs sm:text-[13px] text-gray-500 dark:text-gray-400 leading-relaxed font-normal">
                      Gold, White, and Dark Green transparent brand marks in high-res PNG and vector files.
                    </p>
                  </div>

                  <button
                    onClick={() => triggerDownload("Amiele Official Branding Logos", "Logos PNG", "Vector & PNG")}
                    className="w-full mt-6 py-3.5 px-4 rounded-xl font-bold text-xs sm:text-sm text-[#14231b] dark:text-gray-100 bg-[#f7f6f2] hover:bg-[#edece6] dark:bg-white/5 dark:hover:bg-white/10 transition-colors text-center cursor-pointer shadow-xs active:scale-[0.99]"
                  >
                    Download Logos PNG
                  </button>
                </div>
              </div>

              {/* Card 4: Highland Heritage Posters */}
              <div
                className={`rounded-3xl overflow-hidden border shadow-xs flex flex-col justify-between transition-all hover:shadow-md ${
                  darkMode ? "bg-[#0d1a12] border-white/10" : "bg-white border-gray-100"
                }`}
              >
                {/* Banner: Warm Orange */}
                <div className="h-44 sm:h-48 bg-[#f06400] flex items-center justify-center">
                  <svg className="w-14 h-14 text-white fill-current" viewBox="0 0 24 24">
                    <path d="M6 7.5A1.5 1.5 0 0 1 7.5 6H9v3H7.5A1.5 1.5 0 0 1 6 7.5zM9.5 4h7A2.5 2.5 0 0 1 19 6.5v9.5a2 2 0 0 1-2 2H9.5V4zm0 13H17a1.5 1.5 0 0 1 1.5 1.5v.5a1.5 1.5 0 0 1-1.5 1.5h-7.5A2.5 2.5 0 0 1 7 18v-1h2.5z" />
                  </svg>
                </div>

                {/* Body */}
                <div className="p-6 sm:p-7 flex flex-col justify-between flex-1">
                  <div>
                    <h3
                      className={`text-base sm:text-lg font-bold ${
                        darkMode ? "text-white" : "text-[#111827]"
                      }`}
                    >
                      Highland Heritage Posters
                    </h3>
                    <p className="mt-2 text-xs sm:text-[13px] text-gray-500 dark:text-gray-400 leading-relaxed font-normal">
                      Cultural layouts featuring Begenas and educational text detailing historic musical origins.
                    </p>
                  </div>

                  <button
                    onClick={() => triggerDownload("Highland Heritage Posters", "ZIP", "8.9 MB")}
                    className="w-full mt-6 py-3.5 px-4 rounded-xl font-bold text-xs sm:text-sm text-[#14231b] dark:text-gray-100 bg-[#f7f6f2] hover:bg-[#edece6] dark:bg-white/5 dark:hover:bg-white/10 transition-colors text-center cursor-pointer shadow-xs active:scale-[0.99]"
                  >
                    Download ZIP (8.9 MB)
                  </button>
                </div>
              </div>

              {/* Card 5: Bilingual Caption Templates */}
              <div
                className={`rounded-3xl overflow-hidden border shadow-xs flex flex-col justify-between transition-all hover:shadow-md ${
                  darkMode ? "bg-[#0d1a12] border-white/10" : "bg-white border-gray-100"
                }`}
              >
                {/* Banner: Charcoal Dark Slate */}
                <div className="h-44 sm:h-48 bg-[#2f3237] flex items-center justify-center">
                  <svg className="w-14 h-14 text-white fill-current" viewBox="0 0 24 24">
                    <path d="M4.583 17.321C3.553 16.227 3 15 3 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311 1.804.167 3.226 1.648 3.226 3.489a3.5 3.5 0 0 1-3.5 3.5c-1.073 0-2.099-.49-2.748-1.179zm10 0C13.553 16.227 13 15 13 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311 1.804.167 3.226 1.648 3.226 3.489a3.5 3.5 0 0 1-3.5 3.5c-1.073 0-2.099-.49-2.748-1.179z" />
                  </svg>
                </div>

                {/* Body */}
                <div className="p-6 sm:p-7 flex flex-col justify-between flex-1">
                  <div>
                    <h3
                      className={`text-base sm:text-lg font-bold ${
                        darkMode ? "text-white" : "text-[#111827]"
                      }`}
                    >
                      Bilingual Caption Templates
                    </h3>
                    <p className="mt-2 text-xs sm:text-[13px] text-gray-500 dark:text-gray-400 leading-relaxed font-normal">
                      Ready-to-use captions in Amharic & English describing the spirituality of the David Harp.
                    </p>
                  </div>

                  <button
                    onClick={() => setShowCaptionsModal(true)}
                    className="w-full mt-6 py-3.5 px-4 rounded-xl font-bold text-xs sm:text-sm text-[#14231b] dark:text-gray-100 bg-[#f7f6f2] hover:bg-[#edece6] dark:bg-white/5 dark:hover:bg-white/10 transition-colors text-center cursor-pointer shadow-xs active:scale-[0.99]"
                  >
                    View Text Captions
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* VIEW 6: CAMPAIGNS CREATOR                                 */}
        {/* ========================================================= */}
        {/* ========================================================= */}
        {/* VIEW 6: CAMPAIGNS CREATOR (Bonus Challenges & Campaigns) */}
        {/* ========================================================= */}
        {activeTab === "campaigns" && (
          <div className="space-y-8 animate-in fade-in duration-200">
            {/* Page Heading */}
            <div>
              <h2
                className={`font-benaiah text-3xl sm:text-4xl font-extrabold tracking-tight ${
                  darkMode ? "text-white" : "text-[#111827]"
                }`}
              >
                Bonus Challenges & Campaigns
              </h2>
            </div>

            {/* Campaign Challenge Card matching screenshot */}
            <div
              className={`rounded-3xl p-6 sm:p-8 border shadow-xs transition-all ${
                darkMode ? "bg-[#0d1a12] border-white/10" : "bg-white border-gray-100"
              }`}
            >
              {/* Header: Title & Reward */}
              <div className="flex items-center justify-between gap-4">
                <h3
                  className={`text-base sm:text-lg font-extrabold tracking-tight ${
                    darkMode ? "text-white" : "text-[#111827]"
                  }`}
                >
                  sell 3 kirars
                </h3>
                <span
                  className={`text-base sm:text-lg font-extrabold tracking-tight ${
                    darkMode ? "text-white" : "text-[#111827]"
                  }`}
                >
                  +ETB 1,000 Reward
                </span>
              </div>

              {/* Subtitle / Description */}
              <p className="mt-2 text-xs sm:text-sm text-gray-500 dark:text-gray-400 font-medium">
                sell 3 kirar o rmesenko
              </p>

              {/* Progress Bar */}
              <div className="w-full bg-[#ebeae5] dark:bg-white/10 h-2 sm:h-2.5 rounded-full overflow-hidden mt-6">
                <div
                  className="bg-[#14231b] dark:bg-[#f5c518] h-full rounded-full transition-all duration-500"
                  style={{ width: "33.33%" }}
                />
              </div>

              {/* Progress & Remaining Days Meta */}
              <div className="flex items-center justify-between text-xs sm:text-[13px] font-bold text-gray-600 dark:text-gray-400 mt-3">
                <span>Progress: 1 / 3 sold (33%)</span>
                <span>0 days remaining</span>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* VIEW 7: ACHIEVEMENTS                                      */}
        {/* ========================================================= */}
        {/* ========================================================= */}
        {/* VIEW 7: ACHIEVEMENTS                                      */}
        {/* ========================================================= */}
        {activeTab === "achievements" && (
          <div className="space-y-8 animate-in fade-in duration-200">
            {/* Page Heading */}
            <div>
              <h2
                className={`font-benaiah text-3xl sm:text-4xl font-extrabold tracking-tight ${
                  darkMode ? "text-white" : "text-[#111827]"
                }`}
              >
                Partner Achievements & Badges
              </h2>
            </div>

            {/* Milestone Certifications Announcement Banner */}
            <div
              className={`rounded-3xl p-6 sm:p-8 space-y-2.5 transition-all ${
                darkMode
                  ? "bg-[#131f17] border border-white/10"
                  : "bg-[#fcf8f0] border border-[#f5ebd9]"
              }`}
            >
              <h3
                className={`text-lg sm:text-xl font-extrabold tracking-tight ${
                  darkMode ? "text-white" : "text-[#111827]"
                }`}
              >
                Milestone Certifications
              </h3>
              <p
                className={`text-xs sm:text-[13px] leading-relaxed font-medium ${
                  darkMode ? "text-gray-200" : "text-[#1f2937]"
                }`}
              >
                Achieving sales milestones unlocks professional digital certificates of appreciation signed by our preservation curation committee. Available as direct image downloads below once milestones are met.
              </p>
            </div>

            {/* Achievement Cards Grid matching screenshots */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-7">
              {/* Card 1: First Sale (UNLOCKED) */}
              <div
                className={`rounded-3xl p-7 sm:p-8 flex flex-col items-center text-center justify-between min-h-[320px] transition-all hover:shadow-md border-2 border-[#f5c518] shadow-xs ${
                  darkMode ? "bg-[#0d1a12]" : "bg-white"
                }`}
              >
                <div className="flex flex-col items-center">
                  {/* Golden Star with Sparkles */}
                  <div className="w-16 h-16 flex items-center justify-center relative">
                    <span className="text-4xl select-none">🌟</span>
                  </div>
                  <h4
                    className={`font-extrabold text-base sm:text-lg mt-3 ${
                      darkMode ? "text-white" : "text-[#111827]"
                    }`}
                  >
                    First Sale
                  </h4>
                  <p
                    className={`text-xs font-medium mt-1 ${
                      darkMode ? "text-gray-300" : "text-[#4b5563]"
                    }`}
                  >
                    Refer 1 successful instrument sale
                  </p>
                </div>

                <div className="w-full flex flex-col items-center mt-4">
                  {/* Unlocked Pill */}
                  <span className="rounded-full px-4 py-1 text-xs font-bold bg-[#e8f7ee] text-[#1b8742] dark:bg-emerald-950/40 dark:text-emerald-400">
                    ✓ Unlocked (1/1)
                  </span>

                  {/* Get Certificate Button */}
                  <button
                    onClick={() => setShowCertificateModal(true)}
                    className="w-full mt-5 py-3 px-4 rounded-xl font-bold text-xs sm:text-sm text-white bg-[#14231b] hover:bg-black dark:bg-[#f5c518] dark:text-[#14231b] transition-all text-center cursor-pointer shadow-xs active:scale-[0.99] flex items-center justify-center gap-2"
                  >
                    <span>🥇</span>
                    <span>Get Certificate</span>
                  </button>
                </div>
              </div>

              {/* Card 2: Craftsman Rank (LOCKED) */}
              <div
                className={`rounded-3xl p-7 sm:p-8 flex flex-col items-center text-center justify-between min-h-[320px] transition-all border shadow-xs ${
                  darkMode ? "bg-[#0d1a12] border-white/10" : "bg-white border-gray-100"
                }`}
              >
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 flex items-center justify-center">
                    <span className="text-4xl select-none">🎻</span>
                  </div>
                  <h4
                    className={`font-extrabold text-base sm:text-lg mt-3 ${
                      darkMode ? "text-white" : "text-[#111827]"
                    }`}
                  >
                    Craftsman Rank
                  </h4>
                  <p
                    className={`text-xs font-medium mt-1 ${
                      darkMode ? "text-gray-300" : "text-[#4b5563]"
                    }`}
                  >
                    Refer 10 successful sales
                  </p>
                </div>

                <div className="w-full flex flex-col items-center mt-4">
                  {/* Progress Pill */}
                  <span
                    className={`rounded-full px-4 py-1 text-xs font-bold ${
                      darkMode ? "bg-white/10 text-gray-200" : "bg-gray-100 text-[#1f2937]"
                    }`}
                  >
                    1/10 Sales
                  </span>

                  {/* Locked Button */}
                  <button
                    disabled
                    className="w-full mt-5 py-3 px-4 rounded-xl font-bold text-xs sm:text-sm text-white bg-[#9ea29f] transition-all text-center cursor-not-allowed flex items-center justify-center gap-2 select-none"
                  >
                    <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                      <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
                    </svg>
                    <span>Locked</span>
                  </button>
                </div>
              </div>

              {/* Card 3: Maestro Rank (LOCKED) */}
              <div
                className={`rounded-3xl p-7 sm:p-8 flex flex-col items-center text-center justify-between min-h-[320px] transition-all border shadow-xs ${
                  darkMode ? "bg-[#0d1a12] border-white/10" : "bg-white border-gray-100"
                }`}
              >
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 flex items-center justify-center">
                    <span className="text-4xl select-none">🎼</span>
                  </div>
                  <h4
                    className={`font-extrabold text-base sm:text-lg mt-3 ${
                      darkMode ? "text-white" : "text-[#111827]"
                    }`}
                  >
                    Maestro Rank
                  </h4>
                  <p
                    className={`text-xs font-medium mt-1 ${
                      darkMode ? "text-gray-300" : "text-[#4b5563]"
                    }`}
                  >
                    Refer 50 successful sales
                  </p>
                </div>

                <div className="w-full flex flex-col items-center mt-4">
                  {/* Progress Pill */}
                  <span
                    className={`rounded-full px-4 py-1 text-xs font-bold ${
                      darkMode ? "bg-white/10 text-gray-200" : "bg-gray-100 text-[#1f2937]"
                    }`}
                  >
                    1/50 Sales
                  </span>

                  {/* Locked Button */}
                  <button
                    disabled
                    className="w-full mt-5 py-3 px-4 rounded-xl font-bold text-xs sm:text-sm text-white bg-[#9ea29f] transition-all text-center cursor-not-allowed flex items-center justify-center gap-2 select-none"
                  >
                    <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                      <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
                    </svg>
                    <span>Locked</span>
                  </button>
                </div>
              </div>

              {/* Card 4: Guardian Elite (LOCKED) */}
              <div
                className={`rounded-3xl p-7 sm:p-8 flex flex-col items-center text-center justify-between min-h-[320px] transition-all border shadow-xs ${
                  darkMode ? "bg-[#0d1a12] border-white/10" : "bg-white border-gray-100"
                }`}
              >
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 flex items-center justify-center">
                    <span className="text-4xl select-none">👑</span>
                  </div>
                  <h4
                    className={`font-extrabold text-base sm:text-lg mt-3 ${
                      darkMode ? "text-white" : "text-[#111827]"
                    }`}
                  >
                    Guardian Elite
                  </h4>
                  <p
                    className={`text-xs font-medium mt-1 ${
                      darkMode ? "text-gray-300" : "text-[#4b5563]"
                    }`}
                  >
                    Refer 100 successful sales
                  </p>
                </div>

                <div className="w-full flex flex-col items-center mt-4">
                  {/* Progress Pill */}
                  <span
                    className={`rounded-full px-4 py-1 text-xs font-bold ${
                      darkMode ? "bg-white/10 text-gray-200" : "bg-gray-100 text-[#1f2937]"
                    }`}
                  >
                    1/100 Sales
                  </span>

                  {/* Locked Button */}
                  <button
                    disabled
                    className="w-full mt-5 py-3 px-4 rounded-xl font-bold text-xs sm:text-sm text-white bg-[#9ea29f] transition-all text-center cursor-not-allowed flex items-center justify-center gap-2 select-none"
                  >
                    <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                      <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
                    </svg>
                    <span>Locked</span>
                  </button>
                </div>
              </div>

              {/* Card 5: Top Ambassador (LOCKED) */}
              <div
                className={`rounded-3xl p-7 sm:p-8 flex flex-col items-center text-center justify-between min-h-[320px] transition-all border shadow-xs ${
                  darkMode ? "bg-[#0d1a12] border-white/10" : "bg-white border-gray-100"
                }`}
              >
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 flex items-center justify-center">
                    <span className="text-4xl select-none">🎭</span>
                  </div>
                  <h4
                    className={`font-extrabold text-base sm:text-lg mt-3 ${
                      darkMode ? "text-white" : "text-[#111827]"
                    }`}
                  >
                    Top Ambassador
                  </h4>
                  <p
                    className={`text-xs font-medium mt-1 ${
                      darkMode ? "text-gray-300" : "text-[#4b5563]"
                    }`}
                  >
                    Refer 250+ sales & join elite ambassadors
                  </p>
                </div>

                <div className="w-full flex flex-col items-center mt-4">
                  {/* Progress Pill */}
                  <span
                    className={`rounded-full px-4 py-1 text-xs font-bold ${
                      darkMode ? "bg-white/10 text-gray-200" : "bg-gray-100 text-[#1f2937]"
                    }`}
                  >
                    1/250 Sales
                  </span>

                  {/* Locked Button */}
                  <button
                    disabled
                    className="w-full mt-5 py-3 px-4 rounded-xl font-bold text-xs sm:text-sm text-white bg-[#9ea29f] transition-all text-center cursor-not-allowed flex items-center justify-center gap-2 select-none"
                  >
                    <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                      <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
                    </svg>
                    <span>Locked</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* VIEW 8: BROADCAST UPDATES (Announcements & Updates)       */}
        {/* ========================================================= */}
        {activeTab === "broadcasts" && (
          <div className="space-y-8 animate-in fade-in duration-200">
            {/* Page Heading */}
            <div>
              <h2
                className={`font-benaiah text-3xl sm:text-4xl font-extrabold tracking-tight ${
                  darkMode ? "text-white" : "text-[#111827]"
                }`}
              >
                Announcements & Updates
              </h2>
            </div>

            {/* Announcements Card */}
            <div
              className={`rounded-3xl p-6 sm:p-8 space-y-8 border shadow-xs transition-all ${
                darkMode ? "bg-[#0d1a12] border-white/10" : "bg-white border-gray-100"
              }`}
            >
              {/* Item 1: Traditional Kebero Drums */}
              <div className="border-l-4 border-l-[#14231b] dark:border-l-white/60 pl-5 sm:pl-6 space-y-1.5">
                <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  MAY 7 • PRODUCT
                </p>
                <h3
                  className={`text-base sm:text-lg font-bold tracking-tight ${
                    darkMode ? "text-white" : "text-[#111827]"
                  }`}
                >
                  New Product Drop: Traditional Kebero Drums
                </h3>
                <p className="text-xs sm:text-[13px] text-gray-600 dark:text-gray-400 font-medium leading-relaxed">
                  We have added authentic Ceremonial Kebero drums to our online registry. Direct your audience to the percussion tab! High demand expected.
                </p>
              </div>

              {/* Item 2: +1500 ETB Bonus Campaign */}
              <div className="border-l-4 border-l-[#f5c518] pl-5 sm:pl-6 space-y-1.5">
                <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  JUN 20 • CAMPAIGN
                </p>
                <h3
                  className={`text-base sm:text-lg font-bold tracking-tight ${
                    darkMode ? "text-white" : "text-[#111827]"
                  }`}
                >
                  +1500 ETB Bonus Campaign Launched!
                </h3>
                <p className="text-xs sm:text-[13px] text-gray-600 dark:text-gray-400 font-medium leading-relaxed">
                  Refer 5 Kirar sales by July 20th and receive a flat bonus reward of 1,500 ETB directly into your balance.
                </p>
              </div>

              {/* Item 3: Shipping Network Extended Globally */}
              <div className="border-l-4 border-l-[#14231b] dark:border-l-white/60 pl-5 sm:pl-6 space-y-1.5">
                <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  JUL 4 • UPDATE
                </p>
                <h3
                  className={`text-base sm:text-lg font-bold tracking-tight ${
                    darkMode ? "text-white" : "text-[#111827]"
                  }`}
                >
                  Shipping Network Extended Globally
                </h3>
                <p className="text-xs sm:text-[13px] text-gray-600 dark:text-gray-400 font-medium leading-relaxed">
                  Good news for international buyers: our shipping network now fully supports transit to Europe and North America with complete customs handling.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* VIEW 9: SETTINGS & PARTNER PROFILE                        */}
        {/* ========================================================= */}
        {activeTab === "settings" && (
          <div className="space-y-8 animate-in fade-in duration-200">
            {/* Page Heading */}
            <div>
              <h2
                className={`font-benaiah text-3xl sm:text-4xl font-extrabold tracking-tight ${
                  darkMode ? "text-white" : "text-[#111827]"
                }`}
              >
                Settings & Partner Profile
              </h2>
            </div>

            {/* Two-Column Responsive Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
              {/* Left Column (Forms & Statements) */}
              <div className="lg:col-span-2 space-y-8">
                {/* Card 1: Edit Public Profile */}
                <div
                  className={`rounded-3xl p-6 sm:p-8 border shadow-xs space-y-6 transition-all ${
                    darkMode ? "bg-[#0d1a12] border-white/10" : "bg-white border-gray-100"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <User className="w-5 h-5 text-[#d97706] fill-[#d97706]" />
                    <h3
                      className={`text-base sm:text-lg font-extrabold tracking-tight ${
                        darkMode ? "text-white" : "text-[#111827]"
                      }`}
                    >
                      Edit Public Profile
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    {/* Full Name */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        FULL NAME *
                      </label>
                      <input
                        type="text"
                        value={profileName}
                        onChange={(e) => setProfileName(e.target.value)}
                        className={`w-full rounded-xl px-4 py-3 text-sm font-semibold transition-all border outline-none ${
                          darkMode
                            ? "bg-white/5 border-white/10 text-white focus:border-[#f5c518]"
                            : "bg-[#faf9f6] border-transparent text-[#14231b] focus:border-[#f5c518] focus:bg-white"
                        }`}
                      />
                    </div>

                    {/* Phone Number */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        PHONE NUMBER
                      </label>
                      <input
                        type="text"
                        value={profilePhone}
                        placeholder="e.g. +251911223344"
                        onChange={(e) => setProfilePhone(e.target.value)}
                        className={`w-full rounded-xl px-4 py-3 text-sm font-semibold transition-all border outline-none placeholder-gray-400 ${
                          darkMode
                            ? "bg-white/5 border-white/10 text-white focus:border-[#f5c518]"
                            : "bg-[#faf9f6] border-transparent text-[#14231b] focus:border-[#f5c518] focus:bg-white"
                        }`}
                      />
                    </div>

                    {/* Email Address */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        EMAIL ADDRESS *
                      </label>
                      <input
                        type="email"
                        value={profileEmail}
                        onChange={(e) => setProfileEmail(e.target.value)}
                        className={`w-full rounded-xl px-4 py-3 text-sm font-semibold transition-all border outline-none ${
                          darkMode
                            ? "bg-white/5 border-white/10 text-white focus:border-[#f5c518]"
                            : "bg-[#faf9f6] border-transparent text-[#14231b] focus:border-[#f5c518] focus:bg-white"
                        }`}
                      />
                    </div>

                    {/* Country */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        COUNTRY
                      </label>
                      <div className="relative">
                        <select
                          value={profileCountry}
                          onChange={(e) => setProfileCountry(e.target.value)}
                          className={`w-full appearance-none rounded-xl px-4 py-3 pr-10 text-sm font-semibold transition-all border outline-none cursor-pointer ${
                            darkMode
                              ? "bg-[#112419] border-white/10 text-white focus:border-[#f5c518]"
                              : "bg-[#faf9f6] border-transparent text-[#14231b] focus:border-[#f5c518] focus:bg-white"
                          }`}
                        >
                          <option value="Ethiopia">Ethiopia</option>
                          <option value="United States">United States</option>
                          <option value="Canada">Canada</option>
                          <option value="United Kingdom">United Kingdom</option>
                          <option value="Germany">Germany</option>
                          <option value="Israel">Israel</option>
                          <option value="Sweden">Sweden</option>
                          <option value="Australia">Australia</option>
                        </select>
                        <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    </div>
                  </div>

                  {/* Notification Preferences */}
                  <div className="pt-4 space-y-4 border-t border-gray-100 dark:border-white/5">
                    <div className="flex items-center gap-2">
                      <Bell className="w-5 h-5 text-[#d97706] fill-[#d97706]" />
                      <h4
                        className={`text-base font-extrabold tracking-tight ${
                          darkMode ? "text-white" : "text-[#111827]"
                        }`}
                      >
                        Notification Preferences
                      </h4>
                    </div>

                    <div className="space-y-3">
                      <label className="flex items-center gap-3 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={notificationReports}
                          onChange={(e) => setNotificationReports(e.target.checked)}
                          className="w-4 h-4 rounded text-blue-600 accent-blue-600 cursor-pointer"
                        />
                        <span className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
                          Receive monthly performance reports via Email
                        </span>
                      </label>

                      <label className="flex items-center gap-3 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={notificationPush}
                          onChange={(e) => setNotificationPush(e.target.checked)}
                          className="w-4 h-4 rounded text-blue-600 accent-blue-600 cursor-pointer"
                        />
                        <span className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
                          Simulate push notifications for real-time sale credits
                        </span>
                      </label>
                    </div>

                    {profileSavedToast && (
                      <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 p-3 text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <span>Profile changes saved successfully!</span>
                      </div>
                    )}

                    <button
                      onClick={handleSaveProfile}
                      className="w-full rounded-xl bg-[#14231b] hover:bg-[#0b1610] text-white font-bold text-sm py-3.5 px-6 flex items-center justify-center gap-2.5 shadow-sm transition-all cursor-pointer active:scale-[0.99]"
                    >
                      <CheckCircle2 className="w-4 h-4 text-white" />
                      <span>Save Profile Changes</span>
                    </button>
                  </div>
                </div>

                {/* Card 2: Security & Password */}
                <div
                  className={`rounded-3xl p-6 sm:p-8 border shadow-xs space-y-6 transition-all ${
                    darkMode ? "bg-[#0d1a12] border-white/10" : "bg-white border-gray-100"
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                      <Shield className="w-5 h-5 text-[#d97706] fill-[#d97706]" />
                      <h3
                        className={`text-base sm:text-lg font-extrabold tracking-tight ${
                          darkMode ? "text-white" : "text-[#111827]"
                        }`}
                      >
                        Security & Password
                      </h3>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium pt-1">
                      Ensure your affiliate account is protected with a secure password containing at least 6 characters.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    {/* New Password */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        NEW PASSWORD *
                      </label>
                      <div className="relative">
                        <input
                          type={showNewPassword ? "text" : "password"}
                          placeholder="Enter new password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className={`w-full rounded-xl px-4 py-3 pr-10 text-sm font-semibold transition-all border outline-none placeholder-gray-400 ${
                            darkMode
                              ? "bg-white/5 border-white/10 text-white focus:border-[#f5c518]"
                              : "bg-[#faf9f6] border-transparent text-[#14231b] focus:border-[#f5c518] focus:bg-white"
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
                          title={showNewPassword ? "Hide password" : "Show password"}
                        >
                          {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Confirm New Password */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        CONFIRM NEW PASSWORD *
                      </label>
                      <div className="relative">
                        <input
                          type={showConfirmPassword ? "text" : "password"}
                          placeholder="Re-enter new password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className={`w-full rounded-xl px-4 py-3 pr-10 text-sm font-semibold transition-all border outline-none placeholder-gray-400 ${
                            darkMode
                              ? "bg-white/5 border-white/10 text-white focus:border-[#f5c518]"
                              : "bg-[#faf9f6] border-transparent text-[#14231b] focus:border-[#f5c518] focus:bg-white"
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
                          title={showConfirmPassword ? "Hide password" : "Show password"}
                        >
                          {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {passwordToast && (
                    <div
                      className={`rounded-xl p-3 text-xs font-bold flex items-center gap-2 ${
                        passwordToast.type === "success"
                          ? "bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400"
                          : "bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400"
                      }`}
                    >
                      {passwordToast.type === "success" ? (
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                      ) : (
                        <ShieldAlert className="w-4 h-4 shrink-0" />
                      )}
                      <span>{passwordToast.text}</span>
                    </div>
                  )}

                  <button
                    onClick={handleUpdatePassword}
                    className="w-full rounded-xl bg-[#14231b] hover:bg-[#0b1610] text-[#f5c518] font-bold text-sm py-3.5 px-6 flex items-center justify-center gap-2.5 shadow-sm transition-all cursor-pointer active:scale-[0.99]"
                  >
                    <Key className="w-4 h-4 text-[#f5c518]" />
                    <span>Update Password</span>
                  </button>
                </div>

                {/* Card 3: Performance & Official Statement */}
                <div
                  className={`rounded-3xl p-6 sm:p-8 border shadow-xs space-y-6 transition-all ${
                    darkMode ? "bg-[#0d1a12] border-white/10" : "bg-white border-gray-100"
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2.5">
                      <FileText className="w-5 h-5 text-[#d97706] fill-[#d97706]" />
                      <h3
                        className={`text-base sm:text-lg font-extrabold tracking-tight ${
                          darkMode ? "text-white" : "text-[#111827]"
                        }`}
                      >
                        Performance & Official Statement
                      </h3>
                    </div>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 font-medium">
                      Monthly performance overview & certified partner records
                    </p>
                  </div>

                  {/* Download PDF Report Button */}
                  <div>
                    <button
                      onClick={() =>
                        triggerDownload("Certified Partner Statement (Monthly Report)", "PDF", "Certified")
                      }
                      className="rounded-xl bg-[#14231b] hover:bg-black text-white font-bold text-xs sm:text-sm py-2.5 px-4 flex items-center gap-2 shadow-xs cursor-pointer active:scale-95 transition-all"
                    >
                      <FileText className="w-4 h-4" />
                      <span>Download PDF Report</span>
                    </button>
                  </div>

                  {/* 5 Stats Cards Grid */}
                  <div className="space-y-4">
                    {/* Top Row: 3 columns */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {/* Monthly Clicks */}
                      <div
                        className={`rounded-2xl p-5 border border-l-4 border-l-[#14231b] dark:border-l-white/70 shadow-xs ${
                          darkMode ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-100"
                        }`}
                      >
                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                          MONTHLY CLICKS
                        </span>
                        <p
                          className={`text-2xl sm:text-3xl font-extrabold tracking-tight mt-2 ${
                            darkMode ? "text-white" : "text-[#111827]"
                          }`}
                        >
                          {stats.clicks}
                        </p>
                      </div>

                      {/* Referral Sales */}
                      <div
                        className={`rounded-2xl p-5 border border-l-4 border-l-[#14231b] dark:border-l-white/70 shadow-xs ${
                          darkMode ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-100"
                        }`}
                      >
                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                          REFERRAL SALES
                        </span>
                        <p
                          className={`text-2xl sm:text-3xl font-extrabold tracking-tight mt-2 ${
                            darkMode ? "text-white" : "text-[#111827]"
                          }`}
                        >
                          {stats.referrals}
                        </p>
                      </div>

                      {/* Conversion Rate */}
                      <div
                        className={`rounded-2xl p-5 border border-l-4 border-l-[#14231b] dark:border-l-white/70 shadow-xs ${
                          darkMode ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-100"
                        }`}
                      >
                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                          CONVERSION RATE
                        </span>
                        <p
                          className={`text-2xl sm:text-3xl font-extrabold tracking-tight mt-2 ${
                            darkMode ? "text-white" : "text-[#111827]"
                          }`}
                        >
                          {stats.conversionRate.toFixed(1)}%
                        </p>
                      </div>
                    </div>

                    {/* Bottom Row: 2 columns */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Commission */}
                      <div
                        className={`rounded-2xl p-5 border border-l-4 border-l-[#f5c518] shadow-xs ${
                          darkMode ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-100"
                        }`}
                      >
                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                          COMMISSION
                        </span>
                        <p
                          className={`text-2xl sm:text-3xl font-extrabold tracking-tight mt-2 ${
                            darkMode ? "text-white" : "text-[#111827]"
                          }`}
                        >
                          ETB {stats.availableBalance.toLocaleString()}
                        </p>
                      </div>

                      {/* Store Revenue */}
                      <div
                        className={`rounded-2xl p-5 border border-l-4 border-l-[#14231b] dark:border-l-white/70 shadow-xs ${
                          darkMode ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-100"
                        }`}
                      >
                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                          STORE REVENUE
                        </span>
                        <p
                          className={`text-2xl sm:text-3xl font-extrabold tracking-tight mt-2 ${
                            darkMode ? "text-white" : "text-[#111827]"
                          }`}
                        >
                          ETB {(stats.availableBalance * 10).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Disclaimer Notice Box */}
                  <div
                    className={`rounded-2xl p-5 flex items-start gap-4 border ${
                      darkMode
                        ? "bg-[#131f17] border-white/10 text-gray-300"
                        : "bg-[#fcf9f2] border-[#f5ebd9] text-gray-600"
                    }`}
                  >
                    <span className="text-2xl shrink-0 mt-0.5">📜</span>
                    <p className="text-xs font-medium leading-relaxed">
                      Your statement is generated dynamically with official Amiele cultural committee digital signatures and can be presented as proof of partnership.
                    </p>
                  </div>
                </div>
              </div>

              {/* Right Column (Partner Identity Card & Completion Details) */}
              <div className="lg:col-span-1 space-y-6">
                {/* 1. Partner Identity Card */}
                <div className="rounded-3xl p-8 bg-[#0e2116] text-white flex flex-col items-center text-center space-y-4 shadow-sm border border-white/5">
                  {/* Photo Avatar */}
                  <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-emerald-500/40 shadow-lg shrink-0">
                    <img
                      src="/image/photo_2025-02-27_17-33-38.jpg"
                      alt="Partner Avatar"
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Partner Name */}
                  <h3 className="text-2xl font-black text-white tracking-tight mt-1">
                    {profileName || displayName || "jane"}
                  </h3>

                  {/* Status Pill */}
                  <span className="rounded-full px-5 py-1 text-[11px] font-extrabold uppercase tracking-wider bg-[#b45309] text-white shadow-xs">
                    STANDARD PARTNER
                  </span>

                  {/* Affiliate Code Pill */}
                  <div className="w-full py-2.5 px-3 rounded-xl bg-[#163323] text-[#f5c518] font-mono text-[11px] font-bold tracking-wider text-center border border-white/5 break-all select-all">
                    {activeCode ? `AFF-${activeCode.toUpperCase()}` : "AFF-DB7F89BA-9DB2-4F49-BEA3-26F257B37CDB"}
                  </div>

                  {/* Joined Date */}
                  <p className="text-xs font-semibold text-gray-400 pt-1">
                    Joined: Oct 26, 2026
                  </p>

                  {/* Bottom Stats Divider */}
                  <div className="border-t border-white/10 pt-5 mt-2 w-full grid grid-cols-2 divide-x divide-white/10 text-center">
                    <div className="pr-3">
                      <p className="text-xl font-black text-white">ETB {stats.totalEarnings ?? 0}</p>
                      <p className="text-[10px] font-bold text-gray-400 tracking-wider uppercase mt-1">TOTAL EARNED</p>
                    </div>
                    <div className="pl-3">
                      <p className="text-xl font-black text-white">{stats.referrals ?? 0}</p>
                      <p className="text-[10px] font-bold text-gray-400 tracking-wider uppercase mt-1">SALES</p>
                    </div>
                  </div>
                </div>

                {/* 2. Profile Completion Card */}
                {(() => {
                  const isNameDone = Boolean(profileName && profileName.trim().length > 0);
                  const isEmailDone = Boolean(profileEmail && profileEmail.trim().length > 0);
                  const isPhoneDone = Boolean(profilePhone && profilePhone.trim().length > 0);
                  const isCountryDone = Boolean(profileCountry && profileCountry.trim().length > 0);
                  const isPayoutDone = Boolean(payoutDetails || contactPhone || withdrawals.length > 0);
                  const completedCount = [isNameDone, isEmailDone, isPhoneDone, isCountryDone, isPayoutDone].filter(Boolean).length;
                  const completionPercentage = Math.round((completedCount / 5) * 100);

                  return (
                    <div
                      className={`rounded-3xl p-6 sm:p-7 border shadow-xs space-y-5 transition-all ${
                        darkMode ? "bg-[#0d1a12] border-white/10" : "bg-white border-gray-100"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <ListChecks className="w-5 h-5 text-[#d97706]" />
                          <h3
                            className={`text-base font-extrabold tracking-tight ${
                              darkMode ? "text-white" : "text-[#111827]"
                            }`}
                          >
                            Profile Completion
                          </h3>
                        </div>
                        <span
                          className={`text-sm font-black ${
                            darkMode ? "text-white" : "text-[#111827]"
                          }`}
                        >
                          {completionPercentage}%
                        </span>
                      </div>

                      {/* Circular Progress Ring + Summary */}
                      <div className="flex items-center gap-4">
                        <div className="relative w-16 h-16 shrink-0 flex items-center justify-center">
                          <svg className="w-16 h-16 -rotate-90" viewBox="0 0 36 36">
                            <path
                              className="text-gray-100 dark:text-white/10"
                              strokeWidth="3.5"
                              stroke="currentColor"
                              fill="none"
                              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            />
                            <path
                              className="text-[#f5c518]"
                              strokeDasharray={`${completionPercentage}, 100`}
                              strokeWidth="3.5"
                              strokeLinecap="round"
                              stroke="currentColor"
                              fill="none"
                              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            />
                          </svg>
                          <span
                            className={`absolute text-xs font-black ${
                              darkMode ? "text-white" : "text-[#111827]"
                            }`}
                          >
                            {completionPercentage}%
                          </span>
                        </div>
                        <div>
                          <p
                            className={`text-sm font-extrabold ${
                              darkMode ? "text-white" : "text-[#111827]"
                            }`}
                          >
                            {completedCount} of 5 details completed
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-snug">
                            Keep your details updated to ensure seamless payouts and security.
                          </p>
                        </div>
                      </div>

                      {/* Checklist */}
                      <div className="space-y-2.5 pt-2 border-t border-gray-100 dark:border-white/5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="flex items-center gap-2 font-semibold text-gray-800 dark:text-gray-200">
                            {isNameDone ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            ) : (
                              <Circle className="w-4 h-4 text-gray-300 dark:text-gray-600 shrink-0" />
                            )}
                            Full Name
                          </span>
                          <span className={`font-bold ${isNameDone ? "text-emerald-600" : "text-amber-600"}`}>
                            {isNameDone ? "Completed" : "Missing"}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-xs">
                          <span className="flex items-center gap-2 font-semibold text-gray-800 dark:text-gray-200">
                            {isEmailDone ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            ) : (
                              <Circle className="w-4 h-4 text-gray-300 dark:text-gray-600 shrink-0" />
                            )}
                            Email Address
                          </span>
                          <span className={`font-bold ${isEmailDone ? "text-emerald-600" : "text-amber-600"}`}>
                            {isEmailDone ? "Completed" : "Missing"}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-xs">
                          <span className="flex items-center gap-2 font-semibold text-gray-800 dark:text-gray-200">
                            {isPhoneDone ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            ) : (
                              <Circle className="w-4 h-4 text-gray-300 dark:text-gray-600 shrink-0" />
                            )}
                            Phone Number
                          </span>
                          <span className={`font-bold ${isPhoneDone ? "text-emerald-600" : "text-amber-600"}`}>
                            {isPhoneDone ? "Completed" : "Missing"}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-xs">
                          <span className="flex items-center gap-2 font-semibold text-gray-800 dark:text-gray-200">
                            {isCountryDone ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            ) : (
                              <Circle className="w-4 h-4 text-gray-300 dark:text-gray-600 shrink-0" />
                            )}
                            Country Selected
                          </span>
                          <span className={`font-bold ${isCountryDone ? "text-emerald-600" : "text-amber-600"}`}>
                            {isCountryDone ? "Completed" : "Missing"}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-xs">
                          <span className="flex items-center gap-2 font-semibold text-gray-800 dark:text-gray-200">
                            {isPayoutDone ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            ) : (
                              <Circle className="w-4 h-4 text-gray-300 dark:text-gray-600 shrink-0" />
                            )}
                            Payout Method Configured
                          </span>
                          <span className={`font-bold ${isPayoutDone ? "text-emerald-600" : "text-amber-600"}`}>
                            {isPayoutDone ? "Completed" : "Missing"}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* 3. Ambassador Rank Progress */}
                <div
                  className={`rounded-3xl p-6 sm:p-7 border shadow-xs space-y-3.5 transition-all ${
                    darkMode ? "bg-[#0d1a12] border-white/10" : "bg-white border-gray-100"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <TrendingUp className="w-5 h-5 text-[#111827] dark:text-white" />
                    <h3
                      className={`text-base font-extrabold tracking-tight ${
                        darkMode ? "text-white" : "text-[#111827]"
                      }`}
                    >
                      Ambassador Rank Progress
                    </h3>
                  </div>

                  <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                    Standard to Silver Rank (10 sales required)
                  </p>

                  <div className="w-full bg-[#f2eee3] dark:bg-white/10 h-3 rounded-full overflow-hidden">
                    <div
                      className="bg-[#f5c518] h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, ((stats.referrals || 0) / 10) * 100)}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs font-bold text-gray-600 dark:text-gray-400 pt-0.5">
                    <span>0 Sales</span>
                    <span>10 Sales</span>
                  </div>
                </div>

                {/* 4. Badges Unlocked Card */}
                <div
                  className={`rounded-3xl p-6 sm:p-7 border shadow-xs space-y-3 transition-all ${
                    darkMode ? "bg-[#0d1a12] border-white/10" : "bg-white border-gray-100"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Award className="w-5 h-5 text-[#111827] dark:text-white" />
                    <h3
                      className={`text-base font-extrabold tracking-tight ${
                        darkMode ? "text-white" : "text-[#111827]"
                      }`}
                    >
                      Badges Unlocked
                    </h3>
                  </div>

                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                    No badges unlocked yet.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal: QR Code Share */}
        {showQrModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-black/70 backdrop-blur-xs"
              onClick={() => setShowQrModal(false)}
            />
            <div
              className={`relative w-full max-w-sm rounded-3xl p-6 shadow-2xl border text-center space-y-4 ${
                darkMode ? "bg-[#09170e] border-white/20 text-white" : "bg-white border-gray-200"
              }`}
            >
              <div className="flex items-center justify-between pb-2 border-b border-gray-200 dark:border-white/10">
                <span className="font-bold text-sm">Affiliate QR Code</span>
                <button
                  onClick={() => setShowQrModal(false)}
                  className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 text-gray-500 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 bg-white rounded-2xl inline-block mx-auto border shadow-xs">
                {/* Visual SVG QR Code Representation */}
                <svg className="w-44 h-44 text-[#14231b]" viewBox="0 0 100 100">
                  <rect width="100" height="100" fill="white" />
                  <path
                    d="M10 10 h25 v25 h-25 z M15 15 h15 v15 h-15 z M20 20 h5 v5 h-5 z"
                    fill="currentColor"
                  />
                  <path
                    d="M65 10 h25 v25 h-25 z M70 15 h15 v15 h-15 z M75 20 h5 v5 h-5 z"
                    fill="currentColor"
                  />
                  <path
                    d="M10 65 h25 v25 h-25 z M15 70 h15 v15 h-15 z M20 75 h5 v5 h-5 z"
                    fill="currentColor"
                  />
                  <rect x="42" y="15" width="6" height="6" fill="currentColor" />
                  <rect x="52" y="22" width="6" height="6" fill="currentColor" />
                  <rect x="42" y="32" width="6" height="6" fill="currentColor" />
                  <rect x="15" y="45" width="6" height="6" fill="currentColor" />
                  <rect x="30" y="45" width="6" height="6" fill="currentColor" />
                  <rect x="45" y="45" width="10" height="10" fill="#f5c518" />
                  <rect x="65" y="45" width="6" height="6" fill="currentColor" />
                  <rect x="80" y="45" width="6" height="6" fill="currentColor" />
                  <rect x="45" y="65" width="6" height="6" fill="currentColor" />
                  <rect x="58" y="72" width="6" height="6" fill="currentColor" />
                  <rect x="75" y="65" width="6" height="6" fill="currentColor" />
                  <rect x="68" y="80" width="6" height="6" fill="currentColor" />
                  <rect x="82" y="82" width="6" height="6" fill="currentColor" />
                </svg>
              </div>

              <p className="text-xs text-gray-500 font-mono">{referralLink}</p>

              <button
                onClick={() => handleCopyLink(referralLink)}
                className="w-full py-2.5 rounded-xl bg-[#f5c518] text-[#14231b] font-bold text-xs uppercase tracking-wider hover:brightness-105 active:scale-95 transition-all shadow-xs cursor-pointer"
              >
                {copied ? "Link Copied!" : "Copy Tracking URL"}
              </button>
            </div>
          </div>
        )}

        {/* Modal: Search Command Palette */}
        {showSearchModal && (
          <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4">
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-xs"
              onClick={() => setShowSearchModal(false)}
            />
            <div
              className={`relative w-full max-w-lg rounded-2xl p-4 shadow-2xl border ${
                darkMode ? "bg-[#09170e] border-white/20 text-white" : "bg-white border-gray-200"
              }`}
            >
              <div className="flex items-center gap-2 pb-3 border-b border-gray-200 dark:border-white/10">
                <Search className="w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  autoFocus
                  placeholder="Search partner analytics, commissions, links..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-transparent text-sm focus:outline-hidden"
                />
                <button
                  onClick={() => setShowSearchModal(false)}
                  className="text-xs text-gray-400 hover:text-gray-600 px-1.5 py-0.5 rounded border border-gray-200 dark:border-white/10"
                >
                  ESC
                </button>
              </div>

              <div className="py-3 space-y-1 text-xs">
                <button
                  onClick={() => {
                    handleSelectTab("dashboard");
                    setShowSearchModal(false);
                  }}
                  className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <LayoutGrid className="w-3.5 h-3.5 text-[#f5c518]" />
                    Overview Dashboard
                  </span>
                  <span className="text-gray-400 text-[10px]">Jump to tab</span>
                </button>
                <button
                  onClick={() => {
                    handleSelectTab("referrals");
                    setShowSearchModal(false);
                  }}
                  className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Link2 className="w-3.5 h-3.5 text-[#f5c518]" />
                    Referral Center
                  </span>
                  <span className="text-gray-400 text-[10px]">Jump to tab</span>
                </button>
                <button
                  onClick={() => {
                    handleSelectTab("commissions");
                    setShowSearchModal(false);
                  }}
                  className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5 text-[#52b788]" />
                    Commission Ledger
                  </span>
                  <span className="text-gray-400 text-[10px]">
                    ETB {(stats?.availableBalance || 0).toLocaleString()}
                  </span>
                </button>
                <button
                  onClick={() => {
                    setIsWithdrawOpen(true);
                    setShowSearchModal(false);
                  }}
                  className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Wallet className="w-3.5 h-3.5 text-[#b8860b]" />
                    Request Commission Disbursement
                  </span>
                  <span className="text-gray-400 text-[10px]">Payout</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Payout Disbursement Request (Shared PremiumModal Design System) */}
        <AffiliatePayoutModal
          open={isWithdrawOpen}
          onClose={() => setIsWithdrawOpen(false)}
          availableBalance={stats?.availableBalance || 0}
          onSubmit={async ({ amount, method, details }) => {
            const res = await submitAffiliateWithdrawal({
              affiliate_id: user?.id || "",
              amount,
              method,
              payout_details: details,
            });
            if (res && res.success && user?.id) {
              loadData(user.id);
            }
            return res;
          }}
        />

        {/* Download Feedback Toast */}
        {downloadToast && (
          <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
            <div className="bg-[#14231b] text-white px-5 py-4 rounded-2xl shadow-2xl border border-[#f5c518]/30 flex items-center gap-3.5 max-w-sm">
              <div className="w-9 h-9 rounded-full bg-[#f5c518] text-[#14231b] flex items-center justify-center shrink-0 shadow-xs">
                <Check className="w-4 h-4 stroke-[3]" />
              </div>
              <div className="min-w-0">
                <p className="font-bold text-xs truncate text-white">{downloadToast.title}</p>
                <p className="text-[11px] text-gray-300 mt-0.5">{downloadToast.meta} • Preparing download...</p>
              </div>
            </div>
          </div>
        )}

        {/* Bilingual Captions Modal */}
        {showCaptionsModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div
              className={`w-full max-w-2xl rounded-3xl p-6 sm:p-8 shadow-2xl border max-h-[90vh] overflow-y-auto space-y-6 ${
                darkMode ? "bg-[#0d1a12] border-white/10 text-white" : "bg-white border-gray-100 text-[#14231b]"
              }`}
            >
              <div className="flex items-center justify-between border-b pb-4 border-gray-100 dark:border-white/10">
                <div>
                  <h3 className="text-xl font-extrabold tracking-tight">Bilingual Caption Templates</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Pre-crafted captions embedded with your personal referral link (<span className="font-mono text-[#b8860b] dark:text-[#f5c518] font-bold">{activeCode}</span>).
                  </p>
                </div>
                <button
                  onClick={() => setShowCaptionsModal(false)}
                  className="w-8 h-8 rounded-full bg-gray-100 dark:bg-white/10 flex items-center justify-center text-gray-500 hover:text-black dark:hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4">
                {captionTemplates.map((template, idx) => (
                  <div
                    key={idx}
                    className={`p-5 rounded-2xl border transition-all ${
                      darkMode ? "bg-[#112419] border-white/10" : "bg-[#FAF8F5] border-gray-200/80"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h4 className="font-bold text-sm">{template.title}</h4>
                        <span className="text-[10px] uppercase tracking-wider font-bold text-[#b8860b]">
                          {template.category}
                        </span>
                      </div>
                      <button
                        onClick={() => handleCopyCaption(template.text, idx)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-[#f5c518] text-[#14231b] hover:brightness-105 active:scale-95 transition-all cursor-pointer shadow-xs"
                      >
                        {copiedCaptionIdx === idx ? (
                          <>
                            <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                            <span>Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy Caption</span>
                          </>
                        )}
                      </button>
                    </div>
                    <pre className="text-xs text-gray-700 dark:text-gray-300 font-sans whitespace-pre-wrap leading-relaxed mt-2 p-3 rounded-xl bg-white dark:bg-black/20 border border-gray-100 dark:border-white/5 select-all">
                      {template.text}
                    </pre>
                  </div>
                ))}
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => setShowCaptionsModal(false)}
                  className="px-6 py-2.5 rounded-xl font-bold text-xs bg-[#f5c518] text-[#14231b] hover:brightness-105 transition-all cursor-pointer shadow-xs"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Certificate of Appreciation Modal */}
        {showCertificateModal && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div
              className={`w-full max-w-2xl rounded-3xl p-6 sm:p-10 shadow-2xl border-4 border-[#f5c518] relative text-center space-y-6 ${
                darkMode ? "bg-[#09170e] text-white" : "bg-[#fdfaf5] text-[#14231b]"
              }`}
            >
              <button
                onClick={() => setShowCertificateModal(false)}
                className="absolute top-5 right-5 w-8 h-8 rounded-full bg-gray-100 dark:bg-white/10 flex items-center justify-center text-gray-500 hover:text-black dark:hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="space-y-1">
                <span className="text-[10px] font-bold tracking-[0.3em] uppercase text-[#b8860b]">
                  AMIELE BEGENA ARCHIVE & PRESERVATION GUILD
                </span>
                <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                  Certificate of Appreciation
                </h3>
                <p className="text-xs text-gray-500">Official Ambassador Recognition Milestone</p>
              </div>

              <div className="py-4 border-y border-[#f5c518]/30 space-y-3">
                <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold">
                  This Certificate is proudly conferred to
                </p>
                <h4 className="text-2xl sm:text-3xl font-black text-[#14231b] dark:text-[#f5c518]">
                  {displayName}
                </h4>
                <p className="text-xs text-gray-600 dark:text-gray-300 max-w-md mx-auto leading-relaxed">
                  For completing the <strong>First Sale Ambassador Milestone</strong> in championing and preserving the sacred 10-string King David Harp (ዳዊት በገና) and authentic Ethiopian acoustic instruments.
                </p>
              </div>

              <div className="flex items-center justify-between pt-2 px-4 text-left">
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">Authorized Seal</p>
                  <p className="text-xs font-bold text-[#b8860b]">Preservation Curation Committee</p>
                </div>
                <div className="w-14 h-14 rounded-full bg-[#f5c518]/20 border-2 border-[#f5c518] flex items-center justify-center text-2xl shadow-xs">
                  🎖️
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">Issued</p>
                  <p className="text-xs font-bold">October 2026</p>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-center gap-3">
                <button
                  onClick={() => {
                    triggerDownload("First Sale Ambassador Certificate", "PNG", "High-Res");
                    setShowCertificateModal(false);
                  }}
                  className="px-6 py-2.5 rounded-xl font-bold text-xs bg-[#f5c518] text-[#14231b] hover:brightness-105 active:scale-95 transition-all shadow-xs cursor-pointer flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Certificate PNG</span>
                </button>
                <button
                  onClick={() => setShowCertificateModal(false)}
                  className="px-5 py-2.5 rounded-xl font-bold text-xs border border-gray-300 dark:border-white/20 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 transition-all cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function AffiliatePortalPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center">Loading Portal...</div>}>
      <AffiliatePortalContent />
    </Suspense>
  );
}
