import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { initializeDatabase } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Multer Storage Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath);
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage });

const JWT_SECRET = 'yashashrri_super_secret_key_2026';
let db;

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await db.get(`SELECT * FROM Users WHERE username = ? AND password = ?`, [username, password]);
  if (user) {
    const token = jwt.sign({ username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '8h' });
    res.json({ success: true, token });
  } else {
    res.status(401).json({ success: false, message: 'Invalid credentials' });
  }
});

// Middleware to protect routes
function authenticate(req, res, next) {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token' });
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ message: 'Invalid token' });
    req.user = decoded;
    next();
  });
}

// Active session tracking middleware
app.use((req, res, next) => {
  if (db && req.path.startsWith('/api')) {
    let token = req.headers['authorization']?.split(' ')[1];
    let userStr = 'Guest';
    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        userStr = decoded.username || 'Authenticated';
      } catch (e) {}
    }
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const ua = req.headers['user-agent'] || 'Unknown';
    const now = new Date().toISOString();
    
    db.run(
      `INSERT INTO ActiveSessions (ip, userAgent, lastSeen, user) VALUES (?, ?, ?, ?)
       ON CONFLICT(ip) DO UPDATE SET lastSeen = excluded.lastSeen, user = excluded.user, userAgent = excluded.userAgent`,
      [ip, ua, now, userStr]
    ).catch(e => console.error("Session log error", e));
  }
  next();
});

app.get('/api/students', authenticate, async (req, res) => {
  const students = await db.all(`
    SELECT s.*, c.name as collegeName 
    FROM Students s 
    LEFT JOIN Colleges c ON s.collegeId = c.id
  `);
  const mappings = await db.all(`
    SELECT ss.studentId, s.id as subjectId, s.name, s.fees
    FROM StudentSubjects ss
    JOIN Subjects s ON ss.subjectId = s.id
  `);
  for (let s of students) {
    s.subjects = mappings.filter(m => m.studentId === s.id);
  }
  res.json(students);
});

