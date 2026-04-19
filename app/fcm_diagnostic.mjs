/**
 * 🩺 FCM DIAGNOSTIC SCRIPT - v1
 * Run: node fcm_diagnostic.mjs
 * This will tell us EXACTLY where the notification delivery is failing.
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import crypto from 'crypto';

// --- CONFIG ---
const SUPABASE_URL = "https://akbpfyjszuuwyraoalyf.supabase.co";
const SUPABASE_KEY = "sb_publishable_VjSit-7tvd1Y44zyf8oj_Q_aR2uMSoK";
const SERVICE_ACCOUNT_PATH = "C:/Users/skinz/Downloads/skippy-toes-q8-268d505b95ed.json";
const FCM_PROJECT_ID = "skippy-toes-q8";
const FCM_URL = `https://fcm.googleapis.com/v1/projects/${FCM_PROJECT_ID}/messages:send`;

async function getAccessToken() {
  const sa = JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_PATH, 'utf8'));
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

  const encode = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');
  const signingInput = `${encode(header)}.${encode(payload)}`;

  const privateKey = crypto.createPrivateKey(sa.private_key);
  const signature = crypto.sign('SHA256', Buffer.from(signingInput), privateKey);
  const jwt = `${signingInput}.${signature.toString('base64url')}`;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`
  });
  const data = await res.json();
  if (!data.access_token) throw new Error('Failed to get token: ' + JSON.stringify(data));
  return data.access_token;
}

async function main() {
  console.log('\n🩺 ===== SKIPPY FCM DIAGNOSTIC =====\n');

  // Step 1: Check Supabase tokens
  console.log('📦 Step 1: Checking FCM tokens in database...');
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  const { data: tokens, error } = await supabase
    .from('user_fcm_tokens')
    .select('user_id, fcm_token, updated_at')
    .order('updated_at', { ascending: false })
    .limit(5);

  if (error) {
    console.error('❌ Database error:', error.message);
    return;
  }

  if (!tokens || tokens.length === 0) {
    console.error('❌ NO FCM TOKENS IN DATABASE!');
    console.error('   → The app never successfully registered with FCM.');
    console.error('   → Open the app, log in, and try again.');
    return;
  }

  console.log(`✅ Found ${tokens.length} token(s):`);
  tokens.forEach((t, i) => {
    console.log(`   [${i+1}] User: ${t.user_id?.substring(0, 8)}... | Token: ${t.fcm_token?.substring(0, 20)}... | Last seen: ${t.updated_at}`);
  });

  // Step 2: Get FCM Auth Token
  console.log('\n🔑 Step 2: Getting FCM access token...');
  let accessToken;
  try {
    accessToken = await getAccessToken();
    console.log('✅ Got OAuth token successfully');
  } catch(e) {
    console.error('❌ Failed to get OAuth token:', e.message);
    return;
  }

  // Step 3: Test send to each token
  console.log('\n🚀 Step 3: Testing FCM delivery to each token...\n');
  for (const { fcm_token, user_id } of tokens) {
    const payload = {
      message: {
        token: fcm_token,
        notification: {
          title: "🩺 FCM Diagnostic Test",
          body: "If you see this → FCM is working! Close the app first."
        },
        data: { test: "true" },
        android: {
          priority: "high",
          notification: {
            channel_id: "skippy_toes_alerts_v5",
            icon: "@mipmap/ic_launcher",
            sound: "default"
          }
        }
      }
    };

    const res = await fetch(FCM_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const result = await res.json();

    if (res.ok) {
      console.log(`✅ DELIVERED! Token: ${fcm_token.substring(0, 20)}...`);
      console.log(`   FCM Message ID: ${result.name}`);
      console.log(`   → Check your PHONE NOW. Is the notification there?`);
    } else {
      console.error(`❌ FAILED! Token: ${fcm_token.substring(0, 20)}...`);
      console.error(`   Error Code: ${result.error?.code}`);
      console.error(`   Error Status: ${result.error?.status}`);
      console.error(`   Error Message: ${result.error?.message}`);

      if (result.error?.status === 'NOT_FOUND' || result.error?.status === 'UNREGISTERED') {
        console.error(`   🔴 DIAGNOSIS: This token is STALE/DEAD.`);
        console.error(`   🔴 FIX: Reinstall app and log in to get a fresh token.`);
      }
    }
    console.log('');
  }

  console.log('===== DIAGNOSTIC COMPLETE =====\n');
}

main().catch(console.error);
