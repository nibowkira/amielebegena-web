"use client";

import { useEffect } from "react";

/**
 * Hook to lock background window scrolling while an overlay (modal, cart drawer, dialog) is open.
 * Locks both html and body overflow and intercepts window wheel events outside scrollable areas.
 */
export function useScrollLock(isLocked: boolean) {
  useEffect(() => {
    if (!isLocked) return;
    if (typeof window === "undefined" || typeof document === "undefined") return;

    const htmlEl = document.documentElement;
    const bodyEl = document.body;

    const originalHtmlOverflow = htmlEl.style.overflow;
    const originalBodyOverflow = bodyEl.style.overflow;
    const originalOverscroll = bodyEl.style.overscrollBehavior;

    // Lock both html and body so window cannot scroll behind modal/drawer
    htmlEl.style.overflow = "hidden";
    bodyEl.style.overflow = "hidden";
    bodyEl.style.overscrollBehavior = "none";

    // Block background wheel movement while preserving scrolling within the modal/drawer
    const handleWheel = (e: WheelEvent) => {
      let target = e.target as HTMLElement | null;
      let canScroll = false;
      while (target && target !== bodyEl && target !== htmlEl) {
        if (target.scrollHeight > target.clientHeight) {
          const style = window.getComputedStyle(target);
          if (
            (style.overflowY === "auto" || style.overflowY === "scroll") &&
            target.clientHeight > 0
          ) {
            canScroll = true;
            break;
          }
        }
        target = target.parentElement;
      }
      if (!canScroll) {
        e.preventDefault();
      }
    };

    window.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      htmlEl.style.overflow = originalHtmlOverflow || "";
      bodyEl.style.overflow = originalBodyOverflow || "";
      bodyEl.style.overscrollBehavior = originalOverscroll || "";
      window.removeEventListener("wheel", handleWheel);
    };
  }, [isLocked]);
}
