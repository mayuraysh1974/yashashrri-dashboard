const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./yashashrri.db');

const tables = [
  'Students', 'Teachers', 'StudentSubjects', 'Fees', 
  'StudentAttendance', 'TeacherAttendance', 'TestResults', 
  'Tests', 'StudentDocuments', 'MessageLog'
];

db.serialize(() => {
  tables.forEach(table => {
    db.run(`DELETE FROM ${table}`, (err) => {
      if (err) console.log(`Table ${table} might not exist or failed: ${err.message}`);
      else console.log(`Table ${table} cleared.`);
    });
  });
});

db.close();
