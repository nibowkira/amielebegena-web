"use client";

import { useEffect } from "react";

/**
 * Robust Reference-Counted Scroll Lock
 * Prevents race conditions and rigid/unscrollable stuck states when multiple overlays
 * (CartDrawer, WhatsAppModal, PremiumModal, NotificationFlyout, Mobile Nav Drawer)
 * mount, toggle, or unmount in any order.
 */

let lockCount = 0;
let originalHtmlOverflow: string = "";
let originalBodyOverflow: string = "";
let originalBodyTouchAction: string = "";
let originalBodyOverscroll: string = "";

export function applyScrollLock() {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  const htmlEl = document.documentElement;
  const bodyEl = document.body;

  if (lockCount === 0) {
    // Snapshot original styles only on the initial lock
    originalHtmlOverflow = htmlEl.style.overflow;
    originalBodyOverflow = bodyEl.style.overflow;
    originalBodyTouchAction = bodyEl.style.touchAction;
    originalBodyOverscroll = bodyEl.style.overscrollBehavior;

    // Lock scrolling on html and body cleanly
    htmlEl.style.overflow = "hidden";
    bodyEl.style.overflow = "hidden";
    bodyEl.style.overscrollBehavior = "none";
  }

  lockCount++;
}

export function releaseScrollLock() {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  const htmlEl = document.documentElement;
  const bodyEl = document.body;

  lockCount = Math.max(0, lockCount - 1);

  if (lockCount === 0) {
    // Restore only when ALL active overlays/drawers have fully closed
    htmlEl.style.overflow = originalHtmlOverflow || "";
    bodyEl.style.overflow = originalBodyOverflow || "";
    bodyEl.style.touchAction = originalBodyTouchAction || "";
    bodyEl.style.overscrollBehavior = originalBodyOverscroll || "";
  }
}

/**
 * Failsafe unlock: call on page/route transitions to ensure body/html
 * are 100% liberated and never left rigid or stuck.
 */
export function forceUnlockScroll() {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  lockCount = 0;
  document.documentElement.style.overflow = "";
  document.body.style.overflow = "";
  document.body.style.touchAction = "";
  document.body.style.overscrollBehavior = "";
}

export function useScrollLock(isLocked: boolean) {
  useEffect(() => {
    if (!isLocked) return;

    applyScrollLock();

    return () => {
      releaseScrollLock();
    };
  }, [isLocked]);
}
