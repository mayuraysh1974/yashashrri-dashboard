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
      s.subjects?.some(sub => Number(sub.subjectId) === Number(selectedSubject))
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
    if (!selectedSubject) return;
    const newAtt = { ...subjectAttendance };
    displayedStudents.forEach(s => {
       newAtt[s.id] = 'Present';
    });
    setSubjectAttendance(newAtt);
  };

  const notifyAbsentees = async () => {
    const token = localStorage.getItem('token');
    const absentees = displayedStudents.filter(s => getEffectiveStatus(s.id) === 'Absent' && s.parentPhone);
    
    if (absentees.length === 0) return alert('No absent students found.');
    if (!window.confirm(`Send alerts to ${absentees.length} parents?`)) return;

    for (const student of absentees) {
      const msgHeader = mode === 'Daily' ? 'marked ABSENT for today' : `missed the ${subjects.find(s=>s.id == selectedSubject)?.name} lecture`;
      const message = `Dear Parent, your child ${student.name} ${msgHeader} (${selectedDate}). - Yashashrri Classes`;
      await fetch('/api/alerts/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ studentId: student.id, recipient: student.parentPhone, message })
      });
    }
    alert('Alerts sent.');
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">{mode === 'Daily' ? 'Daily Attendance' : 'Subject-wise Attendance'}</h1>
          <p className="page-subtitle">Academic registry and lecture-level tracking</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <div style={{ display: 'flex', backgroundColor: 'var(--bg-main)', padding: '0.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
              <button 
                onClick={() => setMode('Daily')}
                style={{ padding: '0.5rem 1rem', borderRadius: '6px', border: 'none', cursor: 'pointer', background: mode === 'Daily' ? 'var(--primary-blue)' : 'transparent', color: mode === 'Daily' ? 'white' : 'var(--text-secondary)', fontWeight: 600 }}
              >Daily</button>
              <button 
                onClick={() => setMode('Subject')}
                style={{ padding: '0.5rem 1rem', borderRadius: '6px', border: 'none', cursor: 'pointer', background: mode === 'Subject' ? 'var(--primary-blue)' : 'transparent', color: mode === 'Subject' ? 'white' : 'var(--text-secondary)', fontWeight: 600 }}
              >Subject-wise</button>
          </div>
          <button className="btn-secondary" onClick={notifyAbsentees} style={{ color: 'var(--danger-red)' }}><FiSend /> Notify Absentees</button>
          <button className="btn-primary" onClick={handleSave}><FiSave /> Save Attendance</button>
        </div>
      </div>

      <div className="card-base" style={{ padding: '1.25rem', marginBottom: '1.5rem', display: 'flex', gap: '1.5rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div className="input-group" style={{ marginBottom: 0, width: '160px' }}>
          <label><FiCalendar /> Date</label>
          <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} />
        </div>
        <div className="input-group" style={{ marginBottom: 0, width: '160px' }}>
          <label><FiFilter /> Class</label>
          <select value={selectedStandard} onChange={e => setSelectedStandard(e.target.value)}>
            <option value="">All Classes</option>
            {standards.map(s => <option key={s.id} value={s.standard}>{s.standard}</option>)}
          </select>
        </div>
        {mode === 'Subject' && (
          <div className="input-group" style={{ marginBottom: 0, width: '220px' }}>
            <label><FiBook /> Lecture Subject</label>
            <select value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)}>
              <option value="">Choose Subject...</option>
              {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        )}
        <div className="input-group" style={{ marginBottom: 0, flex: 1, minWidth: '200px' }}>
          <label><FiUserCheck /> Search Student</label>
          <input 
            type="text" 
            placeholder="Search by name or ID..." 
            value={searchTerm} 
            onChange={e => setSearchTerm(e.target.value)} 
          />
        </div>
        {mode === 'Subject' && (
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn-secondary" onClick={markAllEnrolledPresent} disabled={!selectedSubject} style={{ padding: '0.6rem 1rem', fontSize: '0.8rem' }}><FiUserCheck /> All Present</button>
            <button className="btn-secondary" onClick={() => {
              const newAtt = { ...subjectAttendance };
              displayedStudents.forEach(s => newAtt[s.id] = 'No Class');
              setSubjectAttendance(newAtt);
            }} disabled={!selectedSubject} style={{ padding: '0.6rem 1rem', fontSize: '0.8rem' }}><FiXCircle /> No Class</button>
          </div>
        )}
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
                  <td style={{ padding: '1rem', textAlign: 'center' }}>
                     <div style={{ display: 'inline-flex', gap: '0.5rem', backgroundColor: 'var(--bg-main)', padding: '0.25rem', borderRadius: 'var(--radius-md)' }}>
                        <button 
                          onClick={() => handleStatusChange(student.id, 'Present')}
                          style={{ 
                            padding: '0.4rem 1.5rem', fontSize: '0.8rem', borderRadius: '6px',
                            backgroundColor: status === 'Present' ? 'var(--success-green)' : 'transparent',
                            color: status === 'Present' ? 'white' : 'var(--text-secondary)',
                            border: 'none', cursor: 'pointer'
                          }}
                        >Present</button>
                        <button 
                          onClick={() => handleStatusChange(student.id, 'Absent')}
                          style={{ 
                            padding: '0.4rem 1.5rem', fontSize: '0.8rem', borderRadius: '6px',
                            backgroundColor: status === 'Absent' ? 'var(--danger-red)' : 'transparent',
                            color: status === 'Absent' ? 'white' : 'var(--text-secondary)',
                            border: 'none', cursor: 'pointer'
                          }}
                        >Absent</button>
                        <button 
                          onClick={() => handleStatusChange(student.id, 'No Class')}
                          style={{ 
                            padding: '0.4rem 1.5rem', fontSize: '0.8rem', borderRadius: '6px',
                            backgroundColor: status === 'No Class' ? 'var(--text-muted)' : 'transparent',
                            color: status === 'No Class' ? 'white' : 'var(--text-secondary)',
                            border: 'none', cursor: 'pointer'
                          }}
                        >No Class</button>
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
