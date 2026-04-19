import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

// Initialize Supabase Client
const supabaseUrl = process.env.SUPABASE_URL || 'https://htsaqcmhkbcgqlrfxoqt.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0c2FxY21oa2JjZ3FscmZ4b3F0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNjgwOTgyNSwiZXhwIjoyMDUyMzg1ODI1fQ.X2x-K_qgO597VwR28y_4lXo5I-N69_YkXkXN1_3r7_E'; // Fallback to service role if needed for debug
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTokens() {
    console.log('Fetching fcm tokens...');
    const { data: tokens, error } = await supabase
        .from('user_fcm_tokens')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(5);

    if (error) {
        console.error('Error fetching tokens:', error);
        return;
    }

    console.log('Top 5 Recent Tokens:');
    for (const t of tokens) {
        console.log(`- Device: ${t.device_info}`);
        console.log(`  User: ${t.user_id}`);
        console.log(`  Token: ${t.fcm_token.substring(0, 20)}...`);
        console.log(`  Updated: ${t.updated_at}`);
        console.log('---');
    }
}

checkTokens();
