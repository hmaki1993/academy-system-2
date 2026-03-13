import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { RtcTokenBuilder, RtcRole } from "npm:agora-access-token";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const body = await req.json();
        console.log("Request Body:", JSON.stringify(body));

        const { channelName, uid, userAccount, role = 'publisher', expireTime = 3600 } = body;

        const appId = Deno.env.get('AGORA_APP_ID');
        const appCertificate = Deno.env.get('AGORA_APP_CERTIFICATE');

        console.log("App ID Configured:", !!appId);
        console.log("App Certificate Configured:", !!appCertificate);

        if (!appId || !appCertificate) {
            console.error("CRITICAL: Agora credentials missing in environment variables.");
            return new Response(
                JSON.stringify({ error: 'Agora credentials not configured on server' }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        if (!channelName) {
            return new Response(
                JSON.stringify({ error: 'channelName is required' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const rtcRole = role === 'publisher' ? RtcRole.PUBLISHER : RtcRole.SUBSCRIBER;
        const privilegeExpireTime = Math.floor(Date.now() / 1000) + expireTime;

        let token;
        if (userAccount) {
            console.log("Generating token for User Account:", userAccount);
            token = RtcTokenBuilder.buildTokenWithUserAccount(
                appId,
                appCertificate,
                channelName,
                userAccount,
                rtcRole,
                privilegeExpireTime
            );
        } else {
            console.log("Generating token for Numeric UID:", uid || 0);
            token = RtcTokenBuilder.buildTokenWithUid(
                appId,
                appCertificate,
                channelName,
                uid || 0,
                rtcRole,
                privilegeExpireTime
            );
        }

        console.log("Token generated successfully!");
        return new Response(
            JSON.stringify({ token }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    } catch (error) {
        console.error("Function Error:", error.message);
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});