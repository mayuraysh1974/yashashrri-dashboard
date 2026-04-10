import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';

async function migrate() {
  const db = await open({
    filename: './backend/yashashrri.db',
    driver: sqlite3.Database
  });

  console.log('Starting Subjects Migration on yashashrri.db...');
  
  // 1. Fetch current data
  const data = await db.all("SELECT * FROM Subjects");
  console.log(`Backing up ${data.length} records...`);

  // 2. Drop and recreate without UNIQUE
  await db.exec(`DROP TABLE Subjects`);
  await db.exec(`
    CREATE TABLE Subjects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      fees INTEGER NOT NULL
    );
  `);

  // 3. Re-insert
  for (const s of data) {
    await db.run("INSERT INTO Subjects (id, name, fees) VALUES (?, ?, ?)", [s.id, s.name, s.fees]);
  }

  console.log('SUCCESS: Subjects can now have identical names for different classes.');
  await db.close();
}

migrate().catch(console.error);
