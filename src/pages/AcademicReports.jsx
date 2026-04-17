import React, { useState, useEffect } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
  BarChart, Bar, Cell
} from 'recharts';
import { FiPrinter, FiSearch, FiCalendar, FiBook, FiUser, FiTrendingUp, FiCheckCircle, FiXCircle } from 'react-icons/fi';
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
      const { data: tests } = await supabase
        .from('tests')
        .select('*')
        .contains('subjects', [selectedSubject])
        .gte('date', `${selectedMonth}-01`)
        .lte('date', `${selectedMonth}-31`)
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
            percentage: test ? Math.round((actualScore / test.total_marks) * 100) : 0,
            minMarks: test ? Math.round(((test.min_marks || 0) / test.total_marks) * 100) : 0,
            date: test?.date || '',
            subject: Array.isArray(test?.subjects) ? test.subjects[0] : (test?.subject || 'N/A'),
            totalMarks: test?.total_marks || 0
          };
        })
        .sort((a, b) => new Date(a.date) - new Date(b.date));

      const totalTests = progress.length;
      const passCount = progress.filter(p => !p.isAbsent && p.score >= (p.totalMarks * (p.minMarks / 100))).length;
      
      const avgPercentage = progress.length > 0 
        ? progress.reduce((sum, p) => sum + p.percentage, 0) / progress.length 
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

  const handlePrint = () => {
    window.print();
  };

  const PrintHeader = ({ title, subTitle }) => (
    <div className="print-only" style={{ textAlign: 'center', marginBottom: '30px' }}>
      <div style={{ marginBottom: '15px' }}>
        <img src="/logo.png" alt="Yashashrri Logo" style={{ maxWidth: '400px', height: 'auto' }} />
      </div>
      <div style={{ fontSize: '11px', color: '#64748B', lineHeight: '1.6' }}>
        Main Br: "Shree Ekveera Prasad", Vaidya Colony, Nr. Axis bank ATM, Talegaon Dabhade, PUNE - 410506<br />
        Branch 2: Silverwinds, C2, Dnyaneshwar Nagar, Nr. Jijamata Chowk, Talegaon Dabhade, PUNE - 410506<br />
        Contact: +91 73874 20737 | Email: mayuraysh1974@gmail.com
      </div>
      <hr style={{ border: 'none', borderTop: '2px solid #1A237E', margin: '20px 0' }} />
      <h2 style={{ fontSize: '18px', color: '#1A237E', margin: '10px 0', textTransform: 'uppercase', fontWeight: 800 }}>{title}</h2>
      {subTitle && <div style={{ fontSize: '14px', color: '#475569', fontWeight: 700, backgroundColor: '#F8FAFC', padding: '10px', borderRadius: '8px', border: '1px solid #E2E8F0', display: 'inline-block' }}>{subTitle}</div>}
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
          <p className="page-subtitle">Detailed test analytics, student progress tracking, and professional reports</p>
        </div>
        <button className="btn-secondary" onClick={handlePrint}>
          <FiPrinter /> Print / Export PDF
        </button>
      </div>

      <div className="card-base no-print" style={{ marginBottom: '1.5rem', padding: '1rem', display: 'flex', alignItems: 'center', gap: '1.5rem', backgroundColor: 'var(--bg-main)', flexWrap: 'wrap', borderRadius: '12px' }}>
        <div style={{ display: 'inline-flex', gap: '0.25rem', background: '#F1F5F9', padding: '0.3rem', borderRadius: '10px' }}>
          <button 
            onClick={() => setActiveTab('monthly')}
            style={{ 
              backgroundColor: activeTab === 'monthly' ? 'white' : 'transparent',
              color: activeTab === 'monthly' ? 'var(--primary-blue)' : 'var(--text-secondary)',
              boxShadow: activeTab === 'monthly' ? 'var(--shadow-sm)' : 'none',
              padding: '0.6rem 1.2rem', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem'
            }}
          >
            Subject Monthly Report
          </button>
          <button 
            onClick={() => setActiveTab('student')}
            style={{ 
              backgroundColor: activeTab === 'student' ? 'white' : 'transparent',
              color: activeTab === 'student' ? 'var(--primary-blue)' : 'var(--text-secondary)',
              boxShadow: activeTab === 'student' ? 'white' : 'none',
              padding: '0.6rem 1.2rem', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem'
            }}
          >
            Student Progress Analysis
          </button>
        </div>

        {activeTab === 'monthly' ? (
          <div style={{ display: 'flex', gap: '1rem', flex: 1 }}>
            <div style={{ flex: 1 }}>
              <select 
                value={selectedSubject} 
                onChange={e => { setSelectedSubject(e.target.value); setSelectedTestId('all'); }}
                style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}
              >
                <option value="">Select Subject...</option>
                {subjects.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <input 
                type="month" 
                value={selectedMonth} 
                onChange={e => { setSelectedMonth(e.target.value); setSelectedTestId('all'); }}
                style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <select 
                value={selectedTestId} 
                onChange={e => setSelectedTestId(e.target.value)}
                style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}
                disabled={reportData.tests.length === 0}
              >
                <option value="all">All Tests in Month</option>
                {reportData.tests.map(t => (
                  <option key={t.id} value={t.id}>{t.name} ({new Date(t.date).toLocaleDateString()})</option>
                ))}
              </select>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '1rem', flex: 1 }}>
            <div style={{ flex: 1 }}>
              <select 
                value={selectedStandard} 
                onChange={e => { setSelectedStandard(e.target.value); setSelectedStudent(null); }}
                style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}
              >
                <option value="">Filter by Class...</option>
                {standards.map(s => <option key={s.id} value={s.standard}>{s.standard}</option>)}
              </select>
            </div>
            <div style={{ flex: 2 }}>
               <select 
                  value={selectedStudent?.id || ''} 
                  onChange={e => {
                    const student = students.find(s => s.id === e.target.value);
                    setSelectedStudent(student);
                  }}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}
                  disabled={!selectedStandard}
                >
                  <option value="">{selectedStandard ? `Select Student from ${selectedStandard}...` : 'Select Class First'}</option>
                  {students.filter(s => s.standard === selectedStandard).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
            </div>
            <button className="btn-secondary" onClick={() => fetchInitialData()} title="Refresh List" style={{ padding: '0.6rem' }}>
              <FiCalendar />
            </button>
          </div>
        )}
      </div>

      <div className="card-base" style={{ flex: 1, padding: '2rem', display: 'flex', flexDirection: 'column', overflowY: 'auto', position: 'relative' }}>
        {loading && (
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(255,255,255,0.7)', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem' }}>
             <div className="spinner" style={{ width: '40px', height: '40px', border: '4px solid #f3f3f3', borderTop: '4px solid var(--primary-blue)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
             <p style={{ fontWeight: 600, color: 'var(--primary-blue)' }}>Fetching Performance Data...</p>
          </div>
        )}

        {activeTab === 'monthly' ? (
          <>
            <PrintHeader 
              title={selectedTestId === 'all' ? "Monthly Academic Performance Report" : "Specific Test Performance Report"} 
              subTitle={`${selectedTestId === 'all' ? `Subject: ${selectedSubject} | Period: ${new Date(selectedMonth + '-02').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}` : `Test: ${reportData.tests.find(t => t.id === selectedTestId)?.name} | Date: ${new Date(reportData.tests.find(t => t.id === selectedTestId)?.date).toLocaleDateString()}`}`} 
            />
            
            {!loading && reportData.tests.length === 0 ? <div style={{ textAlign: 'center', padding: '4rem' }}><FiBook size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} /><p>No tests found for selected subject and month.</p></div> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                  <div className="card-base no-print" style={{ padding: '1.5rem', minHeight: '300px' }}>
                    <h3 style={{ fontSize: '1rem', color: 'var(--primary-blue)', marginBottom: '1.5rem' }}><FiTrendingUp /> Avg. Performance Trend (%)</h3>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={reportData.performance.filter((_, idx) => selectedTestId === 'all' || String(reportData.tests[idx]?.id) === String(selectedTestId))}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" fontSize={10} />
                        <YAxis tickFormatter={t => `${t}%`} domain={[0, 100]} fontSize={10} />
                        <Tooltip formatter={(value) => [`${value}%`, 'Avg. Performance']} />
                        <Bar dataKey="avg" name="Avg. Performance" fill="var(--primary-blue)" radius={[4, 4, 0, 0]} barSize={selectedTestId === 'all' ? undefined : 60} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="card-base no-print" style={{ padding: '1.5rem', minHeight: '300px' }}>
                    <h3 style={{ fontSize: '1rem', color: 'var(--primary-blue)', marginBottom: '1.5rem' }}><FiCheckCircle /> Student Passing Ratio (%)</h3>
                    <ResponsiveContainer width="100%" height={250}>
                      <LineChart data={reportData.performance.filter((_, idx) => selectedTestId === 'all' || String(reportData.tests[idx]?.id) === String(selectedTestId))}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" fontSize={10} />
                        <YAxis tickFormatter={t => `${t}%`} domain={[0, 100]} fontSize={10} />
                        <Tooltip formatter={(value) => [`${value}%`, 'Passing Ratio']} />
                        <Line type="monotone" dataKey="passing" name="Passing Ratio" stroke="var(--success-green)" strokeWidth={3} dot={{ r: 6 }} activeDot={{ r: 8 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem' }}>
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
                               <div style={{ backgroundColor: 'white', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '0.5rem', marginTop: '0.5rem' }}>
                                  <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Student-wise Breakdown</div>
                                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.5rem' }}>
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
                      );
                    })}
                  </tbody>
                </table>
                <PrintFooter />
              </div>
            )}
          </>
        ) : (
          <>
            {selectedStudent ? (
              <>
                <PrintHeader title="Student Progress Analysis Report" subTitle={`Student: ${selectedStudent.name} | Std: ${selectedStudent.standard}`} />
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                   <div className="card-base" style={{ padding: '1.25rem', textAlign: 'center', background: '#F8FAFC' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Total Tests Attempted</span>
                      <h3 style={{ fontSize: '1.8rem', color: 'var(--primary-blue)' }}>{studentStats.summary.totalTests}</h3>
                   </div>
                   <div className="card-base" style={{ padding: '1.25rem', textAlign: 'center', background: '#F8FAFC' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Average Percentage</span>
                      <h3 style={{ fontSize: '1.8rem', color: 'var(--accent-gold)' }}>{studentStats.summary.avgPercentage}%</h3>
                   </div>
                   <div className="card-base" style={{ padding: '1.25rem', textAlign: 'center', background: '#ECFDF5' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Passed / Cleared</span>
                      <h3 style={{ fontSize: '1.8rem', color: 'var(--success-green)' }}>{studentStats.summary.passCount}</h3>
                   </div>
                </div>

                <div className="card-base" style={{ padding: '2rem', marginBottom: '2rem', minHeight: '350px' }}>
                  <h3 style={{ fontSize: '1rem', color: 'var(--primary-blue)', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <FiTrendingUp /> Detailed Progress Curve (Percentage vs Passing Threshold)
                  </h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={studentStats.progress}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" fontSize={10} />
                      <YAxis tickFormatter={t => `${t}%`} fontSize={10} domain={[0, 100]} />
                      <Tooltip formatter={(value) => [`${value}%`, 'Score']} />
                      <Legend />
                      <Line type="monotone" dataKey="percentage" name="Student Score %" stroke="var(--primary-blue)" strokeWidth={4} dot={{ r: 6, fill: 'var(--primary-blue)' }} activeDot={{ r: 8 }} />
                      <Line type="step" dataKey="minMarks" name="Passing Threshold %" stroke="var(--danger-red)" strokeDasharray="5 5" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                  <div className="no-print" style={{ height: '20px' }}></div> {/* Spacer for screen */}
                </div>

                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#1A237E', color: 'white', textAlign: 'left' }}>
                      <th style={{ padding: '1rem' }}>Test Name</th>
                      <th style={{ padding: '1rem' }}>Subject</th>
                      <th style={{ padding: '1rem' }}>Date</th>
                      <th style={{ padding: '1rem', textAlign: 'right' }}>Score</th>
                      <th style={{ padding: '1rem', textAlign: 'center' }}>Result</th>
                    </tr>
                  </thead>
                  <tbody>
                    {studentStats.progress.map((p, idx) => {
                      const isAbsent = p.score === 0 && p.percentage === 0; // In this view, -1 was converted to 0 percentage
                      // Note: Progress analysis is student-centric, so "Top" doesn't apply here (Top is relative to class).
                      // But we will highlight Pass/Fail and Absent.
                      const isFail = p.percentage < p.minMarks;

                      return (
                        <tr key={idx} style={{ 
                          borderBottom: '1px solid var(--border-color)',
                          backgroundColor: isAbsent ? '#F8FAFC' : (isFail ? '#FEF2F2' : 'transparent'),
                          color: isAbsent ? '#64748B' : 'inherit',
                          fontStyle: isAbsent ? 'italic' : 'normal',
                          opacity: isAbsent ? 0.8 : 1,
                          WebkitPrintColorAdjust: 'exact',
                          printColorAdjust: 'exact'
                        }}>
                          <td style={{ padding: '1rem', fontWeight: 600 }}>{p.name}</td>
                          <td style={{ padding: '1rem' }}>{p.subject}</td>
                          <td style={{ padding: '1rem' }}>{new Date(p.date).toLocaleDateString()}</td>
                          <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 700 }}>
                            {isAbsent ? 'ABSENT' : `${p.score} / ${p.totalMarks}`} ({p.percentage}%)
                          </td>
                          <td style={{ padding: '1rem', textAlign: 'center' }}>
                            {isAbsent ? (
                              <span style={{ color: '#64748B', fontWeight: 800 }}>-</span>
                            ) : !isFail ? (
                              <span style={{ color: 'var(--success-green)', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem' }}><FiCheckCircle /> PASSED</span>
                            ) : (
                              <span style={{ color: 'var(--danger-red)', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem' }}><FiXCircle /> FAILED</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <div className="no-print" style={{ marginTop: '1.5rem', padding: '0.75rem', backgroundColor: '#F8FAFC', borderRadius: '6px', border: '1px solid #E2E8F0', fontSize: '0.8rem', color: '#64748B' }}>
                   <strong>Diagnostic Info:</strong> {debugStatus || 'Ready'}
                </div>
                <PrintFooter />
              </>
            ) : (
              <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                <FiSearch size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                <p>Select a student to view their detailed academic progress and graphical analysis.</p>
              </div>
            )}
          </>
        )}
      </div>

      <style>{`
        .print-only { display: none; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        @media print {
          @page { size: A4 landscape; margin: 10mm; }
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          .card-base { border: none !important; box-shadow: none !important; width: 100% !important; margin: 0 !important; padding: 0 !important; min-height: 0 !important; }
          body { background: white !important; width: 100% !important; margin: 0 !important; padding: 0 !important; font-family: 'Inter', sans-serif !important; }
          table { width: 100% !important; border: 1px solid #ddd !important; font-size: 11px !important; border-collapse: collapse !important; table-layout: fixed !important; }
          th { background-color: #1A237E !important; color: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; padding: 8px !important; }
          td { padding: 8px !important; border-bottom: 1px solid #eee !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; word-wrap: break-word; }
          .recharts-responsive-container { width: 100% !important; height: 350px !important; margin-bottom: 40px !important; }
          .recharts-legend-wrapper { position: relative !important; top: auto !important; margin-top: 15px !important; }
          h2, h3 { color: #1A237E !important; margin-top: 15px !important; margin-bottom: 10px !important; }
          .print-header { margin-bottom: 30px !important; }
          .AcademicNote { font-size: 10px !important; line-height: 1.5 !important; flex: 1.5; padding-right: 40px; }
          .signatory-box { min-width: 250px; text-align: center; }
        }
      `}</style>
    </div>
  );
};

export default AcademicReports;
