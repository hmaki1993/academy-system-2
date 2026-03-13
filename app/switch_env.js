import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const mode = process.argv[2]; // 'epic' or 'demo'

const envPath = path.join(__dirname, '.env');
const epicEnvPath = path.join(__dirname, '.env.epic');
const demoEnvPath = path.join(__dirname, '.env.demo');

if (!mode) {
    console.log('❌ Usage: node switch_env.js [epic|demo]');
    process.exit(1);
}

// Ensure .env.epic exists (backup current .env if first run)
if (!fs.existsSync(epicEnvPath) && mode === 'demo') {
    if (fs.existsSync(envPath)) {
        console.log('ℹ️ backing up current .env to .env.epic');
        fs.copyFileSync(envPath, epicEnvPath);
    } else {
        console.error('❌ No .env file found to backup!');
        process.exit(1);
    }
}

if (mode === 'demo') {
    if (!fs.existsSync(demoEnvPath)) {
        console.error('❌ .env.demo not found! Please create it first with new Supabase keys.');
        process.exit(1);
    }
    console.log('🔄 Switching to NEW ACADEMY DEMO environment...');
    fs.copyFileSync(demoEnvPath, envPath);
    console.log('✅ Switched to DEMO mode properly.');

} else if (mode === 'epic') {
    if (!fs.existsSync(epicEnvPath)) {
        console.error('❌ .env.epic not found!');
        process.exit(1);
    }
    console.log('🔄 Switching back to EPIC GYMNASTICS environment...');
    fs.copyFileSync(epicEnvPath, envPath);
    console.log('✅ Switched to EPIC mode properly.');
} else {
    console.log('❌ Unknown mode. Use "epic" or "demo".');
}
