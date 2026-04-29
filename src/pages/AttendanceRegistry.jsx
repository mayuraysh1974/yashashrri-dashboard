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
  const [holidays, setHolidays] = useState([]);
  const [currentHoliday, setCurrentHoliday] = useState(null);

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (selectedDate) {
      fetchAttendanceRecord();
      checkHolidayStatus();
    }
  }, [selectedDate, selectedStandard, selectedSubject, mode, holidays]);

  // Clear subject if it's no longer valid for the selected standard
  useEffect(() => {
    if (selectedStandard && selectedSubject) {
      const sub = subjects.find(s => s.id == selectedSubject);
      if (sub) {
        const stdVal = selectedStandard.toUpperCase();
        const subName = sub.name.toUpperCase();
        const isMatch = subName.startsWith(stdVal + ' ') || subName === stdVal;
        if (!isMatch) {
          setSelectedSubject('');
        }
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
    if (!selectedDate) {
        setCurrentHoliday(null);
        return;
    }

    const dateHols = holidays.filter(h => h.date === selectedDate);
    if (dateHols.length === 0) {
        setCurrentHoliday(null);
        return;
    }

    // Find holiday matching current context
    const matchingHol = dateHols.find(h => {
        const stdMatch = !selectedStandard || h.description.includes(`[Std: ${selectedStandard}]`) || !h.description.includes('[Std: ');
        const subMatch = mode !== 'Subject' || !selectedSubject || h.description.includes(`[Sub: ${subjects.find(s => s.id == selectedSubject)?.name}]`) || !h.description.includes('[Sub: ');
        return stdMatch && subMatch;
    });

    setCurrentHoliday(matchingHol || null);
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

  // Get subjects filtered by standard
  const filteredSubjects = subjects.filter(s => {
    if (!selectedStandard) return true;
    const stdVal = selectedStandard.toUpperCase();
    const subName = s.name.toUpperCase();
    return subName.startsWith(stdVal + ' ') || subName === stdVal;
  });

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

    setLoading(true);
    const { error } = await supabase
      .from(table)
      .upsert(records, { onConflict: mode === 'Daily' ? 'student_id, date' : 'student_id, subject_id, date' });
    
    if (error) {
      alert('Error saving attendance: ' + error.message);
      setLoading(false);
      return;
    }

    // --- Smart Sync Logic ---
    // If we marked students Absent/No Class/Holiday for the day, sync to all subjects
    if (mode === 'Daily') {
      const syncRecords = [];
      displayedStudents.forEach(student => {
        const status = dailyAttendance[student.id] || 'Absent';
        if (status === 'Absent' || status === 'No Class' || status === 'Holiday') {
          // Add a record for every subject this student is enrolled in
          student.student_subjects?.forEach(sub => {
            syncRecords.push({
              student_id: student.id,
              subject_id: sub.subject_id,
              date: selectedDate,
              status: status
            });
          });
        }
      });

      if (syncRecords.length > 0) {
        await supabase
          .from('student_subject_attendance')
          .upsert(syncRecords, { onConflict: 'student_id, subject_id, date' });
      }
    }

    alert('Attendance saved and synchronized successfully!');
    setLoading(false);
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
                {filteredSubjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
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
          <button 
            className="btn-secondary" 
            onClick={() => {
              if (mode === 'Subject') {
                const newAtt = { ...subjectAttendance };
                displayedStudents.forEach(s => newAtt[s.id] = 'No Class');
                setSubjectAttendance(newAtt);
              } else {
                const newAtt = { ...dailyAttendance };
                displayedStudents.forEach(s => newAtt[s.id] = 'No Class');
                setDailyAttendance(newAtt);
              }
            }} 
            disabled={mode === 'Subject' && !selectedSubject} 
            style={{ flex: 1, padding: '0.5rem', fontSize: '0.75rem', height: '38px' }}
          >
            <FiXCircle /> No Class Today
          </button>
        </div>
      </div>
      
      {/* Holiday Warning Banner */}
      {currentHoliday && (
        <div style={{ 
          margin: '0 0 1rem 0', padding: '1rem', borderRadius: '12px', 
          backgroundColor: currentHoliday.type === 'Holiday' ? '#FEE2E2' : '#FEF3C7',
          border: `1px solid ${currentHoliday.type === 'Holiday' ? '#FCA5A5' : '#FCD34D'}`,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          animation: 'fadeIn 0.3s ease-out'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ padding: '0.5rem', backgroundColor: 'rgba(255,255,255,0.5)', borderRadius: '8px' }}>
                <FiCalendar size={20} color={currentHoliday.type === 'Holiday' ? '#B91C1C' : '#92400E'} />
            </div>
            <div>
              <div style={{ fontWeight: 800, color: currentHoliday.type === 'Holiday' ? '#991B1B' : '#854D0E', fontSize: '0.85rem' }}>
                CALENDAR EVENT: {currentHoliday.type.toUpperCase()}
              </div>
              <div style={{ fontSize: '0.75rem', color: currentHoliday.type === 'Holiday' ? '#B91C1C' : '#92400E', fontWeight: 600 }}>
                {currentHoliday.description.replace(/\[.*?\]/g, '').trim()}
              </div>
            </div>
          </div>
          <button 
            onClick={() => {
                const newAtt = mode === 'Daily' ? {...dailyAttendance} : {...subjectAttendance};
                displayedStudents.forEach(s => newAtt[s.id] = 'Holiday');
                if (mode === 'Daily') setDailyAttendance(newAtt);
                else setSubjectAttendance(newAtt);
            }}
            className="btn-secondary" 
            style={{ fontSize: '0.7rem', padding: '0.4rem 0.8rem', background: 'white', border: 'none', color: '#1E293B' }}
          >
            Mark all 'Holiday'
          </button>
        </div>
      )}

      <div className="card-base" style={{ flex: 1, overflow: 'auto', padding: 0 }}>
        {/* Desktop Table View */}
        <div className="desktop-only">
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
                <tr><td colSpan="2" style={{ padding: '2rem', textAlign: 'center' }}>No students found for this selection.</td></tr>
              ) : displayedStudents.map(student => {
                const status = getEffectiveStatus(student.id);
                return (
                  <tr key={student.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '1rem' }}>
                       <div style={{ fontWeight: 600 }}>{student.name}</div>
                       <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>ID: {student.id} | {student.standard}</div>
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                       <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                          <button 
                            onClick={() => handleStatusChange(student.id, 'Present')}
                            className={`btn-attendance ${status === 'Present' ? 'present' : ''}`}
                          >Present</button>
                          <button 
                            onClick={() => handleStatusChange(student.id, 'Absent')}
                            className={`btn-attendance ${status === 'Absent' ? 'absent' : ''}`}
                          >Absent</button>
                          <button 
                            onClick={() => handleStatusChange(student.id, 'No Class')}
                            className={`btn-attendance ${status === 'No Class' ? 'no-class' : ''}`}
                          >No Class</button>
                       </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="mobile-only" style={{ padding: '0.5rem' }}>
          {(mode === 'Subject' && !selectedSubject) ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Select a subject to begin.</div>
          ) : displayedStudents.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center' }}>No students found.</div>
          ) : displayedStudents.map(student => {
            const status = getEffectiveStatus(student.id);
            return (
              <div key={student.id} className="attendance-mobile-card" style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)', marginBottom: '0.5rem', borderRadius: '12px', backgroundColor: 'white', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--primary-blue)' }}>{student.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{student.id} • {student.standard}</div>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
                  <button 
                    onClick={() => handleStatusChange(student.id, 'Present')}
                    className={`btn-attendance-mobile ${status === 'Present' ? 'present' : ''}`}
                  >Present</button>
                  <button 
                    onClick={() => handleStatusChange(student.id, 'Absent')}
                    className={`btn-attendance-mobile ${status === 'Absent' ? 'absent' : ''}`}
                  >Absent</button>
                  <button 
                    onClick={() => handleStatusChange(student.id, 'No Class')}
                    className={`btn-attendance-mobile ${status === 'No Class' ? 'no-class' : ''}`}
                  >No Class</button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <style>{`
        .btn-attendance {
          padding: 0.5rem 1rem;
          border-radius: 8px;
          border: 1px solid var(--border-color);
          background: white;
          color: #64748B;
          font-weight: 600;
          font-size: 0.8rem;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-attendance.present { background: var(--success-green); color: white; border-color: var(--success-green); }
        .btn-attendance.absent { background: var(--danger-red); color: white; border-color: var(--danger-red); }
        .btn-attendance.no-class { background: #94A3B8; color: white; border-color: #94A3B8; }

        .btn-attendance-mobile {
          padding: 0.75rem 0.25rem;
          border-radius: 8px;
          border: 1px solid var(--border-color);
          background: #F8FAFC;
          color: #64748B;
          font-weight: 700;
          font-size: 0.75rem;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-attendance-mobile.present { background: var(--success-green); color: white; border-color: var(--success-green); box-shadow: 0 4px 12px rgba(16, 185, 129, 0.2); }
        .btn-attendance-mobile.absent { background: var(--danger-red); color: white; border-color: var(--danger-red); box-shadow: 0 4px 12px rgba(239, 68, 68, 0.2); }
        .btn-attendance-mobile.no-class { background: #64748B; color: white; border-color: #64748B; }

        @media (max-width: 768px) {
          .desktop-only { display: none; }
          .mobile-only { display: block; }
        }
        @media (min-width: 769px) {
          .desktop-only { display: block; }
          .mobile-only { display: none; }
        }
      `}</style>
    </div>
  );
};

export default AttendanceRegistry;
