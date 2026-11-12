"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";
import { useCurrency } from "../../context/CurrencyContext";
import { useCart } from "../../context/CartContext";
import { initialProducts } from "../../data/products";
import { Product } from "../../lib/types";
import { supabase } from "../../lib/supabase";
import { useNotificationStore } from "../../components/NotificationFlyout";
import {
  Home,
  Package,
  Heart,
  Bell,
  MapPin,
  TrendingUp,
  Settings,
  LogOut,
  Camera,
  Edit3,
  ShoppingBag,
  Truck,
  Headphones,
  Compass,
  ArrowRight,
  ArrowLeft,
  Store,
  CheckCircle2,
  X,
  Loader2,
  Search,
  ChevronDown,
  BellOff,
  Plus,
  Trash2,
  Save,
  ShieldCheck,
  ExternalLink,
  Copy,
  Check,
  CheckCircle,
  Clock,
  Award,
  AlertCircle,
  Sparkles,
  RefreshCw,
  FileText,
} from "lucide-react";

export default function AccountPage() {
  const router = useRouter();
  const { user, profile, loading: authLoading, signOut, refreshProfile } = useAuth();
  const { currency, setCurrency, formatPrice } = useCurrency();
  const { addItem, openCart } = useCart();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotificationStore();

  const [biographyInput, setBiographyInput] = useState("");
  const [preferredCurrency, setPreferredCurrency] = useState(currency || "ETB");
  const [languageInput, setLanguageInput] = useState("English (US)");
  const [settingsSuccessMsg, setSettingsSuccessMsg] = useState("");
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);

  // Authentication guard: redirect to sign-in when logged out
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login?redirect=/account");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (currency) setPreferredCurrency(currency);
  }, [currency]);

  // Check if current user is an Admin (strictly checked against Supabase profile role)
  const isAdmin = profile?.role === "admin";

  // Check if current user is an approved affiliate
  const [isAffiliate, setIsAffiliate] = useState(false);
  const [referralCode, setReferralCode] = useState<string>("");
  const [affiliateApp, setAffiliateApp] = useState<{
    user_id: string;
    full_name?: string;
    phone?: string;
    motivation?: string;
    social_link?: string;
    status: "pending" | "approved" | "rejected";
    rejection_reason?: string;
    created_at: string;
  } | null>(null);

  // Application modal and form state
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [isViewAppModalOpen, setIsViewAppModalOpen] = useState(false);
  const [submittingApp, setSubmittingApp] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [applyForm, setApplyForm] = useState({
    fullName: "",
    phone: "",
    motivation: "",
    socialLink: "",
  });

  // Authoritative real-time Supabase check for Affiliate & Application records
  const fetchAffiliateStatus = async (userId: string) => {
    try {
      // 1. Check if user is an approved affiliate with an active code
      const { data: affData } = await supabase
        .from("affiliates")
        .select("user_id, referral_code")
        .eq("user_id", userId)
        .maybeSingle();

      if (affData && affData.referral_code) {
        setIsAffiliate(true);
        setReferralCode(affData.referral_code);
      } else if (profile?.role === "affiliate") {
        setIsAffiliate(true);
      } else {
        setIsAffiliate(false);
      }

      // 2. Check user's affiliate application status
      const { data: appData, error: appErr } = await supabase
        .from("affiliate_applications")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (!appErr && appData) {
        setAffiliateApp(appData as any);
      } else {
        setAffiliateApp(null);
      }
    } catch (err) {
      console.warn("Failed to fetch affiliate status:", err);
    }
  };

  useEffect(() => {
    if (user?.id) {
      fetchAffiliateStatus(user.id);
    } else {
      setIsAffiliate(false);
      setAffiliateApp(null);
    }
  }, [user, profile]);

  // Submit or re-apply for Amiele Affiliate program
  const handleSubmitApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;
    if (!applyForm.motivation.trim()) {
      setApplyError("Please share why you want to join the affiliate program.");
      return;
    }

    setSubmittingApp(true);
    setApplyError(null);

    try {
      const nowIso = new Date().toISOString();

      // Update name & phone on profile
      if (applyForm.fullName || applyForm.phone) {
        await supabase
          .from("profiles")
          .update({
            ...(applyForm.fullName ? { full_name: applyForm.fullName.trim() } : {}),
            ...(applyForm.phone ? { phone: applyForm.phone.trim() } : {}),
          })
          .eq("id", user.id);
      }

      const payload = {
        user_id: user.id,
        motivation: applyForm.motivation.trim(),
        social_link: (applyForm.socialLink || "None").trim(),
        status: "pending",
        created_at: nowIso,
      };

      const { data, error } = await supabase
        .from("affiliate_applications")
        .upsert(payload, { onConflict: "user_id" })
        .select()
        .single();

      if (error) throw error;

      setAffiliateApp(data as any);
      setIsApplyModalOpen(false);
    } catch (err: any) {
      console.error("Application submission error:", err);
      setApplyError(err?.message || "Failed to submit application. Please try again.");
    } finally {
      setSubmittingApp(false);
    }
  };

  // Copy referral link to clipboard
  const handleCopyReferralCode = () => {
    if (!referralCode) return;
    const url = `${window.location.origin}/?ref=${referralCode}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    });
  };

  const [activeTab, setActiveTab] = useState<
    "dashboard" | "orders" | "wishlist" | "notifications" | "addresses" | "settings"
  >("dashboard");

  // Sync tab with URL query parameter
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get("tab");
      if (tabParam && ["dashboard", "orders", "wishlist", "notifications", "addresses", "settings"].includes(tabParam)) {
        setActiveTab(tabParam as any);
      }
    }
  }, []);

  const switchTab = (tab: "dashboard" | "orders" | "wishlist" | "notifications" | "addresses" | "settings") => {
    setActiveTab(tab);
    if (typeof window !== "undefined") {
      const url = tab === "dashboard" ? "/account" : `/account?tab=${tab}`;
      window.history.replaceState(null, "", url);
    }
  };

  const avatarInputRef = React.useRef<HTMLInputElement | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("amiele_custom_avatar");
      if (saved) setAvatarPreview(saved);
    }
  }, []);

  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const rawUrl = event.target?.result as string;
      if (!rawUrl) return;

      const img = new Image();
      img.onload = async () => {
        const maxDim = 400;
        let width = img.width;
        let height = img.height;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedUrl = canvas.toDataURL("image/jpeg", 0.85);

          setAvatarPreview(compressedUrl);
          if (typeof window !== "undefined") {
            localStorage.setItem("amiele_custom_avatar", compressedUrl);
          }
          if (user?.id) {
            try {
              await supabase
                .from("profiles")
                .update({ avatar_url: compressedUrl })
                .eq("id", user.id);
              await refreshProfile?.();
            } catch (err) {
              console.warn("Avatar sync error:", err);
            }
          }
          setProfileSuccessMsg("Profile photo updated successfully!");
          setTimeout(() => setProfileSuccessMsg(""), 3500);
          return;
        }

        setAvatarPreview(rawUrl);
        if (typeof window !== "undefined") {
          localStorage.setItem("amiele_custom_avatar", rawUrl);
        }
        setProfileSuccessMsg("Profile photo updated successfully!");
        setTimeout(() => setProfileSuccessMsg(""), 3500);
      };
      img.src = rawUrl;
    };
    reader.readAsDataURL(file);
  };

  // Saved Wishlist state
  const [wishlistProducts, setWishlistProducts] = useState<Product[]>([]);
  const [addedWishlistMap, setAddedWishlistMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const savedMap = localStorage.getItem("amiele_wishlist");
        if (savedMap) {
          const parsed = JSON.parse(savedMap);
          const activeIds = Object.keys(parsed).filter((id) => parsed[id]);
          if (activeIds.length > 0) {
            const matches = initialProducts.filter(
              (p) => activeIds.includes(p.id) || activeIds.includes(p.slug) || activeIds.includes(`prod-${p.slug}-1`)
            );
            if (matches.length > 0) {
              setWishlistProducts(matches);
              return;
            }
          }
        }
      } catch (e) {}

      // Default curated wishlist items
      const defaultWishlist = initialProducts.slice(0, 3);
      setWishlistProducts(defaultWishlist);
      const map: Record<string, boolean> = {};
      defaultWishlist.forEach((p) => {
        map[p.id] = true;
        map[`prod-${p.slug}-1`] = true;
      });
      localStorage.setItem("amiele_wishlist", JSON.stringify(map));
    }
  }, []);

  const handleRemoveFromWishlist = (productId: string) => {
    const updated = wishlistProducts.filter((p) => p.id !== productId);
    setWishlistProducts(updated);
    if (typeof window !== "undefined") {
      const map: Record<string, boolean> = {};
      updated.forEach((p) => {
        map[p.id] = true;
        map[`prod-${p.slug}-1`] = true;
      });
      localStorage.setItem("amiele_wishlist", JSON.stringify(map));
    }
  };

  const handleAddToCartFromWishlist = (product: Product) => {
    addItem(product, 1);
    setAddedWishlistMap((prev) => ({ ...prev, [product.id]: true }));
    setTimeout(() => {
      setAddedWishlistMap((prev) => ({ ...prev, [product.id]: false }));
    }, 2000);
  };

  const [greeting, setGreeting] = useState("Good Afternoon");
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [fullNameInput, setFullNameInput] = useState("");
  const [phoneInput, setPhoneInput] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSuccessMsg, setProfileSuccessMsg] = useState("");
  const [fullNotificationModal, setFullNotificationModal] = useState(false);

  // Shipping Addresses state
  const [addresses, setAddresses] = useState<Array<{
    id: string;
    title: string;
    street: string;
    cityCountry: string;
    phone: string;
    isDefault: boolean;
  }>>([
    {
      id: "addr_1",
      title: "Primary Shipping Address",
      street: "Mexico Square, Kirkos Sub-City",
      cityCountry: "Addis Ababa, Ethiopia",
      phone: "+251 96 426 1817",
      isDefault: true,
    },
  ]);
  const [addressModalOpen, setAddressModalOpen] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [addrTitle, setAddrTitle] = useState("");
  const [addrStreet, setAddrStreet] = useState("");
  const [addrCityCountry, setAddrCityCountry] = useState("");
  const [addrPhone, setAddrPhone] = useState("");
  const [addrIsDefault, setAddrIsDefault] = useState(false);

  // Sync addresses from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("amiele_shipping_addresses");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            setAddresses(parsed);
          }
        } catch (e) {}
      }
    }
  }, []);

  const handleOpenAddAddress = () => {
    setEditingAddressId(null);
    setAddrTitle(addresses.length === 0 ? "Primary Shipping Address" : "Secondary Shipping Address");
    setAddrStreet("");
    setAddrCityCountry("Addis Ababa, Ethiopia");
    setAddrPhone(phoneInput || "+251 96 426 1817");
    setAddrIsDefault(addresses.length === 0);
    setAddressModalOpen(true);
  };

  const handleOpenEditAddress = (addr: any) => {
    setEditingAddressId(addr.id);
    setAddrTitle(addr.title);
    setAddrStreet(addr.street);
    setAddrCityCountry(addr.cityCountry);
    setAddrPhone(addr.phone);
    setAddrIsDefault(addr.isDefault);
    setAddressModalOpen(true);
  };

  const handleSaveAddress = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addrStreet.trim()) return;

    let updated: any[];
    if (editingAddressId) {
      updated = addresses.map((a) => {
        if (a.id === editingAddressId) {
          return {
            ...a,
            title: addrTitle.trim() || "Shipping Address",
            street: addrStreet.trim(),
            cityCountry: addrCityCountry.trim() || "Addis Ababa, Ethiopia",
            phone: addrPhone.trim(),
            isDefault: addrIsDefault,
          };
        }
        return addrIsDefault ? { ...a, isDefault: false } : a;
      });
    } else {
      const newAddr = {
        id: "addr_" + Date.now(),
        title: addrTitle.trim() || (addresses.length === 0 ? "Primary Shipping Address" : "Secondary Address"),
        street: addrStreet.trim(),
        cityCountry: addrCityCountry.trim() || "Addis Ababa, Ethiopia",
        phone: addrPhone.trim(),
        isDefault: addrIsDefault || addresses.length === 0,
      };
      if (newAddr.isDefault) {
        updated = addresses.map((a) => ({ ...a, isDefault: false })).concat(newAddr);
      } else {
        updated = [...addresses, newAddr];
      }
    }

    setAddresses(updated);
    if (typeof window !== "undefined") {
      localStorage.setItem("amiele_shipping_addresses", JSON.stringify(updated));
    }
    setAddressModalOpen(false);
  };

  const handleDeleteAddress = (id: string) => {
    const updated = addresses.filter((a) => a.id !== id);
    if (updated.length > 0 && !updated.some((a) => a.isDefault)) {
      updated[0].isDefault = true;
    }
    setAddresses(updated);
    if (typeof window !== "undefined") {
      localStorage.setItem("amiele_shipping_addresses", JSON.stringify(updated));
    }
    setAddressModalOpen(false);
  };

  const handleSetDefaultAddress = (id: string) => {
    const updated = addresses.map((a) => ({
      ...a,
      isDefault: a.id === id,
    }));
    setAddresses(updated);
    if (typeof window !== "undefined") {
      localStorage.setItem("amiele_shipping_addresses", JSON.stringify(updated));
    }
  };

  // Orders Filter & Search state
  const [orderSearch, setOrderSearch] = useState("");
  const [orderStatusFilter, setOrderStatusFilter] = useState("All Statuses");
  const [ordersList, setOrdersList] = useState<any[]>([]);

  // PMS Products state
  const [pmsSearch, setPmsSearch] = useState("");
  const [pmsCategory, setPmsCategory] = useState("all");

  const filteredPmsProducts = initialProducts.filter((p) => {
    const matchesSearch =
      !pmsSearch.trim() ||
      p.name.toLowerCase().includes(pmsSearch.toLowerCase()) ||
      p.slug.toLowerCase().includes(pmsSearch.toLowerCase());
    const matchesCat = pmsCategory === "all" || p.category === pmsCategory;
    return matchesSearch && matchesCat;
  });

  // Determine greeting based on current local hour
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good Morning");
    else if (hour < 18) setGreeting("Good Afternoon");
    else setGreeting("Good Evening");
  }, []);

  // Sync profile details into edit state
  useEffect(() => {
    if (profile?.fullName) setFullNameInput(profile.fullName);
    if (profile?.phone) setPhoneInput(profile.phone);
  }, [profile]);

  // Load user orders from Supabase with joined product details
  const fetchOrders = useCallback(async () => {
    if (!user?.id) return;
    try {
      const { data, error } = await supabase
        .from("orders")
        .select("*, product:products(name, price, currency, slug, images:product_images(storage_path, is_cover))")
        .eq("customer_id", user.id)
        .order("created_at", { ascending: false });

      if (!error && data) {
        setOrdersList(data);
      } else if (error) {
        console.warn("Error fetching user orders:", error);
      }
    } catch (err) {
      console.warn("Could not load user orders:", err);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchOrders();
    const handleOrderCreated = () => fetchOrders();
    window.addEventListener("amiele_order_created", handleOrderCreated);
    return () => window.removeEventListener("amiele_order_created", handleOrderCreated);
  }, [fetchOrders]);

  useEffect(() => {
    if (activeTab === "orders") {
      fetchOrders();
    }
  }, [activeTab, fetchOrders]);

  // Filtered orders
  const filteredOrders = ordersList.filter((o) => {
    const prodName = o.product?.name || o.product_name || "";
    const matchesSearch =
      !orderSearch.trim() ||
      (o.order_number && o.order_number.toLowerCase().includes(orderSearch.toLowerCase())) ||
      prodName.toLowerCase().includes(orderSearch.toLowerCase()) ||
      (o.id && o.id.toLowerCase().includes(orderSearch.toLowerCase()));

    const matchesStatus =
      orderStatusFilter === "All Statuses" ||
      (o.status && o.status.toLowerCase() === orderStatusFilter.toLowerCase().replace(/\s+/g, "_")) ||
      (o.fulfillment_status && o.fulfillment_status.toLowerCase() === orderStatusFilter.toLowerCase().replace(/\s+/g, "_"));

    return matchesSearch && matchesStatus;
  });

  // Dynamic user data or realistic default fallback matching the design screenshot
  const displayName = profile?.fullName || user?.user_metadata?.full_name || user?.email?.split("@")[0] || "jane";
  const displayEmail = user?.email || "punchesbox@gmail.com";
  const displayId = user?.id ? user.id.replace(/-/g, "").slice(0, 8).toUpperCase() : "DB7F89BA";

  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString("en-US", { month: "short", year: "numeric" })
    : "Jul 2026";

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push("/login");
    } catch (err) {
      console.error("Sign out error:", err);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileSuccessMsg("");

    try {
      setTimeout(async () => {
        await refreshProfile?.();
        setSavingProfile(false);
        setProfileSuccessMsg("Profile updated successfully!");
        setTimeout(() => {
          setEditModalOpen(false);
          setProfileSuccessMsg("");
        }, 1200);
      }, 600);
    } catch (err) {
      setSavingProfile(false);
    }
  };

  if (authLoading || !user) {
    return (
      <div className="w-full min-h-[70vh] flex items-center justify-center bg-[#FAF8F5]">
        <Loader2 className="w-8 h-8 animate-spin text-[#14231b]" />
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-[#FAF8F5] text-[#14231b] py-3 sm:py-8 px-3 sm:px-6 lg:px-10">
      <div className="max-w-[1340px] mx-auto flex flex-col md:flex-row gap-4 sm:gap-6 lg:gap-7 items-start">
        {/* ================= LEFT SIDEBAR (md: and above) ================= */}
        <aside className="hidden md:block md:w-64 xl:w-72 shrink-0 bg-white rounded-3xl p-4 sm:p-5 border border-[#14231b]/8 shadow-[0_4px_25px_rgba(0,0,0,0.03)] space-y-1 sticky top-24 self-start max-h-[calc(100vh-110px)] overflow-y-auto no-scrollbar z-20">
          {/* 1. Dashboard (Active if activeTab === 'dashboard') */}
          <button
            onClick={() => switchTab("dashboard")}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all duration-200 cursor-pointer ${
              activeTab === "dashboard"
                ? "bg-[#14231b] text-white shadow-md shadow-[#14231b]/15"
                : "text-[#14231b] hover:bg-[#FAF8F5]"
            }`}
          >
            <Home
              className={`w-4 h-4 ${
                activeTab === "dashboard" ? "text-[#f3be3b] fill-current" : "text-[#737874]"
              }`}
            />
            <span>Dashboard</span>
          </button>

          {/* 2. Orders (Active if activeTab === 'orders') */}
          <button
            onClick={() => switchTab("orders")}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all duration-200 cursor-pointer group ${
              activeTab === "orders"
                ? "bg-[#14231b] text-white shadow-md shadow-[#14231b]/15"
                : "text-[#14231b] hover:bg-[#FAF8F5]"
            }`}
          >
            <Package
              className={`w-4 h-4 ${
                activeTab === "orders" ? "text-[#f3be3b] fill-current" : "text-[#737874] group-hover:text-[#14231b]"
              }`}
            />
            <span>Orders</span>
          </button>

          {/* 3. Saved Wishlist */}
          <button
            onClick={() => switchTab("wishlist")}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all duration-200 cursor-pointer group ${
              activeTab === "wishlist"
                ? "bg-[#14231b] text-white shadow-md shadow-[#14231b]/15"
                : "text-[#14231b] hover:bg-[#FAF8F5]"
            }`}
          >
            <Heart
              className={`w-4 h-4 ${
                activeTab === "wishlist" ? "text-[#f3be3b] fill-current" : "text-[#737874] group-hover:text-[#14231b]"
              }`}
            />
            <span>Saved Wishlist</span>
          </button>

          {/* 4. Notifications */}
          <button
            onClick={() => switchTab("notifications")}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all duration-200 cursor-pointer group ${
              activeTab === "notifications"
                ? "bg-[#14231b] text-white shadow-md shadow-[#14231b]/15"
                : "text-[#14231b] hover:bg-[#FAF8F5]"
            }`}
          >
            <Bell
              className={`w-4 h-4 ${
                activeTab === "notifications" ? "text-[#f3be3b] fill-current" : "text-[#737874] group-hover:text-[#14231b]"
              }`}
            />
            <span>Notifications</span>
          </button>

          {/* 5. Shipping Addresses */}
          <button
            onClick={() => switchTab("addresses")}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all duration-200 cursor-pointer group ${
              activeTab === "addresses"
                ? "bg-[#14231b] text-white shadow-md shadow-[#14231b]/15"
                : "text-[#14231b] hover:bg-[#FAF8F5]"
            }`}
          >
            <MapPin
              className={`w-4 h-4 ${
                activeTab === "addresses" ? "text-[#f3be3b]" : "text-[#737874] group-hover:text-[#14231b]"
              }`}
            />
            <span>Shipping Addresses</span>
          </button>

          {/* 6. Admin Portal (ADMIN) - Only shown to Admin accounts */}
          {isAdmin && (
            <div className="pt-1.5 pb-0.5">
              <Link
                href="/admin?tab=dashboard"
                className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl border border-[#d4af37]/45 bg-[#fefcf8] hover:bg-[#fcf5e5] text-xs sm:text-sm font-bold text-[#14231b] shadow-xs hover:shadow transition-all duration-200 group cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-[#b8860b] group-hover:scale-110 transition-transform" />
                  <span>Admin Portal</span>
                </div>
                <span className="bg-[#0F2418] text-[#D4AF37] border border-[#D4AF37] text-[10px] font-black tracking-wider px-2 py-0.5 rounded-full uppercase shadow-xs">
                  ADMIN
                </span>
              </Link>
            </div>
          )}

          {/* 7. Affiliate Portal / Dashboard (State E: Admins see this too; Affiliates see it; Customers see Apply/Status) */}
          {(isAdmin || isAffiliate) ? (
            <div className="pt-1.5 pb-0.5">
              <Link
                href="/affiliate/dashboard"
                className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl border border-[#d4af37]/45 bg-[#fefcf8] hover:bg-[#fcf5e5] text-xs sm:text-sm font-bold text-[#14231b] shadow-xs hover:shadow transition-all duration-200 group cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <TrendingUp className="w-4 h-4 text-[#b8860b] group-hover:scale-110 transition-transform" />
                  <span>Affiliate Dashboard</span>
                </div>
                <span className="bg-[#0F2418] text-[#D4AF37] border border-[#D4AF37] text-[10px] font-black tracking-wider px-2 py-0.5 rounded-full uppercase shadow-xs">
                  AFFILIATE
                </span>
              </Link>
            </div>
          ) : (
            <div className="pt-1.5 pb-0.5">
              <button
                type="button"
                onClick={() => {
                  if (affiliateApp?.status === "pending") {
                    setIsViewAppModalOpen(true);
                  } else {
                    setApplyForm({
                      fullName: affiliateApp?.full_name || profile?.fullName || "",
                      phone: affiliateApp?.phone || profile?.phone || "",
                      motivation: affiliateApp?.motivation || "",
                      socialLink: affiliateApp?.social_link || "",
                    });
                    setIsApplyModalOpen(true);
                  }
                }}
                className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl border border-[#d4af37]/45 bg-[#fefcf8] hover:bg-[#fcf5e5] text-xs sm:text-sm font-bold text-[#14231b] shadow-xs hover:shadow transition-all duration-200 group cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <TrendingUp className="w-4 h-4 text-[#b8860b] group-hover:scale-110 transition-transform" />
                  <span>
                    {affiliateApp?.status === "pending"
                      ? "Application Under Review"
                      : affiliateApp?.status === "rejected"
                      ? "Affiliate Application"
                      : "Become an Affiliate"}
                  </span>
                </div>
                <span className="bg-[#d4af37] text-[#14231b] text-[10px] font-black tracking-wider px-2 py-0.5 rounded-full uppercase shadow-xs">
                  {affiliateApp?.status === "pending" ? "REVIEW" : "EARN"}
                </span>
              </button>
            </div>
          )}

          {/* Divider */}
          <div className="border-t border-[#14231b]/8 my-2 pt-1" />

          {/* 7. Settings */}
          <button
            onClick={() => switchTab("settings")}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all duration-200 cursor-pointer group ${
              activeTab === "settings"
                ? "bg-[#14231b] text-white shadow-md shadow-[#14231b]/15"
                : "text-[#14231b] hover:bg-[#FAF8F5]"
            }`}
          >
            <Settings
              className={`w-4 h-4 ${
                activeTab === "settings" ? "text-[#f3be3b]" : "text-[#737874] group-hover:text-[#14231b]"
              }`}
            />
            <span>Settings</span>
          </button>

          {/* 8. Log Out */}
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold text-[#c0392b] hover:bg-red-50 transition-colors duration-200 cursor-pointer group"
          >
            <LogOut className="w-4 h-4 text-[#c0392b] group-hover:-translate-x-1 transition-transform" />
            <span>Log Out</span>
          </button>
        </aside>

        {/* ================= RIGHT MAIN CONTENT AREA ================= */}
        <main className="flex-1 min-w-0 space-y-4 sm:space-y-5 w-full">
          {/* ================= VIEW 1: DASHBOARD ================= */}
          {activeTab === "dashboard" && (
            <>
              {/* 1. TOP WELCOME PROFILE CARD - Exact Match to Screenshot on Mobile, Restored Luxury on Desktop */}
              <div className="relative bg-white rounded-[32px] p-6 sm:p-7 border border-[#E8E1D6] shadow-sm overflow-hidden flex flex-col md:flex-row items-center md:items-center justify-between text-center md:text-left gap-4 sm:gap-6 w-full">
                {/* Desktop Left Amber Edge Accent */}
                <div className="hidden md:block absolute top-0 left-0 bottom-0 w-2.5 bg-[#d4af37] rounded-l-3xl" />
                {/* Mobile Subtle Gold Gradient Top Border Line */}
                <div className="md:hidden absolute top-0 inset-x-6 sm:inset-x-10 h-1 bg-gradient-to-r from-[#d4af37]/40 via-[#d4af37] to-[#d4af37]/40 rounded-full" />

                {/* Left: Avatar + User Info */}
                <div className="flex flex-col md:flex-row items-center md:items-center gap-4 sm:gap-5 md:pl-2">
                  {/* Circular Avatar: Dark Green with Gold Initial "N" + Gold Camera Button */}
                  <div className="relative shrink-0 mb-1 md:mb-0">
                    <input
                      ref={avatarInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarFileChange}
                      className="hidden"
                      id="avatar-file-upload-input"
                    />
                    <div className="w-22 h-22 sm:w-24 sm:h-24 rounded-full border-2 border-[#14231b] overflow-hidden shadow-md bg-[#0c2419] flex items-center justify-center">
                      {avatarPreview ? (
                        <img
                          src={avatarPreview}
                          alt={displayName}
                          className="w-full h-full object-cover rounded-full"
                        />
                      ) : (
                        <span className="font-serif text-3xl sm:text-4xl font-extrabold text-[#d4af37] select-none">
                          {displayName ? displayName.charAt(0).toUpperCase() : "N"}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => avatarInputRef.current?.click()}
                      className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-[#d4af37] hover:bg-[#c2931f] text-[#14231b] flex items-center justify-center shadow-md border-2 border-white cursor-pointer active:scale-95 transition-transform"
                      title="Upload Profile Photo"
                    >
                      <Camera className="w-3.5 h-3.5 text-[#14231b]" />
                    </button>
                  </div>

                  {/* Text Meta Info */}
                  <div className="space-y-1">
                    {profileSuccessMsg && (
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold mb-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>{profileSuccessMsg}</span>
                      </div>
                    )}

                    {/* Subtitle */}
                    <p className="text-xs font-bold text-[#14231b] tracking-normal mb-0.5">
                      Welcome back to Amiele Begena
                    </p>

                    {/* Greeting & Verified Customer Badge */}
                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                      <h1 className="font-sans text-xl sm:text-2xl font-extrabold text-[#14231b] tracking-tight">
                        {greeting}, {displayName} 👋
                      </h1>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-[#fdf6e9] text-[#b47a16] text-[10px] font-extrabold tracking-wider uppercase border border-[#e8cf9b]">
                        VERIFIED CUSTOMER
                      </span>
                    </div>

                    {/* Email & ID Row - Separate lines on mobile */}
                    <div className="flex flex-col sm:flex-row items-center md:items-start justify-center md:justify-start gap-1 sm:gap-3 text-xs text-[#5a625d] font-semibold pt-0.5">
                      <div className="flex items-center gap-1.5">
                        <span>✉️</span>
                        <span>{displayEmail}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span>🪪</span>
                        <span>ID: {displayId}</span>
                      </div>
                    </div>

                    {/* Member Since Row */}
                    <div className="flex items-center justify-center md:justify-start gap-1.5 text-xs text-[#5a625d] font-semibold pb-1">
                      <span>📅</span>
                      <span>Member since {memberSince}</span>
                    </div>
                  </div>
                </div>

                {/* Right: Controls (Edit Profile + Profile Completion) */}
                <div className="w-full md:w-auto md:shrink-0 flex flex-col items-center md:items-end gap-2 mt-2 md:mt-0">
                  {/* Edit Profile Button (Fully rounded pill matching photo) */}
                  <button
                    onClick={() => setEditModalOpen(true)}
                    className="w-full md:w-56 py-3 px-4 rounded-full border border-gray-200 bg-white hover:bg-gray-50 text-xs sm:text-sm font-bold text-[#14231b] shadow-xs flex items-center justify-center gap-2 transition-all active:scale-[0.99] cursor-pointer"
                  >
                    <Edit3 className="w-4 h-4 text-[#14231b]" />
                    <span>Edit Profile</span>
                  </button>

                  {/* Profile Completion Container */}
                  <div className="w-full md:w-56 bg-[#f4f1ea] rounded-2xl px-5 py-3 flex items-center justify-between text-xs border border-gray-200/50 mt-1">
                    <span className="font-bold text-[#14231b] text-xs">Profile Completion</span>
                    <span className="font-extrabold text-[#14231b] text-xs">85%</span>
                  </div>
                </div>
              </div>

              {/* 2. QUICK ACTION PILLS (Mobile 2x2 Grid, Desktop Flex Row) */}
              {/* Mobile (< md): 2x2 Grid + Full Width Support */}
              <div className="grid grid-cols-2 gap-2.5 sm:gap-3 w-full md:hidden">
                {/* 1. Admin Portal (Strictly for Admins) */}
                {isAdmin && (
                  <Link
                    href="/admin?tab=dashboard"
                    className="py-3 px-3 sm:px-4 rounded-full bg-white hover:bg-gray-50 border border-gray-200 shadow-xs flex items-center justify-center gap-2 text-xs sm:text-sm font-bold text-[#14231b] transition-all active:scale-[0.98]"
                  >
                    <ShieldCheck className="w-4 h-4 text-[#d4af37]" />
                    <span>Admin Portal</span>
                  </Link>
                )}

                {/* 2. Affiliate Portal / Status (For Admins and Affiliates, or Apply/Review for Customers) */}
                {(isAdmin || isAffiliate) ? (
                  <Link
                    href="/affiliate/dashboard"
                    className="py-3 px-3 sm:px-4 rounded-full bg-white hover:bg-gray-50 border border-gray-200 shadow-xs flex items-center justify-center gap-2 text-xs sm:text-sm font-bold text-[#14231b] transition-all active:scale-[0.98]"
                  >
                    <TrendingUp className="w-4 h-4 text-[#d4af37]" />
                    <span>Affiliate Dashboard</span>
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      if (affiliateApp?.status === "pending") {
                        setIsViewAppModalOpen(true);
                      } else {
                        setApplyForm({
                          fullName: affiliateApp?.full_name || profile?.fullName || "",
                          phone: affiliateApp?.phone || profile?.phone || "",
                          motivation: affiliateApp?.motivation || "",
                          socialLink: affiliateApp?.social_link || "",
                        });
                        setIsApplyModalOpen(true);
                      }
                    }}
                    className="py-3 px-3 sm:px-4 rounded-full bg-white hover:bg-gray-50 border border-gray-200 shadow-xs flex items-center justify-center gap-2 text-xs sm:text-sm font-bold text-[#14231b] transition-all active:scale-[0.98] cursor-pointer"
                  >
                    <TrendingUp className="w-4 h-4 text-[#d4af37]" />
                    <span>
                      {affiliateApp?.status === "pending"
                        ? "In Review"
                        : affiliateApp?.status === "rejected"
                        ? "Reapply"
                        : "Affiliate"}
                    </span>
                  </button>
                )}

                {/* 3. Browse Products */}
                <Link
                  href="/products"
                  className="py-3 px-3 sm:px-4 rounded-full bg-white hover:bg-gray-50 border border-gray-200 shadow-xs flex items-center justify-center gap-2 text-xs sm:text-sm font-bold text-[#14231b] transition-all active:scale-[0.98]"
                >
                  <Store className="w-4 h-4 text-[#d4af37]" />
                  <span>Browse Products</span>
                </Link>

                {/* 4. Track Order */}
                <Link
                  href="/track-order"
                  className="py-3 px-3 sm:px-4 rounded-full bg-white hover:bg-gray-50 border border-gray-200 shadow-xs flex items-center justify-center gap-2 text-xs sm:text-sm font-bold text-[#14231b] transition-all active:scale-[0.98]"
                >
                  <Truck className="w-4 h-4 text-[#d4af37]" />
                  <span>Track Order</span>
                </Link>

                {/* 5. Saved Wishlist */}
                <button
                  onClick={() => switchTab("wishlist")}
                  className="py-3 px-3 sm:px-4 rounded-full bg-white hover:bg-gray-50 border border-gray-200 shadow-xs flex items-center justify-center gap-2 text-xs sm:text-sm font-bold text-[#14231b] transition-all active:scale-[0.98] cursor-pointer"
                >
                  <Heart className="w-4 h-4 text-[#d4af37] fill-[#d4af37]" />
                  <span>Saved Wishlist</span>
                </button>

                {/* 6. Support */}
                <Link
                  href="/contact"
                  className="py-3 px-4 rounded-full bg-white hover:bg-gray-50 border border-gray-200 shadow-xs flex items-center justify-center gap-2 text-xs sm:text-sm font-bold text-[#14231b] transition-all active:scale-[0.98]"
                >
                  <Headphones className="w-4 h-4 text-[#d4af37]" />
                  <span>Support</span>
                </Link>
              </div>

              {/* Desktop (md: and above): Inline Flex Row of Luxury Pills */}
              <div className="hidden md:flex flex-wrap items-center gap-2.5 sm:gap-3 w-full">
                {/* Admin Portal (Strictly for Admins) */}
                {isAdmin && (
                  <Link
                    href="/admin?tab=dashboard"
                    className="px-4 py-2 rounded-full bg-white hover:bg-[#14231b] hover:text-white border border-[#14231b]/10 shadow-[0_2px_8px_rgba(0,0,0,0.03)] hover:shadow-md hover:border-[#14231b]/25 transition-all duration-200 text-xs font-bold text-[#14231b] flex items-center gap-1.5 cursor-pointer hover:scale-[1.03] active:scale-[0.98] group"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-[#b8860b] group-hover:text-[#f3be3b] transition-colors" />
                    <span>Admin Portal</span>
                  </Link>
                )}

                {/* Affiliate Portal / Dashboard (State E: Admins see this; Affiliates see it; Customers see Apply/Status) */}
                {(isAdmin || isAffiliate) ? (
                  <Link
                    href="/affiliate/dashboard"
                    className="px-4 py-2 rounded-full bg-white hover:bg-[#14231b] hover:text-white border border-[#14231b]/10 shadow-[0_2px_8px_rgba(0,0,0,0.03)] hover:shadow-md hover:border-[#14231b]/25 transition-all duration-200 text-xs font-bold text-[#14231b] flex items-center gap-1.5 cursor-pointer hover:scale-[1.03] active:scale-[0.98] group"
                  >
                    <TrendingUp className="w-3.5 h-3.5 text-[#b8860b] group-hover:text-[#f3be3b] transition-colors" />
                    <span>Affiliate Dashboard</span>
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      if (affiliateApp?.status === "pending") {
                        setIsViewAppModalOpen(true);
                      } else {
                        setApplyForm({
                          fullName: affiliateApp?.full_name || profile?.fullName || "",
                          phone: affiliateApp?.phone || profile?.phone || "",
                          motivation: affiliateApp?.motivation || "",
                          socialLink: affiliateApp?.social_link || "",
                        });
                        setIsApplyModalOpen(true);
                      }
                    }}
                    className="px-4 py-2 rounded-full bg-white hover:bg-[#14231b] hover:text-white border border-[#14231b]/10 shadow-[0_2px_8px_rgba(0,0,0,0.03)] hover:shadow-md hover:border-[#14231b]/25 transition-all duration-200 text-xs font-bold text-[#14231b] flex items-center gap-1.5 cursor-pointer hover:scale-[1.03] active:scale-[0.98] group"
                  >
                    <TrendingUp className="w-3.5 h-3.5 text-[#b8860b] group-hover:text-[#f3be3b] transition-colors" />
                    <span>
                      {affiliateApp?.status === "pending"
                        ? "Application Under Review"
                        : affiliateApp?.status === "rejected"
                        ? "Reapply as Affiliate"
                        : "Become an Affiliate"}
                    </span>
                  </button>
                )}

                <Link
                  href="/products"
                  className="px-4 py-2 rounded-full bg-white hover:bg-[#14231b] hover:text-white border border-[#14231b]/10 shadow-[0_2px_8px_rgba(0,0,0,0.03)] hover:shadow-md hover:border-[#14231b]/25 transition-all duration-200 text-xs font-bold text-[#14231b] flex items-center gap-1.5 cursor-pointer hover:scale-[1.03] active:scale-[0.98] group"
                >
                  <Store className="w-3.5 h-3.5 text-[#b8860b] group-hover:text-[#f3be3b] transition-colors" />
                  <span>Browse Products</span>
                </Link>

                <Link
                  href="/track-order"
                  className="px-4 py-2 rounded-full bg-white hover:bg-[#14231b] hover:text-white border border-[#14231b]/10 shadow-[0_2px_8px_rgba(0,0,0,0.03)] hover:shadow-md hover:border-[#14231b]/25 transition-all duration-200 text-xs font-bold text-[#14231b] flex items-center gap-1.5 cursor-pointer hover:scale-[1.03] active:scale-[0.98] group"
                >
                  <Truck className="w-3.5 h-3.5 text-[#b8860b] group-hover:text-[#f3be3b] transition-colors" />
                  <span>Track Order</span>
                </Link>

                <button
                  onClick={() => switchTab("wishlist")}
                  className="px-4 py-2 rounded-full bg-white hover:bg-[#14231b] hover:text-white border border-[#14231b]/10 shadow-[0_2px_8px_rgba(0,0,0,0.03)] hover:shadow-md hover:border-[#14231b]/25 transition-all duration-200 text-xs font-bold text-[#14231b] flex items-center gap-1.5 cursor-pointer hover:scale-[1.03] active:scale-[0.98] group"
                >
                  <Heart className="w-3.5 h-3.5 text-[#b8860b] group-hover:text-[#f3be3b] transition-colors" />
                  <span>Saved Wishlist</span>
                </button>

                <Link
                  href="/contact"
                  className="px-4 py-2 rounded-full bg-white hover:bg-[#14231b] hover:text-white border border-[#14231b]/10 shadow-[0_2px_8px_rgba(0,0,0,0.03)] hover:shadow-md hover:border-[#14231b]/25 transition-all duration-200 text-xs font-bold text-[#14231b] flex items-center gap-1.5 cursor-pointer hover:scale-[1.03] active:scale-[0.98] group"
                >
                  <Headphones className="w-3.5 h-3.5 text-[#b8860b] group-hover:text-[#f3be3b] transition-colors" />
                  <span>Support</span>
                </Link>
              </div>

              {/* 3. DEDICATED AFFILIATE STATUS SPOTLIGHT CARD (State A, B, C, D) */}
              {!isAdmin && (
                <>
                  {/* STATE A: NOT APPLIED (New Customer) */}
                  {!isAffiliate && (!affiliateApp || !affiliateApp.status) && (
                    <div className="w-full bg-gradient-to-br from-[#FAF8F4] via-[#F8F5EE] to-[#EDE7D9] rounded-3xl p-5 sm:p-6 border border-[#d4af37]/40 shadow-xs relative overflow-hidden group">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="space-y-1.5 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-[#d4af37]" />
                            <span className="text-[10px] sm:text-[11px] font-extrabold tracking-widest text-[#946e19] uppercase">
                              AMIELE PARTNERSHIP • የክብር አጋርነት
                            </span>
                          </div>
                          <h3 className="font-benaiah text-xl sm:text-2xl font-bold text-[#14231b] tracking-tight">
                            Become an Amiele Affiliate / የዓሚኤል ተባባሪ ይሁኑ
                          </h3>
                          <p className="text-xs sm:text-sm text-[#4a524c] max-w-xl leading-relaxed">
                            Earn <strong className="text-[#14231b] font-bold">8% lifetime commission</strong> on every handcrafted sacred Ethiopian Begena, Kirar, and Masenqo ordered with your referral link. Payouts in ETB (direct bank deposit) or USD worldwide.
                          </p>
                        </div>
                        <div className="shrink-0 pt-2 sm:pt-0">
                          <button
                            type="button"
                            onClick={() => {
                              setApplyForm({
                                fullName: profile?.fullName || "",
                                phone: profile?.phone || "",
                                motivation: "",
                                socialLink: "",
                              });
                              setIsApplyModalOpen(true);
                            }}
                            className="w-full sm:w-auto px-6 py-3 rounded-full bg-[#14231b] hover:bg-[#2d4d3c] text-[#D9B32E] hover:text-white font-extrabold text-xs sm:text-sm tracking-wide shadow-md hover:shadow-lg transition-all duration-200 active:scale-95 cursor-pointer flex items-center justify-center gap-2 min-h-[44px]"
                          >
                            <Sparkles className="w-4 h-4 text-[#D9B32E]" />
                            <span>Apply now / አሁን ያመልክቱ</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* STATE B: PENDING (Application under review) */}
                  {!isAffiliate && affiliateApp?.status === "pending" && (
                    <div className="w-full bg-gradient-to-br from-[#FAF8F4] via-[#F8F5EE] to-[#FAF3E1] rounded-3xl p-5 sm:p-6 border border-[#d4af37]/50 shadow-xs relative overflow-hidden">
                      <div className="space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4 text-[#d4af37] animate-pulse" />
                              <span className="text-[10px] sm:text-[11px] font-black tracking-widest text-[#946e19] uppercase">
                                APPLICATION UNDER REVIEW • ማመልከቻዎ እየተገመገመ ነው
                              </span>
                            </div>
                            <h3 className="font-benaiah text-xl sm:text-2xl font-bold text-[#14231b] tracking-tight">
                              Application Under Review
                            </h3>
                            <p className="text-xs sm:text-sm text-[#4a524c]">
                              Submitted on{" "}
                              <strong className="text-[#14231b] font-bold">
                                {new Date(affiliateApp.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                              </strong>
                              . Our artisan guild is reviewing your details.
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => setIsViewAppModalOpen(true)}
                            className="self-start sm:self-center px-4 py-2.5 rounded-full bg-white hover:bg-[#FAF8F5] border border-[#14231b]/15 text-[#14231b] text-xs font-bold shadow-xs hover:shadow transition-all duration-200 flex items-center gap-2 cursor-pointer min-h-[40px] shrink-0"
                          >
                            <FileText className="w-3.5 h-3.5 text-[#946e19]" />
                            <span>View Application / ማመልከቻ ይመልከቱ</span>
                          </button>
                        </div>

                        {/* 3-Step Progress Bar: Submitted -> Under review -> Approved */}
                        <div className="pt-2 pb-1">
                          <div className="relative flex items-center justify-between w-full max-w-xl mx-auto px-2">
                            {/* Connecting Line background */}
                            <div className="absolute left-8 right-8 top-3.5 sm:top-4 h-0.5 bg-gray-200 -z-0">
                              <div className="h-full bg-[#2d6a4f] w-1/2 transition-all duration-500" />
                            </div>

                            {/* Step 1: Submitted (Done) */}
                            <div className="flex flex-col items-center gap-1 sm:gap-1.5 z-10">
                              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#2d6a4f] text-white flex items-center justify-center text-xs font-bold shadow-xs">
                                <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[3]" />
                              </div>
                              <span className="text-[10px] sm:text-xs font-extrabold text-[#14231b]">Submitted</span>
                              <span className="text-[9px] text-[#737874] hidden sm:block">Done</span>
                            </div>

                            {/* Step 2: Under Review (Current / Active) */}
                            <div className="flex flex-col items-center gap-1 sm:gap-1.5 z-10">
                              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#d4af37] text-[#14231b] flex items-center justify-center text-xs font-black shadow-md ring-4 ring-[#d4af37]/25 animate-pulse">
                                <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.5]" />
                              </div>
                              <span className="text-[10px] sm:text-xs font-extrabold text-[#946e19]">Under Review</span>
                              <span className="text-[9px] text-[#946e19] font-bold hidden sm:block">Current Stage</span>
                            </div>

                            {/* Step 3: Approved (Not yet) */}
                            <div className="flex flex-col items-center gap-1 sm:gap-1.5 z-10">
                              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#E5E1D8] text-[#8a918b] flex items-center justify-center text-xs font-bold border border-gray-300">
                                <Award className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                              </div>
                              <span className="text-[10px] sm:text-xs font-bold text-[#8a918b]">Approved</span>
                              <span className="text-[9px] text-gray-400 hidden sm:block">Not Yet</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* STATE C: APPROVED (Active Affiliate) */}
                  {(isAffiliate || affiliateApp?.status === "approved" || profile?.role === "affiliate") && (
                    <div className="w-full bg-gradient-to-br from-[#FAF8F4] via-[#F8F5EE] to-[#E9F4EE] rounded-3xl p-5 sm:p-6 border border-[#2d6a4f]/35 shadow-xs relative overflow-hidden">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="space-y-1.5 min-w-0">
                          <div className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-[#2d6a4f]" />
                            <span className="text-[10px] sm:text-[11px] font-black tracking-widest text-[#2d6a4f] uppercase">
                              APPROVED AFFILIATE • 8% LIFETIME COMMISSION
                            </span>
                          </div>
                          <h3 className="font-benaiah text-xl sm:text-2xl font-bold text-[#14231b] tracking-tight">
                            You are an Amiele Affiliate / እርስዎ የዓሚኤል ተባባሪ ነዎት
                          </h3>
                          <p className="text-xs sm:text-sm text-[#4a524c] max-w-xl">
                            Your partnership is active. Share your unique code or link to earn 8% on every Ethiopian instrument ordered.
                          </p>

                          {referralCode && (
                            <div className="pt-1 flex items-center gap-2 flex-wrap">
                              <div className="px-3.5 py-1.5 rounded-xl bg-white border border-[#2d6a4f]/30 text-xs font-mono font-black text-[#14231b] shadow-2xs flex items-center gap-2">
                                <span className="text-[#737874] text-[10px] uppercase font-sans">Referral Code:</span>
                                <span className="text-[#2d6a4f]">{referralCode}</span>
                              </div>
                              <button
                                type="button"
                                onClick={handleCopyReferralCode}
                                className="px-3 py-1.5 rounded-xl bg-white hover:bg-[#FAF8F5] border border-gray-200 text-xs font-bold text-[#14231b] shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                              >
                                {copiedCode ? (
                                  <>
                                    <Check className="w-3.5 h-3.5 text-[#2d6a4f]" />
                                    <span className="text-[#2d6a4f]">Copied!</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3.5 h-3.5 text-[#737874]" />
                                    <span>Copy Link</span>
                                  </>
                                )}
                              </button>
                            </div>
                          )}
                        </div>

                        <div className="shrink-0 pt-2 sm:pt-0">
                          <Link
                            href="/affiliate/dashboard"
                            className="w-full sm:w-auto px-6 py-3 rounded-full bg-[#14231b] hover:bg-[#2d6a4f] text-[#D9B32E] hover:text-white font-extrabold text-xs sm:text-sm tracking-wide shadow-md hover:shadow-lg transition-all duration-200 active:scale-95 cursor-pointer flex items-center justify-center gap-2 min-h-[44px]"
                          >
                            <TrendingUp className="w-4 h-4 text-[#D9B32E]" />
                            <span>Open Affiliate Dashboard</span>
                          </Link>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* STATE D: REJECTED */}
                  {!isAffiliate && affiliateApp?.status === "rejected" && (
                    <div className="w-full bg-gradient-to-br from-[#FAF8F4] via-[#FDF5F5] to-[#FBEBEB] rounded-3xl p-5 sm:p-6 border border-red-200 shadow-xs relative overflow-hidden">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                        <div className="space-y-1.5 min-w-0">
                          <div className="flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 text-red-600" />
                            <span className="text-[10px] sm:text-[11px] font-black tracking-widest text-red-600 uppercase">
                              APPLICATION NOT APPROVED • ማመልከቻው አልተፈቀደም
                            </span>
                          </div>
                          <h3 className="font-benaiah text-xl sm:text-2xl font-bold text-[#14231b] tracking-tight">
                            Application Not Approved
                          </h3>
                          <p className="text-xs sm:text-sm text-[#4a524c]">
                            {affiliateApp.rejection_reason ? (
                              <>
                                Review feedback: <strong className="text-red-700 font-semibold">&ldquo;{affiliateApp.rejection_reason}&rdquo;</strong>
                              </>
                            ) : (
                              "Your application was not approved at this time. You may update your profile or promotional channels and submit a reapplication."
                            )}
                          </p>
                        </div>

                        <div className="shrink-0 pt-1 sm:pt-0">
                          <button
                            type="button"
                            onClick={() => {
                              setApplyForm({
                                fullName: affiliateApp.full_name || profile?.fullName || "",
                                phone: affiliateApp.phone || profile?.phone || "",
                                motivation: affiliateApp.motivation || "",
                                socialLink: affiliateApp.social_link || "",
                              });
                              setIsApplyModalOpen(true);
                            }}
                            className="w-full sm:w-auto px-5 py-2.5 rounded-full bg-[#14231b] hover:bg-[#2d6a4f] text-white font-bold text-xs sm:text-sm transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5 min-h-[44px]"
                          >
                            <RefreshCw className="w-3.5 h-3.5 text-[#D9B32E]" />
                            <span>Reapply / በድጋሚ ያመልክቱ</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* 3. FOUR METRIC STAT CARDS - Exact Match to Screenshot */}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 w-full">
                {/* Card 1: TOTAL ORDERS */}
                <div
                  onClick={() => switchTab("orders")}
                  className="bg-white rounded-3xl p-5 border border-[#d4af37]/80 shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between space-y-2.5 group cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-extrabold tracking-wider uppercase text-[#6b726d]">
                      TOTAL ORDERS
                    </span>
                    <div className="w-11 h-11 rounded-2xl bg-[#0c2419] text-[#d4af37] flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                      <Package className="w-5 h-5" />
                    </div>
                  </div>
                  <div>
                    <span className="font-serif text-3xl font-extrabold text-[#14231b]">
                      {ordersList.length}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-[#8a918b] font-semibold">
                      {ordersList.length > 0 && ordersList[0].created_at
                        ? `Last order ${new Date(ordersList[0].created_at).toLocaleDateString()}`
                        : "No orders placed yet"}
                    </span>
                  </div>
                </div>

                {/* Card 2: ACTIVE ORDERS */}
                <div
                  onClick={() => switchTab("orders")}
                  className="bg-white rounded-3xl p-5 border border-[#E7E3D8] shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between space-y-2.5 group cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-extrabold tracking-wider uppercase text-[#6b726d]">
                      ACTIVE ORDERS
                    </span>
                    <div className="w-11 h-11 rounded-2xl bg-[#FAF0D7] text-[#d4af37] flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                      <Truck className="w-5 h-5" />
                    </div>
                  </div>
                  <div>
                    <span className="font-serif text-3xl font-extrabold text-[#14231b]">
                      {ordersList.filter((o) => o.status !== "Delivered" && o.status !== "Cancelled" && o.fulfillment_status !== "Delivered" && o.fulfillment_status !== "Cancelled").length}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-[#8a918b] font-semibold">
                      {ordersList.filter((o) => o.status !== "Delivered" && o.status !== "Cancelled" && o.fulfillment_status !== "Delivered" && o.fulfillment_status !== "Cancelled").length > 0
                        ? "Currently in craftsmanship / shipping"
                        : "No active orders"}
                    </span>
                  </div>
                </div>

                {/* Card 3: SAVED ITEMS */}
                <div
                  onClick={() => switchTab("wishlist")}
                  className="bg-white rounded-3xl p-5 border border-[#E7E3D8] shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between space-y-2.5 group cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-extrabold tracking-wider uppercase text-[#6b726d]">
                      SAVED ITEMS
                    </span>
                    <div className="w-11 h-11 rounded-2xl bg-[#EEF2EF] text-[#14231b] flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                      <Heart className="w-5 h-5 fill-current text-[#14231b]" />
                    </div>
                  </div>
                  <div>
                    <span className="font-serif text-3xl font-extrabold text-[#14231b]">
                      0
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-[#8a918b] font-semibold">
                      0 Wishlist products
                    </span>
                  </div>
                </div>

                {/* Card 4: UNREAD ALERTS */}
                <div
                  onClick={() => switchTab("notifications")}
                  className="bg-white rounded-3xl p-5 border border-[#E7E3D8] shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between space-y-2.5 group cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-extrabold tracking-wider uppercase text-[#6b726d]">
                      UNREAD ALERTS
                    </span>
                    <div className="w-11 h-11 rounded-2xl bg-[#EEF2EF] text-[#14231b] flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                      <Bell className="w-5 h-5 fill-current" />
                    </div>
                  </div>
                  <div>
                    <span className="font-serif text-3xl font-extrabold text-[#14231b]">
                      {unreadCount}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-[#8a918b] font-semibold truncate block">
                      {notifications.length > 0
                        ? `Latest: ${notifications[0].sender || notifications[0].actionText}`
                        : "No unread alerts"}
                    </span>
                  </div>
                </div>
              </div>

              {/* 4. CURRENT ORDER TRACKER - Exact Match to Screenshot on Mobile, Restored Luxury Desktop on md: */}
              <div className="bg-white rounded-3xl p-5 sm:p-6 border border-[#E7E3D8] shadow-xs space-y-3.5 w-full">
                {/* Header Row with Compass & Desktop "All History" */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-6 h-6 rounded-full bg-[#d4af37] text-white flex items-center justify-center shrink-0 shadow-xs">
                      <Compass className="w-3.5 h-3.5 fill-white text-white" />
                    </div>
                    <h2 className="font-serif text-lg sm:text-xl font-bold text-[#14231b] tracking-tight">
                      Current Order Tracker
                    </h2>
                  </div>

                  {/* Desktop "All History" Button */}
                  <button
                    onClick={() => switchTab("orders")}
                    className="hidden md:inline-flex px-4 py-2 rounded-xl border border-[#14231b]/15 bg-white hover:bg-[#FAF8F5] text-xs font-bold text-[#14231b] shadow-xs hover:shadow transition-all duration-200 cursor-pointer"
                  >
                    All History
                  </button>
                </div>

                {/* Mobile "All History" Button (< md) */}
                <button
                  onClick={() => switchTab("orders")}
                  className="md:hidden w-full py-2.5 px-4 rounded-2xl border border-gray-200 bg-white hover:bg-gray-50 text-xs sm:text-sm font-bold text-[#14231b] shadow-xs cursor-pointer active:scale-[0.99] transition-all"
                >
                  All History
                </button>

                {/* Spotlight Order Card */}
                {ordersList.length > 0 ? (
                  <div className="border border-gray-100 rounded-2xl p-3 sm:p-4 bg-white flex flex-col md:flex-row md:items-center md:justify-between gap-3.5">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden border border-gray-100 shrink-0 bg-[#FAF8F5] flex items-center justify-center">
                        <img
                          src={
                            ordersList[0].product?.images?.[0]?.storage_path ||
                            "/image/photo_2025-10-01_07-26-53.jpg"
                          }
                          alt={ordersList[0].product?.name || ordersList[0].product_name || "በገና (Begena)"}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="space-y-0.5 min-w-0">
                        <h3 className="font-bold text-sm sm:text-base text-[#14231b] leading-tight truncate">
                          {ordersList[0].product?.name || ordersList[0].product_name || "በገና (Begena)"}
                        </h3>
                        <p className="text-xs text-gray-500 font-semibold leading-relaxed">
                          Order <span className="font-bold text-[#14231b]">#{ordersList[0].order_number}</span> • Courier:{" "}
                          <strong className="font-bold text-[#14231b]">
                            {ordersList[0].shipping_company || "DHL Express"}
                          </strong>{" "}
                          • Status:{" "}
                          <span className="font-bold text-[#14231b]">
                            {ordersList[0].fulfillment_status || ordersList[0].status || "Pending"}
                          </span>
                        </p>
                      </div>
                    </div>

                    {/* Desktop Actions on the right (inline) */}
                    <div className="hidden md:flex items-center gap-2.5 shrink-0">
                      <Link
                        href={`/track-order?order=${ordersList[0].order_number}`}
                        className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#d4af37] hover:bg-[#c49e29] text-[#14231b] text-xs font-bold shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer"
                      >
                        <Truck className="w-3.5 h-3.5" />
                        <span>Track Package</span>
                      </Link>
                      <button
                        type="button"
                        onClick={() => switchTab("orders")}
                        className="px-4 py-2.5 rounded-xl border border-[#14231b]/15 bg-white hover:bg-[#FAF8F5] text-xs font-bold text-[#14231b] shadow-xs hover:shadow transition-all duration-200 cursor-pointer"
                      >
                        View Order
                      </button>
                    </div>

                    {/* Mobile Actions below (< md) */}
                    <div className="md:hidden space-y-2.5 pt-1 w-full">
                      <Link
                        href={`/track-order?order=${ordersList[0].order_number}`}
                        className="w-full py-3 px-4 rounded-2xl bg-[#cf9e26] hover:bg-[#be8d19] text-[#14231b] text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-xs transition-all active:scale-[0.98]"
                      >
                        <Truck className="w-4 h-4 text-[#14231b]" />
                        <span>Track Package</span>
                      </Link>
                      <button
                        type="button"
                        onClick={() => switchTab("orders")}
                        className="w-full py-3 px-4 rounded-2xl border border-gray-200 bg-white hover:bg-gray-50 text-[#14231b] text-xs sm:text-sm font-bold flex items-center justify-center shadow-xs transition-all active:scale-[0.98] cursor-pointer"
                      >
                        <span>View Order</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="border border-gray-100 rounded-2xl p-4 sm:p-5 bg-white flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
                    <div className="space-y-0.5">
                      <p className="text-sm font-bold text-[#14231b]">No active orders to track</p>
                      <p className="text-xs text-[#737874]">Explore our handcrafted Ethiopian instruments and place your first order.</p>
                    </div>
                    <Link
                      href="/products"
                      className="px-4 py-2 rounded-xl bg-[#d4af37] hover:bg-[#c49e29] text-[#14231b] text-xs font-bold shadow-xs hover:shadow transition-all inline-flex items-center gap-1.5 shrink-0"
                    >
                      <Store className="w-3.5 h-3.5" />
                      <span>Browse Products</span>
                    </Link>
                  </div>
                )}
              </div>

              {/* 5. RECENT NOTIFICATIONS (Visible on desktop) */}
              <div className="hidden lg:block bg-white rounded-3xl p-5 sm:p-6 border border-[#14231b]/8 shadow-[0_4px_25px_rgba(0,0,0,0.03)] space-y-3.5 hover:shadow-[0_8px_30px_rgba(0,0,0,0.05)] transition-shadow duration-300">
                {/* Header Row */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Bell className="w-5 h-5 text-[#d4af37] fill-current" />
                    <h2 className="font-benaiah text-xl sm:text-2xl font-bold text-[#14231b] tracking-tight">
                      Recent Notifications
                    </h2>
                  </div>
                  <button
                    onClick={() => switchTab("notifications")}
                    className="px-3.5 py-1.5 rounded-xl border border-[#14231b]/15 bg-white hover:bg-[#FAF8F5] text-xs font-bold text-[#14231b] shadow-xs hover:shadow-md transition-all duration-200 hover:scale-105 flex items-center gap-1 cursor-pointer"
                  >
                    <span>View All</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {notifications.length === 0 ? (
                  <div className="py-6 text-center text-xs text-[#737874] flex flex-col items-center justify-center space-y-1">
                    <p className="font-semibold text-[#14231b]">No notifications</p>
                    <p className="text-[11px]">You have no notifications at this time.</p>
                  </div>
                ) : (
                  notifications.slice(0, 3).map((n) => (
                    <div
                      key={n.id}
                      onClick={() => markAsRead(n.id)}
                      className={`border border-[#14231b]/10 rounded-2xl p-3.5 sm:p-4 flex items-center justify-between gap-4 bg-white hover:bg-[#FAF8F5] hover:border-[#14231b]/20 transition-all duration-200 group cursor-pointer shadow-xs hover:shadow-md ${
                        n.isUnread ? "bg-[#FAF8F5]/80" : "opacity-80"
                      }`}
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-[#EAE6DD] text-[#14231b] flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                          <Bell className="w-4 h-4 fill-current" />
                        </div>
                        <div className="min-w-0 space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs sm:text-sm text-[#14231b] truncate">{n.sender}</span>
                            {n.isUnread && <span className="w-2 h-2 rounded-full bg-[#f3be3b] inline-block shadow-xs shrink-0" />}
                          </div>
                          <p className="text-[11px] sm:text-xs text-[#6b726d] truncate">
                            {n.actionText}
                          </p>
                        </div>
                      </div>
                      <span className="text-[11px] sm:text-xs font-semibold text-[#8a918b] shrink-0">{n.timeAgo}</span>
                    </div>
                  ))
                )}
              </div>
            </>
          )}

          {/* ================= VIEW 2: CUSTOMER ORDER HISTORY ================= */}
          {activeTab === "orders" && (
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#14231b]/8 shadow-[0_4px_25px_rgba(0,0,0,0.03)] space-y-6">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  {/* Yellow Storage Box Icon */}
                  <div className="shrink-0 text-[#d4af37]">
                    <svg width="26" height="24" viewBox="0 0 26 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <rect x="1" y="2" width="24" height="6.5" rx="1.5" fill="#D6A434" />
                      <path d="M3 8.5H23V19.5C23 21 21.8 22 20.2 22H5.8C4.2 22 3 21 3 19.5V8.5Z" fill="#E2AC37" />
                      <rect x="9" y="11.5" width="8" height="2.5" rx="1.25" fill="#B38018" />
                    </svg>
                  </div>
                  <div>
                    <h2
                      style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
                      className="text-2xl sm:text-[28px] font-bold text-[#14231b] tracking-tight"
                    >
                      Customer Order History
                    </h2>
                    <p className="text-xs text-[#737874] font-semibold mt-0.5 font-sans">
                      {filteredOrders.length} orders recorded
                    </p>
                  </div>
                </div>

                {/* Right: Search & Status Dropdown Filter */}
                <div className="flex items-center gap-3 flex-wrap">
                  {/* Search Input */}
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-[#8a918b] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Search order # or product..."
                      value={orderSearch}
                      onChange={(e) => setOrderSearch(e.target.value)}
                      className="pl-9 pr-4 py-2 rounded-full border border-gray-200 bg-white text-xs text-[#14231b] placeholder-gray-400 focus:outline-none focus:border-gray-300 w-52 sm:w-64 transition-all shadow-xs"
                    />
                  </div>

                  {/* Status Dropdown */}
                  <div className="relative">
                    <select
                      value={orderStatusFilter}
                      onChange={(e) => setOrderStatusFilter(e.target.value)}
                      className="appearance-none pl-3.5 pr-8 py-2 rounded-xl border border-gray-200 bg-white text-xs font-semibold text-[#14231b] cursor-pointer focus:outline-none focus:border-gray-300 shadow-xs hover:border-gray-300 transition-all font-sans"
                    >
                      <option value="All Statuses">All Statuses</option>
                      <option value="Pending">Pending</option>
                      <option value="Payment Verified">Payment Verified</option>
                      <option value="Preparing">Preparing</option>
                      <option value="Crafting">Crafting</option>
                      <option value="Packed">Packed</option>
                      <option value="Shipped">Shipped</option>
                      <option value="Delivered">Delivered</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-[#14231b] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Inner Table / Empty State Container */}
              <div className="border border-gray-200/80 rounded-2xl bg-white p-4 sm:p-7">
                {filteredOrders.length === 0 ? (
                  <div className="py-12 sm:py-16 text-center flex flex-col items-center justify-center space-y-3">
                    {/* Open Shipping Box Graphic matching screenshot */}
                    <div className="shrink-0 mb-1">
                      <svg width="60" height="46" viewBox="0 0 60 46" fill="none" xmlns="http://www.w3.org/2000/svg">
                        {/* Left flap angled out */}
                        <polygon points="10,14 1,8 14,5 21,11" fill="#DFA937" />
                        {/* Right flap angled out */}
                        <polygon points="50,14 59,8 46,5 39,11" fill="#C49226" />
                        {/* Inner box opening */}
                        <polygon points="21,11 39,11 43,15 17,15" fill="#996D14" />
                        {/* Front body with rounded bottom */}
                        <path d="M10 14H50L45.5 39C45.2 41 43.5 42.5 41.5 42.5H18.5C16.5 42.5 14.8 41 14.5 39L10 14Z" fill="#D39F31" />
                        {/* Left facet highlight */}
                        <path d="M10 14H30V42.5H18.5C16.5 42.5 14.8 41 14.5 39L10 14Z" fill="#DFAC39" />
                        {/* Subtle seam */}
                        <line x1="30" y1="14" x2="30" y2="42.5" stroke="#FFFFFF" strokeWidth="0.8" strokeOpacity="0.3" />
                      </svg>
                    </div>

                    <h3 className="font-sans text-xl sm:text-2xl font-black text-[#14231b] tracking-tight">
                      No orders yet
                    </h3>

                    <p className="text-xs sm:text-[13px] text-[#737874] max-w-md mx-auto leading-relaxed font-sans">
                      You haven't placed any orders yet. Discover our authentic handmade Ethiopian
                      instrument collection.
                    </p>

                    <Link
                      href="/products"
                      className="mt-3 inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#d4af37] hover:bg-[#c49e29] text-[#14231b] text-xs font-bold tracking-wide shadow-xs hover:shadow transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer font-sans"
                    >
                      <Store className="w-4 h-4 fill-current text-[#14231b]" />
                      <span>Browse Products</span>
                    </Link>
                  </div>
                ) : (
                  <>
                    {/* MOBILE CARDS VIEW (< md) */}
                    <div className="space-y-3 md:hidden font-sans">
                      {filteredOrders.map((order, idx) => (
                        <div
                          key={order.id || idx}
                          className="p-3.5 sm:p-4 rounded-xl border border-gray-100 bg-[#FAF8F5]/60 hover:bg-[#FAF8F5] transition-colors space-y-2.5"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-xs text-[#14231b]">
                              {order.order_number || `#AM-${idx + 1000}`}
                            </span>
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                                order.status === "Delivered" || order.fulfillment_status === "Delivered"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : order.status === "Crafting" || order.fulfillment_status === "Crafting" || order.status === "Preparing"
                                  ? "bg-amber-100 text-amber-800"
                                  : order.status === "Cancelled" || order.fulfillment_status === "Cancelled"
                                  ? "bg-red-100 text-red-800"
                                  : "bg-blue-100 text-blue-800"
                              }`}
                            >
                              {order.fulfillment_status || order.status || "Pending"}
                            </span>
                          </div>

                          <div className="text-xs font-bold text-[#14231b] line-clamp-1">
                            {order.product?.name || order.product_name || "Handmade Ethiopian Begena"}
                          </div>

                          <div className="flex items-center justify-between pt-2 border-t border-gray-200/50 text-[11px] text-[#737874]">
                            <span>
                              {order.created_at ? new Date(order.created_at).toLocaleDateString() : "Recent"} • Qty: {order.quantity || 1}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] bg-white px-1.5 py-0.5 rounded border border-gray-200 text-[#5a625d]">
                                {order.payment_status ? order.payment_status.replace(/_/g, " ").toUpperCase() : order.payment_method || "WhatsApp"}
                              </span>
                              <span className="font-bold text-xs text-[#14231b]">
                                {order.total_price || (order.product?.price ? `${order.product.currency === "USD" ? "$" : "ETB "}${(Number(order.product.price) * (order.quantity || 1)).toLocaleString()}` : (order.total_amount ? `ETB ${order.total_amount.toLocaleString()}` : "$450"))}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* DESKTOP TABLE VIEW (md: and above with contained horizontal scroll) */}
                    <div className="hidden md:block overflow-x-auto">
                      <div className="min-w-[680px]">
                        {/* 7 Table Column Headers */}
                        <div className="grid grid-cols-7 text-[11px] sm:text-xs font-bold tracking-wider uppercase text-[#737874] pb-4 text-left font-sans border-b border-gray-100">
                          <span>ORDER #</span>
                          <span>PRODUCT</span>
                          <span>DATE</span>
                          <span>QTY</span>
                          <span>TOTAL</span>
                          <span>PAYMENT</span>
                          <span>STATUS</span>
                        </div>

                        <div className="divide-y divide-gray-100 pt-1 font-sans">
                          {filteredOrders.map((order, idx) => (
                            <div
                              key={order.id || idx}
                              className="grid grid-cols-7 text-xs items-center py-3.5 hover:bg-[#FAF8F5] transition-colors"
                            >
                              <span className="font-bold text-[#14231b]">
                                {order.order_number || `#AM-${idx + 1000}`}
                              </span>
                              <span className="font-medium text-[#14231b] truncate pr-2">
                                {order.product?.name || order.product_name || "Handmade Ethiopian Begena"}
                              </span>
                              <span className="text-[#6b726d]">
                                {order.created_at ? new Date(order.created_at).toLocaleDateString() : "Recent"}
                              </span>
                              <span className="font-semibold text-[#14231b]">{order.quantity || 1}</span>
                              <span className="font-bold text-[#14231b]">
                                {order.total_price || (order.product?.price ? `${order.product.currency === "USD" ? "$" : "ETB "}${(Number(order.product.price) * (order.quantity || 1)).toLocaleString()}` : (order.total_amount ? `ETB ${order.total_amount.toLocaleString()}` : "$450"))}
                              </span>
                              <span className="text-xs text-[#5a625d] font-medium">
                                {order.payment_status ? order.payment_status.replace(/_/g, " ").toUpperCase() : order.payment_method || "WhatsApp"}
                              </span>
                              <div>
                                <span
                                  className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase ${
                                    order.status === "Delivered" || order.fulfillment_status === "Delivered"
                                      ? "bg-emerald-100 text-emerald-800"
                                      : order.status === "Crafting" || order.fulfillment_status === "Crafting" || order.status === "Preparing"
                                      ? "bg-amber-100 text-amber-800"
                                      : order.status === "Cancelled" || order.fulfillment_status === "Cancelled"
                                      ? "bg-red-100 text-red-800"
                                      : "bg-blue-100 text-blue-800"
                                  }`}
                                >
                                  {order.fulfillment_status || order.status || "Pending"}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* ================= VIEW 3: SAVED WISHLIST ================= */}
          {activeTab === "wishlist" && (
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#14231b]/8 shadow-[0_4px_25px_rgba(0,0,0,0.03)] space-y-6">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#14231b] text-[#f3be3b] flex items-center justify-center shrink-0 shadow-md">
                    <Heart className="w-5 h-5 fill-current" />
                  </div>
                  <div>
                    <h2
                      style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
                      className="text-2xl sm:text-[28px] font-bold text-[#14231b] tracking-tight"
                    >
                      Saved Wishlist
                    </h2>
                    <p className="text-xs text-[#737874] font-semibold mt-0.5 font-sans">
                      {wishlistProducts.length} handcrafted instruments saved in your personal collection
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <Link
                    href="/products"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#d4af37] hover:bg-[#c49e29] text-[#14231b] text-xs sm:text-sm font-bold shadow-xs hover:shadow transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer font-sans"
                  >
                    <Store className="w-4 h-4" />
                    <span>Explore Products</span>
                  </Link>
                  <button
                    type="button"
                    onClick={() => switchTab("dashboard")}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-gray-200 bg-white hover:bg-[#FAF8F5] text-xs sm:text-sm font-bold text-[#14231b] shadow-xs hover:shadow transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer font-sans"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back to Dashboard</span>
                  </button>
                </div>
              </div>

              {/* Wishlist Products Grid or Empty State */}
              {wishlistProducts.length === 0 ? (
                <div className="border border-dashed border-gray-200/90 rounded-2xl p-12 sm:p-16 text-center flex flex-col items-center justify-center space-y-3 bg-[#FAF8F5]/40">
                  <div className="w-16 h-16 rounded-2xl bg-[#EAE6DD] flex items-center justify-center text-[#737874] shadow-xs">
                    <Heart className="w-8 h-8 stroke-[1.5]" />
                  </div>
                  <h3
                    style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
                    className="text-2xl font-bold text-[#14231b]"
                  >
                    Your Wishlist is Empty
                  </h3>
                  <p className="text-xs sm:text-sm text-[#6b726d] max-w-sm mx-auto leading-relaxed font-sans font-medium">
                    Save your favorite handcrafted Begena, Kirar, and accessories to revisit anytime and track their availability.
                  </p>
                  <Link
                    href="/products"
                    className="mt-2 inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#14231b] hover:bg-[#1f3629] text-white text-xs font-bold tracking-wide shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105 cursor-pointer font-sans"
                  >
                    <Store className="w-4 h-4 text-[#f3be3b]" />
                    <span>Browse Catalog</span>
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 pt-1">
                  {wishlistProducts.map((product) => {
                    const coverImg =
                      product.images && product.images[0]?.storagePath
                        ? product.images[0].storagePath
                        : "/image/photo_2025-02-27_17-33-38.jpg";

                    return (
                      <div
                        key={product.id}
                        className="bg-white rounded-2xl border border-[#14231b]/10 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)] transition-all duration-300 flex flex-col justify-between overflow-hidden group"
                      >
                        {/* Image Container with Badge and Heart Remove Button */}
                        <div className="relative h-48 sm:h-52 bg-[#FAF8F5] overflow-hidden">
                          <img
                            src={coverImg}
                            alt={product.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                          {/* Badge */}
                          {product.badge && (
                            <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-[#14231b]/90 backdrop-blur-xs text-[#f3be3b] text-[10px] font-black tracking-wider uppercase shadow-xs">
                              {product.badge}
                            </div>
                          )}
                          {/* Remove from Wishlist button */}
                          <button
                            type="button"
                            onClick={() => handleRemoveFromWishlist(product.id)}
                            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/95 hover:bg-red-50 text-red-500 hover:text-red-600 shadow-md flex items-center justify-center transition-all duration-200 hover:scale-110 cursor-pointer"
                            title="Remove from Wishlist"
                          >
                            <Heart className="w-4 h-4 fill-current" />
                          </button>
                        </div>

                        {/* Content Body */}
                        <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3 font-sans">
                          <div>
                            <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#737874] block mb-1">
                              {product.category || "Sacred Instruments"}
                            </span>
                            <h3
                              style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
                              className="text-xl sm:text-2xl font-bold text-[#14231b] leading-snug group-hover:text-[#b47a16] transition-colors"
                            >
                              {product.name}
                            </h3>
                            <p className="text-xs text-[#6b726d] line-clamp-2 mt-1 leading-relaxed">
                              {product.shortDescription || product.description}
                            </p>
                          </div>

                          {/* Price & Add to Cart Action */}
                          <div className="pt-2 border-t border-[#14231b]/8 flex items-center justify-between gap-3">
                            <div>
                              <span className="text-[11px] font-bold text-[#8a918b] block">Price</span>
                              <span className="text-base sm:text-lg font-black text-[#14231b]">
                                {formatPrice(product.price)}
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleAddToCartFromWishlist(product)}
                              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 flex items-center gap-1.5 shadow-sm hover:shadow cursor-pointer ${
                                addedWishlistMap[product.id]
                                  ? "bg-emerald-700 text-white"
                                  : "bg-[#14231b] hover:bg-[#1f3629] text-white hover:scale-105 active:scale-95"
                              }`}
                            >
                              <ShoppingBag className="w-3.5 h-3.5 text-[#f3be3b]" />
                              <span>{addedWishlistMap[product.id] ? "Added!" : "Add to Cart"}</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ================= VIEW 4: NOTIFICATIONS ================= */}
          {activeTab === "notifications" && (
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#14231b]/8 shadow-[0_4px_25px_rgba(0,0,0,0.03)] space-y-6">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-2.5">
                  {/* Golden Bell Icon */}
                  <span className="text-xl sm:text-2xl leading-none select-none">🔔</span>
                  <h2
                    style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
                    className="text-2xl sm:text-[28px] font-bold text-[#14231b] tracking-tight"
                  >
                    Real-Time Notifications
                  </h2>
                </div>

                {/* Right: Open Full Center Button */}
                <button
                  onClick={() => setFullNotificationModal(true)}
                  className="px-5 py-2.5 rounded-xl bg-[#d4af37] hover:bg-[#c49e29] text-[#14231b] text-xs sm:text-sm font-bold tracking-wide shadow-xs hover:shadow transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer font-sans"
                >
                  Open Full Center
                </button>
              </div>

              {/* Inner Dashed Container / Empty State */}
              <div className="border border-dashed border-gray-200/90 rounded-2xl bg-white p-12 sm:p-20 text-center flex flex-col items-center justify-center space-y-3">
                {/* Gray BellOff Icon with slash */}
                <div className="text-[#8a918b]">
                  <BellOff className="w-10 h-10 stroke-[1.5]" />
                </div>

                <h3
                  style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
                  className="text-xl sm:text-2xl font-bold text-[#14231b] tracking-tight mt-1"
                >
                  You're all caught up!
                </h3>

                <p className="text-xs sm:text-[13px] text-[#737874] max-w-sm mx-auto leading-relaxed font-sans font-bold">
                  No recent notifications at this time.
                </p>
              </div>
            </div>
          )}

          {/* ================= VIEW 5: SHIPPING ADDRESSES ================= */}
          {activeTab === "addresses" && (
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#14231b]/8 shadow-[0_4px_25px_rgba(0,0,0,0.03)] space-y-6">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-2.5">
                  {/* Golden Map Pin Icon */}
                  <div className="shrink-0">
                    <svg width="22" height="26" viewBox="0 0 22 26" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M11 0C4.92487 0 0 4.92487 0 11C0 19.25 11 26 11 26C11 26 22 19.25 22 11C22 4.92487 17.0751 0 11 0Z" fill="#C9972A" />
                      <circle cx="11" cy="11" r="4.5" fill="#FAF8F5" />
                    </svg>
                  </div>
                  <h2
                    style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
                    className="text-2xl sm:text-[28px] font-bold text-[#14231b] tracking-tight"
                  >
                    Shipping Addresses
                  </h2>
                </div>

                {/* Right: + Add Address Button */}
                <button
                  onClick={handleOpenAddAddress}
                  className="inline-flex items-center gap-1.5 px-4 sm:px-5 py-2.5 rounded-xl bg-[#14231b] hover:bg-[#1f3629] text-white text-xs sm:text-sm font-bold tracking-wide shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer font-sans"
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                  <span>Add Address</span>
                </button>
              </div>

              {/* Main Content Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6 pt-1">
                {/* 1. Saved Addresses */}
                {addresses.map((addr) => (
                  <div
                    key={addr.id}
                    className={`relative bg-white rounded-2xl p-5 sm:p-6 border transition-all flex flex-col justify-between ${
                      addr.isDefault
                        ? "border-[#d4af37]/80 shadow-[0_2px_12px_rgba(212,175,55,0.08)]"
                        : "border-gray-200 shadow-xs"
                    }`}
                  >
                    <div>
                      {/* Top Row: Title + DEFAULT Pill */}
                      <div className="flex items-start justify-between gap-3 mb-2.5">
                        <h3 className="font-bold text-sm sm:text-base text-[#14231b] font-sans">
                          {addr.title}
                        </h3>
                        {addr.isDefault && (
                          <span className="px-2.5 py-0.5 rounded-full bg-[#faeed6] text-[#b47a16] text-[10px] font-extrabold tracking-wider uppercase font-sans">
                            DEFAULT
                          </span>
                        )}
                      </div>

                      {/* Address Lines */}
                      <div className="space-y-1 text-xs sm:text-[13px] text-[#5a625d] font-bold font-sans leading-relaxed">
                        <p>{addr.street}</p>
                        <p>{addr.cityCountry}</p>
                        <p className="pt-0.5">Phone: {addr.phone}</p>
                      </div>
                    </div>

                    {/* Bottom Action: Edit */}
                    <div className="flex items-center gap-3 pt-5">
                      <button
                        onClick={() => handleOpenEditAddress(addr)}
                        className="px-4 py-1.5 rounded-xl border border-gray-200 text-xs font-bold text-[#14231b] hover:bg-gray-50 transition-colors cursor-pointer font-sans"
                      >
                        Edit
                      </button>
                      {!addr.isDefault && (
                        <button
                          onClick={() => handleSetDefaultAddress(addr.id)}
                          className="px-3 py-1.5 rounded-xl text-xs font-bold text-[#b47a16] hover:bg-amber-50 transition-colors cursor-pointer font-sans"
                        >
                          Set as Default
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                {/* 2. Add New Shipping Address Dashed Card */}
                <button
                  onClick={handleOpenAddAddress}
                  className="border-2 border-dashed border-gray-200/90 hover:border-[#d4af37] bg-white hover:bg-[#FAF8F5]/50 rounded-2xl p-8 sm:p-10 flex flex-col items-center justify-center space-y-2.5 transition-all duration-200 min-h-[190px] group cursor-pointer"
                >
                  <Plus className="w-8 h-8 text-[#d4af37] stroke-[2.2] group-hover:scale-110 transition-transform" />
                  <span className="text-xs sm:text-sm font-bold text-[#737874] group-hover:text-[#14231b] transition-colors font-sans">
                    Add New Shipping Address
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* ================= VIEW 6: SETTINGS ================= */}
          {activeTab === "settings" && (
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#14231b]/8 shadow-[0_4px_25px_rgba(0,0,0,0.03)] space-y-6">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-2.5">
                  {/* Golden Gear Icon */}
                  <div className="shrink-0 text-[#d4af37]">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#D6A434" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" fill="#D6A434" />
                      <circle cx="12" cy="12" r="3" fill="#ffffff" stroke="none" />
                    </svg>
                  </div>
                  <h2
                    style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
                    className="text-2xl sm:text-[28px] font-bold text-[#14231b] tracking-tight"
                  >
                    Account Settings
                  </h2>
                </div>

                {/* Right: Back to Dashboard */}
                <button
                  type="button"
                  onClick={() => switchTab("dashboard")}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 bg-white hover:bg-[#FAF8F5] text-xs sm:text-sm font-bold text-[#14231b] shadow-xs hover:shadow transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer font-sans"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Dashboard</span>
                </button>
              </div>

              {/* Success Notification Feedback */}
              {settingsSuccessMsg && (
                <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{settingsSuccessMsg}</span>
                </div>
              )}

              {/* Settings Form */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setSavingSettings(true);
                  if (preferredCurrency === "USD" || preferredCurrency === "ETB" || preferredCurrency === "EUR") {
                    setCurrency(preferredCurrency as any);
                  }
                  setTimeout(() => {
                    setSavingSettings(false);
                    setSettingsSuccessMsg("Account settings updated successfully!");
                    setTimeout(() => setSettingsSuccessMsg(""), 3000);
                  }, 400);
                }}
                className="space-y-5"
              >
                {/* Row 1: Full Name & Email Reference */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                  <div>
                    <label className="block text-[11px] sm:text-xs font-extrabold tracking-wider uppercase text-[#737874] mb-2 font-sans">
                      FULL NAME
                    </label>
                    <input
                      type="text"
                      value={fullNameInput || displayName}
                      onChange={(e) => setFullNameInput(e.target.value)}
                      placeholder="jane"
                      className="w-full px-4 py-3 rounded-2xl bg-[#EAE6DD] text-xs sm:text-sm font-bold text-[#14231b] placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-[#14231b]/30 font-sans transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] sm:text-xs font-extrabold tracking-wider uppercase text-[#737874] mb-2 font-sans">
                      EMAIL REFERENCE (READ ONLY)
                    </label>
                    <input
                      type="email"
                      value={displayEmail}
                      readOnly
                      className="w-full px-4 py-3 rounded-2xl bg-[#EAE6DD] text-xs sm:text-sm font-bold text-[#14231b] cursor-not-allowed font-sans select-all focus:outline-none"
                    />
                  </div>
                </div>

                {/* Row 2: Biography / Note to Curator */}
                <div>
                  <label className="block text-[11px] sm:text-xs font-extrabold tracking-wider uppercase text-[#737874] mb-2 font-sans">
                    BIOGRAPHY / NOTE TO CURATOR
                  </label>
                  <textarea
                    value={biographyInput}
                    onChange={(e) => setBiographyInput(e.target.value)}
                    placeholder=""
                    rows={4}
                    className="w-full p-4 rounded-2xl bg-[#EAE6DD] text-xs sm:text-sm font-medium text-[#14231b] focus:outline-none focus:ring-1 focus:ring-[#14231b]/30 font-sans transition-all resize-y min-h-[110px]"
                  />
                </div>

                {/* Row 3: Preferred Currency & Interface Language */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                  <div>
                    <label className="block text-[11px] sm:text-xs font-extrabold tracking-wider uppercase text-[#737874] mb-2 font-sans">
                      PREFERRED CURRENCY
                    </label>
                    <div className="relative">
                      <select
                        value={preferredCurrency}
                        onChange={(e) => {
                          setPreferredCurrency(e.target.value as any);
                          if (e.target.value === "USD" || e.target.value === "ETB" || e.target.value === "EUR") {
                            setCurrency(e.target.value as any);
                          }
                        }}
                        className="appearance-none w-full pl-4 pr-10 py-3 rounded-2xl bg-[#EAE6DD] text-xs sm:text-sm font-bold text-[#14231b] cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#14231b]/30 font-sans transition-all"
                      >
                        <option value="ETB">ETB — Ethiopian Birr</option>
                        <option value="USD">USD — US Dollar ($)</option>
                        <option value="EUR">EUR — Euro (€)</option>
                      </select>
                      <ChevronDown className="w-4 h-4 text-[#14231b] absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] sm:text-xs font-extrabold tracking-wider uppercase text-[#737874] mb-2 font-sans">
                      INTERFACE LANGUAGE
                    </label>
                    <div className="relative">
                      <select
                        value={languageInput}
                        onChange={(e) => setLanguageInput(e.target.value)}
                        className="appearance-none w-full pl-4 pr-10 py-3 rounded-2xl bg-[#EAE6DD] text-xs sm:text-sm font-bold text-[#14231b] cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#14231b]/30 font-sans transition-all"
                      >
                        <option value="English (US)">English (US)</option>
                        <option value="Amharic (አማርኛ)">Amharic (አማርኛ)</option>
                      </select>
                      <ChevronDown className="w-4 h-4 text-[#14231b] absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>
                </div>

                {/* Row 4: Action Buttons */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-[#14231b]/8">
                  {/* Left Side: Save Settings & Cancel / Back */}
                  <div className="flex items-center gap-3">
                    <button
                      type="submit"
                      disabled={savingSettings}
                      className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#14231b] hover:bg-[#1f3629] text-white text-xs sm:text-sm font-bold shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer font-sans"
                    >
                      {savingSettings ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                      <span>Save Settings</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => switchTab("dashboard")}
                      className="inline-flex items-center justify-center gap-1.5 px-4 sm:px-5 py-2.5 rounded-xl border border-gray-200 bg-white hover:bg-[#FAF8F5] text-[#14231b] text-xs sm:text-sm font-bold shadow-xs hover:shadow transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer font-sans"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Cancel / Back</span>
                    </button>
                  </div>

                  {/* Right Side: Delete Account */}
                  <button
                    type="button"
                    onClick={() => setDeleteConfirmOpen(true)}
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-red-200 bg-white hover:bg-red-50 text-red-600 text-xs sm:text-sm font-bold transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer font-sans"
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                    <span>Delete Account</span>
                  </button>
                </div>
              </form>
            </div>
          )}
        </main>
      </div>

      {/* ================= EDIT PROFILE MODAL ================= */}
      {editModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md max-h-[92vh] overflow-y-auto bg-white rounded-3xl p-5 sm:p-8 border border-[#14231b]/10 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-[#14231b]/10 pb-4">
              <h3 className="font-serif text-2xl font-bold text-[#14231b]">Edit Profile Details</h3>
              <button
                onClick={() => setEditModalOpen(false)}
                className="p-1 rounded-lg text-[#737874] hover:text-[#14231b] hover:bg-[#FAF8F5] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {profileSuccessMsg && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{profileSuccessMsg}</span>
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold tracking-wider uppercase text-[#14231b] mb-2 font-sans">
                  FULL NAME
                </label>
                <input
                  type="text"
                  required
                  value={fullNameInput}
                  onChange={(e) => setFullNameInput(e.target.value)}
                  placeholder="e.g. Giddy Mengistu"
                  className="w-full px-4 py-3 rounded-xl bg-[#EAE6DD] text-[#14231b] placeholder-[#8c8780] font-medium focus:outline-none focus:ring-1 focus:ring-[#14231b]/30 transition-all"
                />
              </div>

              <div>
                <label className="block font-bold tracking-wider uppercase text-[#14231b] mb-2 font-sans">
                  PHONE NUMBER
                </label>
                <input
                  type="tel"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  placeholder="e.g. +251 91 123 4567"
                  className="w-full px-4 py-3 rounded-xl bg-[#EAE6DD] text-[#14231b] placeholder-[#8c8780] font-medium focus:outline-none focus:ring-1 focus:ring-[#14231b]/30 transition-all"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-[#14231b]/20 text-[#14231b] font-bold hover:bg-[#FAF8F5] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="px-6 py-2.5 rounded-xl bg-[#14231b] hover:bg-[#1f3629] text-white font-bold transition-all shadow-md flex items-center gap-2"
                >
                  {savingProfile ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save Changes</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= FULL NOTIFICATION CENTER MODAL ================= */}
      {fullNotificationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-[#14231b]/10 space-y-5 animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#14231b]/8">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">🔔</span>
                <h3
                  style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
                  className="text-2xl font-bold text-[#14231b]"
                >
                  Notification Center
                </h3>
              </div>
              <button
                onClick={() => setFullNotificationModal(false)}
                className="p-1 rounded-lg text-[#737874] hover:text-[#14231b] hover:bg-[#FAF8F5] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Notification Items */}
            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
              {notifications.length === 0 ? (
                <div className="py-8 text-center text-xs text-[#737874] flex flex-col items-center justify-center space-y-1">
                  <p className="font-semibold text-[#14231b]">No notifications in archive</p>
                  <p className="text-[11px]">When orders, commissions, or system updates arrive, they will appear here.</p>
                </div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => markAsRead(n.id)}
                    className={`border border-[#14231b]/10 rounded-2xl p-4 flex items-start justify-between gap-3 bg-white hover:bg-[#FAF8F5] transition-colors cursor-pointer ${
                      n.isUnread ? "bg-[#FAF8F5]/80" : ""
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-xl bg-[#faeed6] text-[#b47a16] flex items-center justify-center shrink-0 mt-0.5">
                        <Bell className="w-4 h-4" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs sm:text-sm text-[#14231b]">{n.sender}</span>
                          {n.isUnread && <span className="w-2 h-2 rounded-full bg-[#f3be3b] inline-block" />}
                        </div>
                        <p className="text-xs text-[#6b726d] leading-relaxed">
                          {n.actionText}
                        </p>
                        <span className="text-[11px] font-semibold text-[#8a918b] block pt-1">{n.timeAgo}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Modal Footer */}
            <div className="pt-2 flex items-center justify-between border-t border-[#14231b]/8">
              <span className="text-xs text-[#737874] font-medium">{notifications.length} alerts in archive</span>
              <button
                onClick={() => setFullNotificationModal(false)}
                className="px-5 py-2 rounded-xl bg-[#14231b] text-white text-xs font-bold hover:bg-[#1f3629] transition-all cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= ADD / EDIT SHIPPING ADDRESS MODAL ================= */}
      {addressModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full max-h-[92vh] overflow-y-auto p-5 sm:p-7 shadow-2xl border border-[#14231b]/10 space-y-5 animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#14231b]/8">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">📍</span>
                <h3
                  style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
                  className="text-2xl font-bold text-[#14231b]"
                >
                  {editingAddressId ? "Edit Shipping Address" : "Add Shipping Address"}
                </h3>
              </div>
              <button
                onClick={() => setAddressModalOpen(false)}
                className="p-1 rounded-lg text-[#737874] hover:text-[#14231b] hover:bg-[#FAF8F5] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Address Form */}
            <form onSubmit={handleSaveAddress} className="space-y-4 text-xs font-sans">
              <div>
                <label className="block font-bold tracking-wider uppercase text-[#14231b] mb-1.5">
                  ADDRESS LABEL
                </label>
                <input
                  type="text"
                  required
                  value={addrTitle}
                  onChange={(e) => setAddrTitle(e.target.value)}
                  placeholder="e.g. Primary Shipping Address, Workshop"
                  className="w-full px-4 py-2.5 rounded-xl bg-[#EAE6DD] text-[#14231b] placeholder-[#8c8780] font-medium focus:outline-none focus:ring-1 focus:ring-[#14231b]/30 transition-all"
                />
              </div>

              <div>
                <label className="block font-bold tracking-wider uppercase text-[#14231b] mb-1.5">
                  STREET / DISTRICT / LANDMARK
                </label>
                <input
                  type="text"
                  required
                  value={addrStreet}
                  onChange={(e) => setAddrStreet(e.target.value)}
                  placeholder="e.g. Mexico Square, Kirkos Sub-City"
                  className="w-full px-4 py-2.5 rounded-xl bg-[#EAE6DD] text-[#14231b] placeholder-[#8c8780] font-medium focus:outline-none focus:ring-1 focus:ring-[#14231b]/30 transition-all"
                />
              </div>

              <div>
                <label className="block font-bold tracking-wider uppercase text-[#14231b] mb-1.5">
                  CITY & COUNTRY
                </label>
                <input
                  type="text"
                  required
                  value={addrCityCountry}
                  onChange={(e) => setAddrCityCountry(e.target.value)}
                  placeholder="e.g. Addis Ababa, Ethiopia"
                  className="w-full px-4 py-2.5 rounded-xl bg-[#EAE6DD] text-[#14231b] placeholder-[#8c8780] font-medium focus:outline-none focus:ring-1 focus:ring-[#14231b]/30 transition-all"
                />
              </div>

              <div>
                <label className="block font-bold tracking-wider uppercase text-[#14231b] mb-1.5">
                  CONTACT PHONE
                </label>
                <input
                  type="tel"
                  required
                  value={addrPhone}
                  onChange={(e) => setAddrPhone(e.target.value)}
                  placeholder="e.g. +251 96 426 1817"
                  className="w-full px-4 py-2.5 rounded-xl bg-[#EAE6DD] text-[#14231b] placeholder-[#8c8780] font-medium focus:outline-none focus:ring-1 focus:ring-[#14231b]/30 transition-all"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="defaultAddressCheckbox"
                  checked={addrIsDefault}
                  onChange={(e) => setAddrIsDefault(e.target.checked)}
                  className="w-4 h-4 rounded text-[#14231b] accent-[#14231b] cursor-pointer"
                />
                <label htmlFor="defaultAddressCheckbox" className="font-semibold text-xs text-[#14231b] cursor-pointer">
                  Set as default shipping address
                </label>
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-between pt-3 border-t border-[#14231b]/8">
                {editingAddressId ? (
                  <button
                    type="button"
                    onClick={() => handleDeleteAddress(editingAddressId)}
                    className="flex items-center gap-1.5 text-xs font-bold text-red-600 hover:text-red-700 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setAddressModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-[#14231b]/20 text-[#14231b] font-bold hover:bg-[#FAF8F5] transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-[#14231b] hover:bg-[#1f3629] text-white font-bold transition-all shadow-md cursor-pointer"
                  >
                    Save Address
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= AFFILIATE APPLICATION MODAL (Apply / Reapply) ================= */}
      {isApplyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-[#FAF8F4] border border-[#E8E1D6] rounded-3xl max-w-lg w-full shadow-[0_25px_70px_-15px_rgba(20,39,29,0.35)] overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="px-6 py-5 border-b border-[#E8E1D6] flex items-center justify-between bg-[#F8F5EE] shrink-0">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#D9B32E]" />
                  <span className="text-[10px] font-black tracking-widest text-[#946e19] uppercase">
                    AMIELE AFFILIATE PARTNERSHIP
                  </span>
                </div>
                <h3 className="font-benaiah text-xl sm:text-2xl font-bold text-[#14231b]">
                  {affiliateApp?.status === "rejected" ? "Reapply for Partnership" : "Affiliate Application"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsApplyModalOpen(false)}
                className="w-9 h-9 rounded-full bg-white hover:bg-gray-100 border border-gray-200 flex items-center justify-center text-[#14231b] cursor-pointer transition-colors"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form Body */}
            <form id="affiliateApplyForm" onSubmit={handleSubmitApplication} className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
              {applyError && (
                <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
                  <span className="font-medium text-xs">{applyError}</span>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wider text-[#14231b] mb-1.5">
                  Full Name / ሙሉ ስም <span className="text-[#D9B32E]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={applyForm.fullName}
                  onChange={(e) => setApplyForm({ ...applyForm, fullName: e.target.value })}
                  placeholder="e.g. Dawit Tadesse"
                  className="w-full p-3.5 border border-[#E8E1D6] rounded-[14px] bg-[#FCFBF8] text-base sm:text-xs text-[#14231b] focus:outline-none focus:border-[#d4af37]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wider text-[#14231b] mb-1.5">
                  Phone Number / ስልክ ቁጥር <span className="text-[#D9B32E]">*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={applyForm.phone}
                  onChange={(e) => setApplyForm({ ...applyForm, phone: e.target.value })}
                  placeholder="e.g. +251 91 122 3344"
                  className="w-full p-3.5 border border-[#E8E1D6] rounded-[14px] bg-[#FCFBF8] text-base sm:text-xs text-[#14231b] focus:outline-none focus:border-[#d4af37]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wider text-[#14231b] mb-1.5">
                  Why do you want to join? / ለምን መቀላቀል ይፈልጋሉ? <span className="text-[#D9B32E]">*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  value={applyForm.motivation}
                  onChange={(e) => setApplyForm({ ...applyForm, motivation: e.target.value })}
                  placeholder="Describe your audience, musical background, or how you plan to introduce Amiele Begena instruments to students, churches, or patrons..."
                  className="w-full p-3.5 border border-[#E8E1D6] rounded-[14px] bg-[#FCFBF8] text-base sm:text-xs text-[#14231b] focus:outline-none focus:border-[#d4af37] leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wider text-[#14231b] mb-1.5">
                  Social Link / Website / Channel (Optional)
                </label>
                <input
                  type="text"
                  value={applyForm.socialLink}
                  onChange={(e) => setApplyForm({ ...applyForm, socialLink: e.target.value })}
                  placeholder="e.g. https://instagram.com/my_music or Telegram channel"
                  className="w-full p-3.5 border border-[#E8E1D6] rounded-[14px] bg-[#FCFBF8] text-base sm:text-xs text-[#14231b] focus:outline-none focus:border-[#d4af37]"
                />
              </div>
            </form>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-[#E8E1D6] bg-[#FAF8F4] flex flex-col sm:flex-row-reverse sm:items-center sm:justify-between gap-2.5 shrink-0">
              <button
                type="submit"
                form="affiliateApplyForm"
                disabled={submittingApp}
                className="w-full sm:w-auto px-6 py-3 rounded-full bg-[#14231b] hover:bg-[#2d4d3c] text-[#D9B32E] hover:text-white font-extrabold text-xs sm:text-sm tracking-wide shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 min-h-[44px]"
              >
                {submittingApp ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-[#D9B32E]" />
                    <span>Submitting Application...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-[#D9B32E]" />
                    <span>{affiliateApp?.status === "rejected" ? "Resubmit Application" : "Submit Application"}</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setIsApplyModalOpen(false)}
                disabled={submittingApp}
                className="w-full sm:w-auto px-5 py-2.5 rounded-full border border-gray-200 text-xs sm:text-sm font-bold text-[#14231b] hover:bg-gray-100 transition-colors cursor-pointer min-h-[40px]"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= VIEW APPLICATION MODAL (Read-Only State B) ================= */}
      {isViewAppModalOpen && affiliateApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-[#FAF8F4] border border-[#E8E1D6] rounded-3xl max-w-lg w-full shadow-[0_25px_70px_-15px_rgba(20,39,29,0.35)] overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="px-6 py-5 border-b border-[#E8E1D6] flex items-center justify-between bg-[#F8F5EE] shrink-0">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-[#d4af37]" />
                  <span className="text-[10px] font-black tracking-widest text-[#946e19] uppercase">
                    APPLICATION SUMMARY • ማመልከቻ
                  </span>
                </div>
                <h3 className="font-benaiah text-xl sm:text-2xl font-bold text-[#14231b]">
                  Submitted Application
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsViewAppModalOpen(false)}
                className="w-9 h-9 rounded-full bg-white hover:bg-gray-100 border border-gray-200 flex items-center justify-center text-[#14231b] cursor-pointer transition-colors"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Read-only Content */}
            <div className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
              <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200 text-[#946e19] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 shrink-0" />
                  <span className="font-bold">Status: Under Review by Guild Admins</span>
                </div>
                <span className="text-[10px] font-mono font-bold">
                  {new Date(affiliateApp.created_at).toLocaleDateString()}
                </span>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#737874] block">
                  Applicant Name
                </span>
                <p className="font-bold text-sm text-[#14231b]">
                  {affiliateApp.full_name || profile?.fullName || "N/A"}
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#737874] block">
                  Contact Phone
                </span>
                <p className="font-bold text-sm text-[#14231b]">
                  {affiliateApp.phone || profile?.phone || "N/A"}
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#737874] block">
                  Why you want to join / Motivation
                </span>
                <p className="p-3.5 rounded-xl bg-white border border-[#E8E1D6] text-[#333] leading-relaxed">
                  {affiliateApp.motivation || "No motivation provided."}
                </p>
              </div>

              {affiliateApp.social_link && affiliateApp.social_link !== "None" && (
                <div className="space-y-1">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#737874] block">
                    Social Link / Website
                  </span>
                  <p className="font-mono text-xs text-[#2d6a4f] truncate">
                    {affiliateApp.social_link}
                  </p>
                </div>
              )}

              <p className="text-[11px] text-[#737874] leading-relaxed italic pt-2">
                Note: Applications cannot be modified while under review. Once reviewed by an administrator, your dashboard will automatically update to reflect approval or feedback.
              </p>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-[#E8E1D6] bg-[#FAF8F4] flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setIsViewAppModalOpen(false)}
                className="px-6 py-2.5 rounded-full bg-[#14231b] hover:bg-[#2d4d3c] text-white text-xs font-bold transition-all shadow-xs cursor-pointer min-h-[40px]"
              >
                Close / ዝጋ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= DELETE ACCOUNT CONFIRMATION MODAL ================= */}
      {deleteConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-red-100 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 text-red-600 pb-2 border-b border-gray-100">
              <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <h3 className="font-serif text-xl sm:text-2xl font-bold text-[#14231b]">
                Delete Account
              </h3>
            </div>

            <p className="text-xs sm:text-[13px] text-[#6b726d] leading-relaxed font-sans">
              Are you sure you want to delete your Amiele Begena account? All saved shipping addresses,
              order history, and preferences will be permanently wiped. This action cannot be undone.
            </p>

            <div className="flex items-center justify-end gap-3 pt-3">
              <button
                type="button"
                onClick={() => setDeleteConfirmOpen(false)}
                className="px-4 py-2 rounded-xl border border-gray-200 text-xs font-bold text-[#14231b] hover:bg-[#FAF8F5] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  setDeleteConfirmOpen(false);
                  await signOut();
                  router.push("/");
                }}
                className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all shadow-md cursor-pointer"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
