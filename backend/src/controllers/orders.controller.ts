import { Request, Response } from "express";
import { db, schema } from "../db/index.js";
import { supabase } from "../utils/supabase.js";
import { eq, or, and, desc } from "drizzle-orm";

export const createGuestOrder = async (req: Request, res: Response) => {
  try {
    const {
      customer_name,
      phone,
      customer_email,
      country,
      product_id,
      product_name,
      quantity = 1,
      referral_code,
      session_id,
      notes = "Guest WhatsApp Checkout",
    } = req.body;

    if (!customer_name || !phone) {
      return res.status(400).json({
        success: false,
        error: "Customer name and phone number are required.",
      });
    }

    // Call stored procedure create_guest_order
    const rpcPayload = {
      p_customer_name: customer_name,
      p_phone: phone,
      p_customer_email: customer_email || "N/A",
      p_country: country || "Ethiopia",
      p_product_id: product_id || null,
      p_product_name: product_name || null,
      p_quantity: parseInt(String(quantity), 10) || 1,
      p_referral_code: referral_code || null,
      p_session_id: session_id || null,
      p_notes: notes,
    };

    const { data, error } = await supabase.rpc("create_guest_order", rpcPayload);

    if (error) {
      console.warn("RPC create_guest_order returned error, attempting fallback insert:", error);
      // Fallback direct insert
      const year = new Date().getFullYear();
      const randNum = Math.floor(100000 + Math.random() * 900000);
      const generatedOrderNumber = `AM-${year}-${randNum}`;

      const { data: newOrder, error: insertError } = await supabase
        .from("orders")
        .insert({
          order_number: generatedOrderNumber,
          customer_name,
          phone,
          customer_email: customer_email || null,
          country: country || "Ethiopia",
          product_id: product_id || null,
          quantity: parseInt(String(quantity), 10) || 1,
          referral_code: referral_code || null,
          notes,
          payment_status: "pending_payment",
          status: "pending",
        })
        .select()
        .single();

      if (insertError) throw insertError;

      return res.status(201).json({
        success: true,
        order_number: generatedOrderNumber,
        order_id: newOrder.id,
        status: "pending_payment",
      });
    }

    return res.status(201).json(data || { success: true });
  } catch (error: any) {
    console.error("Error in createGuestOrder:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to process order",
    });
  }
};

export const trackOrder = async (req: Request, res: Response) => {
  try {
    const { order_number, contact_info } = req.body;

    if (!order_number || !contact_info) {
      return res.status(400).json({
        success: false,
        error: "Order number and contact phone/email are required.",
      });
    }

    // Try track_guest_order RPC
    const { data, error } = await supabase.rpc("track_guest_order", {
      p_order_number: order_number.trim(),
      p_contact_info: contact_info.trim(),
    });

    if (!error && data) {
      return res.json(data);
    }

    // Fallback direct lookup
    let query = supabase
      .from("orders")
      .select("*, product:products(name, price, currency), fulfillment_history:order_fulfillment_history(*)")
      .eq("order_number", order_number.trim());

    const { data: orderData, error: lookupErr } = await query.single();
    if (lookupErr || !orderData) {
      return res.status(404).json({
        success: false,
        error: "Order not found or contact info does not match.",
      });
    }

    // Verify contact info matches phone or email
    const cleanContact = contact_info.trim().toLowerCase();
    const phoneMatch = orderData.phone && orderData.phone.replace(/[^0-9]/g, "").includes(cleanContact.replace(/[^0-9]/g, ""));
    const emailMatch = orderData.customer_email && orderData.customer_email.toLowerCase() === cleanContact;

    if (!phoneMatch && !emailMatch) {
      return res.status(403).json({
        success: false,
        error: "Contact information does not match our records for this order.",
      });
    }

    return res.json({
      success: true,
      order: orderData,
      timeline: orderData.fulfillment_history || [],
    });
  } catch (error: any) {
    console.error("Error in trackOrder:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Tracking failed.",
    });
  }
};

