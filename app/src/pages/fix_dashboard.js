const fs = require('fs');
const path = 'f:/epic gymnastic/app/src/pages/ReceptionDashboard.tsx';

try {
    let content = fs.readFileSync(path, 'utf8');

    // Regex to match the function. 
    // Matches "const fetchPtStatus = ..." until the first "};" that appears at the start of a line (with whitespace).
    // The duplicate is the FIRST one.
    const regex = /const fetchPtStatus = async \(\) => \{[\s\S]*?^\s*\}\;/m;

    // Check if it exists twice
    const match1 = content.match(regex);
    if (!match1) {
        console.log('Function not found even once!');
        process.exit(1);
    }

    // Remove the first occurrence
    const newContent = content.replace(regex, '');

    // Check if it still exists (the second one should be remaining)
    if (!newContent.match(/const fetchPtStatus = async/)) {
        console.log('Warning: It seems we removed the ONLY occurrence?');
        // Check original count
        const count = (content.match(/const fetchPtStatus = async/g) || []).length;
        console.log('Original count:', count);
        if (count === 1) {
            console.log('Aborting write, only 1 found originally.');
            process.exit(1);
        }
    }

    fs.writeFileSync(path, newContent, 'utf8');
    console.log('Successfully removed duplicate function.');

} catch (e) {
    console.error(e);
    process.exit(1);
}
