import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import { createClient } from '@supabase/supabase-js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Supabase Credentials
const supabaseUrl = 'https://rfgxrekdginqwzjqltzg.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmZ3hyZWtkZ2lucXd6anFsdHpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU5MjgzNTcsImV4cCI6MjA5MTUwNDM1N30.XfqXtiErXCXoavGURUTtjdj8aQwbh6WWWuK4Ow5Ctu4';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const dbPath = path.resolve('backend', 'yashashrri.db');

async function migrate() {
  console.log('Connecting to local SQLite...');
  const db = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  console.log('--- Migrating Standards ---');
  const standards = await db.all('SELECT * FROM Standards');
  for (const s of standards) {
    await supabase.from('standards').upsert({ id: s.id, standard: s.standard });
  }

  console.log('--- Migrating Subjects ---');
  const subjects = await db.all('SELECT * FROM Subjects');
  for (const s of subjects) {
    await supabase.from('subjects').upsert({ id: s.id, name: s.name, fees: s.fees });
  }

  console.log('--- Migrating Colleges ---');
  const colleges = await db.all('SELECT * FROM Colleges');
  for (const c of colleges) {
    await supabase.from('colleges').upsert({ id: c.id, name: c.name });
  }

  console.log('--- Migrating Teachers ---');
  const teachers = await db.all('SELECT * FROM Teachers');
  for (const t of teachers) {
    await supabase.from('teachers').upsert({ 
      id: t.id, 
      name: t.name, 
      subject: t.subject, 
      attendance: t.attendance, 
      total_share: t.totalShare 
    });
  }

  console.log('--- Migrating Students ---');
  const students = await db.all('SELECT * FROM Students');
  for (const s of students) {
    await supabase.from('students').upsert({
      id: s.id,
      name: s.name,
      standard: s.standard,
      fees_paid: s.feesPaid,
      balance: s.balance,
      concession: s.concession,
      last_contacted: s.lastContacted,
      status: s.status,
      photo: s.photo,
      parent_name: s.parentName,
      parent_phone: s.parentPhone,
      student_phone: s.studentPhone,
      email: s.email,
      address: s.address,
      college_id: s.collegeId,
      installments: s.installments
    });
  }

  console.log('--- Migrating Fees ---');
  const fees = await db.all('SELECT * FROM Fees');
  for (const f of fees) {
    await supabase.from('fees').upsert({
      id: f.id,
      student_id: f.studentId,
      amount_paid: f.amountPaid,
      payment_date: f.paymentDate,
      payment_mode: f.paymentMode,
      remarks: f.remarks
    });
  }

  console.log('--- Migrating Attendance ---');
  const attendance = await db.all('SELECT * FROM StudentAttendance');
  for (const a of attendance) {
    await supabase.from('student_attendance').upsert({
      id: a.id,
      student_id: a.studentId,
      date: a.date,
      status: a.status
    });
  }

  console.log('Migration Complete! ✅');
  await db.close();
}

migrate().catch(console.error);
