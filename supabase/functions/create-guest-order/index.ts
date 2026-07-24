import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
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
    if (isNaN(parsedQty) || parsedQty < 1) {
      return new Response(
        JSON.stringify({ success: false, error: "Quantity must be at least 1." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Resolve Product UUID and Price
    let resolvedProductId: string | null = null;
    let resolvedProductName = product_name || "Ethiopian Instrument";
    let resolvedPriceUSD = 100;

    const isUUID = typeof product_id === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(product_id);
    
    if (isUUID) {
      const { data: prod } = await supabase
        .from("products")
        .select("id, name, price")
        .eq("id", product_id)
        .single();
      if (prod) {
        resolvedProductId = prod.id;
        resolvedProductName = prod.name;
        resolvedPriceUSD = parseFloat(prod.price) || 100;
      }
    }

    if (!resolvedProductId && resolvedProductName) {
      const { data: prod } = await supabase
        .from("products")
        .select("id, name, price")
        .ilike("name", `%${resolvedProductName.split(" ")[0]}%`)
        .limit(1)
        .maybeSingle();
      if (prod) {
        resolvedProductId = prod.id;
        resolvedProductName = prod.name;
        resolvedPriceUSD = parseFloat(prod.price) || 100;
      }
    }

    // Fallback product UUID resolution if products table has entries
    if (!resolvedProductId) {
      const { data: prod } = await supabase.from("products").select("id, name, price").limit(1).maybeSingle();
      if (prod) {
        resolvedProductId = prod.id;
      }
    }

    // 3. Resolve Affiliate Information
    let resolvedAffiliateId: string | null = null;
    let resolvedAffiliateCode: string | null = null;

    const cleanRefCode = referral_code ? String(referral_code).trim() : null;
    if (cleanRefCode) {
      const { data: aff } = await supabase
        .from("affiliates")
        .select("user_id, referral_code")
        .ilike("referral_code", cleanRefCode)
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
      customer_name: customer_name.trim(),
      phone: phone.trim(),
      customer_email: customer_email ? customer_email.trim() : "N/A",
      country: country.trim(),
      product_id: resolvedProductId,
      quantity: parsedQty,
      referral_code: resolvedAffiliateCode || cleanRefCode,
      affiliate_id: resolvedAffiliateId,
      status: "pending",
      payment_status: "pending_payment",
      notes: notes || "Guest WhatsApp Checkout",
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
          details: insertError?.message,
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
      JSON.stringify({ success: false, error: err?.message || "Internal server error." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
