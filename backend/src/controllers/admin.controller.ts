import { Request, Response } from "express";
import { supabase } from "../utils/supabase.js";

export const getAnalytics = async (req: Request, res: Response) => {
  try {
    const [
      { data: ordersData },
      { data: productsData },
      { data: affiliatesData },
      { data: commissionsData },
      { data: clicksData },
      { data: withdrawalsData },
      { data: profilesData },
    ] = await Promise.all([
      supabase
        .from("orders")
        .select("id, order_number, quantity, status, payment_status, fulfillment_status, country, created_at, product_id, product:products(name, price, currency)")
        .order("created_at", { ascending: false }),
      supabase.from("products").select("id, name, price, currency, category, status"),
      supabase.from("affiliates").select("user_id, referral_code, sales_count, created_at, profile:profiles(full_name, email)"),
      supabase.from("commissions").select("id, amount, status, created_at, order_id, affiliate_id"),
      supabase.from("affiliate_clicks").select("id, created_at, referral_code, user_agent").order("created_at", { ascending: false }).limit(200),
      supabase.from("affiliate_withdrawals").select("id, amount, status, created_at, method, affiliate_id").order("created_at", { ascending: false }),
      supabase.from("profiles").select("id, full_name, email, role, created_at"),
    ]);

    const orders = ordersData || [];
    const products = productsData || [];
    const affiliates = affiliatesData || [];
    const commissions = commissionsData || [];
    const clicks = clicksData || [];
    const withdrawals = withdrawalsData || [];
    const profiles = profilesData || [];

    // Revenue calculations
    const paidOrders = orders.filter((o: any) => o.payment_status === "paid" || o.payment_status === "verified");
    let totalRevenueETB = 0;
    const etbRate = 105.88;

    paidOrders.forEach((o: any) => {
      const price = parseFloat(o.product?.price || 0);
      const isUSD = (o.product?.currency || "USD") === "USD";
      const unitInETB = isUSD ? price * etbRate : price;
      totalRevenueETB += unitInETB * (o.quantity || 1);
    });

    const pendingOrdersCount = orders.filter((o: any) => o.payment_status === "pending_payment").length;
    const paidOrdersCount = paidOrders.length;
    const pendingWithdrawalsCount = withdrawals.filter((w: any) => w.status === "pending").length;

    return res.json({
      success: true,
      analytics: {
        totalOrders: orders.length,
        paidOrdersCount,
        pendingOrdersCount,
        totalRevenueETB: Math.round(totalRevenueETB),
        totalRevenueUSD: Math.round(totalRevenueETB / etbRate),
        totalProducts: products.length,
        activeProducts: products.filter((p: any) => p.status === "active").length,
        totalAffiliates: affiliates.length,
        totalClicks: clicks.length,
        totalCommissionsAllocated: commissions
          .filter((c: any) => c.status === "approved")
          .reduce((sum: number, c: any) => sum + parseFloat(c.amount || 0), 0),
        pendingWithdrawalsCount,
        recentOrders: orders.slice(0, 10),
        recentClicks: clicks.slice(0, 10),
        topAffiliates: affiliates.sort((a: any, b: any) => (b.sales_count || 0) - (a.sales_count || 0)).slice(0, 5),
      },
    });
  } catch (error: any) {
    console.error("Error in getAnalytics:", error);
    return res.status(500).json({ success: false, error: error.message || "Failed to load analytics" });
  }
};

export const getAffiliateApplications = async (req: Request, res: Response) => {
  try {
    const { status = "pending" } = req.query;

    let query = supabase
      .from("affiliate_applications")
      .select("*, profile:profiles!user_id(full_name, email, phone)")
      .order("created_at", { ascending: false });

    if (status !== "all") {
      query = query.eq("status", status);
    }

    const { data, error } = await query;
    if (error) throw error;

    return res.json({ success: true, applications: data || [] });
  } catch (error: any) {
    console.error("Error in getAffiliateApplications:", error);
    return res.status(500).json({ success: false, error: error.message || "Failed to load applications" });
  }
};

export const reviewAffiliateApplication = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, referral_code, rejection_reason } = req.body; // 'approved' or 'rejected'

    const updatePayload: any = {
      status,
      reviewed_at: new Date().toISOString(),
    };

    if (rejection_reason !== undefined) {
      updatePayload.rejection_reason = rejection_reason || null;
    }

    const { data: application, error: appError } = await supabase
      .from("affiliate_applications")
      .update(updatePayload)
      .eq("user_id", id)
      .select()
      .maybeSingle();

    if (appError) throw appError;

    // If approved, promote user to affiliate and create affiliates entry
    const targetUserId = application?.user_id || id;
    if (status === "approved" && targetUserId) {
      await supabase
        .from("profiles")
        .update({ role: "affiliate", updated_at: new Date().toISOString() })
        .eq("id", targetUserId);

      // Get profile name for referral code generation
      const { data: prof } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", targetUserId)
        .maybeSingle();

      const rawBase = (prof?.full_name || "affiliate").replace(/[^a-zA-Z0-9]/g, "").toLowerCase().slice(0, 8);
      const generatedCode = referral_code || `${rawBase}-${Math.floor(1000 + Math.random() * 9000)}`;

      await supabase.from("affiliates").upsert(
        {
          user_id: targetUserId,
          referral_code: generatedCode,
          commission_rate: "0.08",
          sales_count: 0,
        },
        { onConflict: "user_id" }
      );
    } else if (status === "rejected" && targetUserId) {
      // Ensure user role remains 'user' and remove from affiliates if any
      await supabase
        .from("profiles")
        .update({ role: "user", updated_at: new Date().toISOString() })
        .eq("id", targetUserId);
    }

    return res.json({ success: true, message: `Application ${status} successfully.`, application });
  } catch (error: any) {
    console.error("Error in reviewAffiliateApplication:", error);
    return res.status(500).json({ success: false, error: error.message || "Failed to review application" });
  }
};

export const getWithdrawalRequests = async (req: Request, res: Response) => {
  try {
    const { status = "pending" } = req.query;

    let query = supabase
      .from("affiliate_withdrawals")
      .select("*, affiliate:affiliates(referral_code, profile:profiles(full_name, email, phone))")
      .order("created_at", { ascending: false });

    if (status !== "all") {
      query = query.eq("status", status);
    }

    const { data, error } = await query;
    if (error) throw error;

    return res.json({ success: true, withdrawals: data || [] });
  } catch (error: any) {
    console.error("Error in getWithdrawalRequests:", error);
    return res.status(500).json({ success: false, error: error.message || "Failed to load withdrawals" });
  }
};

export const reviewWithdrawal = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, rejection_reason } = req.body; // 'approved', 'completed', 'rejected'

    const { data, error } = await supabase
      .from("affiliate_withdrawals")
      .update({
        status,
        rejection_reason: rejection_reason || null,
        processed_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return res.json({ success: true, message: `Withdrawal ${status}.`, withdrawal: data });
  } catch (error: any) {
    console.error("Error in reviewWithdrawal:", error);
    return res.status(500).json({ success: false, error: error.message || "Failed to review withdrawal" });
  }
};
