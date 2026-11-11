"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  Bell,
  MessageSquare,
  Package,
  UserPlus,
  Heart,
  Check,
  X,
  Sparkles,
  ExternalLink,
} from "lucide-react";

export interface NotificationItem {
  id: string;
  sender: string;
  timeAgo: string;
  actionText: string;
  targetBold?: string;
  bodyPreview?: string;
  avatarUrl: string;
  badgeType: "comment" | "package" | "invite" | "like";
  isUnread: boolean;
  hasActions?: boolean;
}

const defaultNotifications: NotificationItem[] = [
  {
    id: "notif_1",
    sender: "Pixelwave",
    timeAgo: "1h ago",
    actionText: "Commented on",
    targetBold: "Master Begena Harps",
    bodyPreview:
      "These artisanal gut strings sound exceptionally resonant. Maybe these could be pre-stretched before global DHL packaging.",
    avatarUrl:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80",
    badgeType: "comment",
    isUnread: true,
  },
  {
    id: "notif_2",
    sender: "Artisan Workshop",
    timeAgo: "1h ago",
    actionText: "Acoustic calibration finalized -",
    targetBold: "Order #AM-2026-001170",
    bodyPreview: "Status: Hand-carved wanza wood frame completed and tuned.",
    avatarUrl:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80",
    badgeType: "package",
    isUnread: true,
  },
  {
    id: "notif_3",
    sender: "Liturgical Guild",
    timeAgo: "1h ago",
    actionText: "Invited you to curate",
    targetBold: "Sacred Acoustic Heritage Exhibition",
    bodyPreview: undefined,
    avatarUrl:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80",
    badgeType: "invite",
    isUnread: true,
    hasActions: true,
  },
  {
    id: "notif_4",
    sender: "Luna T.",
    timeAgo: "1h ago",
    actionText: "Liked",
    targetBold: "Kirar Acoustic Resonance Study",
    avatarUrl:
      "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&auto=format&fit=crop&q=80",
    badgeType: "like",
    isUnread: false,
  },
  {
    id: "notif_5",
    sender: "Affiliate Engine",
    timeAgo: "2h ago",
    actionText: "Commission verified on",
    targetBold: "Order #AM-2026-001171",
    bodyPreview:
      "ETB 680 credited to available balance for referral code giddymesfi-3659.",
    avatarUrl:
      "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=100&auto=format&fit=crop&q=80",
    badgeType: "comment",
    isUnread: false,
  },
];

interface NotificationFlyoutProps {
  buttonClassName?: string;
  iconClassName?: string;
  badgeCount?: number;
  triggerStyle?: "pill" | "circle" | "transparent";
}

