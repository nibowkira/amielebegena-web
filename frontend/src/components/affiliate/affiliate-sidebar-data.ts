import {
  LayoutGrid,
  Link2,
  FileText,
  CreditCard,
  ShoppingBag,
  Target,
  Award,
  Megaphone,
  LucideIcon,
} from "lucide-react";

export type AffiliateTabId =
  | "dashboard"
  | "referrals"
  | "commissions"
  | "payouts"
  | "marketing"
  | "campaigns"
  | "achievements"
  | "broadcasts"
  | "settings";

export interface AffiliateNavItem {
  id: AffiliateTabId;
  label: string;
  icon: LucideIcon;
  href: string;
  badge?: string;
  description?: string;
}

export const AFFILIATE_NAV_ITEMS: AffiliateNavItem[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: LayoutGrid,
    href: "/affiliate-dashboard?tab=overview",
    description: "Overview metrics and partner command center",
  },
  {
    id: "referrals",
    label: "Referral Center",
    icon: Link2,
    href: "/affiliate-dashboard?tab=referrals",
    description: "Custom affiliate links, QR codes and assets",
  },
  {
    id: "commissions",
    label: "Commissions",
    icon: FileText,
    href: "/affiliate-dashboard?tab=commissions",
    description: "Detailed sales audit log and tiered payouts",
  },
  {
    id: "payouts",
    label: "Payout Queue",
    icon: CreditCard,
    href: "/affiliate-dashboard?tab=payouts",
    description: "Telebirr, CBE and instant disbursements",
  },
  {
    id: "marketing",
    label: "Marketing Center",
    icon: ShoppingBag,
    href: "/affiliate-dashboard?tab=marketing",
    description: "Banners, master audio clips and media kits",
  },
  {
    id: "campaigns",
    label: "Campaigns Creator",
    icon: Target,
    href: "/affiliate-dashboard?tab=campaigns",
    description: "Seasonal promotional links and campaign trackers",
  },
  {
    id: "achievements",
    label: "Achievements",
    icon: Award,
    href: "/affiliate-dashboard?tab=achievements",
    description: "Milestones, ambassador rank and awards",
  },
  {
    id: "broadcasts",
    label: "Broadcast Updates",
    icon: Megaphone,
    href: "/affiliate-dashboard?tab=broadcasts",
    description: "Workshop announcements, new product drops and updates",
  },
];