// Helper for automated Student IDs — format: XII2026001
app.get('/api/students/next-id', authenticate, async (req, res) => {
  const { standard } = req.query;
  if (!standard) return res.status(400).json({ error: 'Standard is required' });

  const year = new Date().getFullYear();
  // Strip common prefixes like "Std " so "Std XII" → "XII", "FY Eng" → "FYEng"
  const code = standard.replace(/^std\s+/i, '').replace(/\s+/g, '').toUpperCase();
  const prefix = `${code}${year}`;

  try {
    const rows = await db.all(`SELECT id FROM Students WHERE id LIKE ?`, [`${prefix}%`]);
    let maxSerial = 0;
    for (const row of rows) {
      const serial = parseInt(row.id.slice(prefix.length));
      if (!isNaN(serial) && serial > maxSerial) maxSerial = serial;
    }
    const nextId = `${prefix}${(maxSerial + 1).toString().padStart(3, '0')}`;
    res.json({ nextId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create a new student
app.post('/api/students', authenticate, async (req, res) => {
  const { id, name, standard, feesPaid = 0, balance = 0, concession = 0, lastContacted = 'Today', status = 'Active', subjectIds = [], parentName, parentPhone, studentPhone, email, address, collegeId, installments = 1 } = req.body;
  if (!id || !name) {
    return res.status(400).json({ error: 'Missing required fields: id, name' });
  }
  try {
    await db.run(
      `INSERT INTO Students (id, name, standard, feesPaid, balance, concession, lastContacted, status, parentName, parentPhone, studentPhone, email, address, collegeId, installments) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, name, standard, feesPaid, balance, concession, lastContacted, status, parentName, parentPhone, studentPhone, email, address, collegeId || null, installments || 1]
    );
    // Link subjects
    for (const subId of subjectIds) {
      await db.run(`INSERT INTO StudentSubjects (studentId, subjectId) VALUES (?, ?)`, [id, subId]);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/metrics', authenticate, async (req, res) => {
  const studentCount = await db.get(`SELECT COUNT(*) as count FROM Students`);
  const feeSum = await db.get(`SELECT SUM(amountPaid) as sum FROM Fees`);
  
  res.json({
    totalStudents: studentCount.count,
    feesCollected: feeSum.sum || 0
  });
});

app.get('/api/teachers/next-id', authenticate, async (req, res) => {
  try {
    const last = await db.get(`SELECT id FROM Teachers WHERE id LIKE 'TR%' ORDER BY id DESC LIMIT 1`);
    let nextSerial = 1;
    if (last) {
      const lastSerial = parseInt(last.id.replace('TR', ''));
      if (!isNaN(lastSerial)) nextSerial = lastSerial + 1;
    }
    const nextId = `TR${nextSerial.toString().padStart(3, '0')}`;
    res.json({ nextId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/teachers', authenticate, async (req, res) => {
  const teachers = await db.all(`SELECT * FROM Teachers`);
  res.json(teachers);
});

app.post('/api/teachers', authenticate, async (req, res) => {
  const { id, name, subject, totalShare = 0 } = req.body;
  if (!id || !name || !subject) {
    return res.status(400).json({ error: 'Missing required fields: id, name, subject' });
  }
  try {
    await db.run(
      `INSERT INTO Teachers (id, name, subject, attendance, totalShare) VALUES (?, ?, ?, 'Present', ?)`,
      [id, name, subject, totalShare]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/teachers/attendance', authenticate, async (req, res) => {
  const { id, status } = req.body;
  try {
    await db.run(`UPDATE Teachers SET attendance = ? WHERE id = ?`, [status, id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/reports', authenticate, async (req, res) => {
  try {
    const totalFees = await db.get(`SELECT SUM(amountPaid) as total FROM Fees`);
    const studentStats = await db.get(`SELECT COUNT(*) as totalStudents, SUM(CASE WHEN status='Defaulter' THEN 1 ELSE 0 END) as defaulters FROM Students`);
    const teacherStats = await db.get(`SELECT COUNT(*) as totalTeachers, SUM(totalShare) as totalPayroll FROM Teachers`);
    
    const arrears = await db.all(`SELECT id, name, standard, balance FROM Students WHERE balance > 0 ORDER BY balance DESC LIMIT 5`);

    // Monthly mocked trend data for charts
    const monthlyRevenue = [
      { name: 'Jan', collected: 40000, expected: 50000 },
      { name: 'Feb', collected: 30000, expected: 50000 },
      { name: 'Mar', collected: 20000, expected: 50000 },
      { name: 'Apr', collected: 27800, expected: 50000 },
      { name: 'May', collected: 18900, expected: 50000 },
      { name: 'Jun', collected: totalFees.total || 0, expected: 50000 },
    ];
    const subjectWiseStats = await db.all(`
      SELECT s.name, COUNT(ss.studentId) as value
      FROM Subjects s
      LEFT JOIN StudentSubjects ss ON s.id = ss.subjectId
      GROUP BY s.id
    `);

    const latestAdmissions = await db.all(`
      SELECT 'info' as type, name || ' admitted to ' || standard as text, 'Recent' as time, id 
      FROM Students ORDER BY rowid DESC LIMIT 3
    `);

    const latestPayments = await db.all(`
      SELECT 'success' as type, 'Fee payment received from student ID ' || studentId as text, paymentDate as time, id
      FROM Fees ORDER BY id DESC LIMIT 3
    `);

    res.json({
      revenue: totalFees?.total || 0,
      students: studentStats || { totalStudents: 0, defaulters: 0 },
      teachers: teacherStats || { totalTeachers: 0, totalPayroll: 0 },
      monthlyRevenue,
      subjectStats: subjectWiseStats,
      activities: [...latestPayments, ...latestAdmissions],
      defaulters: arrears || []
    });
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/reports/arrears', authenticate, async (req, res) => {
  try {
    const arrears = await db.all(`
      SELECT s.id, s.name, s.standard, s.feesPaid, s.balance, s.concession, s.status,
      (SELECT GROUP_CONCAT(sub.name, ', ') FROM StudentSubjects ss JOIN Subjects sub ON ss.subjectId = sub.id WHERE ss.studentId = s.id) as subjects
      FROM Students s
      WHERE s.balance > 0
      ORDER BY s.standard, s.name
    `);
    res.json(arrears);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/reports/collection', authenticate, async (req, res) => {
  const { startDate, endDate } = req.query;
  try {
    let query = `
      SELECT f.*, COALESCE(s.name, 'Deleted Student') as studentName, COALESCE(s.standard, 'N/A') as standard
      FROM Fees f
      LEFT JOIN Students s ON f.studentId = s.id
    `;
    const params = [];
    if (startDate && endDate) {
      query += ` WHERE f.paymentDate BETWEEN ? AND ?`;
      params.push(startDate, endDate);
    }
    query += ` ORDER BY f.paymentDate DESC, f.id DESC`;
    
    const collections = await db.all(query, params);
    
    // Summary
    const summary = await db.get(`
      SELECT SUM(amountPaid) as totalCollection, COUNT(*) as transactions
      FROM Fees f
      ${startDate && endDate ? 'WHERE paymentDate BETWEEN ? AND ?' : ''}
    `, params);

    res.json({ collections, summary: summary || { totalCollection: 0, transactions: 0 } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Tests & Performance
app.get('/api/tests', authenticate, async (req, res) => {
  const tests = await db.all(`SELECT * FROM Tests ORDER BY date DESC`);
  res.json(tests);
});

app.post('/api/tests', authenticate, async (req, res) => {
  const { name, subject, standard, totalMarks, date } = req.body;
  try {
    await db.run(
      `INSERT INTO Tests (name, subject, standard, totalMarks, date) VALUES (?, ?, ?, ?, ?)`,
      [name, subject, standard, totalMarks, date]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/tests/:id/results', authenticate, async (req, res) => {
  const { id } = req.params;
  const results = await db.all(`
    SELECT tr.*, s.name as studentName 
    FROM TestResults tr 
    JOIN Students s ON tr.studentId = s.id
    WHERE tr.testId = ?
  `, [id]);
  res.json(results);
});

app.post('/api/tests/:id/results', authenticate, async (req, res) => {
  const { id } = req.params;
  const { results } = req.body; // Array of { studentId, score }
  try {
    for (const r of results) {
      const existing = await db.get(`SELECT id FROM TestResults WHERE studentId = ? AND testId = ?`, [r.studentId, id]);
      if (existing) {
        await db.run(`UPDATE TestResults SET score = ? WHERE id = ?`, [r.score, existing.id]);
      } else {
        await db.run(`INSERT INTO TestResults (studentId, testId, score) VALUES (?, ?, ?)`, [r.studentId, id, r.score]);
      }
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/library', authenticate, async (req, res) => {
  const resources = await db.all(`SELECT * FROM LibraryResources`);
  res.json(resources);
});

app.post('/api/library/upload', authenticate, upload.single('file'), async (req, res) => {
  const { name, standard, type, videoLink } = req.body;
  const fileUrl = req.file ? `/uploads/${req.file.filename}` : null;
  const date = new Date().toISOString().split('T')[0];
  try {
    await db.run(
      `INSERT INTO LibraryResources (name, standard, type, videoLink, date) VALUES (?, ?, ?, ?, ?)`,
      [name || req.file?.originalname, standard, type, videoLink || fileUrl, date]
    );
    res.json({ success: true, fileUrl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Subject CRUD
app.get('/api/subjects', authenticate, async (req, res) => {
  const subjects = await db.all(`SELECT * FROM Subjects`);
  res.json(subjects);
});

app.post('/api/subjects', authenticate, async (req, res) => {
  const { name, fees } = req.body;
  if (!name || isNaN(Number(fees))) {
    return res.status(400).json({ error: 'Valid Name and numeric Fees are required' });
  }
  try {
    await db.run(`INSERT INTO Subjects (name, fees) VALUES (?, ?)`, [name, Number(fees)]);
    res.json({ success: true });
  } catch (err) {
    console.error("Subject save error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/subjects/:id', authenticate, async (req, res) => {
  const { id } = req.params;
  const { name, fees } = req.body;
  try {
    await db.run(`UPDATE Subjects SET name = ?, fees = ? WHERE id = ?`, [name, fees, id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/subjects/:id', authenticate, async (req, res) => {
  const { id } = req.params;
  try {
    await db.run(`DELETE FROM Subjects WHERE id = ?`, [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Standard Master CRUD
app.get('/api/standards', authenticate, async (req, res) => {
  const standards = await db.all(`SELECT * FROM Standards`);
  res.json(standards);
});

app.post('/api/standards', authenticate, async (req, res) => {
  const { standard } = req.body;
  try {
    await db.run(`INSERT INTO Standards (standard) VALUES (?)`, [standard]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/standards/:id', authenticate, async (req, res) => {
  const { id } = req.params;
  const { standard } = req.body;
  try {
    await db.run(`UPDATE Standards SET standard = ? WHERE id = ?`, [standard, id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/standards/:id', authenticate, async (req, res) => {
  const { id } = req.params;
  try {
    await db.run(`DELETE FROM Standards WHERE id = ?`, [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// College Master CRUD
app.get('/api/colleges', authenticate, async (req, res) => {
  const colleges = await db.all(`SELECT * FROM Colleges`);
  res.json(colleges);
});

app.post('/api/colleges', authenticate, async (req, res) => {
  const { name } = req.body;
  try {
    await db.run(`INSERT INTO Colleges (name) VALUES (?)`, [name]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/colleges/:id', authenticate, async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  try {
    await db.run(`UPDATE Colleges SET name = ? WHERE id = ?`, [name, id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/colleges/:id', authenticate, async (req, res) => {
  const { id } = req.params;
  try {
    await db.run(`DELETE FROM Colleges WHERE id = ?`, [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/fees/receipt', authenticate, async (req, res) => {
  const { studentId, amountPaid, paymentDate, paymentMode, remarks } = req.body;
  try {
    await db.run(
      `INSERT INTO Fees (studentId, amountPaid, paymentDate, paymentMode, remarks) VALUES (?, ?, ?, ?, ?)`,
      [studentId, amountPaid, paymentDate, paymentMode, remarks]
    );
    
    // Decrease balance and increase feesPaid for student
    await db.run(
      `UPDATE Students SET balance = MAX(0, balance - ?), feesPaid = feesPaid + ? WHERE id = ?`,
      [amountPaid, amountPaid, studentId]
    );

    const updated = await db.get(`SELECT balance, feesPaid, concession FROM Students WHERE id = ?`, [studentId]);
    
    res.json({ 
      success: true, 
      newBalance: updated.balance, 
      totalPaid: updated.feesPaid,
      concession: updated.concession
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/fees/refund', authenticate, async (req, res) => {
  const { studentId, refundAmount, paymentDate, paymentMode, remarks } = req.body;
  try {
    const amount = -Math.abs(Number(refundAmount));
    await db.run(
      `INSERT INTO Fees (studentId, amountPaid, paymentDate, paymentMode, remarks) VALUES (?, ?, ?, ?, ?)`,
      [studentId, amount, paymentDate, paymentMode, remarks]
    );
    
    // Reverse the payment: drop feesPaid, increase balance by refund amount.
    await db.run(
      `UPDATE Students SET balance = balance + ?, feesPaid = MAX(0, feesPaid + ?) WHERE id = ?`,
      [Math.abs(Number(refundAmount)), amount, studentId]
    );

    const updated = await db.get(`SELECT balance, feesPaid, concession FROM Students WHERE id = ?`, [studentId]);
    
    res.json({ 
      success: true, 
      newBalance: updated.balance, 
      totalPaid: updated.feesPaid,
      concession: updated.concession
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/fees/history', authenticate, async (req, res) => {
  try {
    const fees = await db.all(`
      SELECT f.*, COALESCE(s.name, 'Deleted Student') as studentName, COALESCE(s.standard, 'N/A') as standard, s.balance as currentBalance, s.feesPaid as totalPaid, s.concession
      FROM Fees f
      LEFT JOIN Students s ON f.studentId = s.id
      ORDER BY f.id DESC
      LIMIT 100
    `);
    res.json(fees);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/fees/:id', authenticate, async (req, res) => {
  const { id } = req.params;
  try {
    const fee = await db.get(`SELECT studentId, amountPaid FROM Fees WHERE id = ?`, [id]);
    if (fee) {
      // Reverse the transaction
      // if amountPaid was positive (payment), balance increases, feesPaid decreases.
      // if amountPaid was negative (refund), balance decreases, feesPaid increases.
      await db.run(
        `UPDATE Students SET balance = balance + ?, feesPaid = MAX(0, feesPaid - ?) WHERE id = ?`,
        [fee.amountPaid, fee.amountPaid, fee.studentId]
      );
      await db.run(`DELETE FROM Fees WHERE id = ?`, [id]);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Bulk Promote Students
app.post('/api/students/bulk-promote', authenticate, async (req, res) => {
  const { fromStandard, toStandard } = req.body;
  if (!fromStandard || !toStandard) return res.status(400).json({ error: 'Missing standards' });

  try {
    const result = await db.run(
      `UPDATE Students SET standard = ? WHERE standard = ? AND status = 'Active'`,
      [toStandard, fromStandard]
    );
    res.json({ success: true, changes: result.changes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update Student
app.put('/api/students/:id', authenticate, async (req, res) => {
  const { id } = req.params;
  const { name, standard, feesPaid, balance, status, subjectIds = [], concession = 0, photo = null, parentName, parentPhone, studentPhone, email, address, collegeId, installments = 1 } = req.body;
  try {
    await db.run(
      `UPDATE Students SET name = ?, standard = ?, feesPaid = ?, balance = ?, status = ?, concession = ?, photo = ?, parentName = ?, parentPhone = ?, studentPhone = ?, email = ?, address = ?, collegeId = ?, installments = ? WHERE id = ?`,
      [name, standard, feesPaid, balance, status, concession, photo, parentName, parentPhone, studentPhone, email, address, collegeId || null, installments || 1, id]
    );
    await db.run(`DELETE FROM StudentSubjects WHERE studentId = ?`, [id]);
    for (const subId of subjectIds) {
      await db.run(`INSERT INTO StudentSubjects (studentId, subjectId) VALUES (?, ?)`, [id, subId]);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete Student
app.delete('/api/students/:id', authenticate, async (req, res) => {
  const { id } = req.params;
  try {
    await db.run(`DELETE FROM Students WHERE id = ?`, [id]);
    await db.run(`DELETE FROM StudentSubjects WHERE studentId = ?`, [id]);
    await db.run(`DELETE FROM TestResults WHERE studentId = ?`, [id]);
    // NOTE: We intentionally retain their entries inside Fees (Left Joins handle rendering 'Deleted Student').
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Student Photo and Documents
app.post('/api/students/:id/upload-photo', authenticate, upload.single('photo'), async (req, res) => {
  const { id } = req.params;
  const photoUrl = `/uploads/${req.file.filename}`;
  try {
    await db.run(`UPDATE Students SET photo = ? WHERE id = ?`, [photoUrl, id]);
    res.json({ success: true, photoUrl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/students/:id/documents', authenticate, upload.single('file'), async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  const fileUrl = `/uploads/${req.file.filename}`;
  const date = new Date().toISOString().split('T')[0];
  try {
    await db.run(
      `INSERT INTO StudentDocuments (studentId, name, fileUrl, uploadDate) VALUES (?, ?, ?, ?)`,
      [id, name || req.file.originalname, fileUrl, date]
    );
    res.json({ success: true, fileUrl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/students/:id/documents', authenticate, async (req, res) => {
  const { id } = req.params;
  const docs = await db.all(`SELECT * FROM StudentDocuments WHERE studentId = ?`, [id]);
  res.json(docs);
});

// Student Performance (Test Scores over time)
app.get('/api/students/:id/performance', authenticate, async (req, res) => {
  const { id } = req.params;
  const performance = await db.all(`
    SELECT t.name as testName, t.date, tr.score, t.totalMarks
    FROM TestResults tr
    JOIN Tests t ON tr.testId = t.id
    WHERE tr.studentId = ?
    ORDER BY t.date ASC
  `, [id]);
  res.json(performance);
});

// Attendance Management
app.get('/api/attendance', authenticate, async (req, res) => {
  const { date } = req.query;
  const attendance = await db.all(`SELECT * FROM StudentAttendance WHERE date = ?`, [date]);
  res.json(attendance);
});

app.post('/api/attendance', authenticate, async (req, res) => {
  const { date, attendance } = req.body; // Array of { studentId, status }
  try {
    for (const entry of attendance) {
      await db.run(
        `INSERT INTO StudentAttendance (studentId, date, status) VALUES (?, ?, ?) 
         ON CONFLICT(studentId, date) DO UPDATE SET status = excluded.status`,
        [entry.studentId, date, entry.status]
      );
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/reports/attendance-stats', authenticate, async (req, res) => {
  const { studentId, startDate, endDate } = req.query;
  const query = `
    SELECT status, COUNT(*) as count 
    FROM StudentAttendance 
    WHERE studentId = ? AND date BETWEEN ? AND ? 
    GROUP BY status
  `;
  const stats = await db.all(query, [studentId, startDate, endDate]);
  res.json(stats);
});

// Subject-wise Attendance
app.get('/api/attendance/subject', authenticate, async (req, res) => {
  const { date, subjectId } = req.query;
  try {
    const attendance = await db.all(
      `SELECT * FROM StudentSubjectAttendance WHERE date = ? AND subjectId = ?`, 
      [date, subjectId]
    );
    res.json(attendance);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/attendance/subject', authenticate, async (req, res) => {
  const { date, subjectId, attendance } = req.body; // Array of { studentId, status }
  try {
    for (const entry of attendance) {
      await db.run(
        `INSERT INTO StudentSubjectAttendance (studentId, subjectId, date, status) VALUES (?, ?, ?, ?)
         ON CONFLICT(studentId, subjectId, date) DO UPDATE SET status = excluded.status`,
        [entry.studentId, subjectId, date, entry.status]
      );
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// New attendance report endpoints
app.get('/api/reports/attendance/student-monthly', authenticate, async (req, res) => {
  const { studentId, month } = req.query; // month as 'YYYY-MM'
  try {
    const student = await db.get(`SELECT name, standard FROM Students WHERE id = ?`, [studentId]);
    if (!student) return res.status(404).json({ error: 'Student not found' });

    const attendance = await db.all(`
      SELECT date, status 
      FROM StudentAttendance 
      WHERE studentId = ? AND date LIKE ? 
      ORDER BY date ASC
    `, [studentId, `${month}%`]);

    res.json({ student, attendance });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/reports/attendance/class-daily', authenticate, async (req, res) => {
  const { date, standard } = req.query;
  try {
    const classAttendance = await db.all(`
      SELECT s.id, s.name, COALESCE(sa.status, 'Not Marked') as status
      FROM Students s
      LEFT JOIN StudentAttendance sa ON s.id = sa.studentId AND sa.date = ?
      WHERE s.standard = ? AND s.status = 'Active'
      ORDER BY s.name ASC
    `, [date, standard]);

    res.json(classAttendance);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/reports/attendance/class-monthly', authenticate, async (req, res) => {
  const { month, standard } = req.query;
  try {
    // Get all dates in that month that have attendance records
    const dates = await db.all(`
      SELECT DISTINCT date 
      FROM StudentAttendance sa
      JOIN Students s ON sa.studentId = s.id
      WHERE sa.date LIKE ? AND s.standard = ?
      ORDER BY sa.date ASC
    `, [`${month}%`, standard]);

    // Get attendance stats per date
    const stats = [];
    for (const d of dates) {
      const counts = await db.get(`
        SELECT 
          SUM(CASE WHEN sa.status = 'Present' THEN 1 ELSE 0 END) as present,
          SUM(CASE WHEN sa.status = 'Absent' THEN 1 ELSE 0 END) as absent,
          SUM(CASE WHEN sa.status = 'No Class' THEN 1 ELSE 0 END) as noClass
        FROM StudentAttendance sa
        JOIN Students s ON sa.studentId = s.id
        WHERE sa.date = ? AND s.standard = ?
      `, [d.date, standard]);
      stats.push({ date: d.date, ...counts });
    }

    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/reports/attendance/subject-monthly', authenticate, async (req, res) => {
  const { month, subjectId } = req.query;
  try {
    const dates = await db.all(`
      SELECT DISTINCT date 
      FROM StudentSubjectAttendance 
      WHERE date LIKE ? AND subjectId = ?
      ORDER BY date ASC
    `, [`${month}%`, subjectId]);

    const stats = [];
    for (const d of dates) {
      const counts = await db.get(`
        SELECT 
          SUM(CASE WHEN status = 'Present' THEN 1 ELSE 0 END) as present,
          SUM(CASE WHEN status = 'Absent' THEN 1 ELSE 0 END) as absent,
          SUM(CASE WHEN status = 'Left Early' THEN 1 ELSE 0 END) as leftEarly,
          SUM(CASE WHEN status = 'No Class' THEN 1 ELSE 0 END) as noClass
        FROM StudentSubjectAttendance
        WHERE date = ? AND subjectId = ?
      `, [d.date, subjectId]);
      stats.push({ date: d.date, ...counts });
    }

    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Alerts & Messaging (MSG91 Integration)
app.post('/api/alerts/send', authenticate, async (req, res) => {
  const { studentId, recipient, message, type = 'SMS' } = req.body;
  const timestamp = new Date().toISOString();
  
  if (!recipient) {
    return res.status(400).json({ error: 'Recipient phone number is required' });
  }

  try {
    const authKey = process.env.MSG91_AUTH_KEY || 'YOUR_MSG91_AUTH_KEY'; 
    const senderId = process.env.MSG91_SENDER_ID || 'YSHSHR'; 
    
    // Clean to numeric string
    let formattedPhone = recipient.replace(/\D/g, ''); 
    // Indian standard 10 digit append country code automatically
    if (formattedPhone.length === 10) formattedPhone = '91' + formattedPhone;
    
    // Fast native Node.js fetch call
    const msg91Response = await fetch('https://api.msg91.com/api/v2/sendsms', {
      method: 'POST',
      headers: {
        'authkey': authKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        sender: senderId,
        route: "4", // Route 4 is usually Transactional
        country: "91",
        sms: [
          {
            message: message,
            to: [formattedPhone]
          }
        ]
      })
    });

    const result = await msg91Response.json();

    if (result.type === 'success' || msg91Response.ok) {
      await db.run(
        `INSERT INTO MessageLog (studentId, recipient, message, type, status, timestamp) VALUES (?, ?, ?, ?, ?, ?)`,
        [studentId, recipient, message, type, 'Sent', timestamp]
      );
      res.json({ success: true, message: 'Message securely delivered via MSG91 API!' });
    } else {
      throw new Error(result.message || "Gateway rejection: MSG91 Failed validation.");
    }
  } catch (err) {
    await db.run(
      `INSERT INTO MessageLog (studentId, recipient, message, type, status, timestamp) VALUES (?, ?, ?, ?, ?, ?)`,
      [studentId, recipient, message, type, 'Failed', timestamp]
    );
    res.status(500).json({ error: 'Message failed to send. Check server logs or API key.' });
    console.error("MSG91 Error: ", err);
  }
});

app.get('/api/alerts/history', authenticate, async (req, res) => {
  const history = await db.all(`
    SELECT ml.*, s.name as studentName 
    FROM MessageLog ml 
    LEFT JOIN Students s ON ml.studentId = s.id 
    ORDER BY ml.id DESC LIMIT 50
  `);
  res.json(history);
});

// Delete Student
app.delete('/api/students/:id', authenticate, async (req, res) => {
  const { id } = req.params;
  try {
    await db.run(`DELETE FROM Students WHERE id = ?`, [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update Teacher
app.put('/api/teachers/:id', authenticate, async (req, res) => {
  const { id } = req.params;
  const { name, subject, totalShare } = req.body;
  try {
    await db.run(
      `UPDATE Teachers SET name = ?, subject = ?, totalShare = ? WHERE id = ?`,
      [name, subject, totalShare, id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete Teacher
app.delete('/api/teachers/:id', authenticate, async (req, res) => {
  const { id } = req.params;
  try {
    await db.run(`DELETE FROM Teachers WHERE id = ?`, [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Teacher Finance Management
app.get('/api/teachers/:id/finance', authenticate, async (req, res) => {
  const { id } = req.params;
  try {
    const teacher = await db.get(`SELECT * FROM Teachers WHERE id = ?`, [id]);
    const shares = await db.all(`SELECT * FROM TeacherShares WHERE teacherId = ? ORDER BY date DESC`, [id]);
    const payments = await db.all(`SELECT * FROM TeacherPayments WHERE teacherId = ? ORDER BY date DESC`, [id]);
    
    const totalEarned = shares.reduce((sum, s) => sum + s.amount, 0);
    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
    
    res.json({
      teacher,
      shares,
      payments,
      summary: {
        totalEarned,
        totalPaid,
        balance: totalEarned - totalPaid
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/teachers/:id/shares', authenticate, async (req, res) => {
  const { id } = req.params;
  const { description, amount, date } = req.body;
  try {
    await db.run(
      `INSERT INTO TeacherShares (teacherId, description, amount, date) VALUES (?, ?, ?, ?)`,
      [id, description, amount, date]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/teachers/:id/payments', authenticate, async (req, res) => {
  const { id } = req.params;
  const { amount, date, paymentMode, remarks } = req.body;
  try {
    await db.run(
      `INSERT INTO TeacherPayments (teacherId, amount, date, paymentMode, remarks) VALUES (?, ?, ?, ?, ?)`,
      [id, amount, date, paymentMode, remarks]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/reports/teacher-finance-summary', authenticate, async (req, res) => {
  const { startDate, endDate } = req.query;
  try {
    const teachers = await db.all(`SELECT id, name, subject FROM Teachers`);
    const summary = [];
    for (const t of teachers) {
      let earnedQuery = `SELECT SUM(amount) as sum FROM TeacherShares WHERE teacherId = ?`;
      let paidQuery = `SELECT SUM(amount) as sum FROM TeacherPayments WHERE teacherId = ?`;
      const params = [t.id];

      if (startDate && endDate) {
        earnedQuery += ` AND date BETWEEN ? AND ?`;
        paidQuery += ` AND date BETWEEN ? AND ?`;
        params.push(startDate, endDate);
      }

      const earned = await db.get(earnedQuery, params);
      const paid = await db.get(paidQuery, params);
      
      summary.push({
        ...t,
        totalEarned: earned.sum || 0,
        totalPaid: paid.sum || 0,
        balance: (earned.sum || 0) - (paid.sum || 0)
      });
    }
    res.json(summary);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Database Reset (Clear All Records)
app.post('/api/settings/reset', authenticate, async (req, res) => {
  try {
    await db.run(`DELETE FROM Students`);
    await db.run(`DELETE FROM Teachers`);
    await db.run(`DELETE FROM Fees`);
    res.json({ success: true, message: 'All data has been wiped from the database.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/system/ping', authenticate, (req, res) => {
  res.json({ ok: true });
});

app.get('/api/system/sessions', authenticate, async (req, res) => {
  try {
    await db.run(`DELETE FROM ActiveSessions WHERE datetime(lastSeen) <= datetime('now', '-7 days')`);
    const sessions = await db.all(`SELECT * FROM ActiveSessions ORDER BY lastSeen DESC`);
    res.json(sessions);
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

// Holiday & Academic Calendar Management
app.get('/api/holidays', authenticate, async (req, res) => {
  try {
    const holidays = await db.all(`SELECT * FROM Holidays ORDER BY date ASC`);
    res.json(holidays);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/holidays', authenticate, async (req, res) => {
  const { date, description, type } = req.body;
  try {
    await db.run(
      `INSERT INTO Holidays (date, description, type) VALUES (?, ?, ?)
       ON CONFLICT(date) DO UPDATE SET description = excluded.description, type = excluded.type`,
      [date, description, type || 'Holiday']
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/holidays/:id', authenticate, async (req, res) => {
  const { id } = req.params;
  try {
    await db.run(`DELETE FROM Holidays WHERE id = ?`, [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/working-days', authenticate, async (req, res) => {
  try {
    const wd = await db.all(`SELECT * FROM WorkingDays ORDER BY month ASC`);
    res.json(wd);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/working-days', authenticate, async (req, res) => {
  const { month, days } = req.body;
  try {
    await db.run(
      `INSERT INTO WorkingDays (month, days) VALUES (?, ?)
       ON CONFLICT(month) DO UPDATE SET days = excluded.days`,
      [month, days]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

async function startServer() {
  try {
    db = await initializeDatabase();
    app.post('/api/settings/password', authenticate, async (req, res) => {
      const { currentPassword, newPassword } = req.body;
      
      try {
        const user = await db.get(`SELECT * FROM Users WHERE username = 'admin'`);
        if (user.password !== currentPassword) {
          return res.status(401).json({ error: 'Incorrect current password' });
        }
    
        await db.run(`UPDATE Users SET password = ? WHERE username = 'admin'`, [newPassword]);
        res.json({ success: true, message: 'Password updated successfully' });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });
    app.listen(5000, () => {
      console.log('Backend API running on http://localhost:5000');
    });
  } catch (e) {
    console.error('Failed to start server:', e);
  }
}

startServer();
