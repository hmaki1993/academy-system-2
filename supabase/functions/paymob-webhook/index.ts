import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { crypto } from "https://deno.land/std@0.177.0/crypto/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const PAYMOB_HMAC_SECRET = Deno.env.get('PAYMOB_HMAC_SECRET')

  try {
    const body = await req.json()
    const { type, obj } = body

    // 1. Validate HMAC (Security)
    const signature = req.headers.get('x-paymob-hmac') || req.url.split('hmac=')[1]
    // Note: In real scenarios, you rebuild the string from obj fields and hash it.
    // Paymob HMAC verification is complex, we should implement it properly.
    
    if (type !== 'TRANSACTION') {
        return new Response('Ignored non-transaction update', { status: 200 })
    }

    const { success, pending, id: transId, order: { id: orderId }, amount_cents } = obj

    if (success === true && pending === false) {
        console.log(`✅ Payment success for Transaction ${transId}, Order ${orderId}`)
        
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // Update payment record
        // We need to find the payment associated with this order
        // (Usually we store paymob_order_id when creating the order)
        
        await supabase
            .from('payments')
            .update({ 
                status: 'paid',
                gateway_transaction_id: transId.toString()
            })
            .eq('gateway_order_id', orderId.toString())

        return new Response('Payment processed successfully', { status: 200 })
    }

    return new Response('Transaction pending or failed', { status: 200 })

  } catch (error) {
    console.error('[paymob-webhook] error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
