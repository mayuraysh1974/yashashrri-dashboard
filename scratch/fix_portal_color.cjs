const fs = require('fs');
const path = 'd:/AntiGravity/yashashrri-dashboard/src/pages/StudentPortal.jsx';

let content = fs.readFileSync(path, 'utf8');

// Fix 1: Dashboard balance card - change color from fixed blue to red/green based on amount
content = content.replace(
  "color: '#1A237E', margin: '0', fontSize: '1.5rem' }}>₹{(student.balance || 0).toLocaleString()}</h2>",
  "color: student.balance > 0 ? '#EF4444' : '#10B981', margin: '0', fontSize: '1.5rem' }}>₹{(student.balance || 0).toLocaleString()}</h2>"
);

fs.writeFileSync(path, content, 'utf8');
console.log('Done. Replacements made.');
