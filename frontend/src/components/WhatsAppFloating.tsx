"use client";

import React, { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { useCart } from "../context/CartContext";

export default function WhatsAppFloating() {
  const pathname = usePathname();
  const { isOpen: cartOpen, isCheckoutModalOpen } = useCart();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const [isLocked, setIsLocked] = useState(false);

  useEffect(() => {
    const checkLocked = () => {
      const locked =
        document.body.getAttribute("data-scroll-locked") === "1" ||
        document.body.style.overflow === "hidden";
      setIsLocked(locked);
    };
    checkLocked();
    const observer = new MutationObserver(checkLocked);
    observer.observe(document.body, { attributes: true, attributeFilter: ["style", "data-scroll-locked"] });
    return () => observer.disconnect();
  }, []);

  // Suppress floating widget in admin, affiliate portal, when cart or checkout modal is open,
  // when any modal/drawer locks the screen, or on product pages that already have the dedicated sticky bar.
  if (
    pathname?.startsWith("/admin") ||
    pathname?.startsWith("/affiliate") ||
    pathname?.startsWith("/affiliate-dashboard") ||
    pathname?.startsWith("/about-product") ||
    cartOpen ||
    isCheckoutModalOpen ||
    isLocked
  ) {
    return null;
  }

  const handleStartChat = () => {
    const waUrl =
      "https://wa.me/251969189470?text=ሰላም%20Amiele%20Begena%2C%20የተመረጡ%20የሙዚቃ%20መሣሪያዎችን%20ማዘዝ%20እፈልጋለሁ።";
    window.open(waUrl, "_blank", "noopener,noreferrer");
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="fixed bottom-5 right-5 sm:bottom-6 sm:right-6 z-40 select-none">
      {/* WhatsApp Chat Popup Box matching user's screenshot */}
      {isOpen && (
        <div className="absolute bottom-16 right-0 mb-2 w-[310px] sm:w-[335px] rounded-2xl shadow-2xl overflow-hidden border border-black/10 bg-[#eee7da] animate-in fade-in slide-in-from-bottom-3 duration-200">
          {/* Header */}
          <div className="bg-[#0c281a] px-4 py-3.5 flex items-center justify-between text-white">
            <div className="flex items-center gap-3">
              <div className="relative w-9 h-9 rounded-full overflow-hidden border border-white/20 shrink-0">
                <img
                  src="/image/photo_2025-02-27_17-33-38.jpg"
                  alt="Amiele Begena"
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <h4 className="font-extrabold text-[15px] leading-tight text-white tracking-tight">
                  Amiele Begena
                </h4>
                <p className="text-[11px] text-[#9dbfae] font-medium leading-tight mt-0.5">
                  Typically replies in minutes
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white/60 hover:text-white p-1 rounded-full transition-colors cursor-pointer"
              aria-label="Close chat popup"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="p-4 sm:p-5 space-y-4 bg-[#eee7da]">
            {/* White speech bubble */}
            <div className="bg-white rounded-2xl p-4 shadow-xs text-xs sm:text-[13px] font-semibold text-[#14231b] leading-relaxed">
              Hi there! 👋 How can we help you find the perfect instrument today?
            </div>

            {/* Start Chat Button */}
            <div className="flex justify-center pt-1">
              <button
                onClick={handleStartChat}
                className="rounded-full bg-gradient-to-r from-[#1eb656] via-[#22c55e] to-[#25D366] hover:from-[#18a84e] hover:via-[#1eb656] hover:to-[#22c35e] text-white font-bold text-xs sm:text-sm py-2.5 px-8 shadow-[0_4px_14px_rgba(37,211,102,0.32)] hover:shadow-[0_6px_20px_rgba(37,211,102,0.42)] active:scale-95 transition-all cursor-pointer border border-white/20"
              >
                Start Chat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Action Button (52px on mobile with safe clearance) */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative w-[52px] h-[52px] sm:w-14 sm:h-14 rounded-full bg-[#25D366] text-white flex items-center justify-center shadow-xl hover:bg-[#20ba5a] hover:scale-105 active:scale-95 transition-all cursor-pointer"
        aria-label="Open WhatsApp Chat"
      >
        {/* Red notification dot */}
        <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-[#ef4444] border-2 border-white shadow-xs" />

        {/* WhatsApp Icon */}
        <svg
          className="w-7 h-7 fill-current"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2M12.05 3.67C14.25 3.67 16.31 4.53 17.87 6.09C19.42 7.65 20.28 9.72 20.28 11.92C20.28 16.46 16.58 20.15 12.04 20.15C10.56 20.15 9.11 19.76 7.85 19L7.55 18.83L4.43 19.65L5.26 16.61L5.06 16.29C4.24 14.99 3.81 13.47 3.81 11.91C3.81 7.37 7.5 3.67 12.05 3.67M9.11 6.84C8.95 6.84 8.7 6.9 8.5 7.12C8.28 7.34 7.69 7.9 7.69 9.03C7.69 10.17 8.52 11.27 8.64 11.43C8.75 11.59 10.27 13.93 12.61 14.93C14.55 15.77 14.95 15.6 15.38 15.56C15.81 15.52 16.78 15 16.98 14.41C17.18 13.82 17.18 13.33 17.12 13.22C17.06 13.11 16.9 13.06 16.66 12.94C16.41 12.82 15.2 12.23 14.97 12.15C14.75 12.07 14.59 12.03 14.43 12.27C14.26 12.51 13.8 13.06 13.66 13.22C13.52 13.38 13.38 13.4 13.13 13.28C12.89 13.16 12.11 12.9 11.18 12.07C10.46 11.43 9.97 10.63 9.83 10.39C9.69 10.15 9.82 10.02 9.94 9.9C10.05 9.79 10.19 9.61 10.31 9.47C10.43 9.33 10.47 9.23 10.55 9.07C10.63 8.91 10.59 8.77 10.53 8.65C10.47 8.53 9.99 7.35 9.79 6.88C9.6 6.42 9.4 6.48 9.25 6.47C9.11 6.46 8.95 6.46 8.79 6.46L9.11 6.84Z" />
        </svg>
      </button>
    </div>
  );
}
