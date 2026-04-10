import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.resolve(__dirname, 'yashashrri.db');

export async function initializeDatabase() {
  const db = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  // Create Users table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS Users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL
    );
  `);

  // Seed default admin
  const userCount = await db.get(`SELECT COUNT(*) as count FROM Users`);
  if (userCount.count === 0) {
    await db.run(`INSERT INTO Users (username, password, role) VALUES ('admin', 'password123', 'admin')`);
  }

  // Create Students table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS Students (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      standard TEXT,
      feesPaid INTEGER DEFAULT 0,
      balance INTEGER DEFAULT 0,
      concession INTEGER DEFAULT 0,
      lastContacted TEXT,
      status TEXT,
      photo TEXT,
      parentName TEXT,
      parentPhone TEXT,
      studentPhone TEXT,
      email TEXT,
      address TEXT
    );
  `);
  
  try { await db.exec(`ALTER TABLE Students ADD COLUMN photo TEXT`); } catch(e) {}
  try { await db.exec(`ALTER TABLE Students ADD COLUMN parentName TEXT`); } catch(e) {}
  try { await db.exec(`ALTER TABLE Students ADD COLUMN parentPhone TEXT`); } catch(e) {}
  try { await db.exec(`ALTER TABLE Students ADD COLUMN studentPhone TEXT`); } catch(e) {}
  try { await db.exec(`ALTER TABLE Students ADD COLUMN email TEXT`); } catch(e) {}
  try { await db.exec(`ALTER TABLE Students ADD COLUMN address TEXT`); } catch(e) {}
  try { await db.exec(`ALTER TABLE Students ADD COLUMN concession INTEGER DEFAULT 0`); } catch(e) {}
  try { await db.exec(`ALTER TABLE Students RENAME COLUMN batch TO standard`); } catch(e) {}
  try { await db.exec(`ALTER TABLE Students ADD COLUMN collegeId INTEGER REFERENCES Colleges(id) ON DELETE SET NULL`); } catch(e) {}
  try { await db.exec(`ALTER TABLE Students ADD COLUMN installments INTEGER DEFAULT 1`); } catch(e) {}

  // Create Colleges table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS Colleges (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL
    );
  `);

  // Create StudentAttendance table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS StudentAttendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      studentId TEXT NOT NULL,
      date TEXT NOT NULL,
      status TEXT NOT NULL,
      FOREIGN KEY(studentId) REFERENCES Students(id) ON DELETE CASCADE,
      UNIQUE(studentId, date)
    );
  `);

  // Create StudentDocuments table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS StudentDocuments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      studentId TEXT NOT NULL,
      name TEXT NOT NULL,
      fileUrl TEXT NOT NULL,
      uploadDate TEXT NOT NULL,
      FOREIGN KEY(studentId) REFERENCES Students(id) ON DELETE CASCADE
    );
  `);

  // Create MessageLog table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS MessageLog (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      studentId TEXT,
      recipient TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT NOT NULL,
      status TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      FOREIGN KEY(studentId) REFERENCES Students(id)
    );
  `);

  // Seed mocked students into DB if empty
  const studentCount = await db.get(`SELECT COUNT(*) as count FROM Students`);
  if (studentCount.count === 0) {
    const defaultStudents = [
      { id: 'S001', name: 'Aarav Patel', standard: 'Std X', feesPaid: 45000, balance: 5000, lastContacted: '2 Days Ago', status: 'Active' },
      { id: 'S002', name: 'Diya Sharma', standard: 'Std IX', feesPaid: 30000, balance: 10000, lastContacted: '1 Week Ago', status: 'Active' },
      { id: 'S003', name: 'Rohan Gupta', standard: 'FY Eng', feesPaid: 60000, balance: 0, lastContacted: 'Today', status: 'Active' },
      { id: 'S004', name: 'Ananya Singh', standard: 'Std X', feesPaid: 20000, balance: 30000, lastContacted: '1 Month Ago', status: 'Defaulter' },
      { id: 'S005', name: 'Kabir Verma', standard: 'Std IX', feesPaid: 40000, balance: 0, lastContacted: '3 Days Ago', status: 'Active' },
    ];
    for (const s of defaultStudents) {
      await db.run(
        `INSERT INTO Students (id, name, standard, feesPaid, balance, lastContacted, status) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [s.id, s.name, s.standard, s.feesPaid, s.balance, s.lastContacted, s.status]
      );
    }
  }

  // Create Fees tracking table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS Fees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      studentId TEXT,
      amountPaid INTEGER,
      paymentDate TEXT,
      paymentMode TEXT,
      remarks TEXT,
      FOREIGN KEY(studentId) REFERENCES Students(id)
    );
  `);

  // Create Teachers table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS Teachers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      subject TEXT NOT NULL,
      attendance TEXT DEFAULT 'Present',
      totalShare INTEGER DEFAULT 0
    );
  `);
  try { await db.exec(`ALTER TABLE Teachers RENAME COLUMN salary TO totalShare`); } catch(e) {}

  // Create TeacherShares table (configuration of entitilement)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS TeacherShares (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      teacherId TEXT NOT NULL,
      description TEXT,
      amount INTEGER NOT NULL,
      date TEXT NOT NULL,
      FOREIGN KEY(teacherId) REFERENCES Teachers(id) ON DELETE CASCADE
    );
  `);

  // Create TeacherPayments table (actual payments made)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS TeacherPayments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      teacherId TEXT NOT NULL,
      amount INTEGER NOT NULL,
      date TEXT NOT NULL,
      paymentMode TEXT,
      remarks TEXT,
      FOREIGN KEY(teacherId) REFERENCES Teachers(id) ON DELETE CASCADE
    );
  `);

  // No seed data for Teachers - admin will add real teachers via the UI

  // Create Standards Table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS Standards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      standard TEXT NOT NULL
    );
  `);
  
  // Migrate from Batches to Standards if it exists
  try {
    const oldBatches = await db.all(`SELECT * FROM Batches`);
    for (const b of oldBatches) {
      await db.run(`INSERT INTO Standards (standard) VALUES (?)`, [b.standard || b.name]);
    }
    await db.exec(`DROP TABLE Batches`);
  } catch(e) {}

  // Remove Schedules table as requested
  await db.exec(`DROP TABLE IF EXISTS Schedules`);

  // Create Tests table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS Tests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      subject TEXT NOT NULL,
      standard TEXT NOT NULL,
      totalMarks INTEGER NOT NULL,
      date TEXT NOT NULL
    );
  `);
  try { await db.exec(`ALTER TABLE Tests RENAME COLUMN batch TO standard`); } catch(e) {}

  // Create TestResults table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS TestResults (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      studentId TEXT NOT NULL,
      testId INTEGER NOT NULL,
      score INTEGER NOT NULL,
      FOREIGN KEY(studentId) REFERENCES Students(id) ON DELETE CASCADE,
      FOREIGN KEY(testId) REFERENCES Tests(id) ON DELETE CASCADE
    );
  `);

  // No seed data for Tests - admin will add real tests via the UI

  // Create LibraryResources table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS LibraryResources (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      standard TEXT NOT NULL,
      type TEXT NOT NULL,
      videoLink TEXT,
      date TEXT NOT NULL
    );
  `);
  try { await db.exec(`ALTER TABLE LibraryResources RENAME COLUMN batch TO standard`); } catch(e) {}

  // Create Subjects table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS Subjects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      fees INTEGER NOT NULL
    );
  `);

  // Seed default subjects if empty
  const subCount = await db.get(`SELECT COUNT(*) as count FROM Subjects`);
  if (subCount.count === 0) {
    const defaultSubjects = [
      { name: 'Mathematics', fees: 15000 },
      { name: 'Physics', fees: 12000 },
      { name: 'Chemistry', fees: 12000 },
      { name: 'Biology', fees: 10000 },
      { name: 'Applied Mechanics', fees: 18000 }
    ];
    for (const s of defaultSubjects) {
      await db.run(`INSERT INTO Subjects (name, fees) VALUES (?, ?)`, [s.name, s.fees]);
    }
  }

  // Create StudentSubjects mapping table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS StudentSubjects (
      studentId TEXT,
      subjectId INTEGER,
      FOREIGN KEY(studentId) REFERENCES Students(id) ON DELETE CASCADE,
      FOREIGN KEY(subjectId) REFERENCES Subjects(id) ON DELETE CASCADE,
      PRIMARY KEY (studentId, subjectId)
    );
  `);

  // Create Holidays Table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS Holidays (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT UNIQUE NOT NULL,
      description TEXT,
      type TEXT DEFAULT 'Holiday'
    );
  `);

  // Create WorkingDays Table (Monthly Targets)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS WorkingDays (
      month TEXT PRIMARY KEY,
      days INTEGER NOT NULL
    );
  `);

  // Create StudentSubjectAttendance Table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS StudentSubjectAttendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      studentId TEXT NOT NULL,
      subjectId INTEGER NOT NULL,
      date TEXT NOT NULL,
      status TEXT NOT NULL,
      FOREIGN KEY(studentId) REFERENCES Students(id) ON DELETE CASCADE,
      FOREIGN KEY(subjectId) REFERENCES Subjects(id) ON DELETE CASCADE,
      UNIQUE(studentId, subjectId, date)
    );
  `);

  return db;
}
