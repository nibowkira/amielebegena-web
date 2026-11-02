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

  const navLinks = [
    { name: "HOME", href: "/" },
    { name: "PRODUCTS", href: "/products" },
    { name: "ABOUT PRODUCT", href: "/#favorites" },
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
              ? "w-full max-w-full mx-auto rounded-full px-6 sm:px-10 lg:px-16 py-2.5 bg-[#EAE6DD]/95 backdrop-blur-xl border border-[#14231b]/20 shadow-2xl"
              : "w-full max-w-full rounded-none px-6 sm:px-12 lg:px-20 h-[72px] bg-[#FAF8F5] border-none shadow-none"
          }`}
        >
          {/* Brand Logo in Benaiah Font */}
          <Link href="/" className="flex items-center gap-2 group shrink-0">
            <span className="font-benaiah text-2xl sm:text-3xl font-extrabold text-[#14231b] tracking-wide group-hover:text-[#2d6a4f] transition-colors">
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

          {/* Right Actions: Currency Switcher, Cart, User Account */}
          <div className="flex items-center gap-3 sm:gap-4 shrink-0">
            {/* Currency Switcher Pill */}
            <div className="relative">
              <button
                onClick={() => setCurrencyOpen(!currencyOpen)}
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg border border-[#14231b]/25 bg-[#DFDAD0]/50 text-xs font-bold text-[#14231b] hover:bg-[#DFDAD0] transition-all cursor-pointer"
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
                      className={`w-full px-3 py-1.5 text-left text-xs font-bold transition-colors ${
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

            {/* Clean Bell Notification Flyout without background matching profile/cart */}
            <NotificationFlyout triggerStyle="transparent" />

            {/* Cart Icon Button */}
            <button
              onClick={openCart}
              className="relative p-2 text-[#14231b] hover:text-[#2d6a4f] transition-transform hover:scale-110 cursor-pointer"
              aria-label="View Cart"
            >
              <ShoppingCart className="w-5 h-5 stroke-[1.8]" />
              {totalCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#e63946] text-white text-[10px] font-bold flex items-center justify-center shadow">
                  {totalCount}
                </span>
              )}
            </button>

            {/* User Account Icon in purple */}
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
              className="p-1.5 text-[#512c85] hover:text-[#2d6a4f] transition-transform hover:scale-110"
              aria-label="User Account"
            >
              <UserIcon className="w-5 h-5 fill-current" />
            </Link>

            {/* Mobile Menu Trigger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-1.5 text-[#14231b]"
              aria-label="Toggle mobile menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Drawer */}
        {mobileMenuOpen && (
          <div
            className={`pointer-events-auto md:hidden p-4 bg-[#FAF8F5] border border-[#14231b]/20 shadow-2xl space-y-3 nav-transition ${
              scrolled ? "max-w-6xl mx-auto mt-2 rounded-3xl" : "w-full border-t border-[#14231b]/10"
            }`}
          >
            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 text-xs font-bold tracking-wider text-[#14231b] hover:bg-[#DFDAD0] rounded-xl"
              >
                {link.name}
              </Link>
            ))}
            <div className="pt-2 border-t border-[#14231b]/15 flex items-center justify-between text-xs font-bold text-[#14231b]">
              <Link href={user ? "/account" : "/login"} onClick={() => setMobileMenuOpen(false)}>
                {user ? `Account (${profile?.role || "User"})` : "Sign In / Register"}
              </Link>
            </div>
          </div>
        )}
      </header>
    </>
  );
}
