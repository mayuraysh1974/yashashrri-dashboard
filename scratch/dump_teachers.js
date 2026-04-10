import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function dumpTeachers() {
  const db = await open({
    filename: path.resolve(__dirname, '../backend/yashashrri.db'),
    driver: sqlite3.Database
  });

  const teachers = await db.all('SELECT * FROM Teachers');
  console.log(JSON.stringify(teachers, null, 2));
}

dumpTeachers();
