"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { useCurrency, Currency } from "../context/CurrencyContext";
import {
  ShoppingCart,
  User as UserIcon,
  ChevronDown,
  ChevronRight,
  Menu,
  X,
  Bell,
  LogOut,
  Home,
  ShoppingBag,
  Info,
  Users,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";
import NotificationFlyout from "./NotificationFlyout";
import { useScrollLock, forceUnlockScroll } from "../lib/useScrollLock";

export default function Navbar() {
  const pathname = usePathname();
  const { totalCount, openCart } = useCart();
  const { user, profile, signOut } = useAuth();
  const { currency, setCurrency } = useCurrency();

  const displayName =
    profile?.fullName || user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Member";

  const [scrolled, setScrolled] = useState(false);
  const [currencyOpen, setCurrencyOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Prevent background window scrolling while mobile navigation menu is open
  useScrollLock(mobileMenuOpen);

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY || document.documentElement.scrollTop || window.pageYOffset || 0;
      setScrolled(scrollY > 20);
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close mobile menu, dropdowns, and release any active scroll lock on route changes
  useEffect(() => {
    setMobileMenuOpen(false);
    setCurrencyOpen(false);
    forceUnlockScroll();
  }, [pathname]);

  // Keyboard accessibility: close open menus on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMobileMenuOpen(false);
        setCurrencyOpen(false);
      }
    };
    if (mobileMenuOpen || currencyOpen) {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [mobileMenuOpen, currencyOpen]);

  const navLinks = [
    { name: "HOME", href: "/" },
    { name: "PRODUCTS", href: "/products" },
    { name: "ABOUT PRODUCT", href: "/about-product" },
    { name: "ABOUT US", href: "/about" },
  ];

  const currencies: Currency[] = ["ETB", "USD", "EUR"];

  // Fullscreen Portal views suppress the public storefront navbar
  if (
    pathname?.startsWith("/affiliate/dashboard") ||
    pathname?.startsWith("/affiliate-dashboard") ||
    pathname === "/affiliate/portal" ||
    pathname?.startsWith("/admin")
  ) {
    return null;
  }

  return (
    <>
      {/* Spacer to prevent layout shift and keep top content aligned below full-width navbar */}
      <div className="h-[72px] w-full shrink-0 bg-[#FAF8F5]" aria-hidden="true" />

      {/* Fixed Sticky-on-scroll Header Container */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 w-full pointer-events-none nav-container-transition ${
          scrolled ? "pt-2.5 px-3 sm:px-5 lg:px-6" : "pt-0 px-0"
        }`}
      >
        <div
          className={`pointer-events-auto nav-transition flex items-center justify-between ${
            scrolled
              ? "w-full max-w-full mx-auto rounded-full px-3.5 sm:px-8 lg:px-16 py-2 bg-[#FAF8F5]/98 backdrop-blur-2xl border border-[#14231b]/15 shadow-xl"
              : "w-full max-w-full rounded-none px-4 sm:px-8 lg:px-20 h-[72px] bg-[#FAF8F5] border-none shadow-none"
          }`}
        >
          {/* Brand Logo in Benaiah Font (Scaled appropriately on small mobile screens to prevent crowding) */}
          <Link href="/" className="flex items-center gap-2 group shrink-0">
            <span className="font-benaiah text-base min-[360px]:text-lg min-[380px]:text-xl sm:text-2xl lg:text-3xl font-extrabold text-[#14231b] tracking-wide group-hover:text-[#2d6a4f] transition-colors whitespace-nowrap">
              ዓሚኤል በገና
            </span>
          </Link>

          {/* Center Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6 lg:gap-8">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  className={`text-[11px] lg:text-xs font-bold tracking-widest uppercase transition-all relative py-1 ${
                    isActive
                      ? "text-[#14231b]"
                      : "text-[#14231b]/70 hover:text-[#14231b]"
                  }`}
                >
                  <span>{link.name}</span>
                  {isActive && (
                    <span className="absolute bottom-0 left-0 w-full h-[2px] bg-[#14231b] rounded-full" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Right Actions: Desktop shows full controls; Mobile (<768px) shows Cart then Hamburger */}
          <div className="flex items-center gap-2 sm:gap-3 lg:gap-4 shrink-0">
            {/* Currency Switcher Dropdown - Desktop only (moved into menu on mobile) */}
            <div className="hidden md:block relative">
              <button
                type="button"
                onClick={() => setCurrencyOpen(!currencyOpen)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#14231b]/20 bg-[#DFDAD0]/50 text-xs font-bold text-[#14231b] hover:bg-[#DFDAD0] transition-all cursor-pointer min-h-[38px]"
                aria-label="Select currency"
              >
                <span>{currency}</span>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-[#14231b] transition-transform ${
                    currencyOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {currencyOpen && (
                <div className="absolute right-0 mt-2 w-28 py-1 rounded-xl border border-[#14231b]/20 bg-[#F4F1EA] shadow-xl z-50">
                  {currencies.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => {
                        setCurrency(c);
                        setCurrencyOpen(false);
                      }}
                      className={`w-full px-3 py-1.5 text-left text-xs font-bold transition-colors cursor-pointer ${
                        currency === c
                          ? "bg-[#14231b] text-white"
                          : "text-[#14231b] hover:bg-[#DFDAD0]"
                      }`}
                      aria-label={`Select ${c}`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Notification Flyout - Desktop header only (moved into hamburger menu on mobile) */}
            <div className="hidden md:flex items-center">
              <NotificationFlyout
                triggerStyle="transparent"
                buttonClassName="relative min-w-[44px] min-h-[44px] w-11 h-11 text-[#14231b] hover:text-[#2d6a4f] transition-transform active:scale-95 cursor-pointer flex items-center justify-center rounded-full"
              />
            </div>

            {/* Cart Icon Button - Always visible on mobile and desktop */}
            <button
              type="button"
              onClick={openCart}
              className="relative min-w-[44px] min-h-[44px] w-11 h-11 text-[#14231b] hover:text-[#2d6a4f] transition-transform active:scale-95 cursor-pointer flex items-center justify-center rounded-full"
              aria-label={totalCount > 0 ? `Open cart, ${totalCount} items` : "Open cart"}
            >
              <ShoppingCart className="w-5 h-5 stroke-[1.8]" />
              {totalCount > 0 && (
                <span
                  style={{ top: "-4px", right: "-4px" }}
                  className="absolute min-w-[18px] h-[18px] px-1 rounded-full bg-[#e63946] text-white text-[10px] font-bold flex items-center justify-center shadow-xs pointer-events-none"
                >
                  {totalCount}
                </span>
              )}
            </button>

            {/* User Account Icon - Desktop only (moved into menu on mobile) */}
            <Link
              href={user ? "/account" : "/login"}
              className="hidden md:flex p-2 text-[#512c85] hover:text-[#2d6a4f] transition-transform hover:scale-105 items-center justify-center rounded-full min-h-[40px] min-w-[40px]"
              aria-label="User Account"
            >
              <UserIcon className="w-5 h-5 fill-current" />
            </Link>

            {/* Mobile Menu (Hamburger) Button - Far right, >=44x44px, >=8px gap from cart */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden min-w-[44px] min-h-[44px] w-11 h-11 p-2 text-[#14231b] hover:text-[#2d6a4f] rounded-lg cursor-pointer flex items-center justify-center transition-colors"
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-nav-menu"
            >
              {mobileMenuOpen ? (
                <X className="w-6 h-6 stroke-[2]" />
              ) : (
                <Menu className="w-6 h-6 stroke-[2]" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Semi-Transparent Dark Backdrop */}
        {mobileMenuOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200 pointer-events-auto md:hidden"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* Mobile Slide-Out Drawer (100dvh with overflow-y: auto) */}
        {mobileMenuOpen && (
          <div
            id="mobile-nav-menu"
            role="region"
            aria-label="Mobile Navigation Menu"
            className="fixed top-0 right-0 bottom-0 z-50 h-[100dvh] w-[86%] min-[400px]:w-[80%] sm:w-[360px] max-w-[380px] bg-[#FAF8F5] border-l border-[#E8E1D6] shadow-2xl flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-200 p-4 sm:p-5 pointer-events-auto md:hidden font-sans"
          >
            {/* Top Container: Header + Profile Card + Nav Links */}
            <div className="flex flex-col w-full space-y-3">
              {/* 1. Drawer Header */}
              <div className="flex items-center justify-between pb-3 border-b border-[#E8E1D6]/80 shrink-0">
                <div className="flex items-center gap-2.5">
                  {/* Brand Icon: rounded dark square with gold lyre */}
                  <div className="w-10 h-10 rounded-2xl bg-[#14231b] flex items-center justify-center text-[#d4af37] shadow-xs shrink-0">
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M9 18V5l12-2v13" />
                      <circle cx="6" cy="18" r="3" />
                      <circle cx="18" cy="16" r="3" />
                    </svg>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-benaiah font-bold text-base text-[#14231b] leading-tight">
                      ዓሚኤል በገና
                    </span>
                    <span className="text-[9px] font-extrabold tracking-widest text-[#737874] uppercase font-sans">
                      AMIELE BEGENA
                    </span>
                  </div>
                </div>

                {/* Close Button X */}
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-9 h-9 rounded-full flex items-center justify-center text-[#14231b] hover:bg-[#EAE5D9] transition-colors cursor-pointer"
                  aria-label="Close menu"
                >
                  <X className="w-5 h-5 stroke-[2]" />
                </button>
              </div>

              {/* 2. User Profile Card */}
              {user ? (
                <Link
                  href="/account"
                  onClick={() => setMobileMenuOpen(false)}
                  className="bg-white rounded-2xl p-3 border border-[#E8E1D6] shadow-2xs flex items-center justify-between gap-3 transition-all hover:border-[#d4af37]/60 group shrink-0"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-full bg-[#14231b] border-2 border-[#d4af37]/40 flex items-center justify-center text-[#d4af37] font-serif font-black text-sm shrink-0 overflow-hidden shadow-2xs">
                      {profile?.avatarUrl ? (
                        <img
                          src={profile.avatarUrl}
                          alt={displayName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span>{displayName.slice(0, 2).toUpperCase()}</span>
                      )}
                    </div>
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs sm:text-sm text-[#14231b] truncate">
                          {displayName}
                        </span>
                        <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 inline-block" />
                      </div>
                      <p className="text-[11px] text-[#737874] truncate font-medium">
                        {user.email || "customer@amiele.et"}
                      </p>
                    </div>
                  </div>
                  <div className="w-7 h-7 rounded-full bg-[#FAF8F5] border border-[#E8E1D6] flex items-center justify-center text-[#14231b] shrink-0 group-hover:bg-[#14231b] group-hover:text-white transition-colors">
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </Link>
              ) : (
                <Link
                  href={`/login?redirect=${encodeURIComponent(pathname || "/")}`}
                  onClick={() => setMobileMenuOpen(false)}
                  className="bg-white rounded-2xl p-3 border border-[#E8E1D6] shadow-2xs flex items-center justify-between gap-3 transition-all hover:border-[#d4af37]/60 group shrink-0"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-full bg-[#14231b] border-2 border-[#d4af37]/40 flex items-center justify-center text-[#d4af37] shrink-0 shadow-2xs">
                      <UserIcon className="w-5 h-5 text-[#d4af37]" />
                    </div>
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs sm:text-sm text-[#14231b] truncate">
                          Guest / እንግዳ
                        </span>
                        <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0 inline-block" />
                      </div>
                      <p className="text-[11px] text-[#737874] truncate font-medium">
                        Sign in for your orders / ይግቡ
                      </p>
                    </div>
                  </div>
                  <div className="w-7 h-7 rounded-full bg-[#FAF8F5] border border-[#E8E1D6] flex items-center justify-center text-[#14231b] shrink-0 group-hover:bg-[#14231b] group-hover:text-white transition-colors">
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </Link>
              )}

              {/* 3. Navigation Links List */}
              <div className="w-full space-y-1 pt-1">
                {/* 1. Home / ዋና ገጽ */}
                <Link
                  href="/"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl transition-all ${
                    pathname === "/"
                      ? "bg-[#14231b] text-white shadow-xs"
                      : "text-[#14231b] hover:bg-white"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {pathname === "/" && (
                      <div className="w-1 h-5 rounded-full bg-[#d4af37] shrink-0 -ml-1" />
                    )}
                    <Home
                      className={`w-5 h-5 shrink-0 ${
                        pathname === "/" ? "text-[#d4af37]" : "text-[#737874]"
                      }`}
                    />
                    <span className="font-bold text-sm truncate">Home / ዋና ገጽ</span>
                  </div>
                  <span
                    className={`text-xs font-mono font-bold tracking-wider shrink-0 ${
                      pathname === "/" ? "text-[#d4af37]" : "text-[#8a918b]"
                    }`}
                  >
                    01
                  </span>
                </Link>

                {/* 2. Products / ምርቶች */}
                <Link
                  href="/products"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl transition-all ${
                    pathname.startsWith("/products")
                      ? "bg-[#14231b] text-white shadow-xs"
                      : "text-[#14231b] hover:bg-white"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {pathname.startsWith("/products") && (
                      <div className="w-1 h-5 rounded-full bg-[#d4af37] shrink-0 -ml-1" />
                    )}
                    <ShoppingBag
                      className={`w-5 h-5 shrink-0 ${
                        pathname.startsWith("/products") ? "text-[#d4af37]" : "text-[#737874]"
                      }`}
                    />
                    <span className="font-bold text-sm truncate">Products / ምርቶች</span>
                  </div>
                  <span
                    className={`text-xs font-bold shrink-0 ${
                      pathname.startsWith("/products") ? "text-[#d4af37]" : "text-[#737874]"
                    }`}
                  >
                    በገናዎች
                  </span>
                </Link>

                {/* 3. About Product / ስለ በገና */}
                <Link
                  href="/about-product"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl transition-all ${
                    pathname.startsWith("/about-product")
                      ? "bg-[#14231b] text-white shadow-xs"
                      : "text-[#14231b] hover:bg-white"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {pathname.startsWith("/about-product") && (
                      <div className="w-1 h-5 rounded-full bg-[#d4af37] shrink-0 -ml-1" />
                    )}
                    <Info
                      className={`w-5 h-5 shrink-0 ${
                        pathname.startsWith("/about-product") ? "text-[#d4af37]" : "text-[#737874]"
                      }`}
                    />
                    <span className="font-bold text-sm truncate">About Product / ስለ በገና</span>
                  </div>
                </Link>

                {/* 4. About Us / ስለ እኛ */}
                <Link
                  href="/about"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl transition-all ${
                    pathname === "/about"
                      ? "bg-[#14231b] text-white shadow-xs"
                      : "text-[#14231b] hover:bg-white"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {pathname === "/about" && (
                      <div className="w-1 h-5 rounded-full bg-[#d4af37] shrink-0 -ml-1" />
                    )}
                    <Users
                      className={`w-5 h-5 shrink-0 ${
                        pathname === "/about" ? "text-[#d4af37]" : "text-[#737874]"
                      }`}
                    />
                    <span className="font-bold text-sm truncate">About Us / ስለ እኛ</span>
                  </div>
                </Link>

                {/* 5. Notifications */}
                <div className="w-full">
                  <NotificationFlyout
                    triggerStyle="menu-row"
                    buttonClassName="w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-[#14231b] hover:bg-white transition-all cursor-pointer group"
                  />
                </div>

                {/* 6. Account / መለያ */}
                <Link
                  href={user ? "/account" : "/login"}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl transition-all ${
                    pathname.startsWith("/account")
                      ? "bg-[#14231b] text-white shadow-xs"
                      : "text-[#14231b] hover:bg-white"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {pathname.startsWith("/account") && (
                      <div className="w-1 h-5 rounded-full bg-[#d4af37] shrink-0 -ml-1" />
                    )}
                    <UserIcon
                      className={`w-5 h-5 shrink-0 ${
                        pathname.startsWith("/account") ? "text-[#d4af37]" : "text-[#737874]"
                      }`}
                    />
                    <span className="font-bold text-sm truncate">Account / መለያ</span>
                  </div>
                </Link>

                {/* Admin Portal (Strictly for Admins) */}
                {profile?.role === "admin" && (
                  <Link
                    href="/admin?tab=dashboard"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-[#14231b] hover:bg-white transition-all group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <ShieldCheck className="w-5 h-5 text-[#b8860b] shrink-0" />
                      <span className="font-bold text-sm truncate">Admin Portal / የአስተዳዳሪ</span>
                    </div>
                    <span className="bg-[#0F2418] text-[#D4AF37] border border-[#D4AF37] text-[9px] font-black tracking-wider px-2 py-0.5 rounded-full uppercase shrink-0">
                      ADMIN
                    </span>
                  </Link>
                )}

                {/* Affiliate Dashboard (For Affiliates) */}
                {profile?.role === "affiliate" && (
                  <Link
                    href="/affiliate/dashboard"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-[#14231b] hover:bg-white transition-all group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <TrendingUp className="w-5 h-5 text-[#2d6a4f] shrink-0" />
                      <span className="font-bold text-sm truncate">Affiliate Portal / ተባባሪ</span>
                    </div>
                    <span className="bg-[#2d6a4f]/15 text-[#2d6a4f] text-[10px] font-black px-2 py-0.5 rounded-full shrink-0">
                      8%
                    </span>
                  </Link>
                )}

                {/* Sign Out (when logged in) */}
                {user && (
                  <button
                    type="button"
                    onClick={async () => {
                      await signOut();
                      setMobileMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-red-600 hover:bg-red-50 text-sm font-bold transition-all cursor-pointer text-left"
                  >
                    <LogOut className="w-5 h-5 shrink-0" />
                    <span>Sign Out / ውጣ</span>
                  </button>
                )}
              </div>
            </div>

            {/* Bottom Section: Currency + Language & Version */}
            <div className="pt-3 border-t border-[#E8E1D6]/80 space-y-3 shrink-0">
              <div>
                <span className="text-[10px] font-extrabold tracking-widest uppercase text-[#737874] block mb-2 font-sans">
                  CURRENCY / የገንዘብ አይነት
                </span>
                {/* Segmented Currency Tabs */}
                <div className="w-full bg-[#EAE5D9] p-1.5 rounded-2xl flex items-center justify-between border border-[#E8E1D6]">
                  {currencies.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCurrency(c)}
                      className={`py-2 px-3 flex-1 flex items-center justify-center gap-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                        currency === c
                          ? "bg-[#14231b] text-white shadow-xs"
                          : "text-[#14231b]/75 hover:text-[#14231b]"
                      }`}
                      aria-label={`Switch currency to ${c}`}
                    >
                      <span>{c}</span>
                      {currency === c && (
                        <span className="w-1.5 h-1.5 rounded-full bg-[#d4af37]" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </header>
    </>
  );
}
