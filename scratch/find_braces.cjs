const fs = require('fs');
const content = fs.readFileSync('src/pages/LandingPage.jsx', 'utf8');

let balance = 0;
const lines = content.split('\n');
lines.forEach((line, i) => {
    const open = (line.match(/\{/g) || []).length;
    const close = (line.match(/\}/g) || []).length;
    balance += open - close;
});
console.log(`Final balance: ${balance}`);
