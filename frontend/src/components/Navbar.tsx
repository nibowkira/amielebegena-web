"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { useCurrency, Currency } from "../context/CurrencyContext";
import { ShoppingCart, User as UserIcon, ChevronDown, Menu, X, Bell } from "lucide-react";
import NotificationFlyout from "./NotificationFlyout";

export default function Navbar() {
  const pathname = usePathname();
  const { totalCount, openCart } = useCart();
  const { user, profile } = useAuth();
  const { currency, setCurrency } = useCurrency();

  const [scrolled, setScrolled] = useState(false);
  const [currencyOpen, setCurrencyOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY || document.documentElement.scrollTop || window.pageYOffset || 0;
      setScrolled(scrollY > 20);
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close mobile menu and dropdowns on route changes
  useEffect(() => {
    setMobileMenuOpen(false);
    setCurrencyOpen(false);
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
    { name: "BLOG", href: "/blog" },
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
          {/* Brand Logo in Benaiah Font (Scaled down on mobile to prevent crowding) */}
          <Link href="/" className="flex items-center gap-2 group shrink-0">
            <span className="font-benaiah text-lg min-[360px]:text-xl sm:text-2xl lg:text-3xl font-extrabold text-[#14231b] tracking-wide group-hover:text-[#2d6a4f] transition-colors whitespace-nowrap">
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

          {/* Right Actions: Clean layout keeping >=8px gap, secondary items moved to drawer on mobile */}
          <div className="flex items-center gap-2 sm:gap-3 lg:gap-4 shrink-0">
            {/* Currency Switcher Pill (Desktop & Tablet) */}
            <div className="relative hidden sm:block">
              <button
                onClick={() => setCurrencyOpen(!currencyOpen)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#14231b]/20 bg-[#DFDAD0]/50 text-xs font-bold text-[#14231b] hover:bg-[#DFDAD0] transition-all cursor-pointer min-h-[38px]"
                aria-label="Select currency"
              >
                <span>{currency}</span>
                <ChevronDown
                  className={`w-3 h-3 text-[#14231b] transition-transform ${
                    currencyOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {currencyOpen && (
                <div className="absolute right-0 mt-2 w-28 py-1 rounded-xl border border-[#14231b]/20 bg-[#F4F1EA] shadow-xl z-50">
                  {currencies.map((c) => (
                    <button
                      key={c}
                      onClick={() => {
                        setCurrency(c);
                        setCurrencyOpen(false);
                      }}
                      className={`w-full px-3 py-1.5 text-left text-xs font-bold transition-colors cursor-pointer ${
                        currency === c
                          ? "bg-[#14231b] text-white"
                          : "text-[#14231b] hover:bg-[#DFDAD0]"
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Notification Flyout (Desktop & Tablet) */}
            <div className="hidden sm:block">
              <NotificationFlyout triggerStyle="transparent" />
            </div>

            {/* Cart Icon Button (Always visible on all screens with >=44px touch area) */}
            <button
              onClick={openCart}
              className="relative p-2.5 text-[#14231b] hover:text-[#2d6a4f] transition-transform hover:scale-105 active:scale-95 cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full"
              aria-label="View Cart"
            >
              <ShoppingCart className="w-5 h-5 stroke-[1.8]" />
              {totalCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-[#e63946] text-white text-[10px] font-bold flex items-center justify-center shadow">
                  {totalCount}
                </span>
              )}
            </button>

            {/* User Account Icon in purple (Desktop & Tablet) */}
            <Link
              href={
                user
                  ? profile?.role === "admin"
                    ? "/admin?tab=dashboard"
                    : profile?.role === "affiliate"
                    ? "/affiliate/dashboard"
                    : "/account"
                  : "/login"
              }
              className="hidden sm:flex p-2 text-[#512c85] hover:text-[#2d6a4f] transition-transform hover:scale-105 items-center justify-center rounded-full min-h-[44px] min-w-[44px]"
              aria-label="User Account"
            >
              <UserIcon className="w-5 h-5 fill-current" />
            </Link>

            {/* Mobile Menu Trigger (Always visible on mobile with >=44px touch target) */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-[#14231b] hover:text-[#2d6a4f] rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d4af37] cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label={mobileMenuOpen ? "Close mobile menu" : "Open mobile menu"}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-nav-menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Semi-Transparent Dark Backdrop */}
        {mobileMenuOpen && (
          <div
            className="fixed inset-0 z-40 bg-[#07150D]/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200 pointer-events-auto"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* Mobile Drawer */}
        {mobileMenuOpen && (
          <div
            id="mobile-nav-menu"
            role="region"
            aria-label="Mobile Navigation Menu"
            className={`relative z-50 pointer-events-auto md:hidden p-4 bg-[#FAF8F5] border border-[#14231b]/15 shadow-2xl space-y-3 nav-transition animate-in fade-in slide-in-from-top-2 duration-150 ${
              scrolled ? "max-w-6xl mx-auto mt-2 rounded-3xl" : "w-full border-t border-[#14231b]/10 rounded-b-3xl"
            }`}
          >
            {/* Quick Mobile Controls (Currency & Notification) */}
            <div className="flex items-center justify-between pb-3 border-b border-[#14231b]/10 sm:hidden">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-[#737874] uppercase">Currency:</span>
                <div className="flex items-center gap-1 bg-[#EAE5DB] p-1 rounded-xl">
                  {currencies.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCurrency(c)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                        currency === c ? "bg-[#14231b] text-white shadow-xs" : "text-[#14231b]"
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <NotificationFlyout triggerStyle="pill" />
              </div>
            </div>

            {/* Nav Links */}
            <div className="space-y-1">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3.5 py-2.5 text-xs font-bold tracking-wider text-[#14231b] hover:bg-[#DFDAD0] rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d4af37]"
                >
                  {link.name}
                </Link>
              ))}
            </div>

            {/* Account Link in Drawer */}
            <div className="pt-2 border-t border-[#14231b]/15 flex items-center justify-between text-xs font-bold text-[#14231b]">
              <Link
                href={
                  user
                    ? profile?.role === "admin"
                      ? "/admin?tab=dashboard"
                      : profile?.role === "affiliate"
                      ? "/affiliate/dashboard"
                      : "/account"
                    : "/login"
                }
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 px-3.5 py-2 rounded-lg hover:bg-[#DFDAD0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d4af37] w-full"
              >
                <UserIcon className="w-4 h-4 text-[#512c85] fill-current" />
                <span>
                  {user
                    ? `Account (${profile?.role || "Customer"})`
                    : "Sign In / Register"}
                </span>
              </Link>
            </div>
          </div>
        )}
      </header>
    </>
  );
}
