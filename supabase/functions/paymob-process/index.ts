import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey',
};

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const PAYMOB_API_KEY = Deno.env.get('PAYMOB_API_KEY')
  const PAYMOB_CARD_INTEGRATION_ID = Deno.env.get('PAYMOB_CARD_INTEGRATION_ID')
  const PAYMOB_WALLET_INTEGRATION_ID = Deno.env.get('PAYMOB_WALLET_INTEGRATION_ID')

  if (!PAYMOB_API_KEY) {
    return new Response(JSON.stringify({ error: 'Paymob API key not configured.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    const { amount_cents, currency, billing_data, payment_method } = await req.json()

    // 1. Authenticate with Paymob
    const authResponse = await fetch("https://accept.paymob.com/api/auth/tokens", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ api_key: PAYMOB_API_KEY }),
    })
    
    if (!authResponse.ok) {
        const errorData = await authResponse.text()
        throw new Error(`Auth failed: ${errorData}`)
    }
    
    const { token: authToken } = await authResponse.json()

    // 2. Create Order
    const orderResponse = await fetch("https://accept.paymob.com/api/ecommerce/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        auth_token: authToken,
        delivery_needed: "false",
        amount_cents: amount_cents,
        currency: currency || "EGP",
        items: [],
      }),
    })
    
    if (!orderResponse.ok) {
        const errorData = await orderResponse.text()
        throw new Error(`Order creation failed: ${errorData}`)
    }
    
    const { id: orderId } = await orderResponse.json()

    // 3. Generate Payment Key
    const integrationId = payment_method === 'wallet' ? PAYMOB_WALLET_INTEGRATION_ID : PAYMOB_CARD_INTEGRATION_ID
    
    if (!integrationId) {
        throw new Error(`Integration ID for ${payment_method} not configured.`)
    }

    const keyResponse = await fetch("https://accept.paymob.com/api/accept/payment_keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        auth_token: authToken,
        amount_cents: amount_cents,
        expiration: 3600,
        order_id: orderId,
        billing_data: {
          apartment: "NA",
          email: billing_data.email || "guest@example.com",
          floor: "NA",
          first_name: billing_data.first_name || "Guest",
          street: "NA",
          building: "NA",
          phone_number: billing_data.phone_number || "NA",
          shipping_method: "NA",
          postal_code: "NA",
          city: "NA",
          country: "NA",
          last_name: billing_data.last_name || "User",
          state: "NA",
        },
        currency: currency || "EGP",
        integration_id: integrationId,
      }),
    })
    
    if (!keyResponse.ok) {
        const errorData = await keyResponse.text()
        throw new Error(`Payment key generation failed: ${errorData}`)
    }
    
    const { token: paymentKey } = await keyResponse.json()

    // If wallet, we need one more step to get the redirect URL
    if (payment_method === 'wallet') {
        const walletResponse = await fetch("https://accept.paymob.com/api/acceptance/payments/pay", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                source: {
                    identifier: billing_data.phone_number,
                    subtype: "WALLET"
                },
                payment_token: paymentKey
            })
        })
        const walletData = await walletResponse.json()
        return new Response(JSON.stringify({ redirect_url: walletData.iframe_redirection_url || walletData.redirect_url || walletData.source_data.url }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })
    }

    return new Response(JSON.stringify({ payment_key: paymentKey, order_id: orderId }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('[paymob-process] error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
