import { initializeDatabase } from '../backend/db.js';

async function debugData() {
  const db = await initializeDatabase();
  
  console.log("--- SUBJECTS ---");
  const subjects = await db.all("SELECT * FROM Subjects");
  console.table(subjects);

  console.log("\n--- STUDENTS ---");
  const students = await db.all("SELECT id, name, standard FROM Students LIMIT 10");
  console.table(students);

  console.log("\n--- MAPPINGS (StudentSubjects) ---");
  const mappings = await db.all("SELECT * FROM StudentSubjects LIMIT 20");
  console.table(mappings);

  process.exit(0);
}

debugData();
