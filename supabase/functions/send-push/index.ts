import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import webpush from "https://esm.sh/web-push@3.6.6"

// 🔥 VAPID KEYS: للآيفون والمتصفحات
const VAPID_PUBLIC_KEY = "BAf_m7y1dSUX4uEf1uPNEVVLhfaExGvCqNdVDPh_izDASLvCVV-D9urzNNw4fHvZDoMIKE6YZSe4K3gcYPJTA_k";
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY") || "xT4Y7UeacLm06bG9DT_0Q7QSoc9u1QwVITE9kbMqaP4";

webpush.setVapidDetails(
  "mailto:support@skippytoes.com",
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

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

    // 1. احضر FCM Tokens (Android)
    const { data: fcmTokens } = await supabase
      .from("user_fcm_tokens")
      .select("fcm_token")
      .eq("user_id", userId);

    // 2. احضر Web Push Subscriptions (iPhone / Desktop)
    const { data: webSubscriptions } = await supabase
      .from("user_push_subscriptions")
      .select("endpoint, p256dh, auth")
      .eq("user_id", userId);

    const hasFcm = fcmTokens && fcmTokens.length > 0;
    const hasWeb = webSubscriptions && webSubscriptions.length > 0;

    // 3. إذا لم يوجد أجهزة مسجلة إطلاقاً، استخدم الـ Broadcast كحل أخير
    if (!hasFcm && !hasWeb) {
      try {
        const channel = supabase.channel(`user-notifications:${userId}`);
        await channel.send({
          type: 'broadcast',
          event: 'mission-alert',
          payload: { title: title || "Elite Academy", body: message || "New Mission!", url: url || "/app" }
        });
      } catch (e) { console.warn('Broadcast fallback failed:', e); }

      return new Response(JSON.stringify({ success: true, method: 'broadcast_only' }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 4. احصل على Access Token لـ FCM (لو فيه أجهزة أندرويد)
    let accessToken = "";
    if (hasFcm) {
      accessToken = await getAccessToken(SERVICE_ACCOUNT_JSON);
    }

    // 5. إرسال متوازي لكل الأنواع (FCM + WebPush)
    const allSendPromises = [];

    // --- مسار FCM (Android) ---
    if (hasFcm) {
      fcmTokens.forEach(({ fcm_token }) => {
        allSendPromises.push((async () => {
          const fcmPayload = {
            message: {
              token: fcm_token,
              notification: { title: title || "🏆 Skippy Toes Q8", body: message || "لديك رسالة جديدة" },
              data: { url: url || "/app", title: title || "🏆 Skippy Toes Q8", message: message || "لديك رسالة جديدة" },
              android: {
                priority: "high",
                notification: { channel_id: "skippy_toes_alerts_v5", icon: "@mipmap/ic_launcher", sound: "default" }
              }
            }
          };

          const res = await fetch(FCM_V1_URL, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(fcmPayload)
          });
          
          const result = await res.json();
          if (!res.ok) console.error(`❌ FCM Error:`, JSON.stringify(result));
          
          if (result.error?.code === 404 || result.error?.status === 'UNREGISTERED') {
            await supabase.from('user_fcm_tokens').delete().eq('fcm_token', fcm_token);
          }
          return { type: 'fcm', result };
        })());
      });
    }

    // --- مسار WebPush (iPhone / Safari) ---
    if (hasWeb) {
      webSubscriptions.forEach((sub) => {
        allSendPromises.push((async () => {
          try {
            const pushConfig = {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth }
            };

            const payload = JSON.stringify({
                title: title || "🏆 Skippy Toes Q8",
                message: message || "لديك رسالة جديدة. افتح التطبيق للمتابعة.",
                url: url || "/app"
            });

            await webpush.sendNotification(pushConfig, payload);
            return { type: 'webpush', success: true };
          } catch (err) {
            console.error('❌ WebPush Error:', err);
            if (err.statusCode === 410 || err.statusCode === 404) {
              await supabase.from('user_push_subscriptions').delete().eq('endpoint', sub.endpoint);
            }
            return { type: 'webpush', success: false, error: err.message };
          }
        })());
      });
    }

    const results = await Promise.allSettled(allSendPromises);

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
