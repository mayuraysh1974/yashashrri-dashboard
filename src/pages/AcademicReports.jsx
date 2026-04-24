import React, { useState, useEffect } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
  BarChart, Bar, Cell
} from 'recharts';
import { FiPrinter, FiSearch, FiCalendar, FiBook, FiUser, FiTrendingUp, FiCheckCircle, FiXCircle, FiBarChart2, FiArrowRight, FiDownload } from 'react-icons/fi';
import { supabase } from '../supabaseClient';

const AcademicReports = () => {
  const [activeTab, setActiveTab] = useState('monthly'); // 'monthly' or 'student'
  const [loading, setLoading] = useState(false);
  const [subjects, setSubjects] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [selectedTestId, setSelectedTestId] = useState('all');
  const [selectedStandard, setSelectedStandard] = useState('');
  const [standards, setStandards] = useState([]);
  const [printOrientation, setPrintOrientation] = useState('portrait'); // 'portrait' or 'landscape'
  
  const [reportData, setReportData] = useState({ tests: [], performance: [], results: [] });
  const [debugStatus, setDebugStatus] = useState('');
  const [studentStats, setStudentStats] = useState({ 
    progress: [], 
    summary: { totalTests: 0, passCount: 0, failCount: 0, avgPercentage: 0 } 
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    const { data: subData } = await supabase.from('subjects').select('*').order('name');
    const { data: studData } = await supabase.from('students').select('id, name, standard').order('name');
    const { data: stdData } = await supabase.from('standards').select('*').order('standard');
    
    setSubjects(subData || []);
    setStudents(studData || []);
    setStandards(stdData || []);
    if (subData?.length > 0) setSelectedSubject(subData[0].name);
  };

  useEffect(() => {
    if (activeTab === 'monthly' && selectedSubject && selectedMonth) {
      fetchMonthlyReport();
    } else if (activeTab === 'student' && selectedStudent) {
      fetchStudentProgress();
    }
  }, [activeTab, selectedSubject, selectedMonth, selectedStudent]);

  const fetchMonthlyReport = async () => {
    setLoading(true);
    try {
      // Fetch tests for this subject and month
      // Robust date range for the month
      const startOfMonth = `${selectedMonth}-01`;
      const dateObj = new Date(selectedMonth + '-01');
      dateObj.setMonth(dateObj.getMonth() + 1);
      const endOfMonth = dateObj.toISOString().slice(0, 10);

      const { data: tests } = await supabase
        .from('tests')
        .select('*')
        .contains('subjects', [selectedSubject])
        .gte('date', startOfMonth)
        .lt('date', endOfMonth)
        .order('date', { ascending: true });

      if (!tests || tests.length === 0) {
        setReportData({ tests: [], performance: [] });
        setLoading(false);
        return;
      }

      const testIds = tests.map(t => t.id);
      const { data: results } = await supabase
        .from('test_results')
        .select('*, students(name)')
        .in('test_id', testIds);

      const performance = tests.map(test => {
        const testResults = results.filter(r => r.test_id === test.id);
        const avg = testResults.length > 0 
          ? testResults.reduce((sum, r) => sum + (r.score === -1 ? 0 : r.score), 0) / testResults.length 
          : 0;
        const passCount = testResults.filter(r => r.score >= (test.min_marks || 0)).length;
        
        return {
          name: test.name,
          date: test.date,
          avg: Math.round((avg / test.total_marks) * 100),
          passing: Math.round((passCount / (testResults.length || 1)) * 100),
          totalStudents: testResults.length
        };
      });

      setReportData({ tests, performance, results: results || [] });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStudentProgress = async () => {
    if (!selectedStudent) return;
    setLoading(true);
    setDebugStatus(`Searching for results for: ${selectedStudent.name} (ID: ${selectedStudent.id})...`);
    
    try {
      const cleanId = String(selectedStudent.id).trim();
      
      // Fetch results with an explicit query
      const { data: results, error: fetchError } = await supabase
        .from('test_results')
        .select(`
          id,
          score,
          test_id,
          student_id,
          tests:test_id (
            id,
            name,
            total_marks,
            min_marks,
            date,
            subjects,
            subject
          )
        `)
        .eq('student_id', cleanId);
        
      if (fetchError) throw fetchError;

      const dataResults = results || [];
      setDebugStatus(`Found ${dataResults.length} raw records for this student.`);

      const progress = dataResults
        .filter(r => r.tests)
        .map(r => {
          const test = Array.isArray(r.tests) ? r.tests[0] : r.tests;
          const score = Number(r.score);
          const actualScore = score === -1 ? 0 : score;
          
          return {
            name: test?.name || 'Unknown Test',
            score: actualScore,
            isAbsent: score === -1,
            percentage: test && test.total_marks ? Math.round((actualScore / test.total_marks) * 100) : 0,
            minMarks: test && test.total_marks ? Math.round(((test.min_marks || 0) / test.total_marks) * 100) : 0,
            date: test?.date || '',
            subject: Array.isArray(test?.subjects) ? test.subjects[0] : (test?.subject || 'N/A'),
            totalMarks: test?.total_marks || 0
          };
        })
        .sort((a, b) => new Date(a.date) - new Date(b.date));

      const totalTests = progress.length;
      const passCount = progress.filter(p => !p.isAbsent && p.score >= (p.totalMarks * (p.minMarks / 100))).length;
      
      const avgPercentage = progress.length > 0 
        ? progress.reduce((sum, p) => sum + (p.percentage || 0), 0) / progress.length 
        : 0;

      setStudentStats({ 
        progress, 
        summary: { totalTests, passCount, failCount: totalTests - passCount, avgPercentage: Math.round(avgPercentage) } 
      });
      
      if (progress.length === 0 && dataResults.length > 0) {
        setDebugStatus(`Warning: Found ${dataResults.length} results but could not link them to Test details.`);
      }
    } catch (err) {
      console.error(err);
      setDebugStatus(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

    // 1. Use the manually selected orientation
    const isLandscape = printOrientation === 'landscape';
    
    // 2. Inject a dynamic style tag for the @page orientation
    const styleId = 'dynamic-print-style';
    let styleTag = document.getElementById(styleId);
    if (!styleTag) {
      styleTag = document.createElement('style');
      styleTag.id = styleId;
      document.head.appendChild(styleTag);
    }
    
    styleTag.innerHTML = `
      @media print {
        @page { 
          size: A4 ${isLandscape ? 'landscape' : 'portrait'}; 
          margin: 10mm; 
        }
      }
    `;
    
    // 3. Trigger print
    setTimeout(() => {
      window.print();
    }, 150);
  };

  const PrintHeader = ({ title, subTitle, studentDetails }) => (
    <div className="print-only" style={{ textAlign: 'center', marginBottom: '30px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <img src="/logo.png" alt="Yashashrri Logo" style={{ height: '70px', width: 'auto' }} />
        <div style={{ textAlign: 'right', fontSize: '10px', color: '#64748B', lineHeight: '1.4' }}>
          <div style={{ fontSize: '16px', fontWeight: 800, color: '#1A237E', marginBottom: '4px' }}>YASHASHRRI CLASSES</div>
          <div>ESTD 1999 | Reg. No: MAH/PUNE/123/2010</div>
          <div>Talegaon Dabhade, Pune - 410506</div>
          <div>Mob: +91 73874 20737 | www.yashashrri.com</div>
        </div>
      </div>
      
      <div style={{ borderTop: '2px solid #1A237E', borderBottom: '2px solid #1A237E', padding: '10px 0', margin: '15px 0', backgroundColor: '#F8FAFC' }}>
        <h2 style={{ fontSize: '20px', color: '#1A237E', margin: 0, textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 900 }}>{title}</h2>
      </div>

      {studentDetails && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr', gap: '15px', textAlign: 'left', marginBottom: '25px', padding: '15px', border: '1px solid #E2E8F0', borderRadius: '8px' }}>
          <div>
            <div style={{ fontSize: '9px', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Student Full Name</div>
            <div style={{ fontSize: '14px', fontWeight: 800, color: '#1A237E' }}>{studentDetails.name}</div>
          </div>
          <div>
            <div style={{ fontSize: '9px', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Academic Standard</div>
            <div style={{ fontSize: '14px', fontWeight: 800, color: '#1A237E' }}>{studentDetails.standard}</div>
          </div>
          <div>
            <div style={{ fontSize: '9px', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Unique Student ID</div>
            <div style={{ fontSize: '14px', fontWeight: 800, color: '#1A237E' }}>{studentDetails.id}</div>
          </div>
        </div>
      )}
      
      {!studentDetails && subTitle && <div style={{ fontSize: '14px', color: '#475569', fontWeight: 700, backgroundColor: '#F8FAFC', padding: '10px', borderRadius: '8px', border: '1px solid #E2E8F0', display: 'inline-block' }}>{subTitle}</div>}
    </div>
  );

  const PrintFooter = () => (
    <div className="print-only" style={{ marginTop: '40px', display: 'flex', justifyContent: 'space-between', borderTop: '2px solid #1A237E', paddingTop: '20px' }}>
      <div className="AcademicNote">
        <strong>Academic Note:</strong><br />
        1. This report is based on internal tests conducted for continuous assessment.<br />
        2. Graphical analysis represents performance relative to class averages and passing thresholds.<br />
        3. For detailed career guidance, please contact the faculty coordinator.
      </div>
      <div className="signatory-box">
        <div style={{ width: '100%', borderBottom: '1px solid #000', marginBottom: '10px' }}></div>
        <div style={{ fontSize: '13px', fontWeight: 800, color: '#1A237E' }}>Authorized Signatory</div>
        <div style={{ fontSize: '11px', color: '#64748B' }}>Yashashrri Classes Academic Dept.</div>
      </div>
    </div>
  );

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="page-header no-print">
        <div>
          <h1 className="page-title">Academic Performance Reports</h1>
          <p className="page-subtitle">Detailed test analytics and student progress tracking</p>
        </div>
        <button className="btn-secondary" onClick={() => window.print()}>
          <FiPrinter /> Print / Export PDF
        </button>
      </div>

      <div className="card-base no-print" style={{ 
        marginBottom: '1.5rem', 
        padding: '1rem', 
        display: 'flex', 
        flexDirection: 'column',
        gap: '1rem', 
        backgroundColor: 'var(--bg-main)', 
        borderRadius: '12px' 
      }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center',
          background: '#F1F5F9', 
          padding: '0.3rem', 
          borderRadius: '10px',
          width: '100%'
        }}>
          <button 
            onClick={() => setActiveTab('monthly')}
            style={{ 
              flex: 1,
              backgroundColor: activeTab === 'monthly' ? 'white' : 'transparent',
              color: activeTab === 'monthly' ? 'var(--primary-blue)' : 'var(--text-secondary)',
              boxShadow: activeTab === 'monthly' ? 'var(--shadow-sm)' : 'none',
              padding: '0.6rem', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem'
            }}
          >
            Monthly Report
          </button>
          <button 
            onClick={() => setActiveTab('student')}
            style={{ 
              flex: 1,
              backgroundColor: activeTab === 'student' ? 'white' : 'transparent',
              color: activeTab === 'student' ? 'var(--primary-blue)' : 'var(--text-secondary)',
              boxShadow: activeTab === 'student' ? 'white' : 'none',
              padding: '0.6rem', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem'
            }}
          >
            Progress Analysis
          </button>
        </div>

        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', 
          gap: '1rem',
          width: '100%'
        }}>
          {activeTab === 'monthly' ? (
            <>
              <select 
                value={selectedSubject} 
                onChange={e => { setSelectedSubject(e.target.value); setSelectedTestId('all'); }}
                className="input-base"
                style={{ width: '100%' }}
              >
                <option value="">Select Subject...</option>
                {subjects.map(sub => <option key={sub.id} value={sub.name}>{sub.name}</option>)}
              </select>
              <input 
                type="month" 
                value={selectedMonth} 
                onChange={e => { setSelectedMonth(e.target.value); setSelectedTestId('all'); }}
                className="input-base"
                style={{ width: '100%' }}
              />
              <select 
                value={selectedTestId} 
                onChange={e => setSelectedTestId(e.target.value)}
                className="input-base"
                style={{ width: '100%' }}
                disabled={reportData.tests.length === 0}
              >
                <option value="all">All Tests</option>
                {reportData.tests.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </>
          ) : (
            <>
              <select 
                value={selectedStandard} 
                onChange={e => { setSelectedStandard(e.target.value); setSelectedStudent(null); }}
                className="input-base"
                style={{ width: '100%' }}
              >
                <option value="">Select Class...</option>
                {standards.map(s => <option key={s.id} value={s.standard}>{s.standard}</option>)}
              </select>
              <select 
                value={selectedStudent?.id || ''} 
                onChange={e => {
                  const student = students.find(s => s.id === e.target.value);
                  setSelectedStudent(student);
                }}
                className="input-base"
                style={{ width: '100%' }}
                disabled={!selectedStandard}
              >
                <option value="">Select Student...</option>
                {students.filter(s => s.standard === selectedStandard).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </>
          )}
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0 0.5rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>Print Mode:</span>
            <div style={{ display: 'flex', backgroundColor: '#F1F5F9', padding: '0.2rem', borderRadius: '6px' }}>
              <button 
                onClick={() => setPrintOrientation('portrait')}
                style={{ 
                  padding: '0.3rem 0.6rem', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 600,
                  backgroundColor: printOrientation === 'portrait' ? 'white' : 'transparent',
                  color: printOrientation === 'portrait' ? 'var(--primary-blue)' : 'var(--text-secondary)',
                  boxShadow: printOrientation === 'portrait' ? 'var(--shadow-sm)' : 'none'
                }}
              >
                Portrait
              </button>
              <button 
                onClick={() => setPrintOrientation('landscape')}
                style={{ 
                  padding: '0.3rem 0.6rem', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 600,
                  backgroundColor: printOrientation === 'landscape' ? 'white' : 'transparent',
                  color: printOrientation === 'landscape' ? 'var(--primary-blue)' : 'var(--text-secondary)',
                  boxShadow: printOrientation === 'landscape' ? 'var(--shadow-sm)' : 'none'
                }}
              >
                Landscape
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="card-base report-content-area" style={{ 
        flex: 1, 
        display: 'flex', 
        flexDirection: 'column', 
        overflowY: 'auto', 
        position: 'relative',
        padding: 0,
        background: 'transparent',
        border: 'none',
        boxShadow: 'none'
      }}>
        {loading && (
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(255,255,255,0.7)', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem' }}>
             <div className="spinner" style={{ width: '40px', height: '40px', border: '4px solid #f3f3f3', borderTop: '4px solid var(--primary-blue)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
             <p style={{ fontWeight: 600, color: 'var(--primary-blue)' }}>Fetching Performance Data...</p>
          </div>
        )}

        {activeTab === 'monthly' ? (
          <div className="card-base" style={{ padding: '1rem' }}>
            <PrintHeader 
              title={selectedTestId === 'all' ? "Monthly Academic Performance Report" : "Specific Test Performance Report"} 
              subTitle={selectedTestId === 'all' ? 
                `Subject: ${selectedSubject} | Period: ${new Date(selectedMonth + '-02').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}` : 
                (() => {
                  const t = reportData.tests.find(t => String(t.id) === String(selectedTestId));
                  return t ? `Test: ${t.name} | Date: ${new Date(t.date).toLocaleDateString()}` : `Subject: ${selectedSubject}`;
                })()
              } 
            />
            
            {!loading && reportData.tests.length === 0 ? <div style={{ textAlign: 'center', padding: '4rem' }}><FiBook size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} /><p>No tests found for selected subject and month.</p></div> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 350px), 1fr))', gap: '1.5rem' }}>
                  <div className="card-base no-print" style={{ padding: '1.5rem', minHeight: '300px' }}>
                    <h3 style={{ fontSize: '1rem', color: 'var(--primary-blue)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><FiTrendingUp /> Avg. Performance Trend (%)</h3>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={reportData.performance.filter((_, idx) => selectedTestId === 'all' || String(reportData.tests[idx]?.id) === String(selectedTestId))}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" fontSize={10} padding={{ left: 10, right: 10 }} />
                        <YAxis tickFormatter={t => `${t}%`} domain={[0, 100]} fontSize={10} width={40} />
                        <Tooltip formatter={(value) => [`${value}%`, 'Avg. Performance']} />
                        <Bar dataKey="avg" name="Avg. Performance" fill="var(--primary-blue)" radius={[4, 4, 0, 0]} barSize={selectedTestId === 'all' ? undefined : 60} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="card-base no-print" style={{ padding: '1.5rem', minHeight: '300px' }}>
                    <h3 style={{ fontSize: '1rem', color: 'var(--primary-blue)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><FiCheckCircle /> Student Passing Ratio (%)</h3>
                    <ResponsiveContainer width="100%" height={250}>
                      <LineChart data={reportData.performance.filter((_, idx) => selectedTestId === 'all' || String(reportData.tests[idx]?.id) === String(selectedTestId))}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" fontSize={10} padding={{ left: 10, right: 10 }} />
                        <YAxis tickFormatter={t => `${t}%`} domain={[0, 100]} fontSize={10} width={40} />
                        <Tooltip formatter={(value) => [`${value}%`, 'Passing Ratio']} />
                        <Line type="monotone" dataKey="passing" name="Passing Ratio" stroke="var(--success-green)" strokeWidth={3} dot={{ r: 6 }} activeDot={{ r: 8 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '650px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#1A237E', color: 'white', textAlign: 'left' }}>
                      <th style={{ padding: '1rem' }}>Test Name</th>
                      <th style={{ padding: '1rem' }}>Date</th>
                      <th style={{ padding: '1rem' }}>Total Marks</th>
                      <th style={{ padding: '1rem' }}>Passing Marks</th>
                      <th style={{ padding: '1rem', textAlign: 'right' }}>Avg. Score</th>
                      <th style={{ padding: '1rem', textAlign: 'right' }}>Pass Ratio</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.tests
                      .filter(t => selectedTestId === 'all' || String(t.id) === String(selectedTestId))
                      .map((test) => {
                        const originalIdx = reportData.tests.findIndex(t => String(t.id) === String(test.id));
                        const perf = reportData.performance[originalIdx];
                        const testResults = reportData.results.filter(r => String(r.test_id) === String(test.id));
                        const maxScore = testResults.length > 0 ? Math.max(...testResults.map(r => r.score)) : 0;
                      
                      return (
                        <React.Fragment key={test.id}>
                          <tr style={{ backgroundColor: 'var(--bg-main)', borderBottom: '1px solid var(--border-color)' }}>
                            <td style={{ padding: '1rem', fontWeight: 700 }}>{test.name}</td>
                            <td style={{ padding: '1rem' }}>{new Date(test.date).toLocaleDateString()}</td>
                            <td style={{ padding: '1rem' }}>{test.total_marks}</td>
                            <td style={{ padding: '1rem' }}>{test.min_marks}</td>
                            <td style={{ padding: '1rem', textAlign: 'right', color: 'var(--primary-blue)', fontWeight: 700 }}>{perf?.avg}%</td>
                            <td style={{ padding: '1rem', textAlign: 'right', color: 'var(--success-green)', fontWeight: 700 }}>{perf?.passing}%</td>
                          </tr>
                          <tr>
                            <td colSpan="6" style={{ padding: '0 1rem 1rem 1rem' }}>
                               <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '0.4rem', marginTop: '0.2rem' }}>
                                  <div className="no-print" style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-secondary)', marginBottom: '0.3rem', textTransform: 'uppercase' }}>Student-wise Breakdown</div>
                                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '0.3rem' }}>
                                    {testResults.sort((a,b) => b.score - a.score).map(res => {
                                      const isAbsent = res.score === -1;
                                      const isTop = res.score === maxScore && maxScore > 0;
                                      const isFail = !isAbsent && res.score < (test.min_marks || 0);
                                      
                                      let bgColor = 'white';
                                      let borderColor = '#E2E8F0';
                                      let textColor = 'inherit';
                                      let borderStyle = 'solid';
                                      let opacity = 1;

                                      if (isAbsent) { 
                                        bgColor = '#F8FAFC'; 
                                        borderColor = '#CBD5E1'; 
                                        borderStyle = 'dashed'; 
                                        textColor = '#64748B';
                                        opacity = 0.8;
                                      }
                                      else if (isTop) { bgColor = '#FFFBEB'; borderColor = '#F59E0B'; textColor = '#B45309'; }
                                      else if (isFail) { bgColor = '#FEF2F2'; borderColor = '#FECACA'; textColor = '#EF4444'; }

                                      return (
                                        <div key={res.id} style={{ 
                                          padding: '0.4rem 0.8rem', 
                                          borderRadius: '6px', 
                                          border: `1px ${borderStyle} ${borderColor}`, 
                                          backgroundColor: bgColor, 
                                          color: textColor,
                                          display: 'flex', 
                                          justifyContent: 'space-between', 
                                          alignItems: 'center', 
                                          fontSize: '0.8rem', 
                                          opacity,
                                          WebkitPrintColorAdjust: 'exact', 
                                          printColorAdjust: 'exact' 
                                        }}>
                                          <span style={{ fontWeight: 600 }}>{res.students?.name}</span>
                                          <span style={{ fontWeight: 800 }}>
                                            {isAbsent ? 'AB' : res.score}
                                            {isTop && <span style={{ marginLeft: '4px', fontSize: '0.6rem', backgroundColor: '#F59E0B', color: 'white', padding: '1px 3px', borderRadius: '3px', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>TOP</span>}
                                          </span>
                                        </div>
                                      );
                                    })}
                                  </div>
                               </div>
                            </td>
                          </tr>
                        </React.Fragment>
                      )
                    })}
                  </tbody>
                </table>
                <PrintFooter />
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="student-report-wrapper" style={{ padding: 0 }}>
            {selectedStudent ? (
              <div className="animate-in student-report-container" style={{ padding: '1rem' }}>
                <PrintHeader 
                  title="STATEMENT OF ACADEMIC PERFORMANCE" 
                  studentDetails={selectedStudent}
                />
                
                {/* Dashboard Stats */}
                <div className="stats-grid-compact" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
                   <div className="card-base" style={{ padding: '1rem', textAlign: 'center', backgroundColor: '#F8FAFC' }}>
                      <p style={{ fontSize: '0.65rem', color: '#64748B', fontWeight: 800, textTransform: 'uppercase', marginBottom: '0.25rem' }}>Tests Attempted</p>
                      <h2 style={{ color: '#1A237E', margin: 0, fontSize: '1.5rem' }}>{studentStats.summary.totalTests}</h2>
                   </div>
                   <div className="card-base" style={{ padding: '1rem', textAlign: 'center', backgroundColor: '#F8FAFC' }}>
                      <p style={{ fontSize: '0.65rem', color: '#64748B', fontWeight: 800, textTransform: 'uppercase', marginBottom: '0.25rem' }}>Avg. Percentage</p>
                      <h2 style={{ color: '#B8860B', margin: 0, fontSize: '1.5rem' }}>{studentStats.summary.avgPercentage}%</h2>
                   </div>
                   <div className="card-base" style={{ padding: '1rem', textAlign: 'center', backgroundColor: '#ECFDF5', borderLeft: '4px solid #10B981' }}>
                      <p style={{ fontSize: '0.65rem', color: '#047857', fontWeight: 800, textTransform: 'uppercase', marginBottom: '0.25rem' }}>Tests Cleared</p>
                      <h2 style={{ color: '#059669', margin: 0, fontSize: '1.5rem' }}>{studentStats.summary.passCount}</h2>
                   </div>
                </div>

                {/* Performance Chart */}
                <div className="card-base chart-container-card" style={{ padding: '1.25rem', marginBottom: '1.5rem', minHeight: '300px' }}>
                  <h3 style={{ fontSize: '1rem', color: '#1A237E', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <FiTrendingUp style={{ color: '#B8860B' }} /> Performance Progress Curve
                  </h3>
                  <div style={{ height: '240px', width: '100%' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={studentStats.progress}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                        <XAxis dataKey="name" fontSize={9} tick={{ fill: '#64748B' }} padding={{ left: 10, right: 10 }} />
                        <YAxis tickFormatter={t => `${t}%`} fontSize={9} tick={{ fill: '#64748B' }} domain={[0, 100]} width={35} />
                        <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 8px 24px rgba(0,0,0,0.1)', fontSize: '10px' }} />
                        <Legend verticalAlign="bottom" height={36} iconSize={10} wrapperStyle={{ fontSize: '10px' }} />
                        <Line type="monotone" dataKey="percentage" name="Student Score %" stroke="#1A237E" strokeWidth={3} dot={{ r: 4, fill: '#1A237E', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
                        <Line type="step" dataKey="minMarks" name="Passing %" stroke="#EF4444" strokeDasharray="6 4" strokeWidth={1.5} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Marks Table */}
                <div className="card-base" style={{ padding: '0', overflow: 'hidden', border: '1px solid #E2E8F0' }}>
                   {/* Desktop Table */}
                   <div className="desktop-only">
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#F8FAFC', color: '#475569' }}>
                          <th style={{ padding: '1rem', fontSize: '0.75rem', fontWeight: 800 }}>TEST NAME</th>
                          <th style={{ padding: '1rem', fontSize: '0.75rem', fontWeight: 800 }}>SUBJECT</th>
                          <th style={{ padding: '1rem', fontSize: '0.75rem', fontWeight: 800 }}>DATE</th>
                          <th style={{ padding: '1rem', fontSize: '0.75rem', fontWeight: 800, textAlign: 'right' }}>SCORE</th>
                          <th style={{ padding: '1rem', fontSize: '0.75rem', fontWeight: 800, textAlign: 'center' }}>RESULT</th>
                        </tr>
                      </thead>
                      <tbody>
                        {studentStats.progress.length === 0 ? (
                          <tr><td colSpan="5" style={{ padding: '2rem', textAlign: 'center', color: '#94A3B8' }}>No test records found.</td></tr>
                        ) : studentStats.progress.map((p, idx) => {
                          const isAbsent = p.isAbsent;
                          const isFail = p.percentage < p.minMarks;
                          return (
                            <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9', backgroundColor: isAbsent ? '#F8FAFC' : 'white' }}>
                              <td style={{ padding: '0.75rem 1rem', fontWeight: 600, fontSize: '0.85rem' }}>{p.name}</td>
                              <td style={{ padding: '0.75rem 1rem', color: '#64748B', fontSize: '0.8rem' }}>{p.subject}</td>
                              <td style={{ padding: '0.75rem 1rem', color: '#64748B', fontSize: '0.8rem' }}>{new Date(p.date).toLocaleDateString()}</td>
                              <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 700, fontSize: '0.85rem', color: isFail ? '#EF4444' : '#10B981' }}>
                                {isAbsent ? 'ABSENT' : `${p.score}/${p.totalMarks}`}
                              </td>
                              <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                                <span style={{ 
                                  color: isAbsent ? '#94A3B8' : (!isFail ? '#059669' : '#DC2626'), 
                                  backgroundColor: isAbsent ? '#F1F5F9' : (!isFail ? '#D1FAE5' : '#FEE2E2'), 
                                  padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 800 
                                }}>
                                  {isAbsent ? 'ABS' : (!isFail ? 'PASSED' : 'FAILED')}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                   </div>

                   {/* Mobile Cards */}
                   <div className="mobile-only" style={{ padding: '0.75rem' }}>
                      {studentStats.progress.map((p, idx) => (
                        <div key={idx} style={{ padding: '0.75rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                           <div>
                             <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>{p.name}</div>
                             <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{p.subject} • {new Date(p.date).toLocaleDateString()}</div>
                           </div>
                           <div style={{ textAlign: 'right' }}>
                             <div style={{ fontWeight: 800, fontSize: '0.9rem', color: p.isAbsent ? '#64748B' : (p.percentage < p.minMarks ? '#EF4444' : '#10B981') }}>
                               {p.isAbsent ? 'ABSENT' : `${p.score}/${p.totalMarks}`}
                             </div>
                             <div style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{p.percentage}%</div>
                           </div>
                        </div>
                      ))}
                   </div>
                </div>

                <div className="no-print" style={{ marginTop: '1.5rem', padding: '0.75rem', backgroundColor: '#F1F5F9', borderRadius: '8px', fontSize: '0.75rem', color: '#64748B' }}>
                   <strong>Status:</strong> Found {studentStats.progress.length} academic record(s).
                </div>
                <PrintFooter />
              </div>
            ) : (
              <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                <FiSearch size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                <p>Select a student to view their detailed academic progress and graphical analysis.</p>
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        .print-only { display: none; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        
        @media print {
          @page { 
            size: A4 portrait; 
            margin: 10mm; 
          }
          
          body, html { 
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            height: auto !important;
            overflow: visible !important;
          }

          .no-print { display: none !important; }
          .print-only { display: block !important; }
          
          /* Auto-fit and Scaling */
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          
          .report-content-area,
          .student-report-wrapper,
          .student-report-container {
            overflow: visible !important;
            height: auto !important;
            position: static !important;
            width: 100% !important;
            max-width: 100% !important;
          }

          .app-layout { padding: 0 !important; }
          
          .student-report-container {
             padding: 0 !important;
             margin: 0 !important;
             width: 100% !important;
             display: block !important;
          }

          .card-base { 
            border: none !important; 
            box-shadow: none !important; 
            width: 100% !important; 
            margin-bottom: 10px !important; 
            padding: 0 !important; 
            background: white !important;
          }

          table { 
            width: 100% !important; 
            border: 1px solid #1A237E !important; 
            font-size: 10px !important; 
            border-collapse: collapse !important; 
          }
          
          th { 
            background-color: #1A237E !important; 
            color: white !important; 
            padding: 6px !important; 
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          
          td { 
            padding: 6px !important; 
            border: 1px solid #E2E8F0 !important;
          }

          .recharts-responsive-container { 
            height: 180px !important; 
            margin: 5px auto !important;
          }

          .stats-grid-compact {
             display: grid !important;
             grid-template-columns: repeat(3, 1fr) !important;
             gap: 8px !important;
             margin-bottom: 10px !important;
          }

          .chart-container-card {
            padding: 8px !important;
            margin-bottom: 10px !important;
            min-height: auto !important;
          }

          .AcademicNote { font-size: 8px !important; line-height: 1.2 !important; margin-top: 5px !important; }
          .signatory-box { min-width: 120px; }
          .signatory-box div { font-size: 10px !important; }
        }

        /* Responsive refinements */
        @media (max-width: 768px) {
          .stats-grid-compact {
             grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
};

export default AcademicReports;
