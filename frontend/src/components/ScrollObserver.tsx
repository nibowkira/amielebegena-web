"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { forceUnlockScroll } from "../lib/useScrollLock";

export default function ScrollObserver() {
  const pathname = usePathname();

  useEffect(() => {
    // Failsafe: Ensure clean unlocked scrolling on every route transition
    forceUnlockScroll();
    const handleScrollAnimations = () => {
      const elements = document.querySelectorAll(".reveal, .reveal-left, .reveal-right, .reveal-scale");

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add("active");
            }
          });
        },
        {
          threshold: 0.05,
          rootMargin: "80px 0px 80px 0px",
        }
      );

      elements.forEach((el) => {
        const rect = el.getBoundingClientRect();
        if (rect.top < window.innerHeight && rect.bottom > 0) {
          el.classList.add("active");
        } else {
          observer.observe(el);
        }
      });

      return () => observer.disconnect();
    };

    // Small delay to allow DOM to hydrate
    const timeout = setTimeout(handleScrollAnimations, 100);
    return () => clearTimeout(timeout);
  }, [pathname]);

  return null;
}
