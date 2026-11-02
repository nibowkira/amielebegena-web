import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Security: Only allow requests from the production origin.
const ALLOWED_ORIGIN = "https://amielebegena.vercel.app";

function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") || "";
  // Only reflect the origin if it matches the allowed production origin.
  const allowedOrigin = origin === ALLOWED_ORIGIN ? ALLOWED_ORIGIN : "null";
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Vary": "Origin",
  };
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Security: Reject non-POST requests
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ success: false, error: "Method not allowed." }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    // This edge function performs a direct table insert (bypassing RLS), so it
    // requires the service role key. CORS is locked to the production origin
    // above, so only the legitimate frontend can invoke this function.
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    if (!supabaseKey) {
      console.error("[CreateGuestOrder] SUPABASE_SERVICE_ROLE_KEY is not configured.");
      return new Response(
        JSON.stringify({ success: false, error: "Server configuration error." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();
    const {
      customer_name,
      phone,
      customer_email,
      country,
      product_id,
      quantity = 1,
      referral_code,
      session_id,
      notes,
    } = body;

    // 1. Data Validation
    if (!customer_name || typeof customer_name !== "string" || customer_name.trim().length < 2) {
      return new Response(
        JSON.stringify({ success: false, error: "Valid customer full name is required." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!phone || typeof phone !== "string" || phone.trim().length < 5) {
      return new Response(
        JSON.stringify({ success: false, error: "Valid customer phone number is required." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!country || typeof country !== "string" || country.trim().length < 2) {
      return new Response(
        JSON.stringify({ success: false, error: "Delivery country is required." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const parsedQty = parseInt(String(quantity), 10);
    if (isNaN(parsedQty) || parsedQty < 1 || parsedQty > 100) {
      return new Response(
        JSON.stringify({ success: false, error: "Quantity must be between 1 and 100." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Resolve Product — UUID ONLY (no name-based fallbacks)
    const isUUID = typeof product_id === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(product_id);

    if (!isUUID) {
      return new Response(
        JSON.stringify({ success: false, error: "A valid product ID is required to place an order." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: prod, error: prodErr } = await supabase
      .from("products")
      .select("id, name, price")
      .eq("id", product_id)
      .maybeSingle();

    if (prodErr || !prod) {
      return new Response(
        JSON.stringify({ success: false, error: "The selected product could not be found. Please try again." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const resolvedProductId = prod.id;
    const resolvedProductName = prod.name;

    // 3. Resolve Affiliate Information — exact match only
    let resolvedAffiliateId: string | null = null;
    let resolvedAffiliateCode: string | null = null;

    const cleanRefCode = referral_code ? String(referral_code).trim() : null;
    if (cleanRefCode && cleanRefCode.length <= 100) {
      const { data: aff } = await supabase
        .from("affiliates")
        .select("user_id, referral_code")
        .eq("referral_code", cleanRefCode)
        .maybeSingle();

      if (aff) {
        resolvedAffiliateId = aff.user_id;
        resolvedAffiliateCode = aff.referral_code;
      }
    }

    // 4. Generate Official Order Number
    const year = new Date().getFullYear();
    const randomSeq = Math.floor(100000 + Math.random() * 900000);
    const orderNumber = `AM-${year}-${randomSeq}`;

    // 5. Create Order Record in Database
    const orderInsertPayload = {
      order_number: orderNumber,
      customer_name: customer_name.trim().substring(0, 200),
      phone: phone.trim().substring(0, 30),
      customer_email: customer_email ? customer_email.trim().substring(0, 254) : "N/A",
      country: country.trim().substring(0, 100),
      product_id: resolvedProductId,
      quantity: parsedQty,
      referral_code: resolvedAffiliateCode || cleanRefCode,
      affiliate_id: resolvedAffiliateId,
      status: "pending",
      payment_status: "pending_payment",
      notes: notes ? String(notes).substring(0, 500) : "Guest WhatsApp Checkout",
      whatsapp_sent_at: new Date().toISOString(),
    };

    const { data: createdOrder, error: insertError } = await supabase
      .from("orders")
      .insert(orderInsertPayload)
      .select()
      .single();

    if (insertError || !createdOrder) {
      console.error("[CreateGuestOrder] Insert Error:", insertError);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Failed to create order in database. Please try again.",
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 6. Build Server-Side WhatsApp Message
    const refText = resolvedAffiliateCode ? `\n🔗 Referral Code:\n${resolvedAffiliateCode}\n` : "";
    const whatsappMessage =
      `Hello Amiele Begena,\n\n` +
      `I would like to confirm my order:\n\n` +
      `📦 Product:\n${parsedQty}x ${resolvedProductName}\n\n` +
      `🆔 Order Number:\n${createdOrder.order_number}\n\n` +
      `👤 Customer Name:\n${customer_name.trim()}\n\n` +
      `📞 Phone Number:\n${phone.trim()}\n\n` +
      `🌍 Delivery Country:\n${country.trim()}\n` +
      refText +
      `\nThank you!`;

    // 7. Return Required Output Structure
    return new Response(
      JSON.stringify({
        success: true,
        order_id: createdOrder.id,
        order_number: createdOrder.order_number,
        status: createdOrder.status,
        whatsapp_message: whatsappMessage,
        affiliate: resolvedAffiliateCode
          ? { code: resolvedAffiliateCode, id: resolvedAffiliateId }
          : null,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("[CreateGuestOrder] Server Exception:", err);
    return new Response(
      JSON.stringify({ success: false, error: "Internal server error." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
