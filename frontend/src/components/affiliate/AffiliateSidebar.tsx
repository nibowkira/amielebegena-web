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
      {/* AFFILIATE PORTAL SIDEBAR - Perfectly Sized & Distributed   */}
      {/* ========================================================= */}
      <aside
        className={`aff-sidebar fixed md:sticky top-0 inset-y-0 left-0 z-50 md:z-30 w-[240px] sm:w-[245px] md:w-[245px] lg:w-[252px] bg-[#0f2418] text-white flex flex-col justify-between px-3.5 py-3.5 sm:px-4 sm:py-4 shrink-0 h-screen max-h-screen overflow-y-auto overflow-x-hidden border-r border-white/5 select-none transition-transform duration-300 ease-in-out ${
          mobileOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full md:translate-x-0"
        } ${className}`}
      >
        {/* Top: Brand Header */}
        <div className="space-y-0.5 shrink-0 pb-1">
          <div className="flex items-center justify-between">
            <Link href="/" className="block group">
              <span className="font-benaiah text-xl sm:text-[22px] font-extrabold tracking-wide text-white group-hover:text-[#f5c518] transition-colors block">
                ዓሚኤል በገና
              </span>
            </Link>

            {/* Mobile Close Button */}
            {onCloseMobile && (
              <button
                type="button"
                onClick={onCloseMobile}
                className="md:hidden p-1 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                aria-label="Close menu"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <span className="text-[9.5px] font-extrabold text-[#f5c518] tracking-[0.2em] uppercase block">
            AFFILIATE PORTAL
          </span>
        </div>

        {/* Center: Navigation Links List - Centered and nudged slightly up for optical balance */}
        <nav
          className="my-auto -translate-y-4 sm:-translate-y-6 py-2 w-full flex flex-col justify-center shrink-0 min-h-0"
          aria-label="Affiliate Portal Navigation"
        >
          <ul className="aff-sidebar-menu space-y-1 sm:space-y-1.5 list-none p-0 m-0">
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
                    className={`aff-menu-item font-benaiah w-full h-[33px] sm:h-[35px] flex items-center gap-2.5 px-3 rounded-xl text-xs sm:text-[12.5px] font-semibold transition-all duration-150 cursor-pointer ${
                      isActive
                        ? "active bg-[#f5c518] text-[#14231b] font-bold shadow-[0_2px_10px_rgba(245,197,24,0.3)]"
                        : "text-[#d6e0da] hover:text-white hover:bg-white/10"
                    }`}
                  >
                    <Icon
                      className={`w-3.5 h-3.5 shrink-0 ${
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

        {/* Bottom Footer: User Profile Card (Settings) & Exit to Account Action */}
        <footer className="pt-2.5 border-t border-white/10 space-y-2 shrink-0 font-benaiah">
          {/* User Profile Card / Settings - Aligned Cleanly */}
          <div
            data-tour="settings"
            onClick={() => {
              onSelectTab("settings");
              if (onCloseMobile) onCloseMobile();
            }}
            className={`aff-sidebar-user rounded-xl p-2 flex items-center justify-between shadow-xs transition-all cursor-pointer ${
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
                <p className="text-[10px] text-[#cad5cf] truncate max-w-[110px]">
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
              className={`p-1 rounded-md transition-colors cursor-pointer ${
                activeTab === "settings"
                  ? "text-[#f5c518]"
                  : "text-[#d6e0da] hover:text-white"
              }`}
              title="Partner Settings"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Exit to Account Action Button */}
          <div className="aff-sidebar-bottom-actions">
            <Link
              href="/account"
              className="font-benaiah w-full h-[31px] sm:h-[32px] rounded-xl border border-white/15 hover:border-white/30 hover:bg-white/5 text-white text-xs font-semibold px-3 flex items-center justify-start gap-2 transition-all duration-150 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Exit to Account</span>
            </Link>
          </div>
        </footer>
      </aside>
    </>
  );
}
