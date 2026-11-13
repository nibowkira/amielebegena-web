"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft, Pencil, Settings, X } from "lucide-react";
import {
  AFFILIATE_NAV_ITEMS,
  AffiliateTabId,
  AffiliateNavItem,
} from "./affiliate-sidebar-data";
import { useScrollLock } from "../../lib/useScrollLock";

export interface AffiliateUserProfile {
  displayName: string;
  displayEmail: string;
  userInitial: string;
}

export interface AffiliateSidebarProps {
  activeTab: AffiliateTabId;
  onSelectTab: (tabId: AffiliateTabId) => void;
  userProfile?: AffiliateUserProfile;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
  className?: string;
}

export default function AffiliateSidebar({
  activeTab,
  onSelectTab,
  userProfile = {
    displayName: "jane",
    displayEmail: "punchesbox@gmail.com",
    userInitial: "J",
  },
  mobileOpen = false,
  onCloseMobile,
  className = "",
}: AffiliateSidebarProps) {
  const { displayName, displayEmail, userInitial } = userProfile;

  // Lock scrolling when mobile sidebar drawer is open
  useScrollLock(mobileOpen);

  // Close on Escape key press
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && mobileOpen && onCloseMobile) {
        onCloseMobile();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mobileOpen, onCloseMobile]);

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 md:hidden transition-opacity"
          onClick={onCloseMobile}
          style={{ touchAction: "none" }}
        />
      )}

      {/* ========================================================= */}
      {/* AFFILIATE PORTAL SIDEBAR - 100dvh Flex Column on Mobile    */}
      {/* ========================================================= */}
      <aside
        className={`aff-sidebar fixed md:sticky top-0 inset-y-0 left-0 z-50 md:z-30 w-[270px] sm:w-[280px] md:w-[245px] lg:w-[252px] bg-[#0f2418] text-white flex flex-col justify-between px-3.5 py-3 sm:px-4 sm:py-4 md:px-4 md:py-4 shrink-0 h-[100dvh] md:h-screen max-h-[100dvh] md:max-h-screen overflow-hidden border-r border-white/5 select-none transition-transform duration-300 ease-in-out ${
          mobileOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full md:translate-x-0"
        } ${className}`}
      >
        {/* Top: Brand Header (Fixed, Does Not Scroll) */}
        <div className="space-y-0.5 shrink-0 pb-1">
          <div className="flex items-center justify-between">
            <Link
              href="/"
              onClick={() => {
                if (onCloseMobile) onCloseMobile();
              }}
              className="block group"
            >
              <span className="font-benaiah text-xl sm:text-[22px] font-extrabold tracking-wide text-white group-hover:text-[#f5c518] transition-colors block">
                ዓሚኤል በገና
              </span>
            </Link>

            {/* Mobile Close Button */}
            {onCloseMobile && (
              <button
                type="button"
                onClick={onCloseMobile}
                className="md:hidden p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          <span className="text-[9.5px] font-extrabold text-[#f5c518] tracking-[0.2em] uppercase block">
            AFFILIATE PORTAL
          </span>
        </div>

        {/* Center: Navigation Links List - flex-1 with min-h-0, fits viewport on mobile */}
        <nav
          className="mt-2.5 sm:mt-4 md:mt-6 flex-1 min-h-0 py-1 md:py-2 w-full no-scrollbar"
          aria-label="Affiliate Portal Navigation"
        >
          <ul className="aff-sidebar-menu space-y-0.5 sm:space-y-1 md:space-y-1.5 list-none p-0 m-0">
            {AFFILIATE_NAV_ITEMS.map((item: AffiliateNavItem) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <li key={item.id} className="w-full">
                  <button
                    type="button"
                    data-tour={item.id}
                    onClick={() => {
                      onSelectTab(item.id);
                      if (onCloseMobile) onCloseMobile();
                    }}
                    className={`aff-menu-item font-benaiah w-full h-[44px] md:h-[35px] flex items-center gap-2.5 md:gap-3 px-3 md:px-3 rounded-xl text-[12px] sm:text-[12.5px] font-semibold transition-all duration-150 cursor-pointer min-h-[44px] ${
                      isActive
                        ? "active bg-[#f5c518] text-[#14231b] font-bold shadow-[0_2px_10px_rgba(245,197,24,0.3)]"
                        : "text-[#d6e0da] hover:text-white hover:bg-white/10"
                    }`}
                  >
                    <Icon
                      className={`w-[18px] h-[18px] md:w-3.5 md:h-3.5 shrink-0 ${
                        isActive ? "text-[#14231b]" : "text-[#d6e0da]"
                      }`}
                    />
                    <span className="truncate">{item.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Bottom Footer: User Profile Card & Exit Action pinned to bottom with safe-area padding */}
        <footer
          className="pt-2 md:pt-2.5 border-t border-white/10 space-y-1.5 md:space-y-2 shrink-0 font-benaiah mt-auto"
          style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom, 16px))" }}
        >
          {/* User Profile Card / Settings - Matching menu row width and rounded-xl */}
          <div
            data-tour="settings"
            onClick={() => {
              onSelectTab("settings");
              if (onCloseMobile) onCloseMobile();
            }}
            className={`aff-sidebar-user w-full rounded-xl p-2 md:p-2 flex items-center justify-between shadow-xs transition-all cursor-pointer min-h-[44px] md:min-h-[40px] ${
              activeTab === "settings"
                ? "bg-[#182c20] border-2 border-[#f5c518] shadow-[0_0_12px_rgba(245,197,24,0.3)]"
                : "bg-white/5 border border-white/10 hover:border-white/20"
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              {/* Yellow avatar circle with initial & verified pencil edit badge */}
              <div className="relative w-8 h-8 rounded-full bg-[#f5c518] text-[#14231b] font-black text-xs flex items-center justify-center shrink-0 shadow-xs font-benaiah">
                <span>{userInitial}</span>
                <div
                  className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-[#f5c518] rounded-full border border-[#0f2418] flex items-center justify-center text-[#0f2418]"
                  title="Verified Profile"
                >
                  <Pencil className="w-1.5 h-1.5" />
                </div>
              </div>

              {/* Name & Email */}
              <div className="min-w-0 font-benaiah">
                <p className="text-xs font-bold text-white truncate leading-tight">
                  {displayName}
                </p>
                <p className="text-[10px] text-[#cad5cf] truncate max-w-[130px] md:max-w-[110px]">
                  {displayEmail}
                </p>
              </div>
            </div>

            {/* Settings Gear Button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSelectTab("settings");
                if (onCloseMobile) onCloseMobile();
              }}
              className={`p-1.5 md:p-1 rounded-md transition-colors cursor-pointer min-w-[36px] min-h-[36px] flex items-center justify-center ${
                activeTab === "settings"
                  ? "text-[#f5c518]"
                  : "text-[#d6e0da] hover:text-white"
              }`}
              title="Partner Settings"
            >
              <Settings className="w-4 h-4 md:w-3.5 md:h-3.5" />
            </button>
          </div>

          {/* Exit to Account Action Button - Matching menu row width, radius, and height */}
          <div className="aff-sidebar-bottom-actions w-full">
            <Link
              href="/account"
              onClick={() => {
                if (onCloseMobile) onCloseMobile();
              }}
              className="font-benaiah w-full h-[44px] md:h-[32px] rounded-xl border border-white/15 hover:border-white/30 hover:bg-white/5 text-white text-xs font-semibold px-3 md:px-3 flex items-center justify-start gap-2.5 transition-all duration-150 cursor-pointer min-h-[44px]"
            >
              <ArrowLeft className="w-[18px] h-[18px] md:w-3.5 md:h-3.5 shrink-0" />
              <span>Exit to Account</span>
            </Link>
          </div>
        </footer>
      </aside>
    </>
  );
}
