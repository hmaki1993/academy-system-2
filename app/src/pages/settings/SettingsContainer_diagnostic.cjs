const fs = require('fs');
const path = 'f:/MyRestoredProjects/gymnastic-system-2/app/src/pages/settings/SettingsContainer.tsx';
let s = fs.readFileSync(path, 'utf8');
const lines = s.split('\n');

let stack = [];
lines.forEach((l, i) => {
    const oMatches = [...l.matchAll(/<div(?!e)/g)];
    const cMatches = [...l.matchAll(/<\/div>/g)];
    
    // We'll simplisticly handle multiple matches in one line
    const ops = oMatches.map(m => ({ type: 'open', line: i + 1 }));
    const cls = cMatches.map(m => ({ type: 'close', line: i + 1 }));
    
    const events = [...ops, ...cls].sort((a, b) => 0); // Keep line order
    
    events.forEach(e => {
        if (e.type === 'open') {
            stack.push(e.line);
        } else {
            if (stack.length > 0) stack.pop();
        }
    });
});

console.log('UNCLOSED DIVS (STARTED ON LINES):', stack);
