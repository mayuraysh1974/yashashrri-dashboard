import React, { useState, useEffect } from 'react';
import { FiPlus, FiCalendar, FiBook, FiUsers, FiX, FiCheckCircle, FiSend, FiBell } from 'react-icons/fi';

const TestScheduler = () => {
  const [tests, setTests] = useState([]);
  const [standards, setStandards] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [activeTest, setActiveTest] = useState(null);
  const [studentResults, setStudentResults] = useState([]);
  const [formData, setFormData] = useState({ name: '', subject: '', standard: '', totalMarks: 50, date: new Date().toISOString().split('T')[0] });

  useEffect(() => {
    fetchTests();
    fetchStandards();
    fetchSubjects();
  }, []);

  const fetchTests = async () => {
    const token = localStorage.getItem('token');
    const res = await fetch('/api/tests', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) setTests(await res.json());
    setLoading(false);
  };

  const fetchStandards = async () => {
    const token = localStorage.getItem('token');
    const res = await fetch('/api/standards', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) setStandards(await res.json());
  };

  const fetchSubjects = async () => {
    const token = localStorage.getItem('token');
    const res = await fetch('/api/subjects', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) setSubjects(await res.json());
  };

  const handleCreateTest = async () => {
    const token = localStorage.getItem('token');
    const res = await fetch('/api/tests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(formData)
    });
    if (res.ok) {
      setShowModal(false);
      fetchTests();
    }
  };

  const sendTestAlert = async (test) => {
    const token = localStorage.getItem('token');
    const sRes = await fetch(`/api/students`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const allStudents = await sRes.json();
    const targetStudents = allStudents.filter(s => s.standard === test.standard);

    if (targetStudents.length === 0) return alert('No students found in this standard to notify.');

    if (!window.confirm(`Send test alerts to ${targetStudents.length} students/parents?`)) return;

    for (const student of targetStudents) {
      const message = `Upcoming Test Alert: ${test.name} (${test.subject}) is scheduled for ${test.date}. Total Marks: ${test.totalMarks}. Please prepare well! - Yashashrri Classes`;
      
      // Target parent
      if (student.parentPhone) {
        await fetch('/api/alerts/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ studentId: student.id, recipient: student.parentPhone, message, type: 'SMS' })
        });
      }
      // Target student
      if (student.studentPhone) {
        await fetch('/api/alerts/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ studentId: student.id, recipient: student.studentPhone, message, type: 'SMS' })
        });
      }
    }
    alert('Test schedule alerts simulated and logged successfully.');
  };

  const openResultEntry = async (test) => {
    setActiveTest(test);
    const token = localStorage.getItem('token');
    const sRes = await fetch(`/api/students`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const allStudents = await sRes.json();
    const standardStudents = allStudents.filter(s => s.standard === test.standard);

    const rRes = await fetch(`/api/tests/${test.id}/results`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const existingResults = await rRes.json();

    const resultState = standardStudents.map(s => {
      const found = existingResults.find(r => r.studentId === s.id);
      return { studentId: s.id, studentName: s.name, score: found ? found.score : '' };
    });

    setStudentResults(resultState);
    setShowResultModal(true);
  };

  const handleSaveResults = async () => {
    const token = localStorage.getItem('token');
    const res = await fetch(`/api/tests/${activeTest.id}/results`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ results: studentResults })
    });
    if (res.ok) {
      alert('Marks updated successfully!');
      setShowResultModal(false);
    }
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Test Scheduler & Alerts</h1>
          <p className="page-subtitle">Manage upcoming exams and notify students/parents of schedules</p>
        </div>
        <button className="btn-primary" onClick={() => setShowModal(true)}>
          <FiPlus /> New Test
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '2rem' }}>
        {loading ? (
             <p>Loading scheduled tests...</p>
        ) : tests.map(test => (
          <div key={test.id} className="card-base" style={{ padding: '2rem', position: 'relative', display: 'flex', flexDirection: 'column' }}>
            <div style={{ position: 'absolute', top: '1rem', right: '1rem' }}>
               <button className="btn-secondary" style={{ padding: '0.4rem', border: '1px solid var(--border-color)', borderRadius: '50%' }} onClick={() => sendTestAlert(test)} title="Send Alert">
                 <FiBell size={14} color="var(--primary-blue)" />
               </button>
            </div>
            
            <div style={{ marginBottom: '1.5rem' }}>
               <h3 style={{ fontSize: '1.25rem', color: 'var(--primary-blue)', marginBottom: '0.25rem' }}>{test.name}</h3>
               <p style={{ color: 'var(--accent-gold)', fontWeight: 700, fontSize: '0.9rem' }}><FiCalendar /> {test.date}</p>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2rem', backgroundColor: 'var(--bg-main)', padding: '1rem', borderRadius: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                <FiBook /> {test.subject}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                <FiUsers /> For {test.standard}
              </div>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Max Score: <span style={{ fontWeight: 800, color: 'var(--text-primary)' }}>{test.totalMarks}</span></div>
            </div>

            <button className="btn-secondary" style={{ width: '100%', marginTop: 'auto' }} onClick={() => openResultEntry(test)}>
              <FiCheckCircle /> Record Marks
            </button>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="card-base" style={{ width: '100%', maxWidth: '450px', padding: '2rem', borderTop: '4px solid var(--accent-gold)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '1.5rem', color: 'var(--primary-blue)' }}>Schedule New Test</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'transparent' }}><FiX size={24} /></button>
            </div>
            
            <div className="input-group">
              <label>Test Name</label>
              <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. Unit Test 1" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              <div className="input-group">
                <label>Subject</label>
                <select value={formData.subject} onChange={e => setFormData({...formData, subject: e.target.value})}>
                  <option value="">Select subject</option>
                  {subjects.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                </select>
              </div>
              <div className="input-group">
                <label>Standard</label>
                <select value={formData.standard} onChange={e => setFormData({...formData, standard: e.target.value})}>
                  <option value="">Select standard</option>
                  {standards.map(s => <option key={s.id} value={s.standard}>{s.standard}</option>)}
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
              <div className="input-group">
                <label>Total Marks</label>
                <input type="number" value={formData.totalMarks} onChange={e => setFormData({...formData, totalMarks: Number(e.target.value)})} />
              </div>
              <div className="input-group">
                <label>Test Date</label>
                <input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
              <button className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn-primary" style={{ padding: '0.75rem 2rem' }} onClick={handleCreateTest}>Create Test</button>
            </div>
          </div>
        </div>
      )}

      {/* Result Entry Modal... same as before */}
      {showResultModal && (
        <div className="modal-overlay">
          <div className="card-base" style={{ width: '100%', maxWidth: '600px', padding: '1.5rem', backgroundColor: 'var(--bg-surface)' }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', color: 'var(--primary-blue)' }}>Record Marks: {activeTest?.name}</h2>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{activeTest?.standard} | Max Score: {activeTest?.totalMarks}</p>
              </div>
              <button onClick={() => setShowResultModal(false)} style={{ background: 'transparent' }}><FiX size={24} /></button>
            </div>

            <div style={{ maxHeight: '400px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '1rem', backgroundColor: 'var(--bg-main)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                    <th style={{ padding: '0.75rem', fontSize: '0.85rem' }}>Student Name</th>
                    <th style={{ padding: '0.75rem', fontSize: '0.85rem', textAlign: 'right' }}>Score Obtained</th>
                  </tr>
                </thead>
                <tbody>
                  {studentResults.map((res, index) => (
                    <tr key={res.studentId} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '0.75rem', fontSize: '0.9rem', fontWeight: 600 }}>{res.studentName}</td>
                      <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                        <input 
                          type="number" 
                          max={activeTest.totalMarks}
                          value={res.score} 
                          onChange={(e) => {
                             const newList = [...studentResults];
                             newList[index].score = Number(e.target.value);
                             setStudentResults(newList);
                          }}
                          style={{ width: '100px', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)', textAlign: 'center' }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem' }}>
              <button className="btn-secondary" onClick={() => setShowResultModal(false)}>Discard</button>
              <button className="btn-primary" onClick={handleSaveResults}>Save All Marks</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TestScheduler;
