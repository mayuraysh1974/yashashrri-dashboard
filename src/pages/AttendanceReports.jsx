import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
  LineChart, Line
} from 'recharts';
import { FiPrinter, FiCalendar, FiUser, FiLayers, FiFileText, FiBook } from 'react-icons/fi';

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
    fetchStandards();
    fetchStudents();
    fetchSubjects();
  }, []);

  const fetchStandards = async () => {
    const token = localStorage.getItem('token');
    const res = await fetch('/api/standards', { headers: { 'Authorization': `Bearer ${token}` } });
    if (res.ok) setStandards(await res.json());
  };

  const fetchStudents = async () => {
    const token = localStorage.getItem('token');
    const res = await fetch('/api/students', { headers: { 'Authorization': `Bearer ${token}` } });
    if (res.ok) setStudents(await res.json());
  };

  const fetchSubjects = async () => {
    const token = localStorage.getItem('token');
    const res = await fetch('/api/subjects', { headers: { 'Authorization': `Bearer ${token}` } });
    if (res.ok) setSubjects(await res.json());
  };

  const fetchReportData = async () => {
    setLoading(true);
    const token = localStorage.getItem('token');
    let url = '';
    if (activeTab === 'student-monthly') {
        if (!selectedStudent) { alert('Select student'); setLoading(false); return; }
        url = `/api/reports/attendance/student-monthly?studentId=${selectedStudent}&month=${selectedMonth}`;
    } else if (activeTab === 'class-daily') {
        if (!selectedStandard) { alert('Select standard'); setLoading(false); return; }
        url = `/api/reports/attendance/class-daily?date=${selectedDate}&standard=${selectedStandard}`;
    } else if (activeTab === 'class-monthly') {
        if (!selectedStandard) { alert('Select standard'); setLoading(false); return; }
        url = `/api/reports/attendance/class-monthly?month=${selectedMonth}&standard=${selectedStandard}`;
    } else if (activeTab === 'subject-monthly') {
        if (!selectedSubject) { alert('Select subject'); setLoading(false); return; }
        url = `/api/reports/attendance/subject-monthly?month=${selectedMonth}&subjectId=${selectedSubject}`;
    }

    const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
    if (res.ok) setReportData(await res.json());
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
        Contact: +91 73874 20737 | Email: mayuraysh1974@gmail.com
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

      <div className="card-base no-print" style={{ marginBottom: '1.5rem', padding: '0.5rem', display: 'flex', gap: '1rem', backgroundColor: 'var(--bg-main)', borderRadius: '12px' }}>
          {[
            { id: 'student-monthly', label: 'Student Monthly' },
            { id: 'class-daily', label: 'Daily Class-wise' },
            { id: 'class-monthly', label: 'Monthly Class-wise' },
            { id: 'subject-monthly', label: 'Subject-wise Monthly' }
          ].map(tab => (
            <button 
              key={tab.id}
              style={{ padding: '0.6rem 1.2rem', borderRadius: '8px', border: 'none', background: activeTab === tab.id ? 'var(--bg-surface)' : 'transparent', color: activeTab === tab.id ? 'var(--primary-blue)' : 'var(--text-secondary)', fontWeight: 600, cursor: 'pointer', boxShadow: activeTab === tab.id ? 'var(--shadow-sm)' : 'none' }}
              onClick={() => { setActiveTab(tab.id); setReportData(null); }}
            >{tab.label}</button>
          ))}
      </div>

      <div className="card-base no-print" style={{ padding: '1.25rem', marginBottom: '1.5rem', display: 'flex', gap: '1.5rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          {activeTab === 'student-monthly' && (
            <div className="input-group" style={{ width: '250px', marginBottom: 0 }}>
              <label><FiUser /> Student</label>
              <select value={selectedStudent} onChange={e => setSelectedStudent(e.target.value)}>
                <option value="">Choose Student...</option>
                {students.map(s => <option key={s.id} value={s.id}>{s.name} ({s.standard})</option>)}
              </select>
            </div>
          )}
          {(activeTab === 'class-daily' || activeTab === 'class-monthly') && (
            <div className="input-group" style={{ width: '200px', marginBottom: 0 }}>
              <label><FiLayers /> Standard</label>
              <select value={selectedStandard} onChange={e => setSelectedStandard(e.target.value)}>
                <option value="">Choose Class...</option>
                {standards.map(s => <option key={s.id} value={s.standard}>{s.standard}</option>)}
              </select>
            </div>
          )}
          {activeTab === 'subject-monthly' && (
            <div className="input-group" style={{ width: '220px', marginBottom: 0 }}>
              <label><FiBook /> Subject</label>
              <select value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)}>
                <option value="">Choose Subject...</option>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          )}
          {(activeTab === 'student-monthly' || activeTab === 'class-monthly' || activeTab === 'subject-monthly') && (
            <div className="input-group" style={{ width: '180px', marginBottom: 0 }}>
              <label><FiCalendar /> Select Month</label>
              <input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} />
            </div>
          )}
          {activeTab === 'class-daily' && (
            <div className="input-group" style={{ width: '180px', marginBottom: 0 }}>
              <label><FiCalendar /> Select Date</label>
              <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} />
            </div>
          )}
          <button className="btn-primary" onClick={fetchReportData} disabled={loading}>{loading ? 'Generating...' : 'Generate Report'}</button>
      </div>

      {reportData && (
        <div className="card-base" style={{ flex: 1, padding: '2rem', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          <PrintHeader title={activeTab.split('-').join(' ').toUpperCase() + " REPORT"} />
          
          <div style={{ flex: 1 }}>
            {activeTab === 'student-monthly' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
                  <div>
                    <h3 style={{ fontSize: '1.2rem', color: '#1A237E' }}>{reportData.student.name}</h3>
                    <p style={{ color: '#475569' }}>Standard: {reportData.student.standard}</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontWeight: 600 }}>Period: {selectedMonth}</p>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(60px, 1fr))', gap: '5px' }}>
                  {reportData.attendance.map(a => (
                    <div key={a.date} style={{ 
                      padding: '0.5rem', 
                      textAlign: 'center', 
                      borderRadius: '4px', 
                      background: a.status === 'Present' ? '#10B981' : a.status === 'No Class' ? '#94A3B8' : '#EF4444', 
                      color: 'white', 
                      fontSize: '0.8rem' 
                    }}>
                      <div style={{ fontWeight: 800 }}>{a.date.split('-')[2]}</div>
                      <div>{a.status === 'Present' ? 'P' : a.status === 'No Class' ? 'N' : 'A'}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'class-daily' && (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#1A237E', color: 'white' }}>
                    <th style={{ padding: '1rem', textAlign: 'left' }}>Student Name</th>
                    <th style={{ padding: '1rem', textAlign: 'center' }}>Role/ID</th>
                    <th style={{ padding: '1rem', textAlign: 'right' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.map(s => (
                    <tr key={s.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '1rem', fontWeight: 600 }}>{s.name}</td>
                      <td style={{ padding: '1rem', textAlign: 'center' }}>{s.id}</td>
                      <td style={{ padding: '1rem', textAlign: 'right', color: s.status === 'Present' ? '#059669' : '#DC2626', fontWeight: 700 }}>{s.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {(activeTab === 'class-monthly' || activeTab === 'subject-monthly') && (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#1A237E', color: 'white' }}>
                    <th style={{ padding: '1rem', textAlign: 'left' }}>Date</th>
                    <th style={{ padding: '1rem', textAlign: 'center' }}>Present</th>
                    <th style={{ padding: '1rem', textAlign: 'center' }}>Absent</th>
                    <th style={{ padding: '1rem', textAlign: 'right' }}>% Attendance</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.map(d => {
                    const total = d.present + d.absent;
                    const percentage = total > 0 ? ((d.present / total) * 100).toFixed(1) + '%' : 'N/A';
                    return (
                    <tr key={d.date} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '1rem' }}>
                        {d.date}
                        {d.noClass > 0 && <span style={{ fontSize: '0.7rem', color: '#64748B', marginLeft: '10px' }}>(No Class)</span>}
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'center' }}>{d.present}</td>
                      <td style={{ padding: '1rem', textAlign: 'center' }}>{d.absent}</td>
                      <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 700 }}>{percentage}</td>
                    </tr>
                  )})}
                </tbody>
              </table>
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
          .card-base { border: none !important; box-shadow: none !important; width: 100% !important; margin: 0 !important; padding: 0 !important; }
          body { background: white !important; }
          .content-area { padding: 0 !important; position: static !important; }
          table { width: 100% !important; border: 1px solid #ddd !important; }
          th { background-color: #1A237E !important; color: white !important; -webkit-print-color-adjust: exact; }
        }
      `}</style>
    </div>
  );
};

export default AttendanceReports;
