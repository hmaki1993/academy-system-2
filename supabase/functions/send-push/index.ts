import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import webpush from "https://esm.sh/web-push@3.6.4"

const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") || "mailto:admin@elite-academy.com";

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

serve(async (req) => {
  try {
    const { userId, title, message, url } = await req.json();

    if (!userId) {
      return new Response("Missing userId", { status: 400 });
    }

    // 1. Fetch all subscriptions for this user
    const { data: subscriptions, error: subError } = await supabase
      .from("user_push_subscriptions")
      .select("*")
      .eq("user_id", userId);

    if (subError) throw subError;
    if (!subscriptions || subscriptions.length === 0) {
      return new Response("No subscriptions found", { status: 200 });
    }

    // 2. Prepare payload
    const payload = JSON.stringify({
      title: title || "Elite Academy",
      message: message || "You have a new mission!",
      url: url || "/"
    });

    // 3. Send to all devices
    const sendPromises = subscriptions.map(async (sub) => {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth
        }
      };

      try {
        await webpush.sendNotification(pushSubscription, payload, {
          TTL: 60, // Keep active for 60 seconds if device is temporarily offline
          urgency: "high", // Force heads-up / drop-down notification
          topic: "mission-alerts" // Helps OS group and prioritize
        });
      } catch (err) {
        if (err.statusCode === 404 || err.statusCode === 410) {
          // Subscription expired or gone, delete it
          console.log(`Deleting expired subscription for user ${userId}`);
          await supabase.from("user_push_subscriptions").delete().eq("id", sub.id);
        } else {
          console.error(`Push failed for sub ${sub.id}:`, err);
        }
      }
    });

    await Promise.all(sendPromises);

    return new Response(JSON.stringify({ success: true, count: subscriptions.length }), {
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
})
