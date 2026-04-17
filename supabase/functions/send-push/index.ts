import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

// 🔥 FCM V1 API - الأحدث والأقوى
const FCM_PROJECT_ID = "skippy-toes-q8";
const FCM_V1_URL = `https://fcm.googleapis.com/v1/projects/${FCM_PROJECT_ID}/messages:send`;

// Service Account JSON (مخزنة كـ Environment Variable)
const SERVICE_ACCOUNT_JSON = Deno.env.get("FCM_SERVICE_ACCOUNT_JSON")!;

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

// ✅ توليد OAuth 2.0 Token من Service Account
async function getAccessToken(serviceAccountJson: string): Promise<string> {
  const sa = JSON.parse(serviceAccountJson);

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: sa.client_email,
    sub: sa.client_email,
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
    scope: "https://www.googleapis.com/auth/firebase.messaging"
  };

  const encode = (obj: object) =>
    btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

  const signingInput = `${encode(header)}.${encode(payload)}`;

  // Import private key
  const privateKeyPem = sa.private_key;
  const pemContents = privateKeyPem
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\n/g, '');

  const keyBuffer = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8', keyBuffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false, ['sign']
  );

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    new TextEncoder().encode(signingInput)
  );

  const jwt = `${signingInput}.${btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')}`;

  // Exchange JWT for Access Token
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`
  });

  const tokenData = await tokenResponse.json();
  return tokenData.access_token;
}

serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { userId, title, message, url } = await req.json();

    if (!userId) {
      return new Response("Missing userId", { status: 400 });
    }

    // 1. إرسال Realtime Broadcast (للـ Foreground / Fallback)
    try {
      const channel = supabase.channel(`user-notifications:${userId}`);
      await channel.send({
        type: 'broadcast',
        event: 'mission-alert',
        payload: { title: title || "Elite Academy", body: message || "New Mission!", url: url || "/app" }
      });
    } catch (e) { console.warn('Broadcast failed:', e); }

    // 2. احضر FCM Tokens
    const { data: tokens } = await supabase
      .from("user_fcm_tokens")
      .select("fcm_token")
      .eq("user_id", userId);

    if (!tokens || tokens.length === 0) {
      return new Response(JSON.stringify({ success: true, method: 'broadcast_only' }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. احصل على Access Token
    const accessToken = await getAccessToken(SERVICE_ACCOUNT_JSON);

    // 4. إرسال لكل جهاز عبر FCM V1
    const results = await Promise.allSettled(
      tokens.map(async ({ fcm_token }) => {
        const fcmPayload = {
          message: {
            token: fcm_token,
            notification: {
              title: title || "🏆 Elite Academy",
              body: message || "لديك رسالة جديدة",
            },
            data: {
              url: url || "/app",
              title: title || "🏆 Elite Academy",
              message: message || "لديك رسالة جديدة",
            }
          }
        };

        const res = await fetch(FCM_V1_URL, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(fcmPayload)
        });

        const result = await res.json();

        // 🔍 DIAGNOSTIC LOGGING: اعرف بالظبط ليه الإشعار فشل
        if (!res.ok) {
          console.error(`❌ FCM Error [${fcm_token.substring(0, 10)}...]:`, JSON.stringify(result));
        }

        // حذف الـ Token المنتهي أو غير الصحيح (بسبب تغيير الـ VAPID Key)
        if (result.error?.code === 404 || result.error?.status === 'UNREGISTERED' || result.error?.details?.[0]?.errorCode === 'INVALID_ARGUMENT') {
          console.log(`🧹 FCM Cleanup: Removing dead/invalid token: ${fcm_token.substring(0, 10)}...`);
          await supabase.from('user_fcm_tokens').delete().eq('fcm_token', fcm_token);
        }

        return result;
      })
    );

    const successCount = results.filter(r => r.status === 'fulfilled').length;
    const errors = (results.filter(r => r.status === 'rejected') as PromiseRejectedResult[]).map(r => r.reason);
    const fcmResponses = (results.filter(r => r.status === 'fulfilled') as PromiseFulfilledResult<any>[]).map(r => r.value);

    console.log(`🔥 FCM V1: Sent to ${successCount}/${tokens.length} devices`);

    return new Response(JSON.stringify({ 
      success: true, 
      method: 'fcm_v1', 
      sent: successCount,
      total: tokens.length,
      fcm_responses: fcmResponses,
      errors: errors
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error('send-push error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
})
