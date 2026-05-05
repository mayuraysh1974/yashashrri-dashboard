import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { FiXCircle, FiCalendar, FiFilter, FiSave, FiSend, FiBook, FiUserCheck, FiRefreshCw } from 'react-icons/fi';

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
  const [holidays, setHolidays] = useState([]);
  const [currentHoliday, setCurrentHoliday] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (selectedDate) {
      fetchAttendanceRecord();
      checkHolidayStatus();
    }
  }, [selectedDate, selectedStandard, selectedSubject, mode, holidays]);

  useEffect(() => {
    if (selectedStandard && selectedSubject) {
      const sub = subjects.find(s => s.id == selectedSubject);
      if (sub) {
        const std = selectedStandard.toLowerCase();
        const subName = sub.name.toLowerCase();
        const subStd = (sub.standard || '').toLowerCase();
        const isMatch = subStd === std || 
                        subName.includes(std) || 
                        new RegExp(`\\b${std.split(' ')[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(subName);
        if (!isMatch) setSelectedSubject('');
      }
    }
  }, [selectedStandard, selectedSubject, subjects]);

  const fetchInitialData = async () => {
    const [stdRes, stuRes, subRes, holRes] = await Promise.all([
      supabase.from('standards').select('*'),
      supabase.from('students').select('*, student_subjects(subject_id)'),
      supabase.from('subjects').select('*'),
      supabase.from('holidays').select('*')
    ]);
    if (stdRes.data) setStandards(stdRes.data);
    if (stuRes.data) setStudents(stuRes.data);
    if (subRes.data) setSubjects(subRes.data);
    if (holRes.data) setHolidays(holRes.data);
    setLoading(false);
  };

  const checkHolidayStatus = () => {
    if (!selectedDate) { setCurrentHoliday(null); return; }
    const dateHols = holidays.filter(h => h.date === selectedDate);
    if (dateHols.length === 0) { setCurrentHoliday(null); return; }
    const matchingHol = dateHols.find(h => {
        const stdMatch = !selectedStandard || h.description.includes(`[Std: ${selectedStandard}]`) || !h.description.includes('[Std: ');
        const subMatch = mode !== 'Subject' || !selectedSubject || h.description.includes(`[Sub: ${subjects.find(s => s.id == selectedSubject)?.name}]`) || !h.description.includes('[Sub: ');
        return stdMatch && subMatch;
    });
    setCurrentHoliday(matchingHol || null);
  };

  const fetchAttendanceRecord = async () => {
    const { data: dData } = await supabase.from('student_attendance').select('student_id, status').eq('date', selectedDate);
    if (dData) {
      let dMap = {};
      dData.forEach(e => dMap[e.student_id] = e.status);
      setDailyAttendance(dMap);
    }
    if (mode === 'Subject' && selectedSubject) {
      const { data: sData } = await supabase.from('student_subject_attendance').select('student_id, status').eq('date', selectedDate).eq('subject_id', selectedSubject);
      if (sData) {
        const sMap = {};
        sData.forEach(e => sMap[e.student_id] = e.status);
        setSubjectAttendance(sMap);
      }
    }
  };

  const handleStatusChange = (studentId, status) => {
    if (mode === 'Daily') setDailyAttendance({ ...dailyAttendance, [studentId]: status });
    else setSubjectAttendance({ ...subjectAttendance, [studentId]: status });
  };

  const filteredSubjects = subjects.filter(s => {
    if (!selectedStandard) return true;
    const std = selectedStandard.toLowerCase();
    const subName = (s.name || '').toLowerCase();
    const subStd = (s.standard || '').toLowerCase();
    if (subStd === std) return true;
    const fullStdRegex = new RegExp(`\\b${std.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (fullStdRegex.test(subName)) return true;
    const stdFirstWord = std.split(' ')[0];
    const firstWordRegex = new RegExp(`\\b${stdFirstWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    return firstWordRegex.test(subName);
  });

  let displayedStudents = students;
  if (selectedStandard) displayedStudents = displayedStudents.filter(s => s.standard === selectedStandard);
  if (mode === 'Subject' && selectedSubject) {
    displayedStudents = displayedStudents.filter(s => {
      const enrollment = s.student_subjects || [];
      return enrollment.some(sub => Number(sub.subject_id) === Number(selectedSubject));
    });
  }
  if (searchTerm) {
    displayedStudents = displayedStudents.filter(s => 
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      s.id.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }

  const getEffectiveStatus = (studentId) => {
    if (mode === 'Daily') return dailyAttendance[studentId];
    if (subjectAttendance[studentId]) return subjectAttendance[studentId];
    return dailyAttendance[studentId] === 'Present' ? 'Present' : dailyAttendance[studentId];
  };

  const handleSave = async () => {
    const table = mode === 'Daily' ? 'student_attendance' : 'student_subject_attendance';
    const records = displayedStudents.map(s => {
      const record = { student_id: s.id, date: selectedDate, status: getEffectiveStatus(s.id) || 'Absent' };
      if (mode === 'Subject') record.subject_id = selectedSubject;
      return record;
    });
    if (mode === 'Subject' && !selectedSubject) return alert('Please select a subject first.');
    setLoading(true);
    const { error } = await supabase.from(table).upsert(records, { onConflict: mode === 'Daily' ? 'student_id, date' : 'student_id, subject_id, date' });
    if (error) { alert('Error saving attendance: ' + error.message); setLoading(false); return; }
    if (mode === 'Daily') {
      const syncRecords = [];
      displayedStudents.forEach(student => {
        const status = dailyAttendance[student.id] || 'Absent';
        if (status === 'Absent' || status === 'No Class' || status === 'Holiday') {
          student.student_subjects?.forEach(sub => {
            syncRecords.push({ student_id: student.id, subject_id: sub.subject_id, date: selectedDate, status: status });
          });
        }
      });
      if (syncRecords.length > 0) await supabase.from('student_subject_attendance').upsert(syncRecords, { onConflict: 'student_id, subject_id, date' });
    }
    alert('Attendance saved successfully!');
    setLoading(false);
  };

  const markAllEnrolledPresent = () => {
    const newAtt = mode === 'Daily' ? { ...dailyAttendance } : { ...subjectAttendance };
    displayedStudents.forEach(s => { newAtt[s.id] = 'Present'; });
    if (mode === 'Daily') setDailyAttendance(newAtt);
    else setSubjectAttendance(newAtt);
  };

  const notifyAbsentees = async () => {
    const absentees = displayedStudents.filter(s => getEffectiveStatus(s.id) === 'Absent' && (s.parent_phone || s.parentPhone));
    if (absentees.length === 0) return alert('No absent students with parent contacts found.');
    if (!window.confirm(`Log absence alerts for ${absentees.length} parents?`)) return;
    const inserts = absentees.map(student => {
      const msgHeader = mode === 'Daily' ? 'marked ABSENT for today' : `missed the ${subjects.find(s => s.id == selectedSubject)?.name} lecture`;
      return { student_id: student.id, student_name: student.name, recipient: student.parent_phone || student.parentPhone, message: `Dear Parent, your child ${student.name} was ${msgHeader} (${selectedDate}). - Yashashrri Classes`, type: 'SMS', status: 'Simulated' };
    });
    const { error } = await supabase.from('message_log').insert(inserts);
    if (error) alert('Failed to log alerts: ' + error.message);
    else alert(`${absentees.length} absence alerts logged successfully.`);
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '0.4rem', padding: '0.5rem' }} className="attendance-page-container">
      <div className="attendance-compact-header no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary-blue)' }}>Attendance</h1>
          <div style={{ display: 'flex', background: '#f1f5f9', padding: '2px', borderRadius: '6px' }}>
            <button onClick={() => setMode('Daily')} style={{ padding: '2px 10px', fontSize: '0.7rem', borderRadius: '4px', border: 'none', cursor: 'pointer', background: mode === 'Daily' ? 'var(--primary-blue)' : 'transparent', color: mode === 'Daily' ? 'white' : 'var(--text-secondary)', fontWeight: 700 }}>Daily</button>
            <button onClick={() => setMode('Subject')} style={{ padding: '2px 10px', fontSize: '0.7rem', borderRadius: '4px', border: 'none', cursor: 'pointer', background: mode === 'Subject' ? 'var(--primary-blue)' : 'transparent', color: mode === 'Subject' ? 'white' : 'var(--text-secondary)', fontWeight: 700 }}>Subject</button>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn-secondary" style={{ padding: '4px 10px', fontSize: '0.75rem' }} onClick={fetchInitialData}><FiRefreshCw /> Refresh</button>
          <button className="btn-secondary" style={{ padding: '4px 10px', fontSize: '0.75rem', color: 'var(--danger-red)' }} onClick={notifyAbsentees}><FiSend /> Notify</button>
          <button className="btn-primary" style={{ padding: '4px 14px', fontSize: '0.75rem', background: 'var(--accent-gold)', border: 'none' }} onClick={handleSave}><FiSave /> Save</button>
        </div>
      </div>

      <style>{`
        .attendance-page-container { padding: 0.5rem !important; background-color: var(--bg-main); }
        .filter-card-compact { padding: 0.5rem 0.75rem !important; margin-bottom: 0.4rem !important; border-radius: 8px !important; }
        .mobile-filter-grid { display: grid; grid-template-columns: 1fr 1fr 1.5fr !important; gap: 1rem !important; align-items: flex-end; }
        .input-group label { font-size: 0.7rem !important; margin-bottom: 2px !important; color: var(--text-muted); }
        .input-group select, .input-group input { height: 34px !important; padding: 0 10px !important; border-radius: 6px !important; font-size: 0.85rem !important; }
        .btn-attendance { padding: 0.4rem 0.8rem; border-radius: 6px; border: 1px solid var(--border-color); background: white; color: #64748B; font-weight: 600; font-size: 0.75rem; cursor: pointer; transition: all 0.2s; }
        .btn-attendance.present { background: var(--success-green); color: white; border-color: var(--success-green); }
        .btn-attendance.absent { background: var(--danger-red); color: white; border-color: var(--danger-red); }
        .btn-attendance.no-class { background: #94A3B8; color: white; border-color: #94A3B8; }
        @media (max-width: 768px) {
          .attendance-compact-header { flex-direction: column; align-items: flex-start !important; gap: 0.5rem; }
          .mobile-filter-grid { grid-template-columns: 1fr !important; gap: 0.4rem !important; }
          .attendance-compact-header div:last-child { width: 100%; justify-content: space-between; }
          .desktop-only { display: none; }
          .mobile-only { display: block; }
        }
        @media (min-width: 769px) { .desktop-only { display: block; } .mobile-only { display: none; } }
      `}</style>

      <div className="card-base animate-in filter-card-compact">
        <div className="mobile-filter-grid">
          <div className="input-group">
            <label><FiCalendar /> Date</label>
            <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} />
          </div>
          <div className="input-group">
            <label><FiFilter /> Class</label>
            <select value={selectedStandard} onChange={e => setSelectedStandard(e.target.value)}>
              <option value="">All Classes</option>
              {standards.map(s => <option key={s.id} value={s.standard}>{s.standard}</option>)}
            </select>
          </div>
          <div className="input-group">
            <label><FiUserCheck /> Search</label>
            <input type="text" placeholder="Name or ID..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>
        </div>
        {mode === 'Subject' && (
          <div className="input-group" style={{ marginTop: '0.5rem' }}>
            <label><FiBook /> Subject</label>
            <select value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)}>
              <option value="">Choose Subject...</option>
              {filteredSubjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        )}
        <div className="attendance-utility-btns" style={{ display: 'flex', gap: '0.4rem', marginTop: '0.5rem' }}>
          <button className="btn-secondary" style={{ flex: 1, padding: '4px', fontSize: '0.75rem' }} onClick={markAllEnrolledPresent}><FiUserCheck /> Mark All Present</button>
          <button className="btn-secondary" style={{ flex: 1, padding: '4px', fontSize: '0.75rem' }} onClick={() => {
            const newAtt = mode === 'Daily' ? { ...dailyAttendance } : { ...subjectAttendance };
            displayedStudents.forEach(s => newAtt[s.id] = 'No Class');
            if (mode === 'Daily') setDailyAttendance(newAtt); else setSubjectAttendance(newAtt);
          }} disabled={mode === 'Subject' && !selectedSubject}><FiXCircle /> No Class Today</button>
        </div>
      </div>
      
      {currentHoliday && (
        <div className="holiday-banner-compact" style={{ margin: '0 0 0.5rem 0', padding: '0.5rem 0.75rem', borderRadius: '8px', backgroundColor: currentHoliday.type === 'Holiday' ? '#FEE2E2' : '#FEF3C7', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FiCalendar size={16} color={currentHoliday.type === 'Holiday' ? '#B91C1C' : '#92400E'} />
            <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>{currentHoliday.type.toUpperCase()}: {currentHoliday.description.replace(/\[.*?\]/g, '').trim()}</span>
          </div>
          <button onClick={() => {
            const newAtt = mode === 'Daily' ? {...dailyAttendance} : {...subjectAttendance};
            displayedStudents.forEach(s => newAtt[s.id] = 'Holiday');
            if (mode === 'Daily') setDailyAttendance(newAtt); else setSubjectAttendance(newAtt);
          }} className="btn-secondary" style={{ fontSize: '0.65rem', padding: '2px 8px', background: 'white' }}>Mark Holiday</button>
        </div>
      )}

      <div className="card-base" style={{ flex: 1, overflow: 'auto', padding: 0, borderRadius: '8px' }}>
        <div className="desktop-only">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ position: 'sticky', top: 0, backgroundColor: 'var(--bg-surface)', zIndex: 1 }}>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ padding: '0.5rem 0.75rem', fontSize: '0.75rem', width: '250px' }}>Student Profile</th>
                <th style={{ padding: '0.5rem 0.75rem', fontSize: '0.75rem' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {displayedStudents.length === 0 ? (
                <tr><td colSpan="2" style={{ padding: '2rem', textAlign: 'center', fontSize: '0.8rem' }}>No students found.</td></tr>
              ) : displayedStudents.map(student => {
                const status = getEffectiveStatus(student.id);
                return (
                  <tr key={student.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '0.4rem 0.75rem' }}>
                       <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{student.name}</div>
                       <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>ID: {student.id} | {student.standard}</div>
                    </td>
                    <td style={{ padding: '0.4rem 0.75rem', textAlign: 'left' }}>
                       <div style={{ display: 'inline-flex', gap: '0.3rem' }}>
                          <button onClick={() => handleStatusChange(student.id, 'Present')} className={`btn-attendance ${status === 'Present' ? 'present' : ''}`}>Present</button>
                          <button onClick={() => handleStatusChange(student.id, 'Absent')} className={`btn-attendance ${status === 'Absent' ? 'absent' : ''}`}>Absent</button>
                          <button onClick={() => handleStatusChange(student.id, 'No Class')} className={`btn-attendance ${status === 'No Class' ? 'no-class' : ''}`}>No Class</button>
                       </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="mobile-only" style={{ padding: '0.4rem' }}>
          {displayedStudents.map(student => {
            const status = getEffectiveStatus(student.id);
            return (
              <div key={student.id} style={{ padding: '0.75rem', borderBottom: '1px solid #f1f5f9', marginBottom: '0.4rem', borderRadius: '8px', backgroundColor: 'white', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{student.name}</div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>{student.id}</div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.3rem' }}>
                  <button onClick={() => handleStatusChange(student.id, 'Present')} className={`btn-attendance ${status === 'Present' ? 'present' : ''}`} style={{ padding: '0.5rem' }}>Present</button>
                  <button onClick={() => handleStatusChange(student.id, 'Absent')} className={`btn-attendance ${status === 'Absent' ? 'absent' : ''}`} style={{ padding: '0.5rem' }}>Absent</button>
                  <button onClick={() => handleStatusChange(student.id, 'No Class')} className={`btn-attendance ${status === 'No Class' ? 'no-class' : ''}`} style={{ padding: '0.5rem' }}>No Class</button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default AttendanceRegistry;
