const fs = require('fs');
const path = 'f:/MyRestoredProjects/gymnastic-system-2/app/src/pages/settings/SettingsContainer.tsx';
let content = fs.readFileSync(path, 'utf8');

// Strategic Balance Fixes via Pattern Replacement
// We'll replace the existing tab fragments with clean, isolated ones.

// 1. Fix the Portal Overlay (Missing close for div at 772)
const portalSearch = /\{isPublishing && createPortal\([\s\S]+?document\.body\s+?\)\}/;
// I'll use a more precise match if possible, but let's try a targeted sub-replacement first.

// Better to use multi-replace on VERY SPECIFIC anchors.

console.log("Starting targeted repair...");

// Anchor 1: End of Appearance Tab
// We'll look for the transition from Appearance to Notifications
const transition1 = /RESET\s+?<\/button>\s+?<\/div>\s+?<\/div>\s+?<\/div>\s+?\}\)\s+?\}\s+?{activeTab === 'notifications'/;
// Current code has shared closing tags. We'll explicitely close them.

// Actually, I'll use simple search and replace on the known messy lines.
// I'll read the lines again to be 100% sure.
