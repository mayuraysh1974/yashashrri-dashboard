import React, { useState, useEffect } from 'react';
import { FiPlus, FiCalendar, FiBook, FiUsers, FiX, FiCheckCircle, FiBell, FiEdit2, FiTrash2 } from 'react-icons/fi';
import { supabase } from '../supabaseClient';

const TestScheduler = () => {
  const [tests, setTests] = useState([]);
  const [standards, setStandards] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [activeTest, setActiveTest] = useState(null);
  const [studentResults, setStudentResults] = useState([]);
  const [formData, setFormData] = useState({ name: '', subject: '', standards: [], totalMarks: 50, date: new Date().toISOString().split('T')[0] });
  const [solutionFile, setSolutionFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [activeTestId, setActiveTestId] = useState(null);

  useEffect(() => {
    fetchTests();
    fetchStandards();
    fetchSubjects();
  }, []);

  const fetchTests = async () => {
    const { data } = await supabase.from('tests').select('*').order('date', { ascending: false });
    setTests(data || []);
    setLoading(false);
  };

  const fetchStandards = async () => {
    const { data } = await supabase.from('standards').select('*').order('standard', { ascending: true });
    setStandards(data || []);
  };

  const fetchSubjects = async () => {
    const { data } = await supabase.from('subjects').select('*').order('name', { ascending: true });
    setSubjects(data || []);
  };
  const handleCreateTest = async () => {
    if (!formData.name || formData.standards.length === 0 || !formData.subject) {
      return alert('Please fill in Test Name, Subject, and select at least one Standard.');
    }

    setUploading(true);
    let solutionUrl = '';

    if (solutionFile) {
      const fileExt = solutionFile.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `test_solutions/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('solutions')
        .upload(filePath, solutionFile);

      if (uploadError) {
        setUploading(false);
        return alert('Error uploading solution: ' + uploadError.message);
      }

      const { data: { publicUrl } } = supabase.storage
        .from('solutions')
        .getPublicUrl(filePath);
      
      solutionUrl = publicUrl;
    }

    const testData = {
      name: formData.name,
      subject: formData.subject,
      standards: formData.standards,
      total_marks: formData.totalMarks,
      date: formData.date
    };

    if (solutionUrl) {
      testData.solution_url = solutionUrl;
    }

    let error;
    if (editMode && activeTestId) {
      const { error: err } = await supabase.from('tests').update(testData).eq('id', activeTestId);
      error = err;
    } else {
      const { error: err } = await supabase.from('tests').insert(testData);
      error = err;
    }

    setUploading(false);
    
    if (!error) {
      setShowModal(false);
      setEditMode(false);
      setActiveTestId(null);
      setFormData({ name: '', subject: '', standards: [], totalMarks: 50, date: new Date().toISOString().split('T')[0] });
      setSolutionFile(null);
      fetchTests();
    } else {
      alert('Action failed: ' + error.message);
    }
  };

  const handleDeleteTest = async (testId) => {
    if (!window.confirm('Are you sure you want to delete this test? This will also remove all recorded marks for this test.')) return;
    
    const { error } = await supabase.from('tests').delete().eq('id', testId);
    if (!error) {
      fetchTests();
    } else {
      alert('Delete failed: ' + error.message);
    }
  };

  const openEditModal = (test) => {
    setActiveTest(test);
    setActiveTestId(test.id);
    setFormData({
      name: test.name,
      subject: test.subject,
      standards: test.standards || [test.standard],
      totalMarks: test.total_marks || test.totalMarks,
      date: test.date
    });
    setEditMode(true);
    setShowModal(true);
  };

  const sendTestAlert = async (test) => {
    const { data: allStudents } = await supabase.from('students').select('*').in('standard', test.standards || [test.standard]);
    const targetStudents = allStudents || [];

    if (targetStudents.length === 0) return alert('No students found in selected standards to notify.');
    if (!window.confirm(`Log test alerts for ${targetStudents.length} students/parents?`)) return;

    for (const student of targetStudents) {
      const message = `Upcoming Test Alert: ${test.name} (${test.subject}) is scheduled for ${test.date}. Total Marks: ${test.total_marks || test.totalMarks}. Please prepare well! - Yashashrri Classes`;
      if (student.parent_phone || student.parentPhone) {
        await supabase.from('message_log').insert({
          student_id: student.id,
          student_name: student.name,
          recipient: student.parent_phone || student.parentPhone,
          message,
          type: 'SMS',
          status: 'Simulated'
        });
      }
    }
    alert('Test schedule alerts logged successfully.');
  };

  const openResultEntry = async (test) => {
    setActiveTest(test);
    // Fetch students from all standards associated with this test
    const { data: allStudents } = await supabase.from('students').select('*').in('standard', test.standards || [test.standard]);
    const standardStudents = allStudents || [];

    const { data: existingResults } = await supabase.from('test_results').select('*').eq('test_id', test.id);
    const existing = existingResults || [];

    const resultState = standardStudents.map(s => {
      const found = existing.find(r => r.student_id === s.id);
      return { studentId: s.id, studentName: s.name, standard: s.standard, score: found ? found.score : '' };
    });

    setStudentResults(resultState);
    setShowResultModal(true);
  };

  const handleSaveResults = async () => {
    const upserts = studentResults
      .filter(r => r.score !== '')
      .map(r => ({ test_id: activeTest.id, student_id: r.studentId, score: Number(r.score) }));

    if (upserts.length === 0) return alert('No marks entered.');
    const { error } = await supabase.from('test_results').upsert(upserts, { onConflict: 'test_id,student_id' });
    if (!error) {
      alert('Marks updated successfully!');
      setShowResultModal(false);
    } else {
      alert('Failed to save marks: ' + error.message);
    }
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Test Scheduler & Alerts</h1>
          <p className="page-subtitle">Manage upcoming exams and notify students/parents of schedules</p>
        </div>
        <button className="btn-primary" onClick={() => { setEditMode(false); setFormData({ name: '', subject: '', standards: [], totalMarks: 50, date: new Date().toISOString().split('T')[0] }); setSolutionFile(null); setShowModal(true); }}>
          <FiPlus /> New Test
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '2rem' }}>
        {loading ? (
             <p>Loading scheduled tests...</p>
        ) : tests.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', gridColumn: '1/-1', textAlign: 'center', padding: '3rem' }}>No tests scheduled yet. Click 'New Test' to create one.</p>
        ) : tests.map(test => (
          <div key={test.id} className="card-base" style={{ padding: '2rem', position: 'relative', display: 'flex', flexDirection: 'column' }}>
            <div style={{ position: 'absolute', top: '1rem', right: '1rem', display: 'flex', gap: '0.5rem' }}>
               <button className="btn-secondary" style={{ padding: '0.4rem', border: '1px solid var(--border-color)', borderRadius: '50%' }} onClick={() => sendTestAlert(test)} title="Send Alert">
                 <FiBell size={14} color="var(--primary-blue)" />
               </button>
               <button className="btn-secondary" style={{ padding: '0.4rem', border: '1px solid var(--border-color)', borderRadius: '50%' }} onClick={() => openEditModal(test)} title="Edit Test">
                 <FiEdit2 size={14} color="var(--primary-blue)" />
               </button>
               <button className="btn-secondary" style={{ padding: '0.4rem', border: '1px solid var(--border-color)', borderRadius: '50%', color: '#EF4444' }} onClick={() => handleDeleteTest(test.id)} title="Delete Test">
                 <FiTrash2 size={14} />
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
                <FiUsers /> For: {(test.standards || [test.standard]).join(', ')}
              </div>
               <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Max Score: <span style={{ fontWeight: 800, color: 'var(--text-primary)' }}>{test.total_marks || test.totalMarks}</span></div>
               {test.solution_url && (
                 <div style={{ marginTop: '0.5rem' }}>
                   <a href={test.solution_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.85rem', color: 'var(--accent-gold)', textDecoration: 'none', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                     <FiBook /> View Solution PDF
                   </a>
                 </div>
               )}
             </div>

            <button className="btn-secondary" style={{ width: '100%', marginTop: 'auto' }} onClick={() => openResultEntry(test)}>
              <FiCheckCircle /> Record Marks
            </button>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="card-base" style={{ width: '100%', maxWidth: '500px', padding: '2rem', borderTop: '4px solid var(--accent-gold)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '1.5rem', color: 'var(--primary-blue)' }}>{editMode ? 'Edit Scheduled Test' : 'Schedule New Test'}</h2>
              <button onClick={() => { setShowModal(false); setEditMode(false); }} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}><FiX size={24} /></button>
            </div>
            
            <div className="input-group">
              <label>Test Name</label>
              <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. Unit Test 1" />
            </div>

            <div className="input-group">
                <label>Subject</label>
                <select value={formData.subject} onChange={e => setFormData({...formData, subject: e.target.value})}>
                  <option value="">Select subject</option>
                  {subjects.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                </select>
            </div>

            <div className="input-group">
                <label>Target standards (Select multiple if applicable)</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', padding: '1rem', backgroundColor: 'var(--bg-main)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  {standards.map(s => (
                    <label key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', cursor: 'pointer' }}>
                      <input 
                        type="checkbox" 
                        checked={formData.standards.includes(s.standard)} 
                        onChange={(e) => {
                          const newStandards = e.target.checked 
                            ? [...formData.standards, s.standard]
                            : formData.standards.filter(item => item !== s.standard);
                          setFormData({...formData, standards: newStandards});
                        }} 
                      />
                      {s.standard}
                    </label>
                  ))}
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem', marginTop: '1.5rem' }}>
               <div className="input-group">
                 <label>Total Marks</label>
                 <input type="number" value={formData.totalMarks} onChange={e => setFormData({...formData, totalMarks: Number(e.target.value)})} />
               </div>
               <div className="input-group">
                 <label>Test Date</label>
                 <input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
               </div>
             </div>

             <div className="input-group" style={{ marginBottom: '2rem' }}>
               <label>Solution PDF (Optional)</label>
               <input type="file" accept="application/pdf" onChange={e => setSolutionFile(e.target.files[0])} style={{ padding: '0.5rem' }} />
               <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Upload solution for students to access online.</p>
             </div>

             <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
               <button className="btn-secondary" onClick={() => setShowModal(false)} disabled={uploading}>Cancel</button>
               <button className="btn-primary" style={{ padding: '0.75rem 2rem' }} onClick={handleCreateTest} disabled={uploading}>
                 {uploading ? 'Processing...' : (editMode ? 'Update Test Schedule' : 'Schedule Test')}
              </button>
            </div>
          </div>
        </div>
      )}

      {showResultModal && (
        <div className="modal-overlay">
          <div className="card-base" style={{ width: '100%', maxWidth: '600px', padding: '1.5rem', backgroundColor: 'var(--bg-surface)' }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', color: 'var(--primary-blue)' }}>Record Marks: {activeTest?.name}</h2>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{(activeTest?.standards || [activeTest?.standard]).join(', ')} | Max Score: {activeTest?.total_marks || activeTest?.totalMarks}</p>
              </div>
              <button onClick={() => setShowResultModal(false)} style={{ background: 'transparent' }}><FiX size={24} /></button>
            </div>

            <div style={{ maxHeight: '400px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '1rem', backgroundColor: 'var(--bg-main)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                    <th style={{ padding: '0.75rem', fontSize: '0.85rem' }}>Student Name</th>
                    <th style={{ padding: '0.75rem', fontSize: '0.85rem' }}>Class</th>
                    <th style={{ padding: '0.75rem', fontSize: '0.85rem', textAlign: 'right' }}>Score Obtained</th>
                  </tr>
                </thead>
                <tbody>
                  {studentResults.map((res, index) => (
                    <tr key={res.studentId} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '0.75rem', fontSize: '0.9rem', fontWeight: 600 }}>{res.studentName}</td>
                      <td style={{ padding: '0.75rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{res.standard}</td>
                      <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                        <input 
                          type="number" 
                          max={activeTest?.total_marks || activeTest?.totalMarks}
                          value={res.score} 
                          onChange={(e) => {
                             const newList = [...studentResults];
                             newList[index].score = Number(e.target.value);
                             setStudentResults(newList);
                          }}
                          style={{ width: '80px', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)', textAlign: 'center' }}
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
