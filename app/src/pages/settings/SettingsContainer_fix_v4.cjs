const fs = require('fs');
const path = 'f:/MyRestoredProjects/gymnastic-system-2/app/src/pages/settings/SettingsContainer.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Fix Portal Leak (Targeted Regex)
// We look for the portal block and ensure it closes correctly.
const portalRegex = /(\{\s*isPublishing\s*&&\s*createPortal\s*\([\s\S]+?document\.body\s*)(\n\s*\}\s*)\)/;
// Wait, the current code is so broken that a regex might not match.

// Let's use a simpler, line-based fix for the portal.
const lines = content.split('\n');
let portalStart = -1;
let portalEnd = -1;

for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('isPublishing && createPortal(')) portalStart = i;
    if (lines[i].includes('document.body')) portalEnd = i;
}

if (portalStart !== -1 && portalEnd !== -1) {
    console.log(`Found portal at lines ${portalStart + 1} to ${portalEnd + 1}`);
    // Reconstruct the portal block exactly as it should be.
    // We already have the clean code from our previous attempts.
}

// 2. Fix Tab Leaks
// We'll wrap every tab content in a single div and ensure it's closed.

const tabs = ['appearance', 'notifications', 'academy', 'login', 'profile'];

// Actually, I'll just provide the entire return block as a string and replace it.
// This is safest if I can find the start and end of the return block reliably.

const returnStartMarker = 'return (';
const returnEndMarker = 'function LevelPricingTable';

const rStart = content.indexOf(returnStartMarker);
const rEnd = content.indexOf(returnEndMarker);

if (rStart !== -1 && rEnd !== -1) {
    console.log("Found return block! Overwriting with balanced version...");
    // I will write the clean return block here.
    // (This is a large string, I'll build it in chunks if needed but Node can handle it).
} else {
    console.error("Return block not found!");
}
