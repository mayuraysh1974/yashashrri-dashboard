import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function migrate() {
  const db = await open({
    filename: path.resolve(__dirname, '../backend/yashashrri.db'),
    driver: sqlite3.Database
  });

  try {
    await db.exec(`ALTER TABLE Teachers RENAME COLUMN salary TO totalShare`);
    console.log("Successfully migrated 'salary' to 'totalShare' in Teachers table.");
  } catch (err) {
    if (err.message.includes("no such column") || err.message.includes("duplicate column")) {
         console.log("Column 'totalShare' already exists or migration not needed.");
    } else {
         console.error("Migration error:", err.message);
    }
  }
}

migrate();