export default function NotificationFlyout({
  buttonClassName = "",
  iconClassName = "w-5 h-5 stroke-[1.8]",
  badgeCount = 3,
  triggerStyle = "transparent",
}: NotificationFlyoutProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<"all" | "unread">("all");
  const [notifications, setNotifications] = useState<NotificationItem[]>(
    defaultNotifications
  );
  const [actionHandled, setActionHandled] = useState<{ [id: string]: string }>({});

  const containerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Lock background scrolling and movement when notification flyout is open
  useEffect(() => {
    if (!isOpen) return;

    // Save previous styles
    const prevBodyOverflow = document.body.style.overflow;
    const prevBodyTouchAction = document.body.style.touchAction;
    const prevBodyPaddingRight = document.body.style.paddingRight;
    const prevDocOverflow = document.documentElement.style.overflow;

    // Compensate scrollbar width to prevent page horizontal jitter
    const scrollbarWidth =
      window.innerWidth - document.documentElement.clientWidth;
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    document.body.style.overflow = "hidden";
    document.body.style.touchAction = "none";
    document.documentElement.style.overflow = "hidden";

    // Block background wheel and touch gestures outside the popover
    const handleBackgroundMovement = (e: WheelEvent | TouchEvent) => {
      if (popoverRef.current && popoverRef.current.contains(e.target as Node)) {
        return; // Allow scrolling inside the notification list
      }
      if (e.cancelable) {
        e.preventDefault();
      }
    };

    // Close on Escape key
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };

    window.addEventListener("wheel", handleBackgroundMovement, {
      passive: false,
    });
    window.addEventListener("touchmove", handleBackgroundMovement, {
      passive: false,
    });
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = prevBodyOverflow;
      document.body.style.touchAction = prevBodyTouchAction;
      document.body.style.paddingRight = prevBodyPaddingRight;
      document.documentElement.style.overflow = prevDocOverflow;
      window.removeEventListener("wheel", handleBackgroundMovement);
      window.removeEventListener("touchmove", handleBackgroundMovement);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
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

  // Handle invitation buttons
  const handleAction = (id: string, decision: "accepted" | "declined") => {
    setActionHandled((prev) => ({ ...prev, [id]: decision }));
    // Mark as read once acted upon
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isUnread: false } : n))
    );
  };

  // Mark all as read
  const handleMarkAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isUnread: false } : n))
    );
  };

  const filteredNotifications = notifications.filter((n) => {
    if (activeFilter === "unread") return n.isUnread;
    return true;
  });

  const unreadCount = notifications.filter((n) => n.isUnread).length;

  return (
    <div className="relative inline-block" ref={containerRef}>
      {/* Trigger Button without background matching Profile & Cart icons */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={
          buttonClassName ||
          (triggerStyle === "pill"
            ? `w-8 h-8 rounded-xl bg-[#FAF8F5] hover:bg-white border border-[#14231b]/15 shadow-2xs flex items-center justify-center transition-all cursor-pointer relative hover:border-[#D4AF37]/60 ${
                isOpen ? "z-50 ring-2 ring-[#D4AF37]/50 bg-white" : ""
              }`
            : triggerStyle === "circle"
            ? `w-8 h-8 rounded-full bg-[#FAF8F5] border border-[#14231b]/15 flex items-center justify-center text-[#14231b] hover:bg-[#F4F1EA] hover:border-[#D4AF37]/60 transition-colors relative cursor-pointer ${
                isOpen ? "z-50 ring-2 ring-[#D4AF37]/50" : ""
              }`
            : `relative p-1.5 text-[#14231b] hover:text-[#2d6a4f] transition-transform hover:scale-110 cursor-pointer ${
                isOpen ? "z-50 text-[#2d6a4f]" : ""
              }`)
        }
        aria-label="Notifications"
        aria-expanded={isOpen}
      >
        <Bell className={iconClassName} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#e63946] text-white text-[10px] font-bold flex items-center justify-center shadow">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Fullscreen Backdrop: Blocks background clicks, gestures, and movement */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-[#07150D]/30 backdrop-blur-[1.5px] pointer-events-auto transition-opacity animate-in fade-in duration-150"
          onClick={() => setIsOpen(false)}
          onWheel={(e) => {
            if (e.cancelable) e.preventDefault();
          }}
          onTouchMove={(e) => {
            if (e.cancelable) e.preventDefault();
          }}
          aria-hidden="true"
        />
      )}

      {/* Brand-styled Flyout Menu */}
      {isOpen && (
        <div
          ref={popoverRef}
          className="fixed left-3 right-3 top-[76px] sm:absolute sm:left-auto sm:right-0 sm:top-auto sm:mt-2.5 w-auto sm:w-[360px] max-w-[calc(100vw-24px)] sm:max-w-none max-h-[70vh] sm:max-h-[520px] flex flex-col bg-white rounded-2xl p-4 shadow-[0_20px_50px_-12px_rgba(20,35,27,0.22)] border border-[#14231b]/15 z-50 pointer-events-auto text-[#14231b] animate-in fade-in zoom-in-95 duration-150"
          style={{ transformOrigin: "top right" }}
        >
          {/* Subtle Sacred Gold Top Accent Bar */}
          <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent mb-3 rounded-full opacity-80" />

          {/* Header Row: Title & Filter Pills */}
          <div className="flex items-center justify-between pb-2.5 border-b border-[#14231b]/10 shrink-0">
            <div className="flex items-center gap-1.5">
              <h3 className="font-serif text-sm font-bold text-[#14231b] tracking-tight">
                Notifications
              </h3>
              <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
            </div>

            <div className="flex items-center gap-1 text-[11px]">
              <button
                type="button"
                onClick={() => setActiveFilter("all")}
                className={`px-2.5 py-0.5 rounded-lg font-bold transition-all cursor-pointer ${
                  activeFilter === "all"
                    ? "bg-[#14231b] text-[#FAF8F5] shadow-xs"
                    : "text-[#14231b]/60 hover:text-[#14231b] hover:bg-[#FAF8F5]"
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter("unread")}
                className={`px-2.5 py-0.5 rounded-lg font-bold transition-all cursor-pointer ${
                  activeFilter === "unread"
                    ? "bg-[#14231b] text-[#FAF8F5] shadow-xs"
                    : "text-[#14231b]/60 hover:text-[#14231b] hover:bg-[#FAF8F5]"
                }`}
              >
                Unread
              </button>
            </div>
          </div>

          {/* Notification List with Overscroll Containment */}
          <div
            className="divide-y divide-[#14231b]/5 flex-1 max-h-[calc(70vh-125px)] sm:max-h-[340px] overflow-y-auto pr-0.5 mt-1 space-y-0.5 overscroll-contain"
            style={{ overscrollBehavior: "contain" }}
          >
            {filteredNotifications.length === 0 ? (
              <div className="py-8 text-center text-[11px] text-[#737874]">
                No unread notifications at this time.
              </div>
            ) : (
              filteredNotifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => handleMarkAsRead(n.id)}
                  className={`py-2.5 px-2 flex items-start gap-2.5 transition-colors rounded-xl hover:bg-[#FAF8F5] cursor-pointer ${
                    n.isUnread ? "bg-white" : "opacity-80"
                  }`}
                >
                  {/* Left: Avatar with Mini Brand Badge */}
                  <div className="relative shrink-0 mt-0.5">
                    <img
                      src={n.avatarUrl}
                      alt={n.sender}
                      className="w-8.5 h-8.5 rounded-full object-cover border border-[#14231b]/10 shadow-2xs"
                    />

                    {/* Mini Badge on Avatar corner themed with brand colors */}
                    <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full flex items-center justify-center border-2 border-white shadow-2xs">
                      {n.badgeType === "comment" && (
                        <div className="w-full h-full bg-[#512c85] rounded-full flex items-center justify-center text-white" title="Comment">
                          <MessageSquare className="w-2 h-2" />
                        </div>
                      )}
                      {n.badgeType === "package" && (
                        <div className="w-full h-full bg-[#b8860b] rounded-full flex items-center justify-center text-white" title="Masterpiece / Order">
                          <Package className="w-2 h-2" />
                        </div>
                      )}
                      {n.badgeType === "invite" && (
                        <div className="w-full h-full bg-[#2d6a4f] rounded-full flex items-center justify-center text-white" title="Exhibition / Invitation">
                          <UserPlus className="w-2 h-2" />
                        </div>
                      )}
                      {n.badgeType === "like" && (
                        <div className="w-full h-full bg-[#c0392b] rounded-full flex items-center justify-center text-white" title="Appreciation">
                          <Heart className="w-2 h-2 fill-current" />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Middle Content */}
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <div className="text-[11.5px] leading-snug">
                      <span className="font-bold text-[#14231b] mr-1.5">
                        {n.sender}
                      </span>
                      <span className="text-[#737874] font-normal text-[10px]">
                        {n.timeAgo}
                      </span>
                    </div>

                    <p className="text-[11px] text-[#14231b]/80 leading-snug">
                      <span>{n.actionText} </span>
                      {n.targetBold && (
                        <span className="font-bold text-[#14231b]">
                          {n.targetBold}
                        </span>
                      )}
                    </p>

                    {n.bodyPreview && (
                      <p className="text-[10.5px] text-[#737874] line-clamp-2 leading-relaxed pt-0.5 bg-[#FAF8F5]/70 p-1.5 rounded-lg border border-[#14231b]/5 mt-0.5">
                        {n.bodyPreview}
                      </p>
                    )}

                    {/* Interactive Accept / Decline Buttons */}
                    {n.hasActions && !actionHandled[n.id] && (
                      <div className="flex items-center gap-1.5 pt-1.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAction(n.id, "declined");
                          }}
                          className="px-3 py-1 rounded-lg bg-[#FAF8F5] hover:bg-[#EAE6DD] text-[#14231b] text-[11px] font-bold border border-[#14231b]/15 transition-colors cursor-pointer"
                        >
                          Decline
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAction(n.id, "accepted");
                          }}
                          className="px-3.5 py-1 rounded-lg bg-[#14231b] hover:bg-[#07150D] text-[#D4AF37] hover:text-white text-[11px] font-bold shadow-xs border border-[#D4AF37]/35 transition-all cursor-pointer"
                        >
                          Accept
                        </button>
                      </div>
                    )}

                    {actionHandled[n.id] && (
                      <span className="inline-block mt-1 text-[10.5px] font-bold text-[#2d6a4f]">
                        {actionHandled[n.id] === "accepted"
                          ? "✓ Invitation Accepted"
                          : "Declined"}
                      </span>
                    )}
                  </div>

                  {/* Right Status Dot in Brand Emerald Green */}
                  {n.isUnread && (
                    <div className="pt-1.5 shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#2d6a4f] block ring-2 ring-[#2d6a4f]/25" />
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer Link */}
          <div className="pt-2.5 mt-1.5 border-t border-[#14231b]/10 flex items-center justify-between text-[11px]">
            <Link
              href="/account?tab=notifications"
              onClick={() => setIsOpen(false)}
              className="text-[#14231b]/70 hover:text-[#2d6a4f] font-semibold transition-colors"
            >
              Open Notification Center
            </Link>
            <button
              type="button"
              onClick={() =>
                setNotifications((prev) =>
                  prev.map((n) => ({ ...n, isUnread: false }))
                )
              }
              className="text-[#b8860b] hover:text-[#8c6508] font-bold text-[10.5px] hover:underline cursor-pointer"
            >
              Mark all as read
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
