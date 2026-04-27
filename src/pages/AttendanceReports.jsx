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

        // Merge logic: If "Present" in ANY record for that date, student is Present.
        const mergedMap = {};
        (dailyAtt || []).forEach(a => {
           mergedMap[a.date] = a.status;
        });
        (subjectAtt || []).forEach(a => {
           // If already marked Present, keep it. If this one is Present, upgrade it.
           if (mergedMap[a.date] !== 'Present') {
             mergedMap[a.date] = a.status;
           }
        });

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

  const PrintHeader = ({ title }) => (
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
          <PrintHeader title={activeTab.split('-').join(' ').toUpperCase() + " REPORT"} />
          
          <div style={{ flex: 1 }}>
            {activeTab === 'student-monthly' && (
              <div className="card-base" style={{ padding: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
                  <div>
                    <h3 style={{ fontSize: '1rem', color: '#1A237E', margin: 0 }}>{reportData.student?.name}</h3>
                    <p style={{ color: '#64748B', fontSize: '0.8rem', margin: '4px 0 0 0' }}>Standard: {reportData.student?.standard}</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontWeight: 700, fontSize: '0.85rem', margin: 0 }}>{new Date(selectedMonth + '-02').toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}</p>
                  </div>
                </div>
                {reportData.attendance.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>No attendance records found.</p>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(40px, 1fr))', gap: '4px' }}>
                    {reportData.attendance.map(a => (
                      <div key={a.date} style={{ 
                        padding: '0.4rem 0', 
                        textAlign: 'center', 
                        borderRadius: '6px', 
                        background: a.status === 'Present' ? '#10B981' : a.status === 'No Class' ? '#F1F5F9' : '#EF4444', 
                        color: a.status === 'No Class' ? '#64748B' : 'white', 
                        fontSize: '0.7rem',
                        border: a.status === 'No Class' ? '1px solid var(--border-color)' : 'none'
                      }}>
                        <div style={{ fontWeight: 800 }}>{a.date.split('-')[2]}</div>
                        <div style={{ fontSize: '0.6rem' }}>{a.status === 'Present' ? 'P' : a.status === 'No Class' ? 'N' : 'A'}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

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
