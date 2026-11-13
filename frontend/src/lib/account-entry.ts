/**
 * Account entry status and router logic for Amiele Begena (/account)
 */

export type AccountEntryStatus = "ADMIN" | "AFFILIATE" | "PENDING" | "REJECTED" | "NOT_APPLIED";

/**
 * Derives exactly one authoritative status for the user's account entry point:
 * Priority: profile.role === "admin" first, then approved affiliate, then pending, then rejected, then not applied.
 * Real database values only.
 */
export function getAccountEntry(
  profile?: { role?: string | null } | null,
  affiliateApp?: { status?: "pending" | "approved" | "rejected" | string | null } | null,
  isAffiliate?: boolean
): AccountEntryStatus {
  // 1. Priority: profile.role === "admin" first -> ADMIN
  if (profile?.role === "admin") {
    return "ADMIN";
  }

  // 2. Approved affiliate -> AFFILIATE
  if (isAffiliate || affiliateApp?.status === "approved" || profile?.role === "affiliate") {
    return "AFFILIATE";
  }

  // 3. Pending application -> PENDING
  if (affiliateApp?.status === "pending") {
    return "PENDING";
  }

  // 4. Rejected application -> REJECTED
  if (affiliateApp?.status === "rejected") {
    return "REJECTED";
  }

  // 5. Not applied -> NOT_APPLIED
  return "NOT_APPLIED";
}

