import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

async function cleanup() {
  const db = await open({
    filename: './backend/database.sqlite',
    driver: sqlite3.Database
  });

  // Delete records where time is in the old 12-hour format containing AM or PM
  // The system now uses 24-hour HH:MM format like "16:30"
  await db.run("DELETE FROM Schedules WHERE time LIKE '%AM%' OR time LIKE '%PM%'");
  console.log('Cleaned up corrupted time format records.');

  const remaining = await db.all("SELECT id, time, batch FROM Schedules");
  console.log('Remaining valid schedules:', remaining);

  await db.close();
}

cleanup();
