"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";
import {
  LayoutGrid,
  Users,
  FileText,
  ShoppingBag,
  CreditCard,
  Target,
  Megaphone,
  UserCheck,
  ChevronDown,
  ArrowLeft,
  Calendar,
  RefreshCw,
  Wallet,
  TrendingUp,
  Loader2,
  Clock,
  CheckCheck,
  Truck,
  PackageCheck,
  Award,
  Flame,
  Calculator,
  BarChart2,
  Lightbulb,
  Globe,
  Trophy,
  Package,
  GitMerge,
  Activity,
  Plus,
  Trash2,
  Edit,
  ExternalLink,
  ShieldCheck,
  Bell,
  Search,
  CheckCircle,
  Scissors,
  Hammer,
  Plane,
  Menu,
  X,
  AlertCircle,
  AlertTriangle,
  Check,
} from "lucide-react";
import NotificationFlyout from "../../components/NotificationFlyout";
import ProductManagementModule from "../../components/admin/ProductManagementModule";

type AdminTab =
  | "dashboard"
  | "products"
  | "users"
  | "applications"
  | "orders"
  | "commissions"
  | "withdrawals"
  | "campaigns"
  | "announcements";

interface AdminUserItem {
  id: string;
  fullName: string;
  email: string;
  role: "user" | "affiliate" | "admin";
  joinedDate: string;
}

interface ApplicationItem {
  id: string;
  applicantName: string;
  contactInfo: string;
  country: string;
  socialLinks: string;
  whyJoin: string;
  submittedDate: string;
  status: "pending" | "approved" | "rejected";
}

interface AdminOrderItem {
  id: string;
  orderRef: string;
  customerName: string;
  customerContact: string;
  productQty: string;
  country: string;
  affiliateCode: string;
  affiliateSub: string;
  paymentStatus: "PAID" | "PENDING_PAYMENT" | "CANCELLED";
  fulfillmentStage:
    | "PAYMENT VERIFIED"
    | "PENDING"
    | "PREPARING"
    | "CRAFTING"
    | "PACKED"
    | "SHIPPED"
    | "DELIVERED";
  amount: string;
}

interface WithdrawalItem {
  id: string;
  affiliateId: string;
  amount: string;
  payoutAddressInfo: string;
  requestDate: string;
  status: "PENDING" | "PAID" | "REJECTED";
}

interface CampaignItem {
  id: string;
  title: string;
  description: string;
  target: string;
  reward: string;
  daysRemaining: string;
  status: "ACTIVE" | "EXPIRED" | "DRAFT";
}

interface AnnouncementItem {
  id: string;
  title: string;
  content: string;
  type: string;
  priority: string;
  createdDate: string;
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const { user, profile, loading: authLoading } = useAuth();

