import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { FiCheckCircle, FiXCircle, FiCalendar, FiFilter, FiSave, FiSend, FiBook, FiUserCheck } from 'react-icons/fi';

const AttendanceRegistry = () => {
  const [students, setStudents] = useState([]);
  const [standards, setStandards] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [dailyAttendance, setDailyAttendance] = useState({}); 
  const [subjectAttendance, setSubjectAttendance] = useState({}); 
  const [selectedStandard, setSelectedStandard] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [mode, setMode] = useState('Daily'); 
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (selectedDate) fetchAttendanceRecord();
  }, [selectedDate, selectedStandard, selectedSubject, mode]);

  const fetchInitialData = async () => {
    const [stdRes, stuRes, subRes] = await Promise.all([
      supabase.from('standards').select('*'),
      supabase.from('students').select('*, student_subjects(subject_id)'),
      supabase.from('subjects').select('*')
    ]);
    
    if (stdRes.data) setStandards(stdRes.data);
    if (stuRes.data) setStudents(stuRes.data);
    if (subRes.data) setSubjects(subRes.data);
    setLoading(false);
  };

  const fetchAttendanceRecord = async () => {
    // Fetch daily record
    const { data: dData } = await supabase
      .from('student_attendance')
      .select('student_id, status')
      .eq('date', selectedDate);

    let dMap = {};
    if (dData) {
      dData.forEach(e => dMap[e.student_id] = e.status);
      setDailyAttendance(dMap);
    }

    if (mode === 'Subject' && selectedSubject) {
      const { data: sData } = await supabase
        .from('student_subject_attendance')
        .select('student_id, status')
        .eq('date', selectedDate)
        .eq('subject_id', selectedSubject);
      
      if (sData) {
        const sMap = {};
        sData.forEach(e => sMap[e.student_id] = e.status);
        setSubjectAttendance(sMap);
      }
    }
  };

  const handleStatusChange = (studentId, status) => {
    if (mode === 'Daily') {
      setDailyAttendance({ ...dailyAttendance, [studentId]: status });
    } else {
      setSubjectAttendance({ ...subjectAttendance, [studentId]: status });
    }
  };

  const [searchTerm, setSearchTerm] = useState('');

  // Logic to determine what list to show
  let displayedStudents = students;
  if (selectedStandard) {
    displayedStudents = displayedStudents.filter(s => s.standard === selectedStandard);
  }
  if (mode === 'Subject' && selectedSubject) {
    displayedStudents = displayedStudents.filter(s => 
      s.student_subjects?.some(sub => Number(sub.subject_id) === Number(selectedSubject))
    );
  }

  // Apply search filtering
  if (searchTerm) {
    displayedStudents = displayedStudents.filter(s => 
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      s.id.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }

  const getEffectiveStatus = (studentId) => {
    if (mode === 'Daily') return dailyAttendance[studentId];
    if (subjectAttendance[studentId]) return subjectAttendance[studentId];
    // Fallback to daily presence (Inheritance)
    return dailyAttendance[studentId] === 'Present' ? 'Present' : dailyAttendance[studentId];
  };

  const handleSave = async () => {
    const table = mode === 'Daily' ? 'student_attendance' : 'student_subject_attendance';
    
    const records = displayedStudents.map(s => {
      const record = {
        student_id: s.id,
        date: selectedDate,
        status: getEffectiveStatus(s.id) || 'Absent'
      };
      if (mode === 'Subject') record.subject_id = selectedSubject;
      return record;
    });

    if (mode === 'Subject' && !selectedSubject) return alert('Please select a subject first.');

    const { error } = await supabase
      .from(table)
      .upsert(records, { onConflict: mode === 'Daily' ? 'student_id, date' : 'student_id, subject_id, date' });
    
    if (error) {
      alert('Error saving attendance: ' + error.message);
    } else {
      alert('Attendance saved successfully!');
    }
  };

  const markAllEnrolledPresent = () => {
    if (mode === 'Subject') {
      if (!selectedSubject) return alert('Select a subject first');
      const newAtt = { ...subjectAttendance };
      displayedStudents.forEach(s => {
         newAtt[s.id] = 'Present';
      });
      setSubjectAttendance(newAtt);
    } else {
      const newAtt = { ...dailyAttendance };
      displayedStudents.forEach(s => {
         newAtt[s.id] = 'Present';
      });
      setDailyAttendance(newAtt);
    }
  };

  const notifyAbsentees = async () => {
    const absentees = displayedStudents.filter(s => getEffectiveStatus(s.id) === 'Absent' && (s.parent_phone || s.parentPhone));
    
    if (absentees.length === 0) return alert('No absent students with parent contacts found.');
    if (!window.confirm(`Log absence alerts for ${absentees.length} parents?`)) return;

    const inserts = absentees.map(student => {
      const msgHeader = mode === 'Daily' ? 'marked ABSENT for today' : `missed the ${subjects.find(s => s.id == selectedSubject)?.name} lecture`;
      const message = `Dear Parent, your child ${student.name} was ${msgHeader} (${selectedDate}). - Yashashrri Classes`;
      return {
        student_id: student.id,
        student_name: student.name,
        recipient: student.parent_phone || student.parentPhone,
        message,
        type: 'SMS',
        status: 'Simulated'
      };
    });

    const { error } = await supabase.from('message_log').insert(inserts);
    if (error) {
      alert('Failed to log alerts: ' + error.message);
    } else {
      alert(`${absentees.length} absence alerts logged successfully.`);
    }
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="page-header animate-in">
        <div>
          <h1 className="page-title">{mode === 'Daily' ? 'Daily Attendance' : 'Subject-wise Attendance'}</h1>
          <p className="page-subtitle">Academic registry and lecture-level tracking</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <div className="mode-toggle-compact" style={{ display: 'flex', backgroundColor: '#F1F5F9', padding: '3px', borderRadius: '8px', border: '1px solid var(--border-color)', height: '42px' }}>
              <button 
                onClick={() => setMode('Daily')}
                style={{ padding: '0 12px', borderRadius: '6px', border: 'none', cursor: 'pointer', background: mode === 'Daily' ? 'var(--primary-blue)' : 'transparent', color: mode === 'Daily' ? 'white' : 'var(--text-secondary)', fontWeight: 700, fontSize: '0.75rem' }}
              >Daily</button>
              <button 
                onClick={() => setMode('Subject')}
                style={{ padding: '0 12px', borderRadius: '6px', border: 'none', cursor: 'pointer', background: mode === 'Subject' ? 'var(--primary-blue)' : 'transparent', color: mode === 'Subject' ? 'white' : 'var(--text-secondary)', fontWeight: 700, fontSize: '0.75rem' }}
              >Subject</button>
          </div>
          <button className="btn-secondary" onClick={notifyAbsentees} style={{ color: 'var(--danger-red)', padding: '0 15px', height: '42px' }}><FiSend /> Notify</button>
          <button className="btn-primary" onClick={handleSave} style={{ padding: '0 15px', height: '42px' }}><FiSave /> Save</button>
        </div>
      </div>

      <div className="card-base animate-in" style={{ padding: '1rem', marginBottom: '1rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem' }}>
          <div className="input-group" style={{ marginBottom: 0 }}>
            <label style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}><FiCalendar /> Date</label>
            <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} style={{ height: '40px', fontSize: '0.9rem' }} />
          </div>
          <div className="input-group" style={{ marginBottom: 0 }}>
            <label style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}><FiFilter /> Class</label>
            <select value={selectedStandard} onChange={e => setSelectedStandard(e.target.value)} style={{ height: '40px', fontSize: '0.9rem' }}>
              <option value="">All Classes</option>
              {standards.map(s => <option key={s.id} value={s.standard}>{s.standard}</option>)}
            </select>
          </div>
          {mode === 'Subject' && (
            <div className="input-group" style={{ marginBottom: 0 }}>
              <label style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}><FiBook /> Subject</label>
              <select value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)} style={{ height: '40px', fontSize: '0.9rem' }}>
                <option value="">Choose Subject...</option>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          )}
          <div className="input-group" style={{ marginBottom: 0, gridColumn: mode === 'Subject' ? 'span 1' : 'span 1' }}>
            <label style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}><FiUserCheck /> Search</label>
            <input 
              type="text" 
              placeholder="Name or ID..." 
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)} 
              style={{ height: '40px', fontSize: '0.9rem' }}
            />
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
          <button className="btn-secondary" onClick={markAllEnrolledPresent} style={{ flex: 1, padding: '0.5rem', fontSize: '0.75rem', height: '38px' }}><FiUserCheck /> Mark All Present</button>
          {mode === 'Subject' && (
            <button className="btn-secondary" onClick={() => {
              const newAtt = { ...subjectAttendance };
              displayedStudents.forEach(s => newAtt[s.id] = 'No Class');
              setSubjectAttendance(newAtt);
            }} disabled={!selectedSubject} style={{ flex: 1, padding: '0.5rem', fontSize: '0.75rem', height: '38px' }}><FiXCircle /> No Class Today</button>
          )}
        </div>
      </div>

      <div className="card-base" style={{ flex: 1, overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ position: 'sticky', top: 0, backgroundColor: 'var(--bg-surface)', zIndex: 1 }}>
            <tr style={{ textAlign: 'left', borderBottom: '2px solid var(--border-color)' }}>
              <th style={{ padding: '1rem' }}>Student Profile</th>
              <th style={{ padding: '1rem', textAlign: 'center' }}>Attendance Status</th>
            </tr>
          </thead>
          <tbody>
            {(mode === 'Subject' && !selectedSubject) ? (
              <tr><td colSpan="2" style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>Select a subject to filter enrolled students.</td></tr>
            ) : displayedStudents.length === 0 ? (
              <tr><td colSpan="2" style={{ padding: '2rem', textAlign: 'center' }}>No students found for this selection. Ensure students are assigned this subject in their profile.</td></tr>
            ) : displayedStudents.map(student => {
              const status = getEffectiveStatus(student.id);

              return (
                <tr key={student.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '1rem' }}>
                     <div style={{ fontWeight: 600 }}>{student.name}</div>
                     <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>ID: {student.id} | {student.standard}</div>
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'right' }}>
                     <div className="status-toggle-pill" style={{ display: 'inline-flex', gap: '2px', backgroundColor: '#F1F5F9', padding: '3px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                        <button 
                          onClick={() => handleStatusChange(student.id, 'Present')}
                          style={{ 
                            padding: '0.5rem 12px', fontSize: '0.75rem', borderRadius: '6px', fontWeight: 800,
                            backgroundColor: status === 'Present' ? 'var(--success-green)' : 'transparent',
                            color: status === 'Present' ? 'white' : '#64748B',
                            border: 'none', cursor: 'pointer', transition: 'all 0.2s'
                          }}
                        >P</button>
                        <button 
                          onClick={() => handleStatusChange(student.id, 'Absent')}
                          style={{ 
                            padding: '0.5rem 12px', fontSize: '0.75rem', borderRadius: '6px', fontWeight: 800,
                            backgroundColor: status === 'Absent' ? 'var(--danger-red)' : 'transparent',
                            color: status === 'Absent' ? 'white' : '#64748B',
                            border: 'none', cursor: 'pointer', transition: 'all 0.2s'
                          }}
                        >A</button>
                        <button 
                          onClick={() => handleStatusChange(student.id, 'No Class')}
                          style={{ 
                            padding: '0.5rem 8px', fontSize: '0.75rem', borderRadius: '6px', fontWeight: 800,
                            backgroundColor: status === 'No Class' ? '#94A3B8' : 'transparent',
                            color: status === 'No Class' ? 'white' : '#64748B',
                            border: 'none', cursor: 'pointer', transition: 'all 0.2s'
                          }}
                        >N/C</button>
                     </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AttendanceRegistry;
