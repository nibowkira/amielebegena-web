import { Request, Response } from "express";
import { supabase, getUserSupabaseClient } from "../utils/supabase.js";
import { AuthenticatedRequest } from "../middleware/auth.middleware.js";

export const recordClick = async (req: Request, res: Response) => {
  try {
    const { referral_code, landing_page, session_id } = req.body;
    const userAgent = req.headers["user-agent"] || "unknown";
    const ip = req.ip || req.socket.remoteAddress || "unknown";

    if (!referral_code) {
      return res.status(400).json({ success: false, error: "Referral code is required." });
    }

    // Lookup affiliate by referral code
    const { data: affiliate } = await supabase
      .from("affiliates")
      .select("user_id")
      .eq("referral_code", referral_code)
      .maybeSingle();

    const { data, error } = await supabase.from("affiliate_clicks").insert({
      referral_code,
      affiliate_id: affiliate?.user_id || null,
      user_agent: userAgent,
      ip: typeof ip === "string" ? ip : "unknown",
      landing_page: landing_page || "/",
    });

    if (error) {
      console.warn("Could not insert affiliate click:", error);
    }

    return res.json({ success: true, message: "Click recorded." });
  } catch (error: any) {
    console.error("Error in recordClick:", error);
    return res.status(500).json({ success: false, error: error.message || "Failed to record click" });
  }
};

export const getAffiliateStats = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { identifier } = req.params; // referral code or user_id

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);

    let query = supabase.from("affiliates").select("*, profile:profiles(full_name, email)");
    if (isUuid) {
      query = query.eq("user_id", identifier);
    } else {
      query = query.eq("referral_code", identifier);
    }

    const { data: affiliate, error } = await query.maybeSingle();
    if (error || !affiliate) {
      return res.status(404).json({ success: false, error: "Affiliate not found." });
    }

    // Authorization check: User must own the record or have admin role
    const isOwner = req.user && req.user.id === affiliate.user_id;
    const isAdmin = req.userRole === "admin";

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        error: "Forbidden: You are only authorized to access your own affiliate records.",
      });
    }

    // Fetch clicks count
    const { count: clicksCount } = await supabase
      .from("affiliate_clicks")
      .select("*", { count: "exact", head: true })
      .eq("referral_code", affiliate.referral_code);

    // Fetch commissions ledger
    const { data: commissionsList } = await supabase
      .from("commissions")
      .select("*, order:orders(order_number, created_at, customer_name, quantity, product:products(name, price, currency))")
      .eq("affiliate_id", affiliate.user_id)
      .order("created_at", { ascending: false });

    // Fetch withdrawals history
    const { data: withdrawalsList } = await supabase
      .from("affiliate_withdrawals")
      .select("*")
      .eq("affiliate_id", affiliate.user_id)
      .order("created_at", { ascending: false });

    // Compute metrics
    const totalApprovedCommission = (commissionsList || [])
      .filter((c: any) => c.status === "approved")
      .reduce((sum: number, c: any) => sum + parseFloat(c.amount || 0), 0);

    const pendingCommission = (commissionsList || [])
      .filter((c: any) => c.status === "pending")
      .reduce((sum: number, c: any) => sum + parseFloat(c.amount || 0), 0);

    const totalWithdrawn = (withdrawalsList || [])
      .filter((w: any) => w.status === "approved" || w.status === "completed")
      .reduce((sum: number, w: any) => sum + parseFloat(w.amount || 0), 0);

    const pendingWithdrawal = (withdrawalsList || [])
      .filter((w: any) => w.status === "pending")
      .reduce((sum: number, w: any) => sum + parseFloat(w.amount || 0), 0);

    const availableBalance = Math.max(0, totalApprovedCommission - totalWithdrawn - pendingWithdrawal);

    return res.json({
      success: true,
      affiliate: {
        ...affiliate,
        clicks: clicksCount || 0,
        conversions: commissionsList?.length || 0,
        totalEarnings: totalApprovedCommission,
        pendingCommissions: pendingCommission,
        withdrawnBalance: totalWithdrawn,
        pendingWithdrawals: pendingWithdrawal,
        availableBalance: availableBalance,
      },
      commissions: commissionsList || [],
      withdrawals: withdrawalsList || [],
    });
  } catch (error: any) {
    console.error("Error in getAffiliateStats:", error);
    return res.status(500).json({ success: false, error: error.message || "Failed to fetch stats" });
  }
};

