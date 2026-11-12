"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { useCurrency } from "../context/CurrencyContext";
import { createGuestOrder } from "../lib/api";
import { supabase } from "../lib/supabase";
import PremiumModal from "./ui/PremiumModal";
import { useScrollLock } from "../lib/useScrollLock";
import {
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Loader2,
  ChevronDown,
  Sparkles,
  AlertCircle,
} from "lucide-react";

// Email typo helper for C9
function checkEmailTypo(email: string): string | null {
  if (!email || !email.includes("@")) return null;
  const parts = email.split("@");
  if (parts.length !== 2) return null;
  const domain = parts[1].toLowerCase().trim();
  const typoMap: Record<string, string> = {
    "gamil.com": "gmail.com",
    "gmial.com": "gmail.com",
    "gmai.com": "gmail.com",
    "gnail.com": "gmail.com",
    "yaho.com": "yahoo.com",
    "yahooo.com": "yahoo.com",
    "hotmial.com": "hotmail.com",
    "hotmaill.com": "hotmail.com",
    "outlok.com": "outlook.com",
  };
  if (typoMap[domain]) {
    return `${parts[0]}@${typoMap[domain]}`;
  }
  return null;
}

export default function WhatsAppModal() {
  const {
    isCheckoutModalOpen,
    closeCheckoutModal,
    items,
    directOrderItem,
    subtotalUSD,
    clearCart,
    referralCode,
  } = useCart();
  const { user, profile } = useAuth();
  const { formatPrice } = useCurrency();

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    country: "Ethiopia",
    notes: "",
  });

  // Autofill name, phone, and email if user is logged in
  useEffect(() => {
    if (user || profile) {
      setFormData((prev) => ({
        ...prev,
        name: prev.name || profile?.fullName || user?.user_metadata?.full_name || "",
        phone: prev.phone || profile?.phone || "",
        email: prev.email || user?.email || "",
      }));
    }
  }, [user, profile]);

  const [submitting, setSubmitting] = useState(false);
  const [successOrder, setSuccessOrder] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Active items: if direct order, use ONLY directOrderItem; otherwise use cart items
  const activeItems = directOrderItem ? [directOrderItem] : items;
  const primaryItem = activeItems[0];
  const effectiveSubtotal = directOrderItem
    ? (Number(directOrderItem.price) || 85) * (Number(directOrderItem.quantity) || 1)
    : subtotalUSD > 0
    ? subtotalUSD
    : items.reduce(
        (sum, i) => sum + (Number(i.price) || 85) * (Number(i.quantity) || 1),
        0
      );

  const emailSuggestion = checkEmailTypo(formData.email);

  // Lock background window scrolling while checkout modal is open
  useScrollLock(isCheckoutModalOpen);

  if (!isCheckoutModalOpen) return null;

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (activeItems.length === 0) {
      setErrorMsg("Your cart is empty. Please select an authentic Begena instrument or accessory before placing an order.");
      return;
    }
    if (!formData.name.trim() || !formData.phone.trim()) {
      setErrorMsg("Please provide both your full name and WhatsApp phone number.");
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    // C7: 15-second AbortController timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      const productNames = activeItems.map((i) => `${i.quantity}x ${i.name}`).join(", ");
      const totalQty = activeItems.reduce((sum, i) => sum + i.quantity, 0);

      let orderNum = "";
      let orderSuccess = false;

      // Unified checkout routed through the backend API
      // Backend validates product IDs, enforces rate limiting, and attaches customer_id for authenticated sessions
      const result = await createGuestOrder(
        {
          customer_name: formData.name.trim(),
          phone: formData.phone.trim(),
          customer_email: formData.email.trim() || user?.email || undefined,
          country: formData.country.trim(),
          product_id: activeItems[0]?.productId,
          product_name: productNames || "Amiele Begena Instrument",
          quantity: totalQty || 1,
          referral_code: referralCode,
          notes: formData.notes.trim() || "Website WhatsApp Checkout",
          items: activeItems.map((i) => ({
            product_id: i.productId,
            product_name: i.name,
            quantity: i.quantity,
            price: i.price,
          })),
        },
        controller.signal
      );

      if (result && result.success) {
        orderNum =
          result.order_number ||
          `AM-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
        orderSuccess = true;
      } else {
        setErrorMsg(
          result?.error ||
            "We could not register your order. Please review your details and try again."
        );
        return;
      }

      clearTimeout(timeoutId);

      if (orderSuccess && orderNum) {
        setSuccessOrder(orderNum);

        // Notify open tabs/windows to reload orders immediately
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("amiele_order_created", { detail: { orderNumber: orderNum } })
          );
        }

        // Compose WhatsApp formatted message
        const itemsText = activeItems
          .map((i) => `• ${i.quantity}x ${i.name} (${formatPrice(i.price * i.quantity, i.currency)})`)
          .join("\n");
        const refText = referralCode ? `\n🏷️ Referral Code: ${referralCode}` : "";
        const waText = encodeURIComponent(
          `ሰላም Amiele Begena! I would like to confirm my instrument order:\n\n` +
            `📦 Order Number: ${orderNum}\n` +
            `👤 Customer: ${formData.name}\n` +
            `📞 Phone: ${formData.phone}\n` +
            `🌍 Delivery Destination: ${formData.country}\n` +
            `✉️ Email: ${formData.email || user?.email || "N/A"}\n\n` +
            `🎵 Selected Instruments:\n${itemsText || "• 1x Begena Instrument"}\n\n` +
            `💰 Subtotal: ${formatPrice(effectiveSubtotal, "USD")}${refText}\n\n` +
            `📝 Notes / Tuning: ${formData.notes || "Standard David Harp Pentatonic"}\n\n` +
            `Please provide final shipping confirmation and payment instructions. Ameseginalehu!`
        );

        // Open WhatsApp in new tab
        window.open(`https://wa.me/251969189470?text=${waText}`, "_blank");
        if (!directOrderItem) {
          clearCart();
        }
      }
    } catch (err: any) {
      if (err.name === "AbortError") {
        setErrorMsg("Request timed out after 15 seconds. Please check your connection and retry.");
      } else {
        setErrorMsg(err.message || "Failed to submit order. Please try again.");
      }
    } finally {
      // C7: submitting is ALWAYS reset in a finally block so the button is never stuck gray
      clearTimeout(timeoutId);
      setSubmitting(false);
    }
  };

  // C8: Submit is disabled while an error shows or required fields are invalid
  const isSubmitDisabled =
    submitting ||
    !!errorMsg ||
    !formData.name.trim() ||
    !formData.phone.trim() ||
    activeItems.length === 0;

  // Footer for the Order Modal: On mobile, Submit is full-width with Cancel below it
  const modalFooter = activeItems.length === 0 ? (
    <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-2.5 sm:gap-4">
      <button
        type="button"
        onClick={closeCheckoutModal}
        className="w-full sm:w-auto px-5 py-2.5 rounded-full border border-[#E8E1D6] bg-white hover:bg-[#F8F5EF] text-[#172820] text-xs sm:text-sm font-bold transition-all shadow-xs cursor-pointer min-h-[42px]"
      >
        Close
      </button>
      <Link
        href="/products"
        onClick={closeCheckoutModal}
        className="w-full sm:w-auto px-6 py-2.5 rounded-full bg-[#14271D] hover:bg-[#0c1811] text-white text-xs sm:text-sm font-bold transition-all inline-flex items-center justify-center gap-2 shadow-xs cursor-pointer min-h-[42px]"
      >
        <span>Browse Products</span>
        <ArrowRight className="w-4 h-4" />
      </Link>
    </div>
  ) : (
    <div className="w-full flex flex-col sm:flex-row-reverse sm:items-center sm:justify-between gap-2.5 sm:gap-4">
      <button
        type="submit"
        form="amiele-order-form"
        disabled={isSubmitDisabled}
        className="w-full sm:w-auto px-6 py-3 rounded-full bg-gradient-to-r from-[#1eb656] via-[#22c55e] to-[#25D366] hover:from-[#18a84e] hover:via-[#1eb656] hover:to-[#22c35e] text-white font-extrabold text-xs sm:text-sm tracking-wide shadow-[0_4px_16px_rgba(37,211,102,0.32)] hover:shadow-[0_6px_22px_rgba(37,211,102,0.42)] active:scale-[0.99] transition-all flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[#25D366] min-h-[46px] border border-white/20"
      >
        {submitting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin text-white" />
            <span>Connecting to Master Artisan...</span>
          </>
        ) : (
          <>
            {/* WhatsApp Icon */}
            <span className="w-5.5 h-5.5 rounded-full bg-white/20 backdrop-blur-xs text-white flex items-center justify-center shrink-0 shadow-2xs">
              <svg
                className="w-3.5 h-3.5 fill-current"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2M12.05 3.67C14.25 3.67 16.31 4.53 17.87 6.09C19.42 7.65 20.28 9.72 20.28 11.92C20.28 16.46 16.58 20.15 12.04 20.15C10.56 20.15 9.11 19.76 7.85 19L7.55 18.83L4.43 19.65L5.26 16.61L5.06 16.29C4.24 14.99 3.81 13.47 3.81 11.91C3.81 7.37 7.5 3.67 12.05 3.67M9.11 6.84C8.95 6.84 8.7 6.9 8.5 7.12C8.28 7.34 7.69 7.9 7.69 9.03C7.69 10.17 8.52 11.27 8.64 11.43C8.75 11.59 10.27 13.93 12.61 14.93C14.55 15.77 14.95 15.6 15.38 15.56C15.81 15.52 16.78 15 16.98 14.41C17.18 13.82 17.18 13.33 17.12 13.22C17.06 13.11 16.9 13.06 16.66 12.94C16.41 12.82 15.2 12.23 14.97 12.15C14.75 12.07 14.59 12.03 14.43 12.27C14.26 12.51 13.8 13.06 13.66 13.22C13.52 13.38 13.38 13.4 13.13 13.28C12.89 13.16 12.11 12.9 11.18 12.07C10.46 11.43 9.97 10.63 9.83 10.39C9.69 10.15 9.82 10.02 9.94 9.9C10.05 9.79 10.19 9.61 10.31 9.47C10.43 9.33 10.47 9.23 10.55 9.07C10.63 8.91 10.59 8.77 10.53 8.65C10.47 8.53 9.99 7.35 9.79 6.88C9.6 6.42 9.4 6.48 9.25 6.47C9.11 6.46 8.95 6.46 8.79 6.46L9.11 6.84Z" />
              </svg>
            </span>
            <span>Submit & Open WhatsApp Chat</span>
          </>
        )}
      </button>

      <button
        type="button"
        onClick={closeCheckoutModal}
        disabled={submitting}
        className="w-full sm:w-auto px-5 py-2.5 rounded-full border border-transparent sm:border-[#E8E1D6] bg-transparent sm:bg-white hover:bg-[#F8F5EF] text-[#7D867F] sm:text-[#172820] text-xs sm:text-sm font-bold transition-all shadow-none sm:shadow-xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#D9B32E]/30 disabled:opacity-50 min-h-[40px] sm:min-h-[44px]"
      >
        Cancel
      </button>
    </div>
  );

  return (
    <PremiumModal
      open={isCheckoutModalOpen}
      onClose={closeCheckoutModal}
      eyebrow="COMPLETE YOUR ORDER"
      title="Order Your Instrument"
      subtitle="Secure your order with Amiele Begena"
      badge={
        <div className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[#F8F5EF] border border-[#E8E1D6] text-[11px] font-bold text-[#14271D] shadow-2xs">
          <Sparkles className="w-3.5 h-3.5 text-[#D9B32E]" />
          <span>ORDER DETAILS</span>
        </div>
      }
      footer={!successOrder ? modalFooter : undefined}
    >
      {successOrder ? (
        /* ========================================================= */
        /* SUCCESS CONFIRMATION STATE                                */
        /* ========================================================= */
        <div className="py-8 text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-[#14271D] text-[#D9B32E] border-2 border-[#D9B32E]/30 mx-auto flex items-center justify-center shadow-lg">
            <CheckCircle2 className="w-9 h-9" />
          </div>

          <div className="space-y-1.5">
            <span className="text-[10px] sm:text-[11px] font-bold tracking-[0.25em] text-[#D9B32E] uppercase">
              ORDER REGISTERED SUCCESSFULLY
            </span>
            <h3 className="text-2xl sm:text-3xl font-black text-[#14271D] tracking-tight">
              Welcome to Amiele Begena
            </h3>
            <p className="text-xs sm:text-sm text-[#7D867F] max-w-md mx-auto leading-relaxed">
              Your instrument reservation is recorded in our Master Workshop database.
            </p>
          </div>

          <div className="py-3 px-6 rounded-2xl bg-[#F8F5EF] border border-[#E8E1D6] text-[#14271D] font-mono font-black text-lg sm:text-xl tracking-widest inline-block shadow-xs">
            {successOrder}
          </div>

          <p className="text-xs sm:text-sm text-[#14271D] font-semibold max-w-md mx-auto leading-relaxed">
            We have connected you with our Master Artisan concierge on WhatsApp (<strong>+251 969 189 470</strong>) to finalize sacred tuning and dispatch.
          </p>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3 max-w-md mx-auto">
            <a
              href={`/track-order?order=${encodeURIComponent(successOrder)}`}
              className="w-full sm:w-auto px-6 py-3.5 rounded-full bg-[#14271D] hover:bg-[#0c1811] text-white text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer"
            >
              <span>Track Fulfillment Progress</span>
              <ArrowRight className="w-4 h-4" />
            </a>
            <button
              type="button"
              onClick={closeCheckoutModal}
              className="w-full sm:w-auto px-6 py-3.5 rounded-full border border-[#E8E1D6] bg-white hover:bg-[#F8F5EF] text-[#172820] text-xs sm:text-sm font-bold transition-all cursor-pointer shadow-xs"
            >
              Close Window
            </button>
          </div>
        </div>
      ) : items.length === 0 ? (
        /* ========================================================= */
        /* EMPTY CART STATE                                          */
        /* ========================================================= */
        <div className="py-8 px-4 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-amber-50 border border-amber-200 text-amber-600 mx-auto flex items-center justify-center shadow-xs">
            <AlertCircle className="w-8 h-8" />
          </div>

          <div className="space-y-1.5">
            <span className="text-[10px] sm:text-[11px] font-bold tracking-[0.2em] text-amber-600 uppercase">
              NO PRODUCT SELECTED
            </span>
            <h3 className="text-xl sm:text-2xl font-black text-[#14271D] tracking-tight">
              Your Cart is Empty
            </h3>
            <p className="text-xs sm:text-sm text-[#7D867F] max-w-sm mx-auto leading-relaxed">
              Please choose an authentic Begena instrument, master strings, or accessories before proceeding to checkout.
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3 max-w-xs mx-auto">
            <Link
              href="/products"
              onClick={closeCheckoutModal}
              className="w-full sm:w-auto px-6 py-3 rounded-full bg-[#14271D] hover:bg-[#0c1811] text-white text-xs sm:text-sm font-bold shadow-xs transition-all inline-flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Explore Instruments</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <button
              type="button"
              onClick={closeCheckoutModal}
              className="w-full sm:w-auto px-5 py-3 rounded-full border border-[#E8E1D6] bg-white hover:bg-[#F8F5EF] text-[#172820] text-xs sm:text-sm font-bold shadow-xs transition-all cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      ) : (
        /* ========================================================= */
        /* ORDER FORM CONTENT                                        */
        /* ========================================================= */
        <form
          id="amiele-order-form"
          onSubmit={(e) => handleSubmit(e)}
          className="space-y-5"
        >
          {/* Product Summary Card */}
          {activeItems.length > 0 && (
            <div className="p-4 sm:p-4.5 rounded-2xl bg-[#F8F5EF] border border-[#E8E1D6] flex items-center gap-4 shadow-xs">
              {primaryItem?.image ? (
                <img
                  src={primaryItem.image}
                  alt={primaryItem.name}
                  className="w-16 h-16 sm:w-18 sm:h-18 rounded-xl object-cover border border-[#E8E1D6] bg-white shrink-0 shadow-xs"
                />
              ) : (
                <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-xl bg-[#14271D] text-[#D9B32E] flex items-center justify-center text-2xl shrink-0 shadow-xs">
                  🎻
                </div>
              )}

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#D9B32E]">
                    Handcrafted Begena
                  </span>
                  {activeItems.length > 1 && (
                    <span className="px-2 py-0.5 rounded-full bg-[#14271D] text-white text-[10px] font-bold">
                      +{activeItems.length - 1} more
                    </span>
                  )}
                </div>
                <h4 className="text-sm sm:text-base font-black text-[#14271D] truncate mt-0.5">
                  {activeItems.map((i) => `${i.quantity}x ${i.name}`).join(", ")}
                </h4>
                <p className="text-xs text-[#7D867F] font-medium truncate mt-0.5">
                  Master Workshop Direct • Authentic Sacred Sound • Pre-tuned
                </p>
              </div>

              <div className="text-right shrink-0">
                <span className="text-[10px] sm:text-xs text-[#7D867F] block font-semibold uppercase tracking-wider">
                  Item Total
                </span>
                <span className="text-base sm:text-lg font-black text-[#14271D]">
                  {formatPrice(effectiveSubtotal, "USD")}
                </span>
              </div>
            </div>
          )}

          {/* C7 Error Message with Retry Button */}
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center justify-between gap-3 shadow-2xs">
              <div className="flex items-center gap-2 min-w-0">
                <span className="shrink-0">⚠️</span>
                <span className="truncate">{errorMsg}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setErrorMsg(null);
                  handleSubmit();
                }}
                className="px-3 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold shadow-2xs cursor-pointer shrink-0 transition-colors"
              >
                Retry
              </button>
            </div>
          )}

          {/* Form Fields: Two-Column Grid on Desktop */}
          <div className="space-y-4">
            {/* Row 1: Full Name | Phone Number */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#14271D]">
                  Full Name <span className="text-[#D9B32E]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => {
                    setErrorMsg(null);
                    setFormData({ ...formData, name: e.target.value });
                  }}
                  placeholder="e.g. Yohannes Mengistu"
                  className="w-full px-4 py-3 rounded-[14px] border border-[#E8E1D6] bg-[#FCFBF8] text-[16px] sm:text-sm font-semibold text-[#172820] placeholder-[#7D867F]/70 focus:bg-white focus:border-[#D9B32E] focus:ring-2 focus:ring-[#D9B32E]/20 outline-none transition-all shadow-2xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#14271D]">
                  Phone Number / WhatsApp <span className="text-[#D9B32E]">*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => {
                    setErrorMsg(null);
                    setFormData({ ...formData, phone: e.target.value });
                  }}
                  placeholder="+251 9... or international"
                  className="w-full px-4 py-3 rounded-[14px] border border-[#E8E1D6] bg-[#FCFBF8] text-[16px] sm:text-sm font-semibold text-[#172820] placeholder-[#7D867F]/70 focus:bg-white focus:border-[#D9B32E] focus:ring-2 focus:ring-[#D9B32E]/20 outline-none transition-all shadow-2xs"
                />
              </div>
            </div>

            {/* Row 2: Email (Optional) | Delivery Destination */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#7D867F]">
                  Email Address <span className="text-gray-400 font-normal lowercase">(optional)</span>
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => {
                    setErrorMsg(null);
                    setFormData({ ...formData, email: e.target.value });
                  }}
                  placeholder="you@domain.com"
                  className="w-full px-4 py-3 rounded-[14px] border border-[#E8E1D6] bg-[#FCFBF8] text-[16px] sm:text-sm font-semibold text-[#172820] placeholder-[#7D867F]/70 focus:bg-white focus:border-[#D9B32E] focus:ring-2 focus:ring-[#D9B32E]/20 outline-none transition-all shadow-2xs"
                />
                {/* C9: Email Typo Suggestion Banner */}
                {emailSuggestion && (
                  <div className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200/90 rounded-lg px-2.5 py-1.5 flex items-center justify-between gap-2 shadow-2xs">
                    <span>
                      Did you mean <strong>{emailSuggestion}</strong>?
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setErrorMsg(null);
                        setFormData({ ...formData, email: emailSuggestion });
                      }}
                      className="text-[10px] font-bold text-amber-900 bg-amber-200/60 hover:bg-amber-200 px-2 py-0.5 rounded cursor-pointer transition-colors"
                    >
                      Use this
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#14271D]">
                  Delivery Destination <span className="text-[#D9B32E]">*</span>
                </label>
                <div className="relative">
                  <select
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    className="w-full appearance-none px-4 py-3 pr-10 rounded-[14px] border border-[#E8E1D6] bg-[#FCFBF8] text-[16px] sm:text-sm font-semibold text-[#172820] focus:bg-white focus:border-[#D9B32E] focus:ring-2 focus:ring-[#D9B32E]/20 outline-none transition-all cursor-pointer shadow-2xs"
                  >
                    <option value="Ethiopia">Ethiopia (Local Handcrafted Delivery)</option>
                    <option value="United States">United States (DHL Express)</option>
                    <option value="Canada">Canada (DHL Express)</option>
                    <option value="United Kingdom">United Kingdom (DHL Express)</option>
                    <option value="Germany">Germany (DHL Express)</option>
                    <option value="Israel">Israel (DHL Express)</option>
                    <option value="Sweden">Sweden (DHL Express)</option>
                    <option value="Australia">Australia (DHL Express)</option>
                    <option value="Other International">Other International</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-[#7D867F] absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Row 3: Special Notes or Custom Tuning Requests (Full Width) */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#7D867F]">
                Special Notes or Custom Tuning Requests <span className="text-gray-400 font-normal lowercase">(optional)</span>
              </label>
              <textarea
                rows={2}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="e.g. Please pre-tune to Tizita pentatonic scale, request flight-certified hardshell case, include spare gut strings, etc."
                className="w-full px-4 py-3 rounded-[14px] border border-[#E8E1D6] bg-[#FCFBF8] text-[16px] sm:text-sm font-semibold text-[#172820] placeholder-[#7D867F]/70 focus:bg-white focus:border-[#D9B32E] focus:ring-2 focus:ring-[#D9B32E]/20 outline-none transition-all resize-none shadow-2xs"
              />
            </div>
          </div>

          {/* Order Subtotal Card */}
          <div className="p-4 sm:p-4.5 rounded-2xl bg-[#F8F5EF] border border-[#E8E1D6] flex items-center justify-between shadow-xs">
            <div>
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-[#7D867F]">
                ORDER SUBTOTAL
              </span>
              <div className="text-2xl sm:text-3xl font-black text-[#14271D] tracking-tight mt-0.5">
                {formatPrice(effectiveSubtotal, "USD")}
              </div>
            </div>

            <div className="flex flex-col items-end gap-1">
              {referralCode ? (
                <span className="px-3 py-1 rounded-full bg-[#14271D] text-[#D9B32E] border border-[#D9B32E]/30 text-xs font-bold shadow-xs">
                  Ref: {referralCode}
                </span>
              ) : (
                <span className="text-[11px] font-bold text-[#14271D] flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-[#D9B32E]" />
                  <span>Certified Workshop Direct</span>
                </span>
              )}
              <span className="text-[10px] text-[#7D867F]">
                Tax included • Free tuning calibration
              </span>
            </div>
          </div>

          {/* Trust Subtext */}
          <div className="flex items-center justify-center gap-1.5 text-[11px] text-[#7D867F] text-center pt-0.5">
            <ShieldCheck className="w-3.5 h-3.5 text-[#D9B32E] shrink-0" />
            <span>
              Encrypted RPC order creation with workshop verification log.
            </span>
          </div>
        </form>
      )}
    </PremiumModal>
  );
}
