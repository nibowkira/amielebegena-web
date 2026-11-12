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
            {/* Currency Switcher Pill - visible on mobile & desktop matching reference */}
            <div className="relative">
              <button
                onClick={() => setCurrencyOpen(!currencyOpen)}
                className="flex items-center gap-1 sm:gap-1.5 px-2 py-1 sm:px-3 sm:py-1.5 rounded-md sm:rounded-lg border border-[#14231b] sm:border-[#14231b]/20 bg-white sm:bg-[#DFDAD0]/50 text-xs font-bold text-[#14231b] hover:bg-[#DFDAD0] transition-all cursor-pointer min-h-[32px] sm:min-h-[38px]"
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

            {/* Notification Flyout - Visible on Tablet/Desktop, hidden on mobile header matching reference */}
            <div className="hidden sm:flex items-center">
              <NotificationFlyout triggerStyle="transparent" badgeCount={23} />
            </div>

            {/* Cart Icon Button */}
            <button
              onClick={openCart}
              className="relative p-2 text-[#14231b] hover:text-[#2d6a4f] transition-transform hover:scale-105 active:scale-95 cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center rounded-full"
              aria-label="View Cart"
            >
              <ShoppingCart className="w-5 h-5 stroke-[1.8]" />
              {totalCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-[#e63946] text-white text-[10px] font-bold flex items-center justify-center shadow">
                  {totalCount}
                </span>
              )}
            </button>

            {/* User Account Icon in purple matching screenshot */}
            <Link
              href={user ? "/account" : "/login"}
              className="flex p-2 text-[#512c85] hover:text-[#2d6a4f] transition-transform hover:scale-105 items-center justify-center rounded-full min-h-[40px] min-w-[40px]"
              aria-label="User Account"
            >
              <UserIcon className="w-5 h-5 fill-current" />
            </Link>

            {/* Mobile Menu Trigger matching screenshot with clean icon */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-1.5 sm:p-2 text-[#14231b] hover:text-[#2d6a4f] rounded-lg cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center transition-colors"
              aria-label={mobileMenuOpen ? "Close mobile menu" : "Open mobile menu"}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-nav-menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Mobile Semi-Transparent Dark Backdrop below header */}
        {mobileMenuOpen && (
          <div
            className="fixed top-16 sm:top-20 inset-x-0 bottom-0 z-40 bg-black/50 backdrop-blur-xs transition-opacity animate-in fade-in duration-150 pointer-events-auto md:hidden"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* Right-Side Slide-Out Mobile Drawer matching exact screenshot */}
        {mobileMenuOpen && (
          <div
            id="mobile-nav-menu"
            role="region"
            aria-label="Mobile Navigation Menu"
            className="fixed top-16 sm:top-20 right-0 bottom-0 z-50 pointer-events-auto md:hidden w-[54%] min-w-[210px] max-w-[270px] bg-white border-l border-gray-100 shadow-2xl flex flex-col justify-start overflow-y-auto animate-in slide-in-from-right duration-200"
          >
            <div className="flex flex-col w-full divide-y divide-gray-100 border-b border-gray-100">
              <Link
                href="/"
                onClick={() => setMobileMenuOpen(false)}
                className="px-6 py-3.5 text-sm font-bold text-[#14231b] hover:bg-gray-50 transition-colors"
              >
                Home
              </Link>
              <Link
                href="/products"
                onClick={() => setMobileMenuOpen(false)}
                className="px-6 py-3.5 text-sm font-bold text-[#14231b] hover:bg-gray-50 transition-colors"
              >
                Products
              </Link>
              <Link
                href="/about-product"
                onClick={() => setMobileMenuOpen(false)}
                className="px-6 py-3.5 text-sm font-bold text-[#14231b] hover:bg-gray-50 transition-colors"
              >
                About Product
              </Link>
              <Link
                href="/about"
                onClick={() => setMobileMenuOpen(false)}
                className="px-6 py-3.5 text-sm font-bold text-[#14231b] hover:bg-gray-50 transition-colors"
              >
                About Us
              </Link>
              <Link
                href="/blog"
                onClick={() => setMobileMenuOpen(false)}
                className="px-6 py-3.5 text-sm font-bold text-[#14231b] hover:bg-gray-50 transition-colors"
              >
                Blog
              </Link>
              <Link
                href={user ? "/account" : "/login"}
                onClick={() => setMobileMenuOpen(false)}
                className="px-6 py-3.5 text-sm font-bold text-[#14231b] hover:bg-gray-50 transition-colors"
              >
                Account / መለያ
              </Link>
            </div>
          </div>
        )}
      </header>
    </>
  );
}