export const getOrders = async (req: Request, res: Response) => {
  try {
    const { status, search, page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(1, parseInt(String(page), 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(String(limit), 10)));
    const offset = (pageNum - 1) * limitNum;

    let query = supabase
      .from("orders")
      .select("*, product:products(id, name, price, currency, category), customer:profiles(full_name, email)", {
        count: "exact",
      })
      .order("created_at", { ascending: false })
      .range(offset, offset + limitNum - 1);

    if (status && status !== "all") {
      query = query.eq("payment_status", status);
    }
    if (search && typeof search === "string") {
      query = query.or(`order_number.ilike.%${search}%,customer_name.ilike.%${search}%,phone.ilike.%${search}%`);
    }

    const { data, count, error } = await query;
    if (error) throw error;

    return res.json({
      success: true,
      orders: data || [],
      totalCount: count || 0,
      page: pageNum,
      totalPages: Math.ceil((count || 0) / limitNum),
    });
  } catch (error: any) {
    console.error("Error in getOrders:", error);
    return res.status(500).json({ success: false, error: error.message || "Failed to fetch orders" });
  }
};

export const getOrderById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const isOrderNumber = id.startsWith("AM-");
    let query = supabase
      .from("orders")
      .select("*, product:products(*, product_images(*)), customer:profiles(*)")
      .eq(isOrderNumber ? "order_number" : "id", id);

    const { data: order, error } = await query.single();
    if (error || !order) {
      return res.status(404).json({ success: false, error: "Order not found" });
    }

    const { data: history } = await supabase
      .from("order_fulfillment_history")
      .select("*")
      .eq("order_id", order.id)
      .order("created_at", { ascending: true });

    return res.json({
      success: true,
      order,
      timeline: history || [],
    });
  } catch (error: any) {
    console.error("Error in getOrderById:", error);
    return res.status(500).json({ success: false, error: error.message || "Failed to fetch order details" });
  }
};

export const updateFulfillment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, stage, notes, trackingNumber, carrier, estimatedDelivery } = req.body;

    const { error: orderError } = await supabase
      .from("orders")
      .update({
        fulfillment_status: status || stage,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (orderError) throw orderError;

    // Add checkpoint to order_fulfillment_history
    const { error: historyError } = await supabase.from("order_fulfillment_history").insert({
      order_id: id,
      status: status || stage,
      stage: stage || status,
      notes,
      tracking_number: trackingNumber,
      carrier,
      estimated_delivery: estimatedDelivery || null,
    });

    if (historyError) throw historyError;

    return res.json({ success: true, message: "Order fulfillment updated successfully." });
  } catch (error: any) {
    console.error("Error in updateFulfillment:", error);
    return res.status(500).json({ success: false, error: error.message || "Failed to update fulfillment" });
  }
};

export const approvePayment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Call approve_order_payment RPC to ensure idempotent 8% commission allocation
    const { data, error } = await supabase.rpc("approve_order_payment", {
      p_order_id: id,
    });

    if (!error) {
      return res.json(data || { success: true, message: "Payment approved and commission allocated." });
    }

    console.warn("RPC approve_order_payment error, applying fallback:", error);

    // Fallback: update order payment_status to 'paid'
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .update({
        payment_status: "paid",
        fulfillment_status: "Payment Verified",
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("*, product:products(price, currency)")
      .single();

    if (orderErr) throw orderErr;

    // If order has affiliate attribution, credit affiliate 8%
    if (order.affiliate_id) {
      const price = parseFloat(order.product?.price || "0");
      const commissionAmount = Math.round(price * 0.08 * (order.quantity || 1) * 100) / 100;

      await supabase.from("commissions").upsert(
        {
          order_id: order.id,
          affiliate_id: order.affiliate_id,
          amount: commissionAmount,
          rate: 0.08,
          status: "approved",
        },
        { onConflict: "order_id" }
      );
    }

    return res.json({ success: true, message: "Order payment verified." });
  } catch (error: any) {
    console.error("Error in approvePayment:", error);
    return res.status(500).json({ success: false, error: error.message || "Failed to approve payment" });
  }
};