  // Authentication & Admin Role Enforcement
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.replace("/login?redirect=/admin");
      } else if (profile && profile.role !== "admin") {
        router.replace("/account");
      }
    }
  }, [user, profile, authLoading, router]);

  const [activeTab, setActiveTab] = useState<AdminTab>("dashboard");
  const [loading, setLoading] = useState(false);
  const [timeStr, setTimeStr] = useState("12:15:36 PM");

  // ================= 1. USERS TAB STATE =================
  const [usersList, setUsersList] = useState<AdminUserItem[]>([
    {
      id: "db7f89ba",
      fullName: "jane",
      email: "punchesbox@gmail.com",
      role: "user",
      joinedDate: "10/26/2026",
    },
    {
      id: "0408e820",
      fullName: "ktttttttt",
      email: "krbftdss@gmail.com",
      role: "user",
      joinedDate: "10/26/2026",
    },
    {
      id: "fe9a06dd",
      fullName: "Kirubel",
      email: "giftgiddy62@gmail.com",
      role: "user",
      joinedDate: "10/17/2026",
    },
    {
      id: "8016018d",
      fullName: "Kirubel",
      email: "abayplumbing.addis@gmail.com",
      role: "user",
      joinedDate: "10/17/2026",
    },
    {
      id: "fa4f9dfa",
      fullName: "kirubel tadesse",
      email: "eyuelt354@gmail.com",
      role: "affiliate",
      joinedDate: "10/17/2026",
    },
    {
      id: "76d6f8c2",
      fullName: "amiel",
      email: "amielebegena@gmail.com",
      role: "affiliate",
      joinedDate: "8/26/2026",
    },
  ]);

  // ================= 2. APPLICATIONS QUEUE STATE =================
  const [applications, setApplications] = useState<ApplicationItem[]>([
    {
      id: "app_dawit",
      applicantName: "Dawit Partner Applicant",
      contactInfo: "dawit@amiele.org",
      country: "ET",
      socialLinks: "https://instagram.com/dawit_begena",
      whyJoin: "Cultural promoter & music educator",
      submittedDate: "10/24/2026",
      status: "pending",
    },
    {
      id: "app_0954b62e",
      applicantName: "hjkl",
      contactInfo: "N/A",
      country: "ET",
      socialLinks: "",
      whyJoin: "i want to",
      submittedDate: "8/20/2026",
      status: "pending",
    },
  ]);
  const [pendingApprovalApp, setPendingApprovalApp] = useState<ApplicationItem | null>(null);

  // ================= 3. PRODUCTION ORDER FULFILLMENT STATE =================
  const [orderFilter, setOrderFilter] = useState("All Orders");
  const [orderSearchQuery, setOrderSearchQuery] = useState("");
  const [ordersList, setOrdersList] = useState<AdminOrderItem[]>([
    {
      id: "ord_1",
      orderRef: "AM-2026-001171",
      customerName: "Muisa",
      customerContact: "N/A | 0912122466",
      productQty: "1x ዛፍ-C (Kirar)",
      country: "Usa",
      affiliateCode: "giddymesfi-3659",
      affiliateSub: "giddymesfi-3659",
      paymentStatus: "PAID",
      fulfillmentStage: "PAYMENT VERIFIED",
      amount: "ETB 8,500",
    },
    {
      id: "ord_2",
      orderRef: "AM-2026-001170",
      customerName: "Kira",
      customerContact: "tadesseibowkira@gmail.com | 251964261817",
      productQty: "1x በገና (Begena)",
      country: "Ethiopia",
      affiliateCode: "biruk-9543",
      affiliateSub: "biruk-9543",
      paymentStatus: "PAID",
      fulfillmentStage: "PAYMENT VERIFIED",
      amount: "ETB 8,500",
    },
    {
      id: "ord_3",
      orderRef: "AM-2026-001169",
      customerName: "RLS Security Verification",
      customerContact: "N/A | +251955475542",
      productQty: "1x Awtar (አውታር)",
      country: "Ethiopia",
      affiliateCode: "Direct / None",
      affiliateSub: "None",
      paymentStatus: "PENDING_PAYMENT",
      fulfillmentStage: "PENDING",
      amount: "ETB 220",
    },
    {
      id: "ord_4",
      orderRef: "AM-2026-001168",
      customerName: "Spam Bot Test",
      customerContact: "N/A | +251999888777",
      productQty: "1x Awtar (አውታር)",
      country: "Ethiopia",
      affiliateCode: "Direct / None",
      affiliateSub: "None",
      paymentStatus: "PENDING_PAYMENT",
      fulfillmentStage: "PENDING",
      amount: "ETB 220",
    },
    {
      id: "ord_5",
      orderRef: "AM-2026-001167",
      customerName: "Spam Bot Test",
      customerContact: "N/A | +251999888777",
      productQty: "1x Awtar (አውታር)",
      country: "Ethiopia",
      affiliateCode: "Direct / None",
      affiliateSub: "None",
      paymentStatus: "PENDING_PAYMENT",
      fulfillmentStage: "PENDING",
      amount: "ETB 220",
    },
    {
      id: "ord_6",
      orderRef: "AM-2026-001166",
      customerName: "Spam Bot Test",
      customerContact: "N/A | +251999888777",
      productQty: "1x Awtar (አውታር)",
      country: "Ethiopia",
      affiliateCode: "Direct / None",
      affiliateSub: "None",
      paymentStatus: "PENDING_PAYMENT",
      fulfillmentStage: "PENDING",
      amount: "ETB 220",
    },
  ]);

  // ================= 4. PAYOUT QUEUE STATE =================
  const [withdrawals, setWithdrawals] = useState<WithdrawalItem[]>([
    {
      id: "wth_d8ebba63",
      affiliateId: "kira boss",
      amount: "ETB 1,000",
      payoutAddressInfo:
        "Dashen Bank (Acc: 03483043-4304-3, Name: abeba hbswqiud) 0987657453",
      requestDate: "8/21/2026",
      status: "PENDING",
    },
    {
      id: "wth_b783d04f",
      affiliateId: "kira boss",
      amount: "ETB 500",
      payoutAddressInfo:
        "Bank of Abyssinia (Acc: 437277727, Name: abebe balcha) 0987657453",
      requestDate: "8/21/2026",
      status: "PAID",
    },
    {
      id: "wth_7652ba16",
      affiliateId: "kira boss",
      amount: "ETB 500",
      payoutAddressInfo:
        "Bank of Abyssinia (Acc: 437277727, Name: abebe balcha) 0987657453",
      requestDate: "8/21/2026",
      status: "PAID",
    },
  ]);

  // ================= 5. CAMPAIGNS CREATOR STATE =================
  const [campaignTitle, setCampaignTitle] = useState("");
  const [campaignDesc, setCampaignDesc] = useState("");
  const [campaignTarget, setCampaignTarget] = useState("5");
  const [campaignBonus, setCampaignBonus] = useState("1500");
  const [campaignDays, setCampaignDays] = useState("30");
  const [campaignsList, setCampaignsList] = useState<CampaignItem[]>([
    {
      id: "cmp_1",
      title: "Heritage Campaign: Sell 5 Kirars",
      description: "Promote our authentic handcrafted Kirars to global cultural spaces...",
      target: "5 sales",
      reward: "ETB 1,500",
      daysRemaining: "0 days",
      status: "ACTIVE",
    },
    {
      id: "cmp_2",
      title: "Begena Mastery Challenge",
      description: "Sell 3 Master Begena Harps to dedicated liturgical and acoustic patrons...",
      target: "3 sales",
      reward: "ETB 3,000",
      daysRemaining: "0 days",
      status: "ACTIVE",
    },
  ]);

  // ================= 6. BROADCAST UPDATE STATE =================
  const [announcementTitle, setAnnouncementTitle] = useState("");
  const [announcementContent, setAnnouncementContent] = useState("");
  const [broadcastType, setBroadcastType] = useState("New Product Drops");
  const [urgencyPriority, setUrgencyPriority] = useState("Normal Priority");
  const [announcementsList, setAnnouncementsList] = useState<AnnouncementItem[]>([
    {
      id: "anc_1",
      title: "2026 Masterpiece Series Available",
      content:
        "Hand-carved Wanza Wood Begena harps are now catalogued with international DHL Express fulfillment.",
      type: "New Product Drops",
      priority: "Normal Priority",
      createdDate: "10/26/2026",
    },
  ]);

  // Live timer for console header
  useEffect(() => {
    const updateTime = () => {
      setTimeStr(
        new Date().toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          second: "2-digit",
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Sync tab with URL query parameter
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get("tab") as AdminTab;
      if (tabParam) {
        if (tabParam === "commissions" || tabParam === "orders") {
          setActiveTab("commissions");
        } else if (
          [
            "dashboard",
            "products",
            "users",
            "applications",
            "withdrawals",
            "campaigns",
            "announcements",
          ].includes(tabParam)
        ) {
          setActiveTab(tabParam);
        }
      }
    }
  }, []);

  const [mobileAdminMenuOpen, setMobileAdminMenuOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileAdminMenuOpen(false);
    };
    if (mobileAdminMenuOpen) {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [mobileAdminMenuOpen]);

  const switchTab = (tab: AdminTab) => {
    setActiveTab(tab);
    setMobileAdminMenuOpen(false);
    if (typeof window !== "undefined") {
      const queryParam = tab === "commissions" || tab === "orders" ? "commissions" : tab;
      const url = `/admin?tab=${queryParam}`;
      window.history.replaceState(null, "", url);
    }
  };

  const handleRefresh = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
    }, 400);
  };

  // User role updater
  const handleUpdateUserRole = (
    userId: string,
    newRole: "user" | "affiliate" | "admin"
  ) => {
    setUsersList((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
    );
  };

  // Application actions
  const handleApproveApp = (appId: string) => {
    setApplications((prev) =>
      prev.map((a) => (a.id === appId ? { ...a, status: "approved" } : a))
    );
  };

  const handleRejectApp = (appId: string) => {
    setApplications((prev) =>
      prev.map((a) => (a.id === appId ? { ...a, status: "rejected" } : a))
    );
  };

  // Withdrawal actions
  const handleApproveWithdrawal = (wId: string) => {
    setWithdrawals((prev) =>
      prev.map((w) => (w.id === wId ? { ...w, status: "PAID" } : w))
    );
  };

  const handleRejectWithdrawal = (wId: string) => {
    setWithdrawals((prev) =>
      prev.map((w) => (w.id === wId ? { ...w, status: "REJECTED" } : w))
    );
  };

  // Order actions
  const handleApprovePayment = (orderId: string) => {
    setOrdersList((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? { ...o, paymentStatus: "PAID", fulfillmentStage: "PAYMENT VERIFIED" }
          : o
      )
    );
  };

  const handleClearOrders = () => {
    if (confirm("Are you sure you want to clear test orders?")) {
      setOrdersList((prev) => prev.slice(0, 2));
    }
  };

  // Campaign create
  const handleCreateCampaign = (e: React.FormEvent) => {
    e.preventDefault();
    if (!campaignTitle.trim()) return;
    const newCamp: CampaignItem = {
      id: `cmp_${Date.now()}`,
      title: campaignTitle.trim(),
      description: campaignDesc.trim() || "Exclusive challenges for Amiele ambassadors.",
      target: `${campaignTarget} sales`,
      reward: `ETB ${campaignBonus}`,
      daysRemaining: `${campaignDays} days`,
      status: "ACTIVE",
    };
    setCampaignsList((prev) => [newCamp, ...prev]);
    setCampaignTitle("");
    setCampaignDesc("");
  };

  const handleDeleteCampaign = (cId: string) => {
    setCampaignsList((prev) => prev.filter((c) => c.id !== cId));
  };

  // Announcement create
  const handleCreateAnnouncement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!announcementTitle.trim()) return;
    const newAnc: AnnouncementItem = {
      id: `anc_${Date.now()}`,
      title: announcementTitle.trim(),
      content: announcementContent.trim(),
      type: broadcastType,
      priority: urgencyPriority,
      createdDate: new Date().toLocaleDateString("en-US"),
    };
    setAnnouncementsList((prev) => [newAnc, ...prev]);
    setAnnouncementTitle("");
    setAnnouncementContent("");
    alert("Broadcast bullet published to dashboard!");
  };

  // Filtered orders list
  const filteredOrders = ordersList.filter((ord) => {
    const matchesFilter =
      orderFilter === "All Orders" ||
      (orderFilter === "Pending" && ord.paymentStatus === "PENDING_PAYMENT") ||
      (orderFilter === "Payment Verified" && ord.fulfillmentStage === "PAYMENT VERIFIED") ||
      ord.fulfillmentStage.toLowerCase() === orderFilter.toLowerCase();

    const matchesSearch =
      ord.orderRef.toLowerCase().includes(orderSearchQuery.toLowerCase()) ||
      ord.customerName.toLowerCase().includes(orderSearchQuery.toLowerCase()) ||
      ord.affiliateCode.toLowerCase().includes(orderSearchQuery.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  if (authLoading || (user && !profile)) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center bg-[#FAF8F5]">
        <Loader2 className="w-8 h-8 animate-spin text-[#14231b]" />
      </div>
    );
  }

  if (!user || profile?.role !== "admin") {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex flex-col items-center justify-center p-6 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-red-100 text-red-600 flex items-center justify-center shadow-xs">
          <AlertTriangle className="w-8 h-8 stroke-[2.2]" />
        </div>
        <div className="space-y-1">
          <span className="text-[11px] font-bold tracking-widest text-red-600 uppercase">
            HTTP 403 FORBIDDEN
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-[#14231b] tracking-tight">
            Administrator Access Required
          </h1>
        </div>
        <p className="text-xs sm:text-sm text-[#737874] max-w-md leading-relaxed">
          Your account is signed in as a customer. Administrator credentials are required to access and manage the Amiele Begena Admin Portal.
        </p>
        <div className="pt-2">
          <Link
            href="/account"
            className="px-6 py-2.5 rounded-full bg-[#14231b] hover:bg-[#2d4d3c] text-white text-xs font-bold transition-all min-h-[44px] inline-flex items-center justify-center shadow-sm"
          >
            Return to Customer Dashboard / ወደ መለያ ይመለሱ
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-[#FAF8F5] text-[#1C1C1C]">
      {/* ================= MOBILE ADMIN TOP BAR (< lg) ================= */}
      <div className="lg:hidden bg-[#FAF8F5] text-[#1C1C1C] border-b border-gray-200/60 sticky top-0 z-30 px-4 py-3 sm:px-6 flex items-center justify-between">
        {/* Left: Rounded Hamburger Menu Button */}
        <button
          type="button"
          onClick={() => setMobileAdminMenuOpen(!mobileAdminMenuOpen)}
          className="p-2.5 rounded-xl border border-gray-300/80 bg-neutral-100/80 hover:bg-neutral-200 text-[#1C1C1C] active:scale-95 transition-all cursor-pointer min-h-[44px] min-w-[44px] w-11 h-11 flex items-center justify-center shadow-2xs"
          aria-label="Toggle Admin Navigation"
        >
          {mobileAdminMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5 stroke-[2.2]" />}
        </button>

        {/* Right: Notification icon replaces Admin Console title */}
        <NotificationFlyout
          triggerStyle="circle"
          buttonClassName="min-w-[44px] min-h-[44px] w-11 h-11 rounded-full bg-white border border-gray-300/80 flex items-center justify-center text-[#14231b] shadow-2xs hover:bg-[#F4F1EA] transition-all cursor-pointer relative"
        />
      </div>

      {/* Mobile Drawer Backdrop (< lg) */}
      {mobileAdminMenuOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 lg:hidden"
          onClick={() => setMobileAdminMenuOpen(false)}
        />
      )}

      {/* ================= LEFT DARK FOREST GREEN SIDEBAR ================= */}
      <aside
        className={`fixed lg:sticky top-0 inset-y-0 left-0 z-50 lg:z-30 w-[min(85vw,320px)] lg:w-64 bg-[#07150D] text-white shrink-0 p-4 lg:p-5 flex flex-col justify-between select-none border-r border-white/5 h-[100dvh] lg:h-screen overflow-y-auto transition-transform duration-300 ease-in-out pb-[env(safe-area-inset-bottom,16px)] ${
          mobileAdminMenuOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="space-y-4 lg:space-y-6">
          {/* Logo Section */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Link href="/" className="block">
                <span className="font-benaiah text-2xl font-extrabold tracking-wide text-white block">
                  ዓሚኤል በገና
                </span>
              </Link>
              <button
                type="button"
                onClick={() => setMobileAdminMenuOpen(false)}
                className="lg:hidden p-2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-white/80 hover:text-white hover:bg-white/10 cursor-pointer"
                aria-label="Close menu"
              >
                <X className="w-6 h-6 stroke-[2]" />
              </button>
            </div>
            <span className="text-[10px] font-extrabold text-[#D4AF37] tracking-[0.2em] uppercase block">
              ADMIN CONSOLE
            </span>
          </div>

          {/* Sidebar Menu Items */}
          <nav className="space-y-1.5 text-[15px] font-semibold">
            {/* 1. Dashboard */}
            <button
              onClick={() => switchTab("dashboard")}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all cursor-pointer min-h-[44px] ${
                activeTab === "dashboard"
                  ? "bg-[#f5c518] text-[#14231b] font-bold shadow-md shadow-[#f5c518]/25"
                  : "text-[#94A3B8] hover:text-white hover:bg-white/5"
              }`}
            >
              <LayoutGrid className="w-5 h-5" />
              <span>Dashboard</span>
            </button>

            {/* 2. Products Catalog */}
            <button
              onClick={() => switchTab("products")}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all cursor-pointer min-h-[44px] ${
                activeTab === "products"
                  ? "bg-[#f5c518] text-[#14231b] font-bold shadow-md shadow-[#f5c518]/25"
                  : "text-[#94A3B8] hover:text-white hover:bg-white/5"
              }`}
            >
              <Package className="w-5 h-5" />
              <span>Products Catalog</span>
            </button>

            {/* 3. User Roles */}
            <button
              onClick={() => switchTab("users")}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all cursor-pointer min-h-[44px] ${
                activeTab === "users"
                  ? "bg-[#f5c518] text-[#14231b] font-bold shadow-md shadow-[#f5c518]/25"
                  : "text-[#94A3B8] hover:text-white hover:bg-white/5"
              }`}
            >
              <Users className="w-5 h-5" />
              <span>User Roles</span>
            </button>

            {/* 4. Applications Queue */}
            <button
              onClick={() => switchTab("applications")}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all cursor-pointer min-h-[44px] ${
                activeTab === "applications"
                  ? "bg-[#f5c518] text-[#14231b] font-bold shadow-md shadow-[#f5c518]/25"
                  : "text-[#94A3B8] hover:text-white hover:bg-white/5"
              }`}
            >
              <FileText className="w-5 h-5" />
              <span>Applications Queue</span>
            </button>

            {/* 5. Order Management */}
            <button
              onClick={() => switchTab("commissions")}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all cursor-pointer min-h-[44px] ${
                activeTab === "commissions" || activeTab === "orders"
                  ? "bg-[#f5c518] text-[#14231b] font-bold shadow-md shadow-[#f5c518]/25"
                  : "text-[#94A3B8] hover:text-white hover:bg-white/5"
              }`}
            >
              <ShoppingBag className="w-5 h-5" />
              <span>Order Management</span>
            </button>

            {/* 6. Payout Queue */}
            <button
              onClick={() => switchTab("withdrawals")}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all cursor-pointer min-h-[44px] ${
                activeTab === "withdrawals"
                  ? "bg-[#f5c518] text-[#14231b] font-bold shadow-md shadow-[#f5c518]/25"
                  : "text-[#94A3B8] hover:text-white hover:bg-white/5"
              }`}
            >
              <CreditCard className="w-5 h-5" />
              <span>Payout Queue</span>
            </button>

            {/* 7. Campaigns Creator */}
            <button
              onClick={() => switchTab("campaigns")}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all cursor-pointer min-h-[44px] ${
                activeTab === "campaigns"
                  ? "bg-[#f5c518] text-[#14231b] font-bold shadow-md shadow-[#f5c518]/25"
                  : "text-[#94A3B8] hover:text-white hover:bg-white/5"
              }`}
            >
              <Target className="w-5 h-5" />
              <span>Campaigns Creator</span>
            </button>

            {/* 8. Broadcast Update */}
            <button
              onClick={() => switchTab("announcements")}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all cursor-pointer min-h-[44px] ${
                activeTab === "announcements"
                  ? "bg-[#f5c518] text-[#14231b] font-bold shadow-md shadow-[#f5c518]/25"
                  : "text-[#94A3B8] hover:text-white hover:bg-white/5"
              }`}
            >
              <Megaphone className="w-5 h-5" />
              <span>Broadcast Update</span>
            </button>
          </nav>
        </div>

        {/* Bottom Profile & Exit Console - lifted above mobile browser toolbar */}
        <div className="pt-4 lg:pt-6 border-t border-white/10 space-y-2.5 pb-4 lg:pb-0">
          <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white/5 border border-white/5">
            <div className="w-9 h-9 rounded-full bg-[#f5c518] text-[#14231b] font-black flex items-center justify-center text-xs shrink-0 shadow-xs">
              AD
            </div>
            <div className="min-w-0 flex-1">
              <span className="font-bold text-xs text-white block truncate">
                Admin User
              </span>
              <span className="text-[10px] text-[#94A3B8] block truncate">
                Super Admin
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
          </div>

          <Link
            href="/account"
            className="flex items-center gap-2 text-gray-400 hover:text-white text-xs font-semibold px-2 py-2 transition-colors min-h-[44px]"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Exit Console</span>
          </Link>
        </div>
      </aside>

      {/* ================= RIGHT MAIN WORKSPACE ================= */}
      <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 space-y-6 overflow-y-auto max-h-screen w-full max-w-full">
        {/* =========================================================================
            TAB: PRODUCT MANAGEMENT CONSOLE
        ========================================================================= */}
        {activeTab === "products" && <ProductManagementModule />}

        {/* =========================================================================
            TAB 1: EXECUTIVE ANALYTICS CONSOLE (DASHBOARD)
        ========================================================================= */}
        {activeTab === "dashboard" && (
          <div className="space-y-4 sm:space-y-5 animate-in fade-in duration-200">
            {/* Top Executive Hero Card */}
            <div className="relative bg-white rounded-[28px] sm:rounded-3xl p-5 sm:p-6 border border-[#E7E3D8] shadow-sm space-y-4">
              {/* Top Gold Gradient Accent Bar */}
              <div className="absolute top-0 inset-x-8 sm:inset-x-12 h-1 bg-gradient-to-r from-[#d4af37]/40 via-[#d4af37] to-[#d4af37]/40 rounded-full" />

              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="space-y-1">
                  {/* Status Badges */}
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E6F4EA] text-[#16A34A] text-[11px] font-extrabold uppercase tracking-wider border border-[#16A34A]/20">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A]" />
                      LIVE SUPABASE
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F1F3F4] text-[#3C4043] text-[11px] font-bold uppercase tracking-wider">
                      <Calendar className="w-3.5 h-3.5 text-[#5F6368]" />
                      2026
                    </span>
                  </div>

                  {/* Title & Subtitle */}
                  <h1 className="text-2xl sm:text-[28px] font-black text-[#1C1C1C] tracking-tight leading-snug mt-1">
                    Executive Analytics Console
                  </h1>
                  <p className="text-xs sm:text-sm text-[#667085] font-medium">
                    Real-time business intelligence for Amiele Begena.
                  </p>
                </div>

                {/* Right Meta & Refresh (Desktop / Tablet view) */}
                <div className="hidden md:flex items-center gap-3 shrink-0">
                  <NotificationFlyout triggerStyle="circle" />

                  <div className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#FAF8F5] border border-[#E7E3D8] shadow-2xs">
                    <Clock className="w-4 h-4 text-[#c59a27] shrink-0" />
                    <div className="text-xs sm:text-sm text-[#14231b] font-bold">
                      <span className="text-[#667085] text-[11px] font-semibold mr-1.5">Updated:</span>
                      <span className="font-mono font-black">{timeStr}</span>
                    </div>
                  </div>

                  <button
                    onClick={handleRefresh}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#f3be3b] hover:bg-[#e5b02d] text-[#14231b] text-xs sm:text-sm font-bold shadow-xs hover:shadow transition-all cursor-pointer active:scale-95"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                    <span>Refresh Console</span>
                  </button>
                </div>
              </div>

              {/* Mobile Meta & Refresh Row (< md) */}
              <div className="flex md:hidden items-center justify-between gap-3 pt-1">
                <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-full bg-[#FAF8F5] border border-[#E7E3D8] shadow-2xs">
                  <Clock className="w-4 h-4 text-[#c59a27] shrink-0" />
                  <div className="text-xs sm:text-sm text-[#14231b] font-bold">
                    <span className="text-[#667085] text-[11px] font-semibold mr-1.5">Updated:</span>
                    <span className="font-mono font-black">{timeStr}</span>
                  </div>
                </div>

                <button
                  onClick={handleRefresh}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#f3be3b] hover:bg-[#e5b02d] text-[#14231b] text-xs sm:text-sm font-bold shadow-xs hover:shadow transition-all cursor-pointer active:scale-95 shrink-0"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                  <span>Refresh Console</span>
                </button>
              </div>

              {/* Quick Action Navigation Pills Row */}
              <div className="flex pt-3 border-t border-[#E7E3D8] flex-wrap items-center gap-2 text-xs font-bold">
                <button
                  onClick={() => switchTab("commissions")}
                  className="px-3.5 py-2 rounded-full bg-[#FAF8F5] hover:bg-[#F4F1EA] border border-[#E7E3D8] text-[#14231b] flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <CheckCheck className="w-3.5 h-3.5 text-blue-600" />
                  <span>Approve Orders</span>
                </button>

                <button
                  onClick={() => switchTab("campaigns")}
                  className="px-3.5 py-2 rounded-full bg-[#FAF8F5] hover:bg-[#F4F1EA] border border-[#E7E3D8] text-[#14231b] flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Target className="w-3.5 h-3.5 text-purple-600" />
                  <span>Campaigns</span>
                </button>

                <button
                  onClick={() => switchTab("withdrawals")}
                  className="px-3.5 py-2 rounded-full bg-[#FAF8F5] hover:bg-[#F4F1EA] border border-[#E7E3D8] text-[#14231b] flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <CreditCard className="w-3.5 h-3.5 text-amber-600" />
                  <span>Payments</span>
                </button>

                <button
                  onClick={() => switchTab("applications")}
                  className="px-3.5 py-2 rounded-full bg-[#FAF8F5] hover:bg-[#F4F1EA] border border-[#E7E3D8] text-[#14231b] flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Affiliates</span>
                </button>

                <button
                  onClick={() => switchTab("users")}
                  className="px-3.5 py-2 rounded-full bg-[#FAF8F5] hover:bg-[#F4F1EA] border border-[#E7E3D8] text-[#14231b] flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Users className="w-3.5 h-3.5 text-blue-600" />
                  <span>Customers</span>
                </button>
              </div>
            </div>

            {/* 12 Executive KPI Cards Grid (4 Columns x 3 Rows on Desktop, 2 Columns on Mobile) */}
            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
              {/* Card 1: TOTAL REVENUE */}
              <div className="bg-white rounded-[24px] sm:rounded-2xl p-3 md:p-5 border border-[#E7E3D8] shadow-xs flex flex-col justify-between max-md:min-h-[110px] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] min-[380px]:text-[11px] md:text-[11px] lg:text-xs font-extrabold uppercase tracking-wider text-[#667085]">
                    TOTAL REVENUE
                  </span>
                  <div className="w-8 h-8 md:w-9 md:h-9 lg:w-8 lg:h-8 rounded-xl bg-[#FAF3E0] border border-[#FAF3E0] text-[#c59a27] flex items-center justify-center shrink-0">
                    <Wallet className="w-4 h-4 text-[#c59a27]" />
                  </div>
                </div>
                <div>
                  <span className="text-2xl sm:text-[28px] max-md:text-[18px] max-md:min-[380px]:text-[20px] font-extrabold text-[#1C1C1C]">
                    ETB 76,500
                  </span>
                </div>
                <span className="text-xs text-[#667085] line-clamp-2">Confirmed & Paid Sales</span>
              </div>

              {/* Card 2: REVENUE THIS MONTH */}
              <div className="bg-white rounded-[24px] sm:rounded-2xl p-3 md:p-5 border border-[#E7E3D8] shadow-xs flex flex-col justify-between max-md:min-h-[110px] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] min-[380px]:text-[11px] md:text-[11px] lg:text-xs font-extrabold uppercase tracking-wider text-[#667085]">
                    REVENUE THIS MONTH
                  </span>
                  <div className="w-8 h-8 md:w-9 md:h-9 lg:w-8 lg:h-8 rounded-xl bg-[#FAF3E0] border border-[#FAF3E0] text-[#c59a27] flex items-center justify-center shrink-0">
                    <TrendingUp className="w-4 h-4 text-[#c59a27]" />
                  </div>
                </div>
                <div>
                  <span className="text-2xl sm:text-[28px] max-md:text-[22px] font-extrabold text-[#1C1C1C]">
                    ETB 0
                  </span>
                </div>
                <span className="text-xs text-[#667085] line-clamp-2">Current Calendar Month</span>
              </div>

              {/* Card 3: TOTAL ORDERS */}
              <div className="bg-white rounded-[24px] sm:rounded-2xl p-3 md:p-5 border border-[#E7E3D8] shadow-xs flex flex-col justify-between max-md:min-h-[110px] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] min-[380px]:text-[11px] md:text-[11px] font-extrabold uppercase tracking-wider text-[#667085]">
                    TOTAL ORDERS
                  </span>
                  <div className="w-8 h-8 md:w-9 md:h-9 lg:w-8 lg:h-8 rounded-xl bg-[#FAF8F5] border border-[#E7E3D8] text-[#14231b] flex items-center justify-center shrink-0">
                    <ShoppingBag className="w-4 h-4 text-[#b8860b]" />
                  </div>
                </div>
                <div>
                  <span className="text-2xl sm:text-[28px] max-md:text-[22px] font-extrabold text-[#1C1C1C]">
                    89
                  </span>
                </div>
                <span className="text-xs text-[#667085] line-clamp-2">All Orders Recorded</span>
              </div>

              {/* Card 4: PENDING ORDERS */}
              <div className="bg-white rounded-[24px] sm:rounded-2xl p-3 md:p-5 border border-[#E7E3D8] shadow-xs flex flex-col justify-between max-md:min-h-[110px] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] min-[380px]:text-[11px] md:text-[11px] font-extrabold uppercase tracking-wider text-[#667085]">
                    PENDING ORDERS
                  </span>
                  <div className="w-8 h-8 md:w-9 md:h-9 lg:w-8 lg:h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                    <Clock className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <span className="text-2xl sm:text-[28px] max-md:text-[22px] font-extrabold text-[#F59E0B]">
                    80
                  </span>
                </div>
                <span className="text-xs text-[#667085] line-clamp-2">Awaiting Admin Approval</span>
              </div>

              {/* Card 5: CONFIRMED ORDERS */}
              <div className="bg-white rounded-[24px] sm:rounded-2xl p-3 md:p-5 border border-[#E7E3D8] shadow-xs flex flex-col justify-between max-md:min-h-[110px] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] min-[380px]:text-[11px] md:text-[11px] font-extrabold uppercase tracking-wider text-[#667085]">
                    CONFIRMED ORDERS
                  </span>
                  <div className="w-8 h-8 md:w-9 md:h-9 lg:w-8 lg:h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <CheckCheck className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <span className="text-2xl sm:text-[28px] max-md:text-[22px] font-extrabold text-[#2563EB]">
                    9
                  </span>
                </div>
                <span className="text-xs text-[#667085] line-clamp-2">Payment Verified</span>
              </div>

              {/* Card 6: SHIPPED ORDERS */}
              <div className="bg-white rounded-[24px] sm:rounded-2xl p-3 md:p-5 border border-[#E7E3D8] shadow-xs flex flex-col justify-between max-md:min-h-[110px] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] min-[380px]:text-[11px] md:text-[11px] font-extrabold uppercase tracking-wider text-[#667085]">
                    SHIPPED ORDERS
                  </span>
                  <div className="w-8 h-8 md:w-9 md:h-9 lg:w-8 lg:h-8 rounded-xl bg-[#FAF8F5] border border-[#E7E3D8] text-[#14231b] flex items-center justify-center shrink-0">
                    <Truck className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <span className="text-2xl sm:text-[28px] max-md:text-[22px] font-extrabold text-[#1C1C1C]">
                    0
                  </span>
                </div>
                <span className="text-xs text-[#667085] line-clamp-2">In Dispatch / Logistics</span>
              </div>

              {/* Card 7: DELIVERED ORDERS */}
              <div className="bg-white rounded-[24px] sm:rounded-2xl p-3 md:p-5 border border-[#E7E3D8] shadow-xs flex flex-col justify-between max-md:min-h-[110px] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] min-[380px]:text-[11px] md:text-[11px] font-extrabold uppercase tracking-wider text-[#667085]">
                    DELIVERED ORDERS
                  </span>
                  <div className="w-8 h-8 md:w-9 md:h-9 lg:w-8 lg:h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                    <PackageCheck className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <span className="text-2xl sm:text-[28px] max-md:text-[22px] font-extrabold text-[#16A34A]">
                    0
                  </span>
                </div>
                <span className="text-xs text-[#667085] line-clamp-2">Completed Deliveries</span>
              </div>

              {/* Card 8: TOTAL CUSTOMERS */}
              <div className="bg-white rounded-[24px] sm:rounded-2xl p-3 md:p-5 border border-[#E7E3D8] shadow-xs flex flex-col justify-between max-md:min-h-[110px] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] min-[380px]:text-[11px] md:text-[11px] font-extrabold uppercase tracking-wider text-[#667085]">
                    TOTAL CUSTOMERS
                  </span>
                  <div className="w-8 h-8 md:w-9 md:h-9 lg:w-8 lg:h-8 rounded-xl bg-[#FAF8F5] border border-[#E7E3D8] text-[#14231b] flex items-center justify-center shrink-0">
                    <Users className="w-4 h-4 text-[#b8860b]" />
                  </div>
                </div>
                <div>
                  <span className="text-2xl sm:text-[28px] max-md:text-[22px] font-extrabold text-[#1C1C1C]">
                    33
                  </span>
                </div>
                <span className="text-xs text-[#667085] line-clamp-2">Unique Buyer Identities</span>
              </div>

              {/* Card 9: TOTAL AFFILIATES */}
              <div className="bg-white rounded-[24px] sm:rounded-2xl p-3 md:p-5 border border-[#E7E3D8] shadow-xs flex flex-col justify-between max-md:min-h-[110px] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] min-[380px]:text-[11px] md:text-[11px] font-extrabold uppercase tracking-wider text-[#667085]">
                    TOTAL AFFILIATES
                  </span>
                  <div className="w-8 h-8 md:w-9 md:h-9 lg:w-8 lg:h-8 rounded-xl bg-[#FAF8F5] border border-[#E7E3D8] text-[#14231b] flex items-center justify-center shrink-0">
                    <UserCheck className="w-4 h-4 text-[#b8860b]" />
                  </div>
                </div>
                <div>
                  <span className="text-2xl sm:text-[28px] max-md:text-[22px] font-extrabold text-[#1C1C1C]">
                    7
                  </span>
                </div>
                <span className="text-xs text-[#667085] line-clamp-2">Active Partners</span>
              </div>

              {/* Card 10: TOP AFFILIATE */}
              <div className="bg-white rounded-[24px] sm:rounded-2xl p-3 md:p-5 border border-[#E7E3D8] shadow-xs flex flex-col justify-between max-md:min-h-[110px] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-benaiah text-[10px] min-[380px]:text-[11px] md:text-[11px] font-extrabold uppercase tracking-wider text-[#667085]">
                    TOP AFFILIATE
                  </span>
                  <div className="w-8 h-8 md:w-9 md:h-9 lg:w-8 lg:h-8 rounded-xl bg-[#FAF8F5] border border-[#E7E3D8] text-[#14231b] flex items-center justify-center shrink-0">
                    <Award className="w-4 h-4 text-[#b8860b]" />
                  </div>
                </div>
                <div>
                  <span className="text-2xl sm:text-[28px] max-md:text-[22px] font-extrabold text-[#1C1C1C]">
                    jane
                  </span>
                </div>
                <span className="text-xs text-[#667085] line-clamp-2">Lifetime Top Producer</span>
              </div>

              {/* Card 11: TOP AFFILIATE SALES */}
              <div className="bg-white rounded-[24px] sm:rounded-2xl p-3 md:p-5 border border-[#E7E3D8] shadow-xs flex flex-col justify-between max-md:min-h-[110px] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] min-[380px]:text-[11px] md:text-[11px] font-extrabold uppercase tracking-wider text-[#667085]">
                    TOP AFFILIATE SALES
                  </span>
                  <div className="w-8 h-8 md:w-9 md:h-9 lg:w-8 lg:h-8 rounded-xl bg-[#FAF8F5] border border-[#E7E3D8] text-[#14231b] flex items-center justify-center shrink-0">
                    <Flame className="w-4 h-4 text-[#b8860b]" />
                  </div>
                </div>
                <div>
                  <span className="text-2xl sm:text-[28px] max-md:text-[18px] max-md:min-[380px]:text-[20px] font-extrabold text-[#1C1C1C]">
                    ETB 4,500
                  </span>
                </div>
                <span className="text-xs text-[#667085] line-clamp-2">Associated Gross Volume</span>
              </div>

              {/* Card 12: ACTIVE CAMPAIGNS */}
              <div className="bg-white rounded-[24px] sm:rounded-2xl p-3 md:p-5 border border-[#E7E3D8] shadow-xs flex flex-col justify-between max-md:min-h-[110px] space-y-2 max-md:last:odd:col-span-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] min-[380px]:text-[11px] md:text-[11px] font-extrabold uppercase tracking-wider text-[#667085]">
                    ACTIVE CAMPAIGNS
                  </span>
                  <div className="w-8 h-8 md:w-9 md:h-9 lg:w-8 lg:h-8 rounded-xl bg-[#FAF8F5] border border-[#E7E3D8] text-[#14231b] flex items-center justify-center shrink-0">
                    <Activity className="w-4 h-4 text-[#b8860b]" />
                  </div>
                </div>
                <div>
                  <span className="text-2xl sm:text-[28px] max-md:text-[22px] font-extrabold text-[#1C1C1C]">
                    5
                  </span>
                </div>
                <span className="text-[11px] text-[#667085] line-clamp-2">Live Promotional Banners</span>
              </div>
            </div>

            {/* Row 2: 4 Analytics Columns / Widgets */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              {/* Widget 1: Monthly Revenue Progression */}
              <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#E7E3D8] shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#1C1C1C] flex items-center gap-1.5">
                    <BarChart2 className="w-4 h-4 text-[#14231b]" />
                    <span>Monthly Revenue Progression</span>
                  </h3>
                  <span className="text-gray-400">•••</span>
                </div>

                <div className="pt-4 flex items-end justify-between gap-2 h-44 px-1">
                  {[
                    { month: "May 26", h: "35%" },
                    { month: "Jun 26", h: "35%" },
                    { month: "Jul 26", h: "20%" },
                    { month: "Aug 26", h: "100%", active: true },
                    { month: "Sep 26", h: "35%" },
                    { month: "Oct 26", h: "55%" },
                  ].map((bar, bIdx) => (
                    <div
                      key={bIdx}
                      className="flex-1 flex flex-col items-center gap-2 h-full justify-end"
                    >
                      <div
                        className={`w-full rounded-md transition-all ${
                          bar.active
                            ? "bg-gradient-to-t from-[#c89228] to-[#f5c518] shadow-sm"
                            : "bg-gradient-to-t from-[#3a443e] to-[#606a64]"
                        }`}
                        style={{ height: bar.h }}
                      />
                      <span className="text-[10px] text-[#667085] font-semibold whitespace-nowrap">
                        {bar.month}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Widget 2: Executive Insights */}
              <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#E7E3D8] shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#1C1C1C] flex items-center gap-1.5">
                    <Lightbulb className="w-4 h-4 text-[#D4AF37]" />
                    <span>Executive Insights</span>
                  </h3>
                  <span className="text-gray-400">•••</span>
                </div>

                <div className="space-y-3 text-xs pt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[#667085]">Top Affiliate</span>
                    <span className="font-bold text-[#16A34A]">kira boss</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#667085]">Best Product</span>
                    <span className="font-bold text-[#16A34A]">Awtar (አውታር)</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#667085]">Revenue This Month</span>
                    <span className="font-bold text-[#1C1C1C]">ETB 17,000</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#667085]">Average Order Value</span>
                    <span className="font-bold text-[#1C1C1C]">ETB 860</span>
                  </div>
                </div>
              </div>

              {/* Widget 3: Country Analytics */}
              <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#E7E3D8] shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#1C1C1C] flex items-center gap-1.5">
                    <Globe className="w-4 h-4 text-[#14231b]" />
                    <span>Country Analytics</span>
                  </h3>
                  <span className="text-gray-400">•••</span>
                </div>

                <div className="space-y-2.5 text-xs pt-1">
                  <div>
                    <div className="flex items-center justify-between text-[11px] mb-1">
                      <span className="font-semibold text-[#1C1C1C]">ET Ethiopia</span>
                      <span className="font-bold text-[#1C1C1C]">82 (92%)</span>
                    </div>
                    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#16A34A] rounded-full"
                        style={{ width: "92%" }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-[11px] mb-1">
                      <span className="font-semibold text-[#1C1C1C]">USA</span>
                      <span className="font-bold text-[#1C1C1C]">2 (2%)</span>
                    </div>
                    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full"
                        style={{ width: "2%" }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-[11px] mb-1">
                      <span className="font-semibold text-[#1C1C1C]">Germany</span>
                      <span className="font-bold text-[#1C1C1C]">1 (1%)</span>
                    </div>
                    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full"
                        style={{ width: "1%" }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-[11px] mb-1">
                      <span className="font-semibold text-[#1C1C1C]">Ya</span>
                      <span className="font-bold text-[#1C1C1C]">1 (1%)</span>
                    </div>
                    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full"
                        style={{ width: "1%" }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Widget 4: Affiliate Leaderboard */}
              <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#E7E3D8] shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#1C1C1C] flex items-center gap-1.5">
                    <Trophy className="w-4 h-4 text-[#D4AF37]" />
                    <span>Affiliate Leaderboard</span>
                  </h3>
                  <span className="text-gray-400">•••</span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-[#f5c518] text-[#14231b] font-bold text-[10px] flex items-center justify-center">
                        KB
                      </span>
                      <div>
                        <span className="font-bold text-[#1C1C1C] block text-[11px]">
                          kira boss
                        </span>
                        <span className="text-[9px] text-[#667085]">kiraboss-6819</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-[#1C1C1C] block text-[11px]">
                        6 Sales
                      </span>
                      <span className="text-[10px] text-[#16A34A]">ETB 4,080</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-gray-200 text-[#14231b] font-bold text-[10px] flex items-center justify-center">
                        B
                      </span>
                      <div>
                        <span className="font-bold text-[#1C1C1C] block text-[11px]">
                          biruk
                        </span>
                        <span className="text-[9px] text-[#667085]">biruk-9543</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-[#1C1C1C] block text-[11px]">
                        2 Sales
                      </span>
                      <span className="text-[10px] text-[#16A34A]">ETB 1,360</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-amber-100 text-[#14231b] font-bold text-[10px] flex items-center justify-center">
                        AT
                      </span>
                      <div>
                        <span className="font-bold text-[#1C1C1C] block text-[11px]">
                          Affiliate Test
                        </span>
                        <span className="text-[9px] text-[#667085]">testaffprod</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-[#1C1C1C] block text-[11px]">
                        2 Sales
                      </span>
                      <span className="text-[10px] text-gray-500">ETB 0</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-[#14231b] text-white font-bold text-[10px] flex items-center justify-center">
                        GG
                      </span>
                      <div>
                        <span className="font-bold text-[#1C1C1C] block text-[11px]">
                          giddy gift
                        </span>
                        <span className="text-[9px] text-[#667085]">
                          giddymosfi-3659
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-[#1C1C1C] block text-[11px]">
                        1 Sale
                      </span>
                      <span className="text-[10px] text-[#16A34A]">ETB 680</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-[#07150D] text-white font-bold text-[10px] flex items-center justify-center">
                        A
                      </span>
                      <div>
                        <span className="font-bold text-[#1C1C1C] block text-[11px]">
                          amiel
                        </span>
                        <span className="text-[9px] text-[#667085]">amiel-5058</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-[#1C1C1C] block text-[11px]">
                        0 Sales
                      </span>
                      <span className="text-[10px] text-gray-400">ETB 0</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Row 3: 3 Columns (Best Selling Products, Order Workflow, Recent Activity) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Card 1: Best Selling Products */}
              <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#E7E3D8] shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#1C1C1C] flex items-center gap-1.5">
                    <Package className="w-4 h-4 text-[#16A34A]" />
                    <span>Best Selling Products</span>
                  </h3>
                  <span className="text-gray-400">•••</span>
                </div>

                <div className="overflow-x-auto text-xs">
                  <table className="w-full text-left min-w-[500px]">
                    <thead className="text-[10px] font-bold uppercase text-[#667085] border-b border-gray-100">
                      <tr>
                        <th className="pb-2">Product</th>
                        <th className="pb-2">Units</th>
                        <th className="pb-2">Revenue</th>
                        <th className="pb-2 text-right">Trend</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      <tr>
                        <td className="py-2.5">
                          <span className="font-bold text-[#1C1C1C] block">
                            Awtar (አውታር)
                          </span>
                          <span className="text-[10px] text-[#667085]">
                            Traditional Instrument
                          </span>
                        </td>
                        <td className="py-2.5 font-bold">80</td>
                        <td className="py-2.5 font-bold">ETB 0</td>
                        <td className="py-2.5 text-right text-emerald-600 font-bold">
                          ↗
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2.5">
                          <span className="font-bold text-[#1C1C1C] block">
                            በገና (Begena)
                          </span>
                          <span className="text-[10px] text-[#667085]">
                            Traditional Instrument
                          </span>
                        </td>
                        <td className="py-2.5 font-bold">7</td>
                        <td className="py-2.5 font-bold">ETB 59,500</td>
                        <td className="py-2.5 text-right text-emerald-600 font-bold">
                          ↗
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2.5">
                          <span className="font-bold text-[#1C1C1C] block">
                            ክራር (Kirar)
                          </span>
                          <span className="text-[10px] text-[#667085]">
                            Traditional Instrument
                          </span>
                        </td>
                        <td className="py-2.5 font-bold">2</td>
                        <td className="py-2.5 font-bold">ETB 17,000</td>
                        <td className="py-2.5 text-right text-emerald-600 font-bold">
                          ↗
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Card 2: Order Workflow */}
              <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#E7E3D8] shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#1C1C1C] flex items-center gap-1.5">
                    <GitMerge className="w-4 h-4 text-[#2563EB]" />
                    <span>Order Workflow</span>
                  </h3>
                  <span className="text-gray-400">•••</span>
                </div>

                <div className="grid grid-cols-4 gap-2 pt-2 text-center text-xs">
                  <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200/60 space-y-1">
                    <Clock className="w-4 h-4 text-amber-600 mx-auto" />
                    <span className="text-lg font-extrabold text-[#1C1C1C] block">
                      80
                    </span>
                    <span className="text-[10px] font-bold text-amber-700 block">
                      PENDING
                    </span>
                    <span className="text-[9px] text-[#667085] block">Awaiting</span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-blue-50/70 border border-blue-200/60 space-y-1">
                    <CheckCheck className="w-4 h-4 text-blue-600 mx-auto" />
                    <span className="text-lg font-extrabold text-[#1C1C1C] block">9</span>
                    <span className="text-[10px] font-bold text-blue-700 block">
                      CONFIRMED
                    </span>
                    <span className="text-[9px] text-[#667085] block">Verified</span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-[#FAF8F5] border border-gray-200/60 space-y-1">
                    <Truck className="w-4 h-4 text-gray-600 mx-auto" />
                    <span className="text-lg font-extrabold text-[#1C1C1C] block">0</span>
                    <span className="text-[10px] font-bold text-gray-700 block">
                      SHIPPED
                    </span>
                    <span className="text-[9px] text-[#667085] block">In Transit</span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-200/60 space-y-1">
                    <PackageCheck className="w-4 h-4 text-emerald-600 mx-auto" />
                    <span className="text-lg font-extrabold text-[#1C1C1C] block">0</span>
                    <span className="text-[10px] font-bold text-emerald-700 block">
                      DELIVERED
                    </span>
                    <span className="text-[9px] text-[#667085] block">Done</span>
                  </div>
                </div>
              </div>

              {/* Card 3: Recent Activity */}
              <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#E7E3D8] shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#1C1C1C] flex items-center gap-1.5">
                    <Activity className="w-4 h-4 text-[#D4AF37]" />
                    <span>Recent Activity</span>
                  </h3>
                  <span className="text-gray-400">•••</span>
                </div>

                <div className="space-y-2.5 max-h-48 overflow-y-auto text-xs pr-1">
                  <div className="flex items-start gap-2.5 p-2 rounded-xl bg-[#FAF8F5]">
                    <div className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 mt-0.5 font-bold">
                      ⚡
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="font-bold text-[#1C1C1C] block text-[11px]">
                        New Order (AM-2026-001171)
                      </span>
                      <p className="text-[10px] text-[#667085] truncate">
                        Muisa placed order for ክራር (Kirar)
                      </p>
                    </div>
                    <span className="text-[9px] text-gray-400 shrink-0">3:25 PM</span>
                  </div>

                  <div className="flex items-start gap-2.5 p-2 rounded-xl bg-white border border-gray-100">
                    <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 mt-0.5">
                      🔗
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="font-bold text-[#1C1C1C] block text-[11px]">
                        Referral Link Clicked
                      </span>
                      <p className="text-[10px] text-[#667085] truncate">
                        Code: giddymesfi-3659
                      </p>
                    </div>
                    <span className="text-[9px] text-gray-400 shrink-0">3:24 PM</span>
                  </div>

                  <div className="flex items-start gap-2.5 p-2 rounded-xl bg-[#FAF8F5]">
                    <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5 font-bold">
                      ✓
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="font-bold text-[#1C1C1C] block text-[11px]">
                        New Order (AM-2026-001170)
                      </span>
                      <p className="text-[10px] text-[#667085] truncate">
                        Kira placed order for በገና (Begena)
                      </p>
                    </div>
                    <span className="text-[9px] text-gray-400 shrink-0">3:16 PM</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Row 4: Performance Summary */}
            <div className="bg-white rounded-2xl p-4 md:p-5 border border-[#E7E3D8] shadow-xs space-y-2.5 md:space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#1C1C1C]">
                Performance Summary
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-0 sm:gap-4 divide-y sm:divide-y-0 sm:divide-x divide-gray-100 pt-1">
                <div className="flex items-center justify-between pb-1.5 sm:pb-0 sm:pr-4">
                  <div>
                    <span className="text-[11px] md:text-[10px] font-bold text-[#667085] uppercase block max-md:leading-tight">
                      REVENUE GROWTH
                    </span>
                    <span className="text-xl sm:text-2xl max-md:text-[20px] font-extrabold text-[#1C1C1C] max-md:leading-tight">
                      +100%
                    </span>
                    <span className="text-xs md:text-[10px] md:leading-[15px] text-[#667085] block max-md:leading-tight">vs last month</span>
                  </div>
                  <svg width="60" height="24" viewBox="0 0 60 24" fill="none" className="max-md:w-16 max-md:h-7 shrink-0">
                    <path
                      d="M2 20L15 15L30 18L45 8L58 4"
                      stroke="#16A34A"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>

                <div className="flex items-center justify-between py-1.5 sm:py-0 sm:px-4">
                  <div>
                    <span className="text-[11px] md:text-[10px] font-bold text-[#667085] uppercase block max-md:leading-tight">
                      AFFILIATE CONVERSION
                    </span>
                    <span className="text-xl sm:text-2xl max-md:text-[20px] font-extrabold text-[#1C1C1C] max-md:leading-tight">
                      129%
                    </span>
                    <span className="text-xs md:text-[10px] md:leading-[15px] text-[#667085] block max-md:leading-tight">
                      Click to Sale Rate
                    </span>
                  </div>
                  <svg width="60" height="24" viewBox="0 0 60 24" fill="none" className="max-md:w-16 max-md:h-7 shrink-0">
                    <path
                      d="M2 18L15 20L30 14L45 16L58 5"
                      stroke="#16A34A"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>

                <div className="flex items-center justify-between py-1.5 sm:py-0 sm:px-4">
                  <div>
                    <span className="text-[11px] md:text-[10px] font-bold text-[#667085] uppercase block max-md:leading-tight">
                      ORDER CONVERSION
                    </span>
                    <span className="text-xl sm:text-2xl max-md:text-[20px] font-extrabold text-[#1C1C1C] max-md:leading-tight">
                      10%
                    </span>
                    <span className="text-xs md:text-[10px] md:leading-[15px] text-[#667085] block max-md:leading-tight">
                      Visit to Order Rate
                    </span>
                  </div>
                  <svg width="60" height="24" viewBox="0 0 60 24" fill="none" className="max-md:w-16 max-md:h-7 shrink-0">
                    <path
                      d="M2 20L15 12L30 16L45 9L58 4"
                      stroke="#16A34A"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>

                <div className="flex items-center justify-between pt-1.5 sm:pt-0 sm:pl-4">
                  <div>
                    <span className="text-[11px] md:text-[10px] font-bold text-[#667085] uppercase block max-md:leading-tight">
                      CUSTOMER RETENTION
                    </span>
                    <span className="text-xl sm:text-2xl max-md:text-[20px] font-extrabold text-[#1C1C1C] max-md:leading-tight">
                      6%
                    </span>
                    <span className="text-xs md:text-[10px] md:leading-[15px] text-[#667085] block max-md:leading-tight">
                      Returning Customers
                    </span>
                  </div>
                  <svg width="60" height="24" viewBox="0 0 60 24" fill="none" className="max-md:w-16 max-md:h-7 shrink-0">
                    <path
                      d="M2 18L15 14L30 18L45 10L58 6"
                      stroke="#16A34A"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 2: MANAGE USER ROLES
        ========================================================================= */}
        {activeTab === "users" && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <h1 className="text-2xl sm:text-[26px] font-extrabold text-[#1C1C1C] tracking-tight">
              Manage User Roles
            </h1>

            <div className="bg-white rounded-2xl border border-[#E7E3D8] shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs min-w-[650px]">
                  <thead className="bg-[#FAF8F5] text-[#14231b] uppercase text-[10px] font-bold tracking-wider border-b border-[#E7E3D8]">
                    <tr>
                      <th className="p-4 font-extrabold text-[#667085]">USER ID</th>
                      <th className="p-4 font-extrabold text-[#667085]">FULL NAME</th>
                      <th className="p-4 font-extrabold text-[#667085]">EMAIL ADDRESS</th>
                      <th className="p-4 font-extrabold text-[#667085]">CURRENT ROLE</th>
                      <th className="p-4 font-extrabold text-[#667085]">JOINED DATE</th>
                      <th className="p-4 font-extrabold text-[#667085]">UPDATE ROLE</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E7E3D8]/60">
                    {usersList.map((usr) => (
                      <tr
                        key={usr.id}
                        className="hover:bg-[#FAF8F5]/60 transition-colors"
                      >
                        <td className="p-4 font-mono font-bold text-[#1C1C1C]">
                          {usr.id}
                        </td>
                        <td className="p-4 font-bold text-[#1C1C1C]">{usr.fullName}</td>
                        <td className="p-4 text-[#1C1C1C]">{usr.email}</td>
                        <td className="p-4">
                          <span
                            className={`px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wide inline-block ${
                              usr.role === "admin"
                                ? "bg-[#0F2418] text-[#f5c518] border border-[#f5c518]/30"
                                : usr.role === "affiliate"
                                ? "bg-[#E6F4EA] text-[#16A34A] border border-[#16A34A]/20"
                                : "bg-[#FEF3C7] text-[#D97706] border border-[#D97706]/20"
                            }`}
                          >
                            {usr.role.toUpperCase()}
                          </span>
                        </td>
                        <td className="p-4 font-medium text-[#1C1C1C]">
                          {usr.joinedDate}
                        </td>
                        <td className="p-4">
                          <div className="relative inline-block w-32">
                            <select
                              value={
                                usr.role.charAt(0).toUpperCase() + usr.role.slice(1)
                              }
                              onChange={(e) =>
                                handleUpdateUserRole(
                                  usr.id,
                                  e.target.value.toLowerCase() as any
                                )
                              }
                              className="w-full appearance-none px-3 py-1.5 rounded-xl border border-gray-300 hover:border-[#f5c518] focus:border-[#f5c518] focus:ring-1 focus:ring-[#f5c518] bg-white text-xs font-semibold text-[#1C1C1C] cursor-pointer outline-none transition-all shadow-xs"
                            >
                              <option value="User">User</option>
                              <option value="Affiliate">Affiliate</option>
                              <option value="Admin">Admin</option>
                            </select>
                            <ChevronDown className="w-3.5 h-3.5 text-gray-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 3: AFFILIATE APPLICATIONS QUEUE
        ========================================================================= */}
        {activeTab === "applications" && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <h1 className="text-2xl sm:text-[26px] font-extrabold text-[#1C1C1C] tracking-tight">
              Affiliate Applications Queue
            </h1>

            <div className="bg-white rounded-2xl border border-[#E7E3D8] shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs min-w-[650px]">
                  <thead className="bg-[#FAF8F5] text-[#14231b] uppercase text-[10px] font-bold tracking-wider border-b border-[#E7E3D8]">
                    <tr>
                      <th className="p-4 font-extrabold text-[#667085]">APP ID</th>
                      <th className="p-4 font-extrabold text-[#667085]">
                        APPLICANT NAME
                      </th>
                      <th className="p-4 font-extrabold text-[#667085]">CONTACT INFO</th>
                      <th className="p-4 font-extrabold text-[#667085]">SOCIAL LINKS</th>
                      <th className="p-4 font-extrabold text-[#667085]">WHY JOIN?</th>
                      <th className="p-4 font-extrabold text-[#667085]">
                        SUBMITTED DATE
                      </th>
                      <th className="p-4 font-extrabold text-[#667085]">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E7E3D8]/60">
                    {applications.map((app) => (
                      <tr
                        key={app.id}
                        className="hover:bg-[#FAF8F5]/60 transition-colors"
                      >
                        <td className="p-4 font-mono font-bold text-[#1C1C1C]">
                          {app.id}
                        </td>
                        <td className="p-4 font-bold text-[#1C1C1C]">
                          {app.applicantName}
                        </td>
                        <td className="p-4">
                          <span className="font-medium text-[#1C1C1C] block">
                            {app.contactInfo}
                          </span>
                          <span className="text-[10px] font-bold text-[#667085] block">
                            {app.country}
                          </span>
                        </td>
                        <td className="p-4">
                          {app.socialLinks ? (
                            <a
                              href={app.socialLinks}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline flex items-center gap-1"
                            >
                              <span>Profile</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="p-4 text-[#1C1C1C]">{app.whyJoin}</td>
                        <td className="p-4 font-medium text-[#1C1C1C]">
                          {app.submittedDate}
                        </td>
                        <td className="p-4">
                          {app.status === "pending" ? (
                            <div className="flex flex-col gap-1.5 w-24">
                              <button
                                onClick={() => setPendingApprovalApp(app)}
                                className="w-full px-3 py-1.5 rounded-lg bg-[#07150D] hover:bg-[#14231b] text-[#74d99f] font-bold text-xs uppercase shadow-xs transition-colors cursor-pointer"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleRejectApp(app.id)}
                                className="w-full px-3 py-1.5 rounded-lg bg-[#07150D] hover:bg-[#14231b] text-[#f5c518] font-bold text-xs uppercase shadow-xs transition-colors cursor-pointer"
                              >
                                Reject
                              </button>
                            </div>
                          ) : (
                            <span
                              className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                                app.status === "approved"
                                  ? "bg-emerald-50 text-emerald-800"
                                  : "bg-red-50 text-red-800"
                              }`}
                            >
                              {app.status}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Approve Affiliate Application Confirmation Modal matching screenshot */}
            {pendingApprovalApp && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border-2 border-[#d4af37] overflow-hidden">
                  {/* Content Body */}
                  <div className="p-6 sm:p-8 space-y-3">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="w-6 h-6 text-[#eab308] shrink-0 fill-[#eab308]/20" />
                      <h3 className="text-xl sm:text-2xl font-black text-[#14231b]">
                        Approve Affiliate Application
                      </h3>
                    </div>
                    <p className="text-sm sm:text-base text-[#4b5563] font-medium leading-relaxed pt-1">
                      Are you sure you want to approve the application for{" "}
                      <span className="font-bold text-[#14231b]">{pendingApprovalApp.applicantName}</span>?
                    </p>
                  </div>

                  {/* Footer Actions */}
                  <div className="bg-[#FBF9F5] p-4 sm:p-5 flex items-center justify-end gap-3 border-t border-black/5">
                    <button
                      onClick={() => setPendingApprovalApp(null)}
                      className="px-5 py-2.5 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-800 text-sm font-bold transition-all cursor-pointer shadow-xs"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        handleApproveApp(pendingApprovalApp.id);
                        setPendingApprovalApp(null);
                      }}
                      className="px-6 py-2.5 rounded-xl bg-[#c59b27] hover:bg-[#b58c1e] text-white text-sm font-bold transition-all cursor-pointer shadow-sm active:scale-95"
                    >
                      Confirm
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            TAB 4: PRODUCTION ORDER FULFILLMENT SYSTEM (ORDER MANAGEMENT)
        ========================================================================= */}
        {(activeTab === "commissions" || activeTab === "orders") && (
          <div className="space-y-5 animate-in fade-in duration-200">
            {/* Header with Clear Orders button */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h1 className="text-2xl sm:text-[26px] font-extrabold text-[#1C1C1C] tracking-tight">
                  Production Order Fulfillment System
                </h1>
                <p className="text-xs text-[#667085] font-medium">
                  Live tracking from payment confirmation to final worldwide delivery
                </p>
              </div>

              <button
                onClick={handleClearOrders}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#07150D] text-[#f5c518] hover:bg-[#14231b] border border-white/10 text-xs font-bold shadow-xs transition-all cursor-pointer self-start sm:self-auto"
              >
                <Trash2 className="w-3.5 h-3.5 text-[#f5c518]" />
                <span>Clear Orders</span>
              </button>
            </div>

            {/* 7 Metric Stat Cards Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
              {/* Stat 1: PREPARING */}
              <div className="bg-white rounded-2xl p-4 border border-[#E7E3D8] shadow-xs flex flex-col justify-between space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#667085]">
                    PREPARING
                  </span>
                  <div className="w-6 h-6 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center">
                    <Scissors className="w-3 h-3" />
                  </div>
                </div>
                <div>
                  <span className="text-2xl font-extrabold text-[#1C1C1C]">0</span>
                </div>
                <span className="text-[10px] text-[#667085]">Materials Sourced</span>
              </div>

              {/* Stat 2: CRAFTING */}
              <div className="bg-white rounded-2xl p-4 border border-[#E7E3D8] shadow-xs flex flex-col justify-between space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#667085]">
                    CRAFTING
                  </span>
                  <div className="w-6 h-6 rounded-full bg-orange-50 text-orange-600 flex items-center justify-center">
                    <Hammer className="w-3 h-3" />
                  </div>
                </div>
                <div>
                  <span className="text-2xl font-extrabold text-[#1C1C1C]">0</span>
                </div>
                <span className="text-[10px] text-[#667085]">Handcrafted by Artisan</span>
              </div>

              {/* Stat 3: PACKED */}
              <div className="bg-white rounded-2xl p-4 border border-[#E7E3D8] shadow-xs flex flex-col justify-between space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#667085]">
                    PACKED
                  </span>
                  <div className="w-6 h-6 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
                    <Package className="w-3 h-3" />
                  </div>
                </div>
                <div>
                  <span className="text-2xl font-extrabold text-[#1C1C1C]">0</span>
                </div>
                <span className="text-[10px] text-[#667085]">Ready for Shipment</span>
              </div>

              {/* Stat 4: SHIPPED */}
              <div className="bg-white rounded-2xl p-4 border border-[#E7E3D8] shadow-xs flex flex-col justify-between space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#667085]">
                    SHIPPED
                  </span>
                  <div className="w-6 h-6 rounded-full bg-green-50 text-green-600 flex items-center justify-center">
                    <Truck className="w-3 h-3" />
                  </div>
                </div>
                <div>
                  <span className="text-2xl font-extrabold text-[#1C1C1C]">0</span>
                </div>
                <span className="text-[10px] text-[#667085]">In Dispatch</span>
              </div>

              {/* Stat 5: DELIVERED */}
              <div className="bg-white rounded-2xl p-4 border border-[#E7E3D8] shadow-xs flex flex-col justify-between space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#667085]">
                    DELIVERED
                  </span>
                  <div className="w-6 h-6 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <PackageCheck className="w-3 h-3" />
                  </div>
                </div>
                <div>
                  <span className="text-2xl font-extrabold text-[#1C1C1C]">0</span>
                </div>
                <span className="text-[10px] text-[#667085]">Completed</span>
              </div>

              {/* Stat 6: AVG FULFILLMENT */}
              <div className="bg-white rounded-2xl p-4 border border-[#E7E3D8] shadow-xs flex flex-col justify-between space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#667085]">
                    AVG FULFILLMENT
                  </span>
                  <div className="w-6 h-6 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Clock className="w-3 h-3" />
                  </div>
                </div>
                <div>
                  <span className="text-2xl font-extrabold text-[#1C1C1C]">--</span>
                </div>
                <span className="text-[10px] text-[#667085]">Order → Packed</span>
              </div>

              {/* Stat 7: AVG SHIPPING */}
              <div className="bg-white rounded-2xl p-4 border border-[#E7E3D8] shadow-xs flex flex-col justify-between space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#667085]">
                    AVG SHIPPING
                  </span>
                  <div className="w-6 h-6 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center">
                    <Plane className="w-3 h-3" />
                  </div>
                </div>
                <div>
                  <span className="text-2xl font-extrabold text-[#1C1C1C]">--</span>
                </div>
                <span className="text-[10px] text-[#667085]">Shipped → Delivered</span>
              </div>
            </div>

            {/* Filter Pills Row */}
            <div className="flex flex-wrap items-center gap-2 text-xs font-bold pt-1">
              {[
                "All Orders",
                "Pending",
                "Payment Verified",
                "Preparing",
                "Crafting",
                "Packed",
                "Shipped",
                "Delivered",
                "Cancelled",
              ].map((pill) => (
                <button
                  key={pill}
                  onClick={() => setOrderFilter(pill)}
                  className={`px-3.5 py-1.5 rounded-full transition-all cursor-pointer ${
                    orderFilter === pill
                      ? "bg-[#0F2418] text-white shadow-xs"
                      : "bg-[#FAF8F5] text-[#14231b] hover:bg-[#F4F1EA] border border-[#E7E3D8]"
                  }`}
                >
                  {pill}
                </button>
              ))}
            </div>

            {/* Search Input Bar */}
            <div className="relative max-w-sm">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={orderSearchQuery}
                onChange={(e) => setOrderSearchQuery(e.target.value)}
                placeholder="Search order #, customer..."
                className="w-full pl-10 pr-4 py-2 bg-white rounded-full border border-[#E7E3D8] text-xs text-[#1C1C1C] placeholder:text-gray-400 outline-none focus:border-[#f5c518] shadow-xs"
              />
            </div>

            {/* Orders Table Card */}
            <div className="bg-white rounded-2xl border border-[#E7E3D8] shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs min-w-[650px]">
                  <thead className="bg-[#FAF8F5] text-[#14231b] uppercase text-[10px] font-bold tracking-wider border-b border-[#E7E3D8]">
                    <tr>
                      <th className="p-4 font-extrabold text-[#667085]">ORDER REF</th>
                      <th className="p-4 font-extrabold text-[#667085]">CUSTOMER INFO</th>
                      <th className="p-4 font-extrabold text-[#667085]">PRODUCT & QTY</th>
                      <th className="p-4 font-extrabold text-[#667085]">COUNTRY</th>
                      <th className="p-4 font-extrabold text-[#667085]">
                        AFFILIATE / CODE
                      </th>
                      <th className="p-4 font-extrabold text-[#667085]">PAYMENT</th>
                      <th className="p-4 font-extrabold text-[#667085]">
                        FULFILLMENT STAGE
                      </th>
                      <th className="p-4 font-extrabold text-[#667085]">AMOUNT</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E7E3D8]/60">
                    {filteredOrders.map((ord) => (
                      <tr
                        key={ord.orderRef}
                        className="hover:bg-[#FAF8F5]/60 transition-colors"
                      >
                        <td className="p-4 font-mono font-bold text-[#1C1C1C] whitespace-nowrap">
                          {ord.orderRef}
                        </td>
                        <td className="p-4">
                          <span className="font-bold text-[#1C1C1C] block">
                            {ord.customerName}
                          </span>
                          <span className="text-[10px] text-[#667085] block">
                            {ord.customerContact}
                          </span>
                        </td>
                        <td className="p-4 font-medium text-[#1C1C1C] whitespace-nowrap">
                          {ord.productQty}
                        </td>
                        <td className="p-4 font-medium text-[#1C1C1C]">{ord.country}</td>
                        <td className="p-4">
                          <span className="font-bold text-[#1C1C1C] block">
                            {ord.affiliateCode}
                          </span>
                          <span className="text-[10px] text-[#667085] block">
                            {ord.affiliateSub}
                          </span>
                        </td>
                        <td className="p-4">
                          <span
                            className={`font-extrabold text-[11px] ${
                              ord.paymentStatus === "PAID"
                                ? "text-[#1C1C1C]"
                                : "text-[#D97706]"
                            }`}
                          >
                            {ord.paymentStatus}
                          </span>
                        </td>
                        <td className="p-4">
                          {ord.fulfillmentStage === "PAYMENT VERIFIED" ? (
                            <span className="px-3 py-1 rounded-full bg-[#EBF5FF] text-[#2563EB] font-extrabold text-[10px] tracking-wide uppercase inline-block border border-[#2563EB]/20">
                              PAYMENT VERIFIED
                            </span>
                          ) : (
                            <button
                              onClick={() => handleApprovePayment(ord.id)}
                              className="px-3 py-1 rounded-full bg-[#FEF3C7] text-[#D97706] font-extrabold text-[10px] tracking-wide uppercase inline-block border border-[#D97706]/20 hover:bg-[#FDE68A] cursor-pointer"
                            >
                              PENDING (VERIFY)
                            </button>
                          )}
                        </td>
                        <td className="p-4 font-extrabold text-[#1C1C1C] whitespace-nowrap">
                          {ord.amount}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 5: PAYOUT REQUESTS QUEUE
        ========================================================================= */}
        {activeTab === "withdrawals" && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <h1 className="text-2xl sm:text-[26px] font-extrabold text-[#1C1C1C] tracking-tight">
              Payout Requests Queue
            </h1>

            <div className="bg-white rounded-2xl border border-[#E7E3D8] shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs min-w-[650px]">
                  <thead className="bg-[#FAF8F5] text-[#14231b] uppercase text-[10px] font-bold tracking-wider border-b border-[#E7E3D8]">
                    <tr>
                      <th className="p-4 font-extrabold text-[#667085]">REQUEST ID</th>
                      <th className="p-4 font-extrabold text-[#667085]">AFFILIATE ID</th>
                      <th className="p-4 font-extrabold text-[#667085]">AMOUNT</th>
                      <th className="p-4 font-extrabold text-[#667085]">
                        PAYOUT ADDRESS INFO
                      </th>
                      <th className="p-4 font-extrabold text-[#667085]">REQUEST DATE</th>
                      <th className="p-4 font-extrabold text-[#667085]">STATUS</th>
                      <th className="p-4 font-extrabold text-[#667085]">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E7E3D8]/60">
                    {withdrawals.map((wth) => (
                      <tr
                        key={wth.id}
                        className="hover:bg-[#FAF8F5]/60 transition-colors"
                      >
                        <td className="p-4 font-mono font-bold text-[#1C1C1C]">
                          {wth.id}
                        </td>
                        <td className="p-4 font-bold text-[#1C1C1C]">
                          {wth.affiliateId}
                        </td>
                        <td className="p-4 font-extrabold text-[#1C1C1C] whitespace-nowrap">
                          {wth.amount}
                        </td>
                        <td className="p-4 text-[#1C1C1C] max-w-sm">
                          {wth.payoutAddressInfo}
                        </td>
                        <td className="p-4 font-medium text-[#1C1C1C]">
                          {wth.requestDate}
                        </td>
                        <td className="p-4">
                          <span
                            className={`px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wide inline-block ${
                              wth.status === "PAID"
                                ? "bg-[#EFF6FF] text-[#2563EB] border border-[#2563EB]/20"
                                : wth.status === "PENDING"
                                ? "bg-[#FEF3C7] text-[#D97706] border border-[#D97706]/20"
                                : "bg-red-50 text-red-700 border border-red-200"
                            }`}
                          >
                            {wth.status}
                          </span>
                        </td>
                        <td className="p-4">
                          {wth.status === "PENDING" ? (
                            <div className="flex flex-col gap-1.5 w-24">
                              <button
                                onClick={() => handleApproveWithdrawal(wth.id)}
                                className="w-full px-3 py-1.5 rounded-lg bg-[#07150D] hover:bg-[#14231b] text-[#74d99f] font-bold text-xs uppercase shadow-xs transition-colors cursor-pointer"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleRejectWithdrawal(wth.id)}
                                className="w-full px-3 py-1.5 rounded-lg bg-[#07150D] hover:bg-[#14231b] text-[#f5c518] font-bold text-xs uppercase shadow-xs transition-colors cursor-pointer"
                              >
                                Reject
                              </button>
                            </div>
                          ) : (
                            <span className="text-gray-400 font-bold">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 6: MANAGE CHALLENGE CAMPAIGNS
        ========================================================================= */}
        {activeTab === "campaigns" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <h1 className="text-2xl sm:text-[26px] font-extrabold text-[#1C1C1C] tracking-tight">
              Manage Challenge Campaigns
            </h1>

            {/* Form Card 1: Create New Campaign Challenge */}
            <div className="bg-white rounded-2xl p-6 border border-[#E7E3D8] shadow-sm space-y-5">
              <h2 className="text-base font-extrabold text-[#1C1C1C]">
                Create New Campaign Challenge
              </h2>

              <form onSubmit={handleCreateCampaign} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-extrabold uppercase text-[#1C1C1C] tracking-wider block">
                    CAMPAIGN TITLE *
                  </label>
                  <input
                    type="text"
                    required
                    value={campaignTitle}
                    onChange={(e) => setCampaignTitle(e.target.value)}
                    placeholder="e.g. Sell 5 Kirars"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:border-[#f5c518] focus:ring-1 focus:ring-[#f5c518] bg-white text-xs text-[#1C1C1C] outline-none transition-all shadow-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-extrabold uppercase text-[#1C1C1C] tracking-wider block">
                    CAMPAIGN DESCRIPTION *
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={campaignDesc}
                    onChange={(e) => setCampaignDesc(e.target.value)}
                    placeholder="Explain target details clearly..."
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:border-[#f5c518] focus:ring-1 focus:ring-[#f5c518] bg-white text-xs text-[#1C1C1C] outline-none transition-all shadow-xs"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-extrabold uppercase text-[#1C1C1C] tracking-wider block">
                      TARGET SALES *
                    </label>
                    <input
                      type="number"
                      required
                      value={campaignTarget}
                      onChange={(e) => setCampaignTarget(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:border-[#f5c518] focus:ring-1 focus:ring-[#f5c518] bg-white text-xs text-[#1C1C1C] outline-none transition-all shadow-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-extrabold uppercase text-[#1C1C1C] tracking-wider block">
                      BONUS REWARD (ETB) *
                    </label>
                    <input
                      type="number"
                      required
                      value={campaignBonus}
                      onChange={(e) => setCampaignBonus(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:border-[#f5c518] focus:ring-1 focus:ring-[#f5c518] bg-white text-xs text-[#1C1C1C] outline-none transition-all shadow-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1.5 max-w-xs">
                  <label className="text-[11px] font-extrabold uppercase text-[#1C1C1C] tracking-wider block">
                    CAMPAIGN DAYS DURATION *
                  </label>
                  <input
                    type="number"
                    required
                    value={campaignDays}
                    onChange={(e) => setCampaignDays(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:border-[#f5c518] focus:ring-1 focus:ring-[#f5c518] bg-white text-xs text-[#1C1C1C] outline-none transition-all shadow-xs"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="px-6 py-3 rounded-xl bg-[#07150D] text-[#f5c518] hover:bg-[#14231b] font-bold text-xs uppercase tracking-wider shadow-sm transition-all cursor-pointer"
                  >
                    Create Campaign Challenge
                  </button>
                </div>
              </form>
            </div>

            {/* Table Card 2: Current Live Challenges */}
            <div className="bg-white rounded-2xl p-6 border border-[#E7E3D8] shadow-sm space-y-4">
              <h2 className="text-base font-extrabold text-[#1C1C1C]">
                Current Live Challenges
              </h2>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs min-w-[650px]">
                  <thead className="bg-[#FAF8F5] text-[#14231b] uppercase text-[10px] font-bold tracking-wider border-b border-[#E7E3D8]">
                    <tr>
                      <th className="p-3.5 font-extrabold text-[#667085]">
                        CAMPAIGN ID
                      </th>
                      <th className="p-3.5 font-extrabold text-[#667085]">TITLE</th>
                      <th className="p-3.5 font-extrabold text-[#667085]">
                        DESCRIPTION
                      </th>
                      <th className="p-3.5 font-extrabold text-[#667085]">TARGET</th>
                      <th className="p-3.5 font-extrabold text-[#667085]">REWARD</th>
                      <th className="p-3.5 font-extrabold text-[#667085]">
                        DAYS REMAINING
                      </th>
                      <th className="p-3.5 font-extrabold text-[#667085]">STATUS</th>
                      <th className="p-3.5 font-extrabold text-[#667085]">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E7E3D8]/60">
                    {campaignsList.map((cmp) => (
                      <tr
                        key={cmp.id}
                        className="hover:bg-[#FAF8F5]/60 transition-colors"
                      >
                        <td className="p-3.5 font-mono font-bold text-[#1C1C1C]">
                          {cmp.id}
                        </td>
                        <td className="p-3.5 font-bold text-[#1C1C1C]">{cmp.title}</td>
                        <td className="p-3.5 text-[#667085] max-w-xs truncate">
                          {cmp.description}
                        </td>
                        <td className="p-3.5 font-extrabold text-[#1C1C1C]">
                          {cmp.target}
                        </td>
                        <td className="p-3.5 font-extrabold text-[#1C1C1C]">
                          {cmp.reward}
                        </td>
                        <td className="p-3.5 font-bold text-[#1C1C1C]">
                          {cmp.daysRemaining}
                        </td>
                        <td className="p-3.5">
                          <span className="font-extrabold text-[10px] text-emerald-600 uppercase">
                            {cmp.status}
                          </span>
                        </td>
                        <td className="p-3.5">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              className="px-2.5 py-1 rounded-lg border border-[#f5c518]/50 text-[#b48316] font-bold text-[11px] hover:bg-[#FEF9C3] transition-colors cursor-pointer flex items-center gap-1"
                            >
                              <Edit className="w-3 h-3" />
                              <span>Edit</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteCampaign(cmp.id)}
                              className="px-2.5 py-1 rounded-lg border border-red-200 text-red-600 font-bold text-[11px] hover:bg-red-50 transition-colors cursor-pointer flex items-center gap-1"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>Delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 7: BROADCAST UPDATES TO DASHBOARD
        ========================================================================= */}
        {activeTab === "announcements" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <h1 className="text-2xl sm:text-[26px] font-extrabold text-[#1C1C1C] tracking-tight">
              Broadcast Updates to Dashboard
            </h1>

            <div className="bg-white rounded-2xl p-6 border border-[#E7E3D8] shadow-sm space-y-5 max-w-3xl">
              <h2 className="text-base font-extrabold text-[#1C1C1C]">
                Create Announcement Bullet
              </h2>

              <form onSubmit={handleCreateAnnouncement} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-extrabold uppercase text-[#1C1C1C] tracking-wider block">
                    ANNOUNCEMENT TITLE *
                  </label>
                  <input
                    type="text"
                    required
                    value={announcementTitle}
                    onChange={(e) => setAnnouncementTitle(e.target.value)}
                    placeholder="e.g. New Product Launch"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:border-[#f5c518] focus:ring-1 focus:ring-[#f5c518] bg-white text-xs text-[#1C1C1C] outline-none transition-all shadow-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-extrabold uppercase text-[#1C1C1C] tracking-wider block">
                    ANNOUNCEMENT CONTENT *
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={announcementContent}
                    onChange={(e) => setAnnouncementContent(e.target.value)}
                    placeholder="Explain updates details..."
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:border-[#f5c518] focus:ring-1 focus:ring-[#f5c518] bg-white text-xs text-[#1C1C1C] outline-none transition-all shadow-xs"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-extrabold uppercase text-[#1C1C1C] tracking-wider block">
                      BROADCAST TYPE *
                    </label>
                    <div className="relative">
                      <select
                        value={broadcastType}
                        onChange={(e) => setBroadcastType(e.target.value)}
                        className="w-full appearance-none px-4 py-2.5 rounded-xl border border-gray-300 focus:border-[#f5c518] focus:ring-1 focus:ring-[#f5c518] bg-white text-xs text-[#1C1C1C] outline-none transition-all cursor-pointer shadow-xs"
                      >
                        <option value="New Product Drops">New Product Drops</option>
                        <option value="Commission Boost">Commission Boost</option>
                        <option value="Platform Maintenance">Platform Maintenance</option>
                        <option value="Artisan Showcase">Artisan Showcase</option>
                      </select>
                      <ChevronDown className="w-4 h-4 text-gray-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-extrabold uppercase text-[#1C1C1C] tracking-wider block">
                      URGENCY PRIORITY *
                    </label>
                    <div className="relative">
                      <select
                        value={urgencyPriority}
                        onChange={(e) => setUrgencyPriority(e.target.value)}
                        className="w-full appearance-none px-4 py-2.5 rounded-xl border border-gray-300 focus:border-[#f5c518] focus:ring-1 focus:ring-[#f5c518] bg-white text-xs text-[#1C1C1C] outline-none transition-all cursor-pointer shadow-xs"
                      >
                        <option value="Normal Priority">Normal Priority</option>
                        <option value="High Priority">High Priority</option>
                        <option value="Urgent Alert">Urgent Alert</option>
                      </select>
                      <ChevronDown className="w-4 h-4 text-gray-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="px-8 py-3 rounded-xl bg-[#07150D] text-[#f5c518] hover:bg-[#14231b] font-bold text-xs uppercase tracking-wider shadow-sm transition-all cursor-pointer"
                  >
                    Publish Announcement Bullet
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
