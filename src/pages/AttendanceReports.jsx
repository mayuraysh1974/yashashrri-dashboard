import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
  LineChart, Line
} from 'recharts';
import { FiPrinter, FiCalendar, FiUser, FiLayers, FiFileText, FiBook } from 'react-icons/fi';
import { supabase } from '../supabaseClient';

const AttendanceReports = () => {
  const [activeTab, setActiveTab] = useState('student-monthly');
  const [standards, setStandards] = useState([]);
  const [students, setStudents] = useState([]);
  const [subjects, setSubjects] = useState([]);
  
  const [selectedStudent, setSelectedStudent] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().split('T')[0].slice(0, 7));
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedStandard, setSelectedStandard] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');

  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchDropdowns = async () => {
      const [{ data: sData }, { data: stData }, { data: subData }] = await Promise.all([
        supabase.from('standards').select('id, standard').order('standard'),
        supabase.from('students').select('id, name, standard').order('name'),
        supabase.from('subjects').select('id, name').order('name')
      ]);
      setStandards(sData || []);
      setStudents(stData || []);
      setSubjects(subData || []);
    };
    fetchDropdowns();
  }, []);

  const fetchReportData = async () => {
    setLoading(true);
    setReportData(null);
    try {
      if (activeTab === 'student-monthly') {
        if (!selectedStudent) { alert('Select a student'); setLoading(false); return; }
        const student = students.find(s => s.id === selectedStudent);
        // e.g. selectedMonth = "2026-03"
        const from = `${selectedMonth}-01`;
        const dateObj = new Date(selectedMonth + '-01');
        dateObj.setMonth(dateObj.getMonth() + 1);
        const to = dateObj.toISOString().slice(0, 10);

        const { data: dailyAtt } = await supabase
          .from('student_attendance')
          .select('date, status')
          .eq('student_id', selectedStudent)
          .gte('date', from)
          .lt('date', to);
        
        const { data: subjectAtt } = await supabase
          .from('student_subject_attendance')
          .select('date, status')
          .eq('student_id', selectedStudent)
          .gte('date', from)
          .lt('date', to);

        // Merge logic with Priority: Present > Absent > No Class > Holiday
        const mergedMap = {};
        const priority = { 'Present': 3, 'Absent': 2, 'No Class': 1, 'Holiday': 1, 'Late': 2 };

        const processRecord = (rec) => {
            const currentStatus = mergedMap[rec.date];
            const newStatus = rec.status;
            if (!currentStatus || (priority[newStatus] || 0) > (priority[currentStatus] || 0)) {
                mergedMap[rec.date] = newStatus;
            }
        };

        (dailyAtt || []).forEach(processRecord);
        (subjectAtt || []).forEach(processRecord);

        const finalAtt = Object.entries(mergedMap).map(([date, status]) => ({ date, status })).sort((a, b) => a.date.localeCompare(b.date));
        setReportData({ student, attendance: finalAtt });

      } else if (activeTab === 'class-daily') {
        if (!selectedStandard) { alert('Select a standard'); setLoading(false); return; }
        const { data: studs } = await supabase.from('students').select('id, name').eq('standard', selectedStandard);
        const studentIds = (studs || []).map(s => s.id);
        if (studentIds.length === 0) { setReportData([]); setLoading(false); return; }
        const { data: att } = await supabase
          .from('student_attendance')
          .select('student_id, status')
          .in('student_id', studentIds)
          .eq('date', selectedDate);
        const result = (studs || []).map(s => {
          const rec = (att || []).find(a => a.student_id === s.id);
          return { ...s, status: rec ? rec.status : 'Absent' };
        });
        setReportData(result);

      } else if (activeTab === 'class-monthly') {
        if (!selectedStandard) { alert('Select a standard'); setLoading(false); return; }
        const { data: studs } = await supabase.from('students').select('id').eq('standard', selectedStandard);
        const studentIds = (studs || []).map(s => s.id);
        if (studentIds.length === 0) { setReportData([]); setLoading(false); return; }
        const from = `${selectedMonth}-01`;
        const dateObj = new Date(selectedMonth + '-01');
        dateObj.setMonth(dateObj.getMonth() + 1);
        const to = dateObj.toISOString().slice(0, 10);

        const { data: att } = await supabase
          .from('student_attendance')
          .select('date, status')
          .in('student_id', studentIds)
          .gte('date', from)
          .lt('date', to);
        // Group by date
        const dateMap = {};
        (att || []).forEach(a => {
          if (!dateMap[a.date]) dateMap[a.date] = { date: a.date, present: 0, absent: 0, noClass: 0 };
          if (a.status === 'Present') dateMap[a.date].present++;
          else if (a.status === 'No Class') dateMap[a.date].noClass++;
          else dateMap[a.date].absent++;
        });
        setReportData(Object.values(dateMap).sort((a, b) => a.date.localeCompare(b.date)));

      } else if (activeTab === 'subject-monthly') {
        if (!selectedSubject) { alert('Select a subject'); setLoading(false); return; }
        const from = `${selectedMonth}-01`;
        const dateObj = new Date(selectedMonth + '-01');
        dateObj.setMonth(dateObj.getMonth() + 1);
        const to = dateObj.toISOString().slice(0, 10);

        const { data: att } = await supabase
          .from('student_subject_attendance')
          .select('date, status')
          .eq('subject_id', selectedSubject)
          .gte('date', from)
          .lt('date', to);
        const dateMap = {};
        (att || []).forEach(a => {
          if (!dateMap[a.date]) dateMap[a.date] = { date: a.date, present: 0, absent: 0, noClass: 0 };
          if (a.status === 'Present') dateMap[a.date].present++;
          else if (a.status === 'No Class') dateMap[a.date].noClass++;
          else dateMap[a.date].absent++;
        });
        setReportData(Object.values(dateMap).sort((a, b) => a.date.localeCompare(b.date)));
      }
    } catch (err) {
      console.error(err);
      alert('Failed to load report: ' + err.message);
    }
    setLoading(false);
  };

  const PrintHeader = ({ title, subTitle }) => (
    <div className="print-header" style={{ display: 'none', textAlign: 'center', marginBottom: '30px' }}>
      <div style={{ marginBottom: '10px' }}>
        <img src="/logo.png" alt="Yashashrri Logo" style={{ maxWidth: '450px', height: 'auto' }} onError={(e) => { e.target.onerror = null; e.target.style.display = 'none'; e.target.parentNode.nextElementSibling.style.display = 'block'; }} />
      </div>
      <div style={{ display: 'none' }}>
        <h1 style={{ color: '#1A237E', margin: 0, fontSize: '28px', letterSpacing: '2px' }}>YASHASHRRI CLASSES</h1>
        <div style={{ color: '#D4AF37', fontWeight: 700, fontSize: '13px', marginBottom: '10px' }}>BUILDING BRIDGES TO SUCCESS</div>
      </div>
      <div style={{ fontSize: '11px', color: '#64748B', lineHeight: '1.6' }}>
        Main Br: "Shree Ekveera Prasad", Vaidya Colony, Nr. Axis bank ATM, Talegaon Dabhade, PUNE - 410506<br />
        Branch 2: Silverwinds, C2, Dnyaneshwar Nagar, Nr. Jijamata Chowk, Talegaon Dabhade, PUNE - 410506<br />
        Contact: +91 73874 20737 | https://yashashrri-dashboard.vercel.app
      </div>
      <hr style={{ border: 'none', borderTop: '2px solid #1A237E', margin: '20px 0' }} />
      <h2 style={{ fontSize: '16px', color: '#1A237E', margin: '10px 0', textTransform: 'uppercase' }}>{title}</h2>
      {subTitle && <p style={{ fontSize: '13px', color: '#64748B', fontWeight: 600, margin: '4px 0 0 0' }}>{subTitle}</p>}
    </div>
  );

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="page-header no-print">
        <div>
          <h1 className="page-title">Attendance Reports</h1>
          <p className="page-subtitle">Track regularity and monthly engagement trends</p>
        </div>
        <button className="btn-secondary" onClick={() => window.print()} disabled={!reportData}>
          <FiPrinter /> Print Report
        </button>
      </div>

      <div className="card-base no-print" style={{ 
        marginBottom: '1rem', 
        padding: '0.3rem', 
        display: 'flex', 
        backgroundColor: '#F1F5F9', 
        borderRadius: '10px',
        overflowX: 'auto'
      }}>
          {[
            { id: 'student-monthly', label: 'Monthly' },
            { id: 'class-daily', label: 'Daily Class' },
            { id: 'class-monthly', label: 'Monthly Class' },
            { id: 'subject-monthly', label: 'Subject-wise' }
          ].map(tab => (
            <button 
              key={tab.id}
              style={{ 
                flex: 1,
                padding: '0.6rem 0.5rem', 
                borderRadius: '8px', 
                border: 'none', 
                background: activeTab === tab.id ? 'white' : 'transparent', 
                color: activeTab === tab.id ? 'var(--primary-blue)' : 'var(--text-secondary)', 
                fontWeight: 600, 
                cursor: 'pointer', 
                boxShadow: activeTab === tab.id ? 'var(--shadow-sm)' : 'none',
                fontSize: '0.75rem',
                whiteSpace: 'nowrap'
              }}
              onClick={() => { setActiveTab(tab.id); setReportData(null); }}
            >{tab.label}</button>
          ))}
      </div>

      <div className="card-base no-print" style={{ 
        padding: '1rem', 
        marginBottom: '1rem', 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', 
        gap: '1rem', 
        alignItems: 'flex-end' 
      }}>
          {activeTab === 'student-monthly' && (
            <>
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label>Class Filter</label>
                <select value={selectedStandard} onChange={e => { setSelectedStandard(e.target.value); setSelectedStudent(''); }}>
                  <option value="">All Classes</option>
                  {standards.map(s => <option key={s.id} value={s.standard}>{s.standard}</option>)}
                </select>
              </div>
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label>Student</label>
                <select value={selectedStudent} onChange={e => setSelectedStudent(e.target.value)}>
                  <option value="">Choose Student...</option>
                  {students.filter(s => !selectedStandard || s.standard === selectedStandard).map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            </>
          )}
          {(activeTab === 'class-daily' || activeTab === 'class-monthly') && (
            <div className="input-group" style={{ marginBottom: 0 }}>
              <label>Standard</label>
              <select value={selectedStandard} onChange={e => setSelectedStandard(e.target.value)}>
                <option value="">Choose Class...</option>
                {standards.map(s => <option key={s.id} value={s.standard}>{s.standard}</option>)}
              </select>
            </div>
          )}
          {activeTab === 'subject-monthly' && (
            <div className="input-group" style={{ marginBottom: 0 }}>
              <label>Subject</label>
              <select value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)}>
                <option value="">Choose Subject...</option>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          )}
          {(activeTab === 'student-monthly' || activeTab === 'class-monthly' || activeTab === 'subject-monthly') && (
            <div className="input-group" style={{ marginBottom: 0 }}>
              <label>Select Month</label>
              <input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} />
            </div>
          )}
          {activeTab === 'class-daily' && (
            <div className="input-group" style={{ marginBottom: 0 }}>
              <label>Select Date</label>
              <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} />
            </div>
          )}
          <button className="btn-primary" style={{ padding: '0.8rem' }} onClick={fetchReportData} disabled={loading}>
            {loading ? 'Generating...' : 'Generate Report'}
          </button>
      </div>

      {reportData && (
        <div className="card-base" style={{ flex: 1, padding: '1rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', background: 'transparent', border: 'none', boxShadow: 'none' }}>
          <PrintHeader 
            title={activeTab.split('-').join(' ').toUpperCase() + ' REPORT'}
            subTitle={
              activeTab === 'class-daily'
                ? `Date: ${new Date(selectedDate).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} | Class: ${selectedStandard}`
                : activeTab === 'class-monthly'
                ? `Month: ${new Date(selectedMonth + '-02').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })} | Class: ${selectedStandard}`
                : activeTab === 'subject-monthly'
                ? `Month: ${new Date(selectedMonth + '-02').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })} | Subject: ${subjects.find(s => s.id === selectedSubject)?.name || ''}`
                : `Month: ${new Date(selectedMonth + '-02').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })} | Student: ${reportData?.student?.name || ''}`
            }
          />

          {/* Visible on-screen report context banner */}
          <div style={{ background: '#1A237E', color: 'white', borderRadius: '10px', padding: '0.75rem 1.25rem', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div style={{ fontWeight: 800, fontSize: '0.95rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {activeTab === 'class-daily' ? 'Class Daily Report' : activeTab === 'class-monthly' ? 'Class Monthly Report' : activeTab === 'subject-monthly' ? 'Subject Monthly Report' : 'Student Monthly Report'}
            </div>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, opacity: 0.9, textAlign: 'right' }}>
              {activeTab === 'class-daily' && (
                <><span style={{ background: 'rgba(255,255,255,0.2)', borderRadius: '6px', padding: '0.2rem 0.6rem', marginRight: '0.5rem' }}>{new Date(selectedDate).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</span><span style={{ background: 'rgba(255,255,255,0.15)', borderRadius: '6px', padding: '0.2rem 0.6rem' }}>Class: {selectedStandard}</span></>
              )}
              {(activeTab === 'class-monthly' || activeTab === 'subject-monthly' || activeTab === 'student-monthly') && (
                <span style={{ background: 'rgba(255,255,255,0.2)', borderRadius: '6px', padding: '0.2rem 0.6rem' }}>{new Date(selectedMonth + '-02').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</span>
              )}
            </div>
          </div>
          
          <div style={{ flex: 1 }}>
            {activeTab === 'student-monthly' && (() => {
              // Build a full calendar for the selected month
              const attMap = {};
              (reportData.attendance || []).forEach(a => { attMap[a.date] = a.status; });
              const year = parseInt(selectedMonth.split('-')[0]);
              const month = parseInt(selectedMonth.split('-')[1]) - 1;
              const daysInMonth = new Date(year, month + 1, 0).getDate();
              const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0=Sun
              const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

              const presentCount = (reportData.attendance || []).filter(a => a.status === 'Present').length;
              const absentCount = (reportData.attendance || []).filter(a => a.status === 'Absent').length;
              const totalClasses = presentCount + absentCount;
              const pct = totalClasses > 0 ? ((presentCount / totalClasses) * 100).toFixed(1) : 'N/A';

              // Build calendar cells: empty slots + day cells
              const cells = [];
              for (let i = 0; i < firstDayOfWeek; i++) cells.push(null);
              for (let d = 1; d <= daysInMonth; d++) cells.push(d);

              return (
                <div className="card-base" style={{ padding: '1.25rem' }}>
                  {/* Student Info + Summary */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div>
                      <h3 style={{ fontSize: '1rem', color: '#1A237E', margin: 0 }}>{reportData.student?.name}</h3>
                      <p style={{ color: '#64748B', fontSize: '0.8rem', margin: '4px 0 0 0' }}>Standard: {reportData.student?.standard}</p>
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                      <div style={{ textAlign: 'center', background: '#DCFCE7', borderRadius: '8px', padding: '0.4rem 0.8rem' }}>
                        <div style={{ fontWeight: 800, color: '#059669', fontSize: '1.1rem' }}>{presentCount}</div>
                        <div style={{ fontSize: '0.65rem', color: '#059669' }}>Present</div>
                      </div>
                      <div style={{ textAlign: 'center', background: '#FEE2E2', borderRadius: '8px', padding: '0.4rem 0.8rem' }}>
                        <div style={{ fontWeight: 800, color: '#DC2626', fontSize: '1.1rem' }}>{absentCount}</div>
                        <div style={{ fontSize: '0.65rem', color: '#DC2626' }}>Absent</div>
                      </div>
                      <div style={{ textAlign: 'center', background: '#EFF6FF', borderRadius: '8px', padding: '0.4rem 0.8rem' }}>
                        <div style={{ fontWeight: 800, color: '#1D4ED8', fontSize: '1.1rem' }}>{pct}{pct !== 'N/A' ? '%' : ''}</div>
                        <div style={{ fontSize: '0.65rem', color: '#1D4ED8' }}>Attendance</div>
                      </div>
                    </div>
                  </div>

                  {/* Calendar Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '3px' }}>
                    {/* Day headers */}
                    {dayNames.map(d => (
                      <div key={d} style={{ textAlign: 'center', fontWeight: 700, fontSize: '0.7rem', color: '#64748B', padding: '0.3rem 0', textTransform: 'uppercase' }}>{d}</div>
                    ))}

                    {/* Calendar cells */}
                    {cells.map((day, i) => {
                      if (!day) return <div key={`empty-${i}`} />;
                      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                      const status = attMap[dateStr];
                      const bg = status === 'Present' ? '#10B981' : status === 'Absent' ? '#EF4444' : status === 'No Class' ? '#E2E8F0' : 'transparent';
                      const color = status === 'No Class' ? '#64748B' : status ? 'white' : '#94A3B8';
                      const label = status === 'Present' ? 'P' : status === 'Absent' ? 'A' : status === 'No Class' ? 'N' : '';
                      return (
                        <div key={dateStr} style={{ textAlign: 'center', borderRadius: '8px', padding: '0.4rem 0.2rem', background: bg, border: !status ? '1px dashed #E2E8F0' : 'none', minHeight: '44px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                          <div style={{ fontWeight: 700, fontSize: '0.8rem', color }}>{day}</div>
                          {label && <div style={{ fontSize: '0.6rem', color, fontWeight: 600 }}>{label}</div>}
                        </div>
                      );
                    })}
                  </div>

                  {/* Legend */}
                  <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)', flexWrap: 'wrap' }}>
                    {[['#10B981', 'Present'], ['#EF4444', 'Absent'], ['#E2E8F0', 'No Class'], ['transparent', 'No Record']].map(([bg, label]) => (
                      <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: '#64748B' }}>
                        <div style={{ width: '14px', height: '14px', borderRadius: '4px', background: bg, border: bg === 'transparent' ? '1px dashed #CBD5E1' : 'none' }} />
                        {label}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {activeTab === 'class-daily' && (
              <div className="card-base" style={{ padding: 0, overflow: 'hidden' }}>
                {/* Desktop Table */}
                <div className="desktop-only">
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#1A237E', color: 'white' }}>
                        <th style={{ padding: '0.75rem', textAlign: 'left' }}>Student Name</th>
                        <th style={{ padding: '0.75rem', textAlign: 'center' }}>ID</th>
                        <th style={{ padding: '0.75rem', textAlign: 'right' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Array.isArray(reportData) && reportData.map(s => (
                        <tr key={s.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                          <td style={{ padding: '0.75rem', fontWeight: 600 }}>{s.name}</td>
                          <td style={{ padding: '0.75rem', textAlign: 'center' }}>{s.id}</td>
                          <td style={{ padding: '0.75rem', textAlign: 'right', color: s.status === 'Present' ? '#059669' : '#DC2626', fontWeight: 700 }}>{s.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards */}
                <div className="mobile-only">
                  {Array.isArray(reportData) && reportData.map(s => (
                    <div key={s.id} style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                       <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{s.name}</div>
                       <div style={{ 
                         color: s.status === 'Present' ? '#059669' : (s.status === 'No Class' ? '#64748B' : '#DC2626'),
                         fontWeight: 800,
                         fontSize: '0.85rem'
                       }}>{s.status}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(activeTab === 'class-monthly' || activeTab === 'subject-monthly') && (
              <div className="card-base" style={{ padding: 0, overflow: 'hidden' }}>
                {/* Desktop Table */}
                <div className="desktop-only">
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#1A237E', color: 'white' }}>
                        <th style={{ padding: '0.75rem', textAlign: 'left' }}>Date</th>
                        <th style={{ padding: '0.75rem', textAlign: 'center' }}>Present</th>
                        <th style={{ padding: '0.75rem', textAlign: 'center' }}>Absent</th>
                        <th style={{ padding: '0.75rem', textAlign: 'right' }}>% Attendance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Array.isArray(reportData) && reportData.length === 0 ? (
                        <tr><td colSpan="4" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No records found.</td></tr>
                      ) : Array.isArray(reportData) && reportData.map(d => {
                        const total = d.present + d.absent;
                        const percentage = total > 0 ? ((d.present / total) * 100).toFixed(1) + '%' : 'N/A';
                        return (
                        <tr key={d.date} style={{ borderBottom: '1px solid #e2e8f0' }}>
                          <td style={{ padding: '0.75rem' }}>
                            {d.date}
                            {d.noClass > 0 && <span style={{ fontSize: '0.7rem', color: '#64748B', marginLeft: '10px' }}>(No Class)</span>}
                          </td>
                          <td style={{ padding: '0.75rem', textAlign: 'center' }}>{d.present}</td>
                          <td style={{ padding: '0.75rem', textAlign: 'center' }}>{d.absent}</td>
                          <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 700 }}>{percentage}</td>
                        </tr>
                      )})}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards */}
                <div className="mobile-only">
                  {Array.isArray(reportData) && reportData.map(d => {
                    const total = d.present + d.absent;
                    const percentage = total > 0 ? ((d.present / total) * 100).toFixed(0) + '%' : 'N/A';
                    return (
                      <div key={d.date} style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                         <div>
                            <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>{new Date(d.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>P: {d.present} | A: {d.absent}</div>
                         </div>
                         <div style={{ textAlign: 'right' }}>
                            <div style={{ fontWeight: 800, fontSize: '1rem', color: parseInt(percentage) > 75 ? '#059669' : '#DC2626' }}>{percentage}</div>
                            <div style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Attendance</div>
                         </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="print-only" style={{ marginTop: '50px', display: 'flex', justifyContent: 'flex-end' }}>
             <div style={{ textAlign: 'center' }}>
                <div style={{ width: '180px', borderBottom: '1px solid #000', marginBottom: '8px' }}></div>
                <div style={{ fontWeight: 700, fontSize: '14px' }}>Administrative Head</div>
             </div>
          </div>
        </div>
      )}

      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-header { display: block !important; }
          .print-only { display: block !important; }
          .card-base { border: none !important; box-shadow: none !important; width: 100% !important; margin: 0 !important; padding: 0 !important; background: white !important; height: auto !important; overflow: visible !important; }
          body { background: white !important; height: auto !important; overflow: visible !important; }
          .content-area { padding: 0 !important; position: static !important; height: auto !important; overflow: visible !important; }
          table { width: 100% !important; border: 1px solid #ddd !important; }
          th { background-color: #1A237E !important; color: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>
    </div>
  );
};

export default AttendanceReports;
