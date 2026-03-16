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
    const { amount_cents, currency, billing_data, payment_method } = await req.json();
    
    // Fallback to exactly V3 architecture (Token -> Order -> Payment Key).
    const apiKey = Deno.env.get("PAYMOB_API_KEY"); // Using API Key, not Secret Key for V3
    const integrationId = payment_method === "card" 
        ? Number(Deno.env.get("PAYMOB_CARD_INTEGRATION_ID"))
        : Number(Deno.env.get("PAYMOB_WALLET_INTEGRATION_ID"));

    if (!integrationId) {
        throw new Error(`Integration ID for ${payment_method} not configured.`);
    }

    console.log(`[Paymob V3] Starting payment process for ${amount_cents} cents`);

    // 1. Authentication Request
    const authReq = await fetch("https://accept.paymob.com/api/auth/tokens", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ api_key: apiKey })
    });
    const authData = await authReq.json();
    if (!authReq.ok) throw new Error("Paymob Auth Failed");
    const authToken = authData.token;

    // 2. Order Registration
    const orderReq = await fetch("https://accept.paymob.com/api/ecommerce/orders", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            auth_token: authToken,
            delivery_needed: "false",
            amount_cents: amount_cents.toString(),
            currency: currency || "EGP",
            items: []
        })
    });
    const orderData = await orderReq.json();
    if (!orderReq.ok) throw new Error("Paymob Order Failed");
    const orderId = orderData.id;

    // 3. Payment Key Request
    const sanitizedBilling = {
        first_name: billing_data.first_name || "Guest",
        last_name: billing_data.last_name || "User",
        email: billing_data.email || "guest@fame-academy.online",
        phone_number: billing_data.phone_number || "01234567890",
        apartment: "NA", floor: "NA", street: "NA", building: "NA",
        shipping_method: "NA", postal_code: "NA", city: "Cairo", country: "EG", state: "Cairo"
    };

    const paymentKeyReq = await fetch("https://accept.paymob.com/api/acceptance/payment_keys", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            auth_token: authToken,
            amount_cents: amount_cents.toString(),
            expiration: 3600,
            order_id: orderId,
            billing_data: sanitizedBilling,
            currency: currency || "EGP",
            integration_id: integrationId
        })
    });
    const paymentKeyData = await paymentKeyReq.json();
    if (!paymentKeyReq.ok) throw new Error("Paymob Payment Key Failed");
    const paymentToken = paymentKeyData.token;

    // 4. If Wallet, directly initiate payment (bypasses iframe)
    if (payment_method === 'wallet') {
        const payReq = await fetch("https://accept.paymob.com/api/acceptance/payments/pay", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                source: { identifier: sanitizedBilling.phone_number, subtype: "WALLET" },
                payment_token: paymentToken
            })
        });
        const payData = await payReq.json();
        
        if (!payReq.ok || !payData.redirect_url) {
            throw new Error(`Wallet Payment Failed: ${JSON.stringify(payData)}`);
        }

        return new Response(JSON.stringify({ redirect_url: payData.redirect_url }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Return the Payment Token for Card to redirect to iframe on the client-side
    return new Response(
      JSON.stringify({ payment_token: paymentToken }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[Paymob V3] Error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
