"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { useCurrency, Currency } from "../context/CurrencyContext";
import { ShoppingCart, User as UserIcon, ChevronDown, Menu, X, Bell, LogOut } from "lucide-react";
import NotificationFlyout from "./NotificationFlyout";

export default function Navbar() {
  const pathname = usePathname();
  const { totalCount, openCart } = useCart();
  const { user, profile, signOut } = useAuth();
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

            {/* Notification Flyout - Visible on mobile and desktop */}
            <div className="flex items-center">
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
            className="fixed top-0 right-0 bottom-0 z-40 h-[100dvh] w-[75%] sm:w-[60%] max-w-[320px] bg-white border-l border-gray-100 shadow-2xl flex flex-col justify-start overflow-y-auto animate-in slide-in-from-right duration-200 pt-[76px] pb-8 pointer-events-auto md:hidden"
          >
            <div className="flex flex-col w-full divide-y divide-gray-100">
              {/* 1. Home */}
              <Link
                href="/"
                onClick={() => setMobileMenuOpen(false)}
                className="px-6 py-3.5 text-sm font-bold text-[#14231b] hover:bg-[#FAF8F5] transition-colors"
              >
                Home
              </Link>

              {/* 2. Products */}
              <Link
                href="/products"
                onClick={() => setMobileMenuOpen(false)}
                className="px-6 py-3.5 text-sm font-bold text-[#14231b] hover:bg-[#FAF8F5] transition-colors"
              >
                Products
              </Link>

              {/* 3. About Product */}
              <Link
                href="/about-product"
                onClick={() => setMobileMenuOpen(false)}
                className="px-6 py-3.5 text-sm font-bold text-[#14231b] hover:bg-[#FAF8F5] transition-colors"
              >
                About Product
              </Link>

              {/* 4. About Us */}
              <Link
                href="/about"
                onClick={() => setMobileMenuOpen(false)}
                className="px-6 py-3.5 text-sm font-bold text-[#14231b] hover:bg-[#FAF8F5] transition-colors"
              >
                About Us
              </Link>

              {/* 5. Currency Selector (ETB, USD, EUR) */}
              <div className="px-6 py-3.5 flex flex-col gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#14231b]/60">
                  Currency
                </span>
                <div className="flex items-center gap-2">
                  {currencies.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCurrency(c)}
                      className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all text-center cursor-pointer ${
                        currency === c
                          ? "bg-[#14231b] text-white shadow-xs"
                          : "bg-[#FAF8F5] text-[#14231b] hover:bg-[#DFDAD0] border border-[#14231b]/15"
                      }`}
                      aria-label={`Switch currency to ${c}`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              {/* 7. Notifications (with unread count badge on right) */}
              <div>
                <NotificationFlyout triggerStyle="menu-row" />
              </div>

              {/* 8. Account / Sign In */}
              <Link
                href={user ? "/account" : "/login"}
                onClick={() => setMobileMenuOpen(false)}
                className="px-6 py-3.5 text-sm font-bold text-[#14231b] hover:bg-[#FAF8F5] transition-colors flex items-center justify-between"
              >
                <div className="flex items-center gap-2.5">
                  <UserIcon className="w-4 h-4 text-[#512c85] fill-current" />
                  <span>{user ? "Account / መለያ" : "Account / Sign In"}</span>
                </div>
              </Link>
            </div>
          </div>
        )}
      </header>
    </>
  );
}
