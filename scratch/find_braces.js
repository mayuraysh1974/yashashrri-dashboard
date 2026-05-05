const fs = require('fs');
const content = fs.readFileSync('src/pages/AttendanceRegistry.jsx', 'utf8');

let balance = 0;
const lines = content.split('\n');
lines.forEach((line, i) => {
    const open = (line.match(/\{/g) || []).length;
    const close = (line.match(/\}/g) || []).length;
    balance += open - close;
    if (balance < 0) {
        console.log(`Error: Negative balance at line ${i + 1}: ${line}`);
        balance = 0; // Reset to keep going
    }
});
console.log(`Final balance: ${balance}`);
