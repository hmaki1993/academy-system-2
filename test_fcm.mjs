import { readFileSync } from 'fs';
import { google } from 'googleapis';
import fetch from 'node-fetch'; // if not present, I will use https module or fetch in Node 20

// User is on Node 20, fetch is built-in!
const serviceAccountPath = 'c:/Users/skinz/Downloads/skippy-toes-q8-268d505b95ed.json';
const SERVICE_ACCOUNT = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));

const SCOPES = ['https://www.googleapis.com/auth/firebase.messaging'];
const jwtClient = new google.auth.JWT(
  SERVICE_ACCOUNT.client_email,
  null,
  SERVICE_ACCOUNT.private_key,
  SCOPES,
  null
);

async function getAccessToken() {
  return new Promise((resolve, reject) => {
    jwtClient.authorize((err, tokens) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(tokens.access_token);
    });
  });
}

async function testPush() {
    const token = await getAccessToken();
    console.log("Got access token");
    
    // Create the exact payload we used in Edge function
    const fcmPayload = {
      message: {
        token: "TEST_DUMMY_TOKEN", // Even a dummy token returns a specific error if payload is invalid vs token is invalid
        notification: {
          title: "Test Title",
          body: "Test Body",
        },
        android: {
          priority: "high",
          notification: {
            channel_id: "epic_alerts",
            notification_priority: "PRIORITY_MAX",
            visibility: "PUBLIC",
            sound: "default",
            default_sound: true,
            default_vibrate_timings: false,
            vibrate_timings: ["0s", "0.5s", "0.2s", "0.5s"],
          }
        }
      }
    };

    const res = await fetch(`https://fcm.googleapis.com/v1/projects/${SERVICE_ACCOUNT.project_id}/messages:send`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(fcmPayload)
    });

    const data = await res.json();
    console.log("RESPONSE FROM FIREBASE:", JSON.stringify(data, null, 2));
}

testPush().catch(console.error);
