import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

async function cleanup() {
  const db = await open({
    filename: './backend/database.sqlite',
    driver: sqlite3.Database
  });
  await db.run('DELETE FROM Schedules');
  console.log('Schedules table cleared.');
  await db.close();
}

cleanup();