export const submitApplication = async (req: Request, res: Response) => {
  try {
    const {
      user_id,
      full_name,
      email,
      phone,
      motivation,
      social_link,
      payment_method,
      account_details,
    } = req.body;

    if (!email || !full_name) {
      return res.status(400).json({ success: false, error: "Name and email are required." });
    }

    if (!user_id) {
      return res.status(400).json({ success: false, error: "An authenticated user ID is required to apply." });
    }

    const client = getUserSupabaseClient(req.headers.authorization);

    // Sync full_name and phone to the user's profile
    await client
      .from("profiles")
      .update({
        full_name: full_name.trim(),
        ...(phone ? { phone: phone.trim() } : {}),
      })
      .eq("id", user_id);

    // Upsert into affiliate_applications (user_id is PK)
    const { data, error } = await client
      .from("affiliate_applications")
      .upsert(
        {
          user_id,
          motivation: motivation || "Amiele Begena partnership application",
          social_link: social_link || account_details || "Website direct",
          status: "pending",
          reviewed_by: null,
          reviewed_at: null,
        },
        { onConflict: "user_id" }
      )
      .select()
      .single();

    if (error) throw error;

    return res.status(201).json({
      success: true,
      message: "Your application has been received and is under review.",
      application: data,
    });
  } catch (error: any) {
    console.error("Error in submitApplication:", error);
    return res.status(500).json({ success: false, error: error.message || "Failed to submit application" });
  }
};

export const submitWithdrawal = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user;
    const userRole = req.userRole;

    if (!user) {
      return res.status(401).json({ success: false, error: "Unauthorized: Authentication required." });
    }

    if (userRole !== "affiliate" && userRole !== "admin") {
      return res.status(403).json({
        success: false,
        error: "Forbidden: Only approved affiliates or administrators can request withdrawals.",
      });
    }

    const { amount, currency = "ETB", method, payout_details } = req.body;
    // Bind to authenticated user ID unless admin explicitly specifies target affiliate
    const affiliate_id = userRole === "admin" && req.body.affiliate_id ? req.body.affiliate_id : user.id;

    const numAmount = parseFloat(amount);
    if (!numAmount || isNaN(numAmount) || numAmount < 1000) {
      return res.status(400).json({
        success: false,
        error: "Minimum withdrawal amount is 1,000 ETB.",
      });
    }

    if (!method || !payout_details || !String(payout_details).trim()) {
      return res.status(400).json({
        success: false,
        error: "Payout method and account details are required.",
      });
    }

    // Verify actual available balance from database ledger
    const { data: commissionsList } = await supabase
      .from("commissions")
      .select("amount, status")
      .eq("affiliate_id", affiliate_id);

    const { data: withdrawalsList } = await supabase
      .from("affiliate_withdrawals")
      .select("amount, status")
      .eq("affiliate_id", affiliate_id);

    const totalApprovedCommission = (commissionsList || [])
      .filter((c: any) => c.status === "approved")
      .reduce((sum: number, c: any) => sum + parseFloat(c.amount || 0), 0);

    const totalWithdrawn = (withdrawalsList || [])
      .filter((w: any) => w.status === "approved" || w.status === "completed")
      .reduce((sum: number, w: any) => sum + parseFloat(w.amount || 0), 0);

    const pendingWithdrawal = (withdrawalsList || [])
      .filter((w: any) => w.status === "pending")
      .reduce((sum: number, w: any) => sum + parseFloat(w.amount || 0), 0);

    const availableBalance = Math.max(0, totalApprovedCommission - totalWithdrawn - pendingWithdrawal);

    if (numAmount > availableBalance) {
      return res.status(400).json({
        success: false,
        error: `Requested amount (${numAmount.toLocaleString()} ETB) exceeds your verified available balance (${availableBalance.toLocaleString()} ETB).`,
      });
    }

    // Check for any already pending withdrawal
    const { data: existingPending } = await supabase
      .from("affiliate_withdrawals")
      .select("id")
      .eq("affiliate_id", affiliate_id)
      .eq("status", "pending")
      .maybeSingle();

    if (existingPending) {
      return res.status(400).json({
        success: false,
        error: "You already have a pending withdrawal request in review.",
      });
    }

    const { data, error } = await supabase
      .from("affiliate_withdrawals")
      .insert({
        affiliate_id,
        amount: numAmount,
        currency,
        method,
        payout_details: String(payout_details).trim(),
        status: "pending",
      })
      .select()
      .single();

    if (error) throw error;

    return res.status(201).json({
      success: true,
      message: "Withdrawal request submitted successfully.",
      withdrawal: data,
    });
  } catch (error: any) {
    console.error("Error in submitWithdrawal:", error);
    return res.status(500).json({ success: false, error: error.message || "Failed to submit withdrawal" });
  }
};
