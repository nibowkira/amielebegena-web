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
      items,
    } = req.body;

    if (!customer_name || !phone) {
      return res.status(400).json({
        success: false,
        error: "Customer name and phone number are required.",
      });
    }

    // C4 Fix: If multiple items are provided in the cart, create orders for ALL items
    const orderItems: Array<{ product_id?: string; product_name?: string; quantity: number }> =
      Array.isArray(items) && items.length > 0
        ? items.map((i: any) => ({
            product_id: i.product_id || i.productId,
            product_name: i.product_name || i.name,
            quantity: parseInt(String(i.quantity), 10) || 1,
          }))
        : [
            {
              product_id: product_id || null,
              product_name: product_name || null,
              quantity: parseInt(String(quantity), 10) || 1,
            },
          ];

    const createdOrders: any[] = [];
    const errors: string[] = [];

    for (const item of orderItems) {
      let resolvedProdId = item.product_id || null;
      if (!resolvedProdId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(resolvedProdId)) {
        // Safe slug / name resolution fallback
        const term = item.product_id || item.product_name || "";
        const { data: matched } = await supabase
          .from("products")
          .select("id")
          .is("deleted_at", null)
          .eq("status", "active")
          .or(`slug.eq.${term},name.ilike.%${term}%`)
          .limit(1)
          .maybeSingle();
        if (matched) resolvedProdId = matched.id;
      }

      const rpcPayload = {
        p_customer_name: customer_name,
        p_phone: phone,
        p_customer_email: customer_email || "N/A",
        p_country: country || "Ethiopia",
        p_product_id: resolvedProdId,
        p_product_name: item.product_name || null,
        p_quantity: item.quantity,
        p_referral_code: referral_code || null,
        p_session_id: session_id || null,
        p_notes: notes,
      };

      const { data, error } = await supabase.rpc("create_guest_order", rpcPayload);

      if (error) {
        console.warn("RPC create_guest_order technical error:", error);
        errors.push(error.message || "Failed to process order via RPC");
      } else if (data && data.success === false) {
        console.warn("RPC create_guest_order business rule rejected:", data.error);
        errors.push(data.error || "Order could not be accepted");
      } else if (data) {
        createdOrders.push(data);
      }
    }

    if (createdOrders.length === 0 && errors.length > 0) {
      return res.status(500).json({
        success: false,
        error: errors.join(", ") || "Failed to process order",
      });
    }

    // If request contains authenticated bearer token, attach customer_id to created orders
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      try {
        const token = authHeader.split(" ")[1];
        const { data: { user } } = await supabase.auth.getUser(token);
        if (user?.id) {
          const orderIds = createdOrders.map((o) => o.order_id).filter(Boolean);
          if (orderIds.length > 0) {
            await supabase
              .from("orders")
              .update({ customer_id: user.id })
              .in("id", orderIds);
          }
        }
      } catch (authErr) {
        console.warn("Could not attach customer_id from token:", authErr);
      }
    }

    const primaryOrder = createdOrders[0] || {};
    return res.status(201).json({
      success: true,
      order_number: primaryOrder.order_number,
      order_id: primaryOrder.order_id,
      orders: createdOrders,
      total_items_ordered: createdOrders.length,
    });
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
      if (data.error || data.success === false) {
        return res.status(404).json(data);
      }
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
    const effectiveStatus = status || stage || req.body.fulfillment_status || "Processing";

    const orderUpdates: any = {
      fulfillment_status: effectiveStatus,
      updated_at: new Date().toISOString(),
    };
    if (trackingNumber || req.body.tracking_number) {
      orderUpdates.tracking_number = trackingNumber || req.body.tracking_number;
    }
    if (carrier || req.body.shipping_carrier || req.body.shipping_company) {
      orderUpdates.shipping_company = carrier || req.body.shipping_carrier || req.body.shipping_company;
    }

    const { data: updatedOrder, error: orderError } = await supabase
      .from("orders")
      .update(orderUpdates)
      .eq("id", id)
      .select()
      .maybeSingle();

    if (orderError) throw orderError;

    // Add checkpoint to order_fulfillment_history (columns: order_id, status, notes, admin_name)
    try {
      await supabase.from("order_fulfillment_history").insert({
        order_id: id,
        status: effectiveStatus,
        notes: notes || null,
        admin_name: "Admin Operator",
      });
    } catch (histErr) {
      console.warn("Could not record fulfillment history checkpoint:", histErr);
    }

    return res.json({ success: true, message: "Order fulfillment updated successfully.", order: updatedOrder });
  } catch (error: any) {
    console.error("Error in updateFulfillment:", error);
    return res.status(500).json({ success: false, error: error.message || "Failed to update fulfillment" });
  }
};

export const approvePayment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Call approve_order_payment RPC (parameter name is target_order_id)
    const { data, error } = await supabase.rpc("approve_order_payment", {
      target_order_id: id,
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
      .select()
      .maybeSingle();

    if (orderErr) throw orderErr;

    return res.json({
      success: true,
      message: "Payment approved.",
      order,
    });
  } catch (error: any) {
    console.error("Error in approvePayment:", error);
    return res.status(500).json({ success: false, error: error.message || "Failed to approve payment" });
  }
};
