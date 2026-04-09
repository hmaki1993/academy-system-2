import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { amount, currency, customer, payment_method, metadata, redirect_url } = await req.json();
    
    // Tap Secret Key should be set in Supabase Secrets
    const TAP_SECRET_KEY = Deno.env.get("TAP_SECRET_KEY");
    if (!TAP_SECRET_KEY) {
      throw new Error("TAP_SECRET_KEY is not configured in Supabase Secrets.");
    }

    // Map internal names to Tap source IDs
    let sourceId = "src_all"; // Default (Allows K-Net, Apple Pay, Cards)
    if (payment_method === 'knet') sourceId = "src_knet";
    if (payment_method === 'card') sourceId = "src_card";
    if (payment_method === 'apple') sourceId = "src_applepay";
    if (payment_method === 'all') sourceId = "src_all";

    console.log(`[Tap] Creating charge for ${amount} ${currency || 'KWD'} using ${payment_method}`);

    // Handle normalized phone structure (can be string or object)
    const phoneObj = typeof customer.phone === 'object' 
      ? customer.phone 
      : { country_code: "965", number: customer.phone || "00000000" };

    const response = await fetch("https://api.tap.company/v2/charges", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${TAP_SECRET_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        amount: amount,
        currency: currency || "KWD",
        threeDSecure: true,
        save_card: false,
        customer: {
          first_name: customer.first_name || "Guest",
          email: customer.email || "guest@fame-academy.online",
          phone: {
            country_code: phoneObj.country_code || "965",
            number: phoneObj.number || "00000000"
          }
        },
        source: { id: sourceId },
        redirect: {
          url: redirect_url || "https://fame-academy.online/video-library?status=success"
        },
        metadata: {
          type: metadata?.type || "academy_subscription",
          request_id: metadata?.request_id || "unknown",
          student_id: metadata?.student_id || "unknown",
          source: "fame-academy-online-v3"
        }
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("[Tap] API Error:", data);
      throw new Error(data.errors?.[0]?.description || data.message || "Tap API Request Failed");
    }

    // Return the transaction URL to the frontend
    return new Response(
      JSON.stringify({ 
        id: data.id,
        transaction_url: data.transaction.url 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[Tap] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }), 
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
