import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    console.log("[Tap Webhook] Received Event:", payload.status);

    // Charge.captured is the success event
    if (payload.status === "CAPTURED") {
      const { student_id, level_number, type, request_id } = payload.metadata;
      const amount_paid = payload.amount;
      const transId = payload.id;

      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      // Handle Consultation Requests
      if (type === 'consultation') {
        if (!request_id) throw new Error("Missing request_id in metadata");
        
        console.log(`[Tap Webhook] Processing Consultation Payment for request ${request_id}`);
        
        const { error: updateError } = await supabaseAdmin
          .from('consultation_requests')
          .update({ payment_status: 'paid', transaction_id: transId })
          .eq('id', request_id);
          
        if (updateError) throw updateError;
        
        return new Response(JSON.stringify({ success: true, message: "Consultation payment captured" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      // Handle Level Purchases
      if (!student_id || !level_number) {
        throw new Error("Missing student_id or level_number in metadata.");
      }



      // 1. Create the purchase record
      const { error: purchaseError } = await supabaseAdmin
        .from('level_purchases')
        .insert([{
          student_id: student_id,
          level_number: parseInt(level_number),
          amount_paid: amount_paid,
          purchased_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (purchaseError && !purchaseError.message.includes("duplicate key")) {
        throw purchaseError;
      }

      // 2. Log the payment for finance
      await supabaseAdmin.from('payments').insert([{
        student_id: student_id,
        amount: amount_paid,
        payment_method: 'knet',
        notes: `[LEVEL_PURCHASE] Level ${level_number} - (Tap ID: ${transId})`,
        payment_date: new Date().toISOString()
      }]);

      return new Response(JSON.stringify({ success: true, message: "Level unlocked" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify({ success: true, message: "Event ignored" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("[Tap Webhook] Error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
