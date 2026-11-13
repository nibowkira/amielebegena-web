"use client";

import React, { useEffect } from "react";
import { X } from "lucide-react";
import { useScrollLock } from "../../lib/useScrollLock";

export interface PremiumModalProps {
  open: boolean;
  onClose: () => void;
  eyebrow?: string;
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

export default function PremiumModal({
  open,
  onClose,
  eyebrow,
  title,
  subtitle,
  badge,
  children,
  footer,
  className = "",
}: PremiumModalProps) {
  // Prevent background scrolling while modal is open
  useScrollLock(open);

  // Support Escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 p-4 sm:p-6 md:p-8 flex items-center justify-center overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-labelledby="premium-modal-title"
      style={{ overscrollBehavior: "none" }}
    >
      {/* Darkened, Blurred Backdrop */}
      <div
        className="fixed inset-0 bg-[#07130b]/75 backdrop-blur-md transition-opacity duration-300"
        onClick={onClose}
        style={{ touchAction: "none" }}
      />

      {/* Outer Modal Container: Compact responsive size with comfortable outer padding */}
      <div
        className={`relative w-full max-w-[94%] sm:max-w-[540px] md:max-w-[600px] max-h-[calc(100dvh-40px)] sm:max-h-[82vh] rounded-[22px] sm:rounded-[26px] bg-[#FAF8F4] text-[#172820] border border-[#E8E1D6] shadow-[0_25px_70px_-15px_rgba(20,39,29,0.35)] flex flex-col box-border overflow-hidden z-10 animate-in zoom-in-95 fade-in duration-200 ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ========================================================= */}
        {/* FIXED HEADER                                              */}
        {/* ========================================================= */}
        <header className="px-5 py-4 sm:px-7 sm:py-4.5 border-b border-[#E8E1D6] bg-[#FAF8F4] flex items-center justify-between gap-4 shrink-0">
          <div className="min-w-0 flex-1">
            {eyebrow && (
              <div className="flex items-center gap-2 mb-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#D9B32E]" />
                <span className="text-[10px] sm:text-[11px] font-bold tracking-[0.25em] text-[#D9B32E] uppercase truncate">
                  {eyebrow}
                </span>
              </div>
            )}
            <h2
              id="premium-modal-title"
              className="text-xl sm:text-2xl font-black text-[#14271D] tracking-tight truncate leading-tight"
            >
              {title}
            </h2>
            {subtitle && (
              <p className="text-xs text-[#7D867F] font-medium mt-0.5 truncate">
                {subtitle}
              </p>
            )}
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {badge && <div>{badge}</div>}

            {/* Circular Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="min-w-[44px] min-h-[44px] w-11 h-11 rounded-full bg-white border border-[#E8E1D6] text-[#7D867F] hover:text-[#172820] hover:bg-[#F8F5EF] flex items-center justify-center transition-all shadow-xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#D9B32E]/30"
              aria-label="Close modal"
            >
              <X className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>
        </header>

        {/* ========================================================= */}
        {/* SCROLLABLE CENTRAL CONTENT AREA                           */}
        {/* ========================================================= */}
        <div
          className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-4"
          style={{
            overscrollBehavior: "contain",
            WebkitOverflowScrolling: "touch",
            touchAction: "pan-y",
          }}
        >
          {children}
        </div>

        {/* ========================================================= */}
        {/* FIXED FOOTER                                              */}
        {/* ========================================================= */}
        {footer && (
          <footer className="px-4 py-3 sm:px-7 sm:py-3.5 border-t border-[#E8E1D6] bg-[#FAF8F4] w-full shrink-0">
            {footer}
          </footer>
        )}
      </div>
    </div>
  );
}
