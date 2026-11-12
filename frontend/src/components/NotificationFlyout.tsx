"use client";

import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
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
  Info,
  Clock,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { useScrollLock } from "../lib/useScrollLock";

export interface NotificationItem {
  id: string;
  sender: string;
  timeAgo: string;
  actionText: string;
  targetBold?: string;
  bodyPreview?: string;
  avatarUrl?: string;
  badgeType: "comment" | "package" | "invite" | "like" | "info" | "order";
  isUnread: boolean;
  hasActions?: boolean;
  link?: string;
  createdAt: string;
}

function formatTimeAgo(isoString: string): string {
  try {
    const date = new Date(isoString);
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (isNaN(diffSec) || diffSec < 60) return "just now";
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour}h ago`;
    const diffDays = Math.floor(diffHour / 24);
    return `${diffDays}d ago`;
  } catch {
    return "recently";
  }
}

function mapRowToNotification(row: any): NotificationItem {
  return {
    id: String(row.id),
    sender: row.title || "Amiele System",
    timeAgo: formatTimeAgo(row.created_at || new Date().toISOString()),
    actionText: row.message || "",
    targetBold: undefined,
    bodyPreview: row.message || undefined,
    avatarUrl: row.avatar_url || undefined,
    badgeType: (row.type as any) || "info",
    isUnread: !row.is_read,
    link: row.link || undefined,
    createdAt: row.created_at || new Date().toISOString(),
  };
}

interface NotificationFlyoutProps {
  buttonClassName?: string;
  iconClassName?: string;
  badgeCount?: number;
  triggerStyle?: "pill" | "circle" | "transparent" | "menu-row";
  onOpenChange?: (open: boolean) => void;
}

// Live real-time Supabase notifications state shared across all components
let globalNotifications: NotificationItem[] = [];
let isInitialized = false;
const subscribers = new Set<(items: NotificationItem[]) => void>();

function notifySubscribers() {
  subscribers.forEach((callback) => callback([...globalNotifications]));
}

async function fetchRealNotifications() {
  try {
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.warn("Supabase notifications query error:", error.message);
      return;
    }

    if (data) {
      globalNotifications = data.map(mapRowToNotification);
      notifySubscribers();
    }
  } catch (err) {
    console.warn("Error fetching real notifications:", err);
  }
}

function initRealtimeNotifications() {
  if (isInitialized) return;
  isInitialized = true;

  fetchRealNotifications();

  // Subscribe to real-time postgres changes on the notifications table
  try {
    supabase
      .channel("public:notifications_realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications" },
        () => {
          fetchRealNotifications();
        }
      )
      .subscribe();
  } catch (err) {
    console.warn("Realtime subscription setup failed:", err);
  }
}

export function useNotificationStore() {
  const [notifications, setNotifications] = useState<NotificationItem[]>(globalNotifications);

  useEffect(() => {
    initRealtimeNotifications();
    subscribers.add(setNotifications);
    setNotifications([...globalNotifications]);
    return () => {
      subscribers.delete(setNotifications);
    };
  }, []);

  const unreadCount = notifications.filter((n) => n.isUnread).length;

  const markAsRead = async (id: string) => {
    globalNotifications = globalNotifications.map((n) =>
      n.id === id ? { ...n, isUnread: false } : n
    );
    notifySubscribers();

    try {
      await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    } catch (e) {
      console.warn("Failed to mark notification read in Supabase:", e);
    }
  };

  const markAllAsRead = async () => {
    globalNotifications = globalNotifications.map((n) => ({ ...n, isUnread: false }));
    notifySubscribers();

    try {
      await supabase.from("notifications").update({ is_read: true }).eq("is_read", false);
    } catch (e) {
      console.warn("Failed to mark all read in Supabase:", e);
    }
  };

  return { notifications, unreadCount, markAsRead, markAllAsRead, refresh: fetchRealNotifications };
}

export default function NotificationFlyout({
  buttonClassName = "",
  iconClassName = "w-5 h-5 stroke-[1.8]",
  badgeCount,
  triggerStyle = "transparent",
  onOpenChange,
}: NotificationFlyoutProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<"all" | "unread">("all");
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotificationStore();
  const [actionHandled, setActionHandled] = useState<{ [id: string]: string }>({});

  const containerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const triggerButtonRef = useRef<HTMLButtonElement>(null);

  const [mounted, setMounted] = useState(false);
  const [popoverPos, setPopoverPos] = useState<{ top: number; right: number } | null>(null);

  const displayBadgeCount = badgeCount !== undefined ? badgeCount : unreadCount;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen || !mounted) return;

    const updatePos = () => {
      if (triggerButtonRef.current) {
        const rect = triggerButtonRef.current.getBoundingClientRect();
        setPopoverPos({
          top: rect.bottom + 8,
          right: Math.max(12, window.innerWidth - rect.right),
        });
      }
    };

    updatePos();
    window.addEventListener("resize", updatePos);
    window.addEventListener("scroll", updatePos, { passive: true });
    return () => {
      window.removeEventListener("resize", updatePos);
      window.removeEventListener("scroll", updatePos);
    };
  }, [isOpen, mounted]);

  // Lock background scrolling safely via reference-counted hook
  useScrollLock(isOpen);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
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
    markAsRead(id);
  };

  // Mark all as read
  const handleMarkAsRead = (id: string) => {
    markAsRead(id);
  };

  const filteredNotifications = notifications.filter((n) => {
    if (activeFilter === "unread") return n.isUnread;
    return true;
  });

  const toggleOpen = () => {
    const next = !isOpen;
    setIsOpen(next);
    onOpenChange?.(next);
  };

  return (
    <div
      className={triggerStyle === "menu-row" ? "w-full" : "relative inline-block"}
      ref={containerRef}
    >
      {triggerStyle === "menu-row" ? (
        <button
          ref={triggerButtonRef}
          type="button"
          onClick={toggleOpen}
          className={
            buttonClassName ||
            "w-full px-6 py-3.5 text-sm font-bold text-[#14231b] hover:bg-[#FAF8F5] transition-colors flex items-center justify-between cursor-pointer"
          }
          aria-label={displayBadgeCount > 0 ? `Notifications, ${displayBadgeCount} unread` : "Notifications"}
          aria-expanded={isOpen}
        >
          <div className="flex items-center gap-2.5">
            <Bell className="w-4 h-4 text-[#14231b]" />
            <span>Notifications</span>
          </div>
          {displayBadgeCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-[#f3be3b] text-[#14231b] text-xs font-black shadow-xs">
              {displayBadgeCount}
            </span>
          )}
        </button>
      ) : (
        <button
          ref={triggerButtonRef}
          type="button"
          onClick={toggleOpen}
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
          aria-label={displayBadgeCount > 0 ? `Notifications, ${displayBadgeCount} unread` : "Notifications"}
          aria-expanded={isOpen}
        >
          <Bell className={iconClassName} />
          {displayBadgeCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[17px] h-4 px-1 rounded-full bg-[#f3be3b] text-[#14231b] text-[10px] font-black flex items-center justify-center shadow-xs border border-white">
              {displayBadgeCount}
            </span>
          )}
        </button>
      )}

      {/* Fullscreen Blurred Backdrop & Flyout Menu Portaled to document.body */}
      {mounted && isOpen && createPortal(
        <>
          {/* Fullscreen Backdrop: Blurs the entire window */}
          <div
            className="fixed inset-0 z-[9998] bg-black/60 backdrop-blur-md pointer-events-auto transition-opacity animate-in fade-in duration-200"
            onClick={() => {
              setIsOpen(false);
              onOpenChange?.(false);
            }}
            onWheel={(e) => {
              if (e.cancelable) e.preventDefault();
            }}
            onTouchMove={(e) => {
              if (e.cancelable) e.preventDefault();
            }}
            aria-hidden="true"
          />

          {/* Brand-styled Flyout Menu */}
          <div
            ref={popoverRef}
            style={
              popoverPos && typeof window !== "undefined" && window.innerWidth >= 768
                ? {
                    top: `${popoverPos.top}px`,
                    right: `${popoverPos.right}px`,
                    position: "fixed",
                  }
                : undefined
            }
            className="fixed left-3 right-3 top-[76px] md:left-auto md:right-auto md:top-auto w-auto md:w-[360px] max-w-[calc(100vw-24px)] md:max-w-none max-h-[75vh] md:max-h-[520px] flex flex-col bg-white rounded-2xl p-4 shadow-[0_20px_60px_-10px_rgba(0,0,0,0.35)] border border-[#14231b]/15 z-[9999] pointer-events-auto text-[#14231b] animate-in fade-in zoom-in-95 duration-150"
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
              <div className="py-12 px-4 text-center flex flex-col items-center justify-center space-y-2">
                <div className="w-10 h-10 rounded-full bg-[#FAF8F5] border border-[#14231b]/10 flex items-center justify-center text-[#14231b]/40">
                  <Bell className="w-5 h-5 stroke-[1.5]" />
                </div>
                <p className="text-xs font-bold text-[#14231b]">No notifications</p>
                <p className="text-[11px] text-[#737874] max-w-[220px]">
                  {activeFilter === "unread"
                    ? "You have no unread notifications at this time."
                    : "You have no notifications at this time."}
                </p>
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
                    {n.avatarUrl && n.avatarUrl.length > 5 ? (
                      <img
                        src={n.avatarUrl}
                        alt={n.sender}
                        className="w-8.5 h-8.5 rounded-full object-cover border border-[#14231b]/10 shadow-2xs"
                      />
                    ) : (
                      <div className="w-8.5 h-8.5 rounded-full bg-[#14231b]/10 text-[#14231b] flex items-center justify-center font-bold text-xs border border-[#14231b]/10 shadow-2xs">
                        {n.sender.charAt(0).toUpperCase()}
                      </div>
                    )}

                    {/* Mini Badge on Avatar corner themed with brand colors */}
                    <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full flex items-center justify-center border-2 border-white shadow-2xs">
                      {n.badgeType === "comment" && (
                        <div className="w-full h-full bg-[#512c85] rounded-full flex items-center justify-center text-white" title="Comment">
                          <MessageSquare className="w-2 h-2" />
                        </div>
                      )}
                      {(n.badgeType === "package" || n.badgeType === "order") && (
                        <div className="w-full h-full bg-[#b8860b] rounded-full flex items-center justify-center text-white" title="Order">
                          <Package className="w-2 h-2" />
                        </div>
                      )}
                      {n.badgeType === "invite" && (
                        <div className="w-full h-full bg-[#2d6a4f] rounded-full flex items-center justify-center text-white" title="Invitation">
                          <UserPlus className="w-2 h-2" />
                        </div>
                      )}
                      {n.badgeType === "like" && (
                        <div className="w-full h-full bg-[#c0392b] rounded-full flex items-center justify-center text-white" title="Appreciation">
                          <Heart className="w-2 h-2 fill-current" />
                        </div>
                      )}
                      {!["comment", "package", "order", "invite", "like"].includes(n.badgeType) && (
                        <div className="w-full h-full bg-[#14231b] rounded-full flex items-center justify-center text-white" title="Notice">
                          <Bell className="w-2 h-2" />
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
              onClick={markAllAsRead}
              className="text-[#b8860b] hover:text-[#8c6508] font-bold text-[10.5px] hover:underline cursor-pointer"
            >
              Mark all as read
            </button>
          </div>
        </div>
      </>,
      document.body
    )}
  </div>
);
}
