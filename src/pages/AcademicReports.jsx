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
  
  const [reportData, setReportData] = useState({ tests: [], performance: [], results: [] });
  const [studentStats, setStudentStats] = useState({ progress: [], summary: {} });

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    const { data: subData } = await supabase.from('subjects').select('*').order('name');
    const { data: studData } = await supabase.from('students').select('id, name, standard').order('name');
    setSubjects(subData || []);
    setStudents(studData || []);
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
    try {
      const { data: results } = await supabase
        .from('test_results')
        .select('*, tests(*)')
        .eq('student_id', selectedStudent.id)
        .order('created_at', { ascending: true });

      const progress = (results || []).map(r => ({
        name: r.tests.name,
        score: r.score === -1 ? 0 : r.score,
        percentage: Math.round(((r.score === -1 ? 0 : r.score) / r.tests.total_marks) * 100),
        minMarks: Math.round(((r.tests.min_marks || 0) / r.tests.total_marks) * 100),
        date: r.tests.date,
        subject: r.tests.subjects?.[0] || r.tests.subject,
        totalMarks: r.tests.total_marks
      }));

      const totalTests = results.length;
      const passCount = results.filter(r => r.score >= (r.tests.min_marks || 0)).length;
      const avgPercentage = progress.length > 0 
        ? progress.reduce((sum, p) => sum + p.percentage, 0) / progress.length 
        : 0;

      setStudentStats({ 
        progress, 
        summary: { totalTests, passCount, failCount: totalTests - passCount, avgPercentage: Math.round(avgPercentage) } 
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const PrintHeader = ({ title, subTitle }) => (
    <div className="print-header" style={{ display: 'none', textAlign: 'center', marginBottom: '30px' }}>
      <div style={{ marginBottom: '10px' }}>
        <h1 style={{ color: '#1A237E', margin: 0, fontSize: '28px', letterSpacing: '2px' }}>YASHASHRRI CLASSES</h1>
        <div style={{ color: '#D4AF37', fontWeight: 700, fontSize: '13px', marginBottom: '10px' }}>BUILDING BRIDGES TO SUCCESS</div>
      </div>
      <div style={{ fontSize: '11px', color: '#64748B', lineHeight: '1.6' }}>
        Talegaon Dabhade, PUNE | Contact: +91 73874 20737 | Email: mayuraysh1974@gmail.com
      </div>
      <hr style={{ border: 'none', borderTop: '2px solid #1A237E', margin: '20px 0' }} />
      <h2 style={{ fontSize: '16px', color: '#1A237E', margin: '10px 0', textTransform: 'uppercase' }}>{title}</h2>
      {subTitle && <p style={{ fontSize: '13px', color: '#64748B', fontWeight: 600 }}>{subTitle}</p>}
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
                onChange={e => setSelectedSubject(e.target.value)}
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
                onChange={e => setSelectedMonth(e.target.value)}
                style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}
              />
            </div>
          </div>
        ) : (
          <div style={{ flex: 1 }}>
             <select 
                value={selectedStudent?.id || ''} 
                onChange={e => setSelectedStudent(students.find(s => s.id === e.target.value))}
                style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}
              >
                <option value="">Search Student...</option>
                {students.map(s => <option key={s.id} value={s.id}>{s.name} ({s.standard})</option>)}
              </select>
          </div>
        )}
      </div>

      <div className="card-base" style={{ flex: 1, padding: '2rem', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
        {activeTab === 'monthly' ? (
          <>
            <PrintHeader title="Monthly Academic Performance Report" subTitle={`Subject: ${selectedSubject} | Period: ${selectedMonth}`} />
            
            {loading ? <p>Loading report data...</p> : reportData.tests.length === 0 ? <p>No tests found for selected subject and month.</p> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                  <div className="card-base no-print" style={{ padding: '1.5rem', minHeight: '300px' }}>
                    <h3 style={{ fontSize: '1rem', color: 'var(--primary-blue)', marginBottom: '1.5rem' }}><FiTrendingUp /> Avg. Performance Trend (%)</h3>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={reportData.performance}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" fontSize={10} />
                        <YAxis tickFormatter={t => `${t}%`} fontSize={10} />
                        <Tooltip formatter={(value) => [`${value}%`, 'Avg. Performance']} />
                        <Bar dataKey="avg" name="Avg. Performance" fill="var(--primary-blue)" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="card-base no-print" style={{ padding: '1.5rem', minHeight: '300px' }}>
                    <h3 style={{ fontSize: '1rem', color: 'var(--primary-blue)', marginBottom: '1.5rem' }}><FiCheckCircle /> Student Passing Ratio (%)</h3>
                    <ResponsiveContainer width="100%" height={250}>
                      <LineChart data={reportData.performance}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" fontSize={10} />
                        <YAxis tickFormatter={t => `${t}%`} fontSize={10} />
                        <Tooltip formatter={(value) => [`${value}%`, 'Passing Ratio']} />
                        <Line type="monotone" dataKey="passing" name="Passing Ratio" stroke="var(--success-green)" strokeWidth={3} />
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
                    {reportData.tests.map((test, idx) => {
                      const perf = reportData.performance[idx];
                      const testResults = reportData.results.filter(r => r.test_id === test.id);
                      const maxScore = Math.max(...testResults.map(r => r.score));
                      
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
                                      if (isAbsent) { bgColor = '#F1F5F9'; borderColor = '#CBD5E1'; }
                                      else if (isTop) { bgColor = '#FFF9E6'; borderColor = '#D4AF37'; }
                                      else if (isFail) { bgColor = '#FEE2E2'; borderColor = '#FECACA'; }

                                      return (
                                        <div key={res.id} style={{ padding: '0.4rem 0.8rem', borderRadius: '6px', border: `1px solid ${borderColor}`, backgroundColor: bgColor, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
                                          <span style={{ fontWeight: 600, color: isTop ? '#B8860B' : 'inherit' }}>{res.students?.name}</span>
                                          <span style={{ fontWeight: 800 }}>
                                            {isAbsent ? 'AB' : res.score}
                                            {isTop && <span style={{ marginLeft: '4px', fontSize: '0.6rem', backgroundColor: '#D4AF37', color: 'white', padding: '1px 3px', borderRadius: '3px' }}>TOP</span>}
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
                          backgroundColor: isAbsent ? '#F1F5F9' : (isFail ? '#FEE2E2' : 'transparent')
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
        @media print {
          .no-print { display: none !important; }
          .print-header { display: block !important; }
          .card-base { border: none !important; box-shadow: none !important; width: 100% !important; margin: 0 !important; padding: 0 !important; }
          body { background: white !important; }
          table { width: 100% !important; border: 1px solid #ddd !important; font-size: 12px; }
          th { background-color: #1A237E !important; color: white !important; -webkit-print-color-adjust: exact; }
        }
      `}</style>
    </div>
  );
};

export default AcademicReports;
