import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { FiLock, FiUser, FiFileText, FiDownload, FiCheckCircle, FiClock, FiLogOut } from 'react-icons/fi';
import './LandingPage.css';

const PublicResults = () => {
  const [studentId, setStudentId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [student, setStudent] = useState(null);
  const [results, setResults] = useState([]);
  const [error, setError] = useState(null);

  // Check if student is already "logged in" for this session
  useEffect(() => {
    const savedStudent = sessionStorage.getItem('student_session');
    if (savedStudent) {
      const data = JSON.parse(savedStudent);
      setStudent(data);
      fetchResults(data);
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!studentId || !password) return;

    setLoading(true);
    setError(null);

    try {
      // 1. Authenticate student
      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .select('*')
        .eq('id', studentId.trim())
        .eq('portal_password', password.trim())
        .single();

      if (studentError || !studentData) {
        throw new Error('Invalid Student ID or Password.');
      }

      if (studentData.portal_enabled === false) {
        throw new Error('Portal access has been disabled for this account. Please contact administrative office.');
      }

      setStudent(studentData);
      sessionStorage.setItem('student_session', JSON.stringify(studentData));
      await fetchResults(studentData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchResults = async (studentData) => {
    try {
      // 2. Fetch all tests for this student's standard
      const { data: testsData, error: testsError } = await supabase
        .from('tests')
        .select('*')
        .contains('standards', [studentData.standard])
        .order('date', { ascending: false });

      if (testsError) throw testsError;

      // 3. Fetch results for this student
      const { data: resultsData, error: resultsError } = await supabase
        .from('test_results')
        .select('*')
        .eq('student_id', studentData.id);

      if (resultsError) throw resultsError;

      // Combine tests and results
      const combined = testsData.map(test => {
        const result = resultsData.find(r => r.test_id === test.id);
        return {
          ...test,
          score: result ? result.score : 'N/A',
          status: result ? 'Declared' : 'Pending'
        };
      });

      setResults(combined);
    } catch (err) {
      setError('Failed to fetch results: ' + err.message);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('student_session');
    setStudent(null);
    setResults([]);
    setStudentId('');
    setPassword('');
  };

  if (!student) {
    return (
      <div className="landing-container" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'linear-gradient(135deg, #1A237E 0%, #0D47A1 100%)' }}>
        <nav className="landing-nav" style={{ border: 'none', background: 'transparent' }}>
            <div className="landing-logo">
                <img src="/logo.png" alt="Yashashrri Logo" style={{ height: '60px', filter: 'brightness(0) invert(1)' }} />
            </div>
            <div className="landing-nav-links">
                <a href="/" style={{ color: 'white' }}>Back to Website</a>
            </div>
        </nav>

        <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
          <div className="card-base" style={{ width: '100%', maxWidth: '400px', padding: '3rem', textAlign: 'center' }}>
            <h2 style={{ color: '#1A237E', marginBottom: '1.5rem', fontSize: '1.8rem' }}>Student Portal</h2>
            <p style={{ color: '#64748B', marginBottom: '2rem', fontSize: '0.9rem' }}>Please enter your credentials to access your performance dashboard and solutions.</p>
            
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ position: 'relative' }}>
                <FiUser style={{ position: 'absolute', top: '50%', left: '1rem', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                <input 
                  type="text" 
                  placeholder="Student ID" 
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  style={{ width: '100%', padding: '1rem 1rem 1rem 3rem', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '1rem' }}
                />
              </div>
              <div style={{ position: 'relative' }}>
                <FiLock style={{ position: 'absolute', top: '50%', left: '1rem', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                <input 
                  type="password" 
                  placeholder="Portal Password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ width: '100%', padding: '1rem 1rem 1rem 3rem', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '1rem' }}
                />
              </div>
              <button disabled={loading} className="cta-primary" style={{ border: 'none', cursor: 'pointer', padding: '1rem', marginTop: '1rem' }}>
                {loading ? 'Authenticating...' : 'Sign In to Portal'}
              </button>
            </form>
            
            {error && <p style={{ color: '#EF4444', marginTop: '1.5rem', fontSize: '0.85rem', fontWeight: 600, backgroundColor: '#FEE2E2', padding: '0.75rem', borderRadius: '6px' }}>{error}</p>}
            
            <p style={{ marginTop: '2rem', fontSize: '0.75rem', color: '#94A3B8' }}>
              Lost your Student ID or Password? <br /> Please contact the administrative office.
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="landing-container" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#F8FAFC' }}>
      <nav className="landing-nav" style={{ 
        position: 'sticky', 
        top: 0, 
        zIndex: 100, 
        background: '#FFFFFF', 
        boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
        height: '70px',
        display: 'flex',
        alignItems: 'center',
        padding: '0 5%'
      }}>
        <div className="landing-logo">
          <img src="/logo.png" alt="Yashashrri Logo" style={{ height: '45px' }} />
        </div>
        <div className="nav-actions">
          <button onClick={handleLogout} className="btn-secondary" style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.4rem', 
            color: '#EF4444', 
            border: '1px solid #EF4444',
            padding: '0.4rem 0.75rem',
            fontSize: '0.8rem',
            fontWeight: 700
          }}>
            <FiLogOut /> Logout
          </button>
        </div>
      </nav>

      <main className="public-results-main" style={{ flex: 1, padding: '2rem 5%' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h1 style={{ color: '#1A237E', margin: 0, fontSize: '1.25rem' }}>Welcome, {student.name}</h1>
              <p style={{ color: '#64748B', fontWeight: 600, marginTop: '4px', fontSize: '0.8rem' }}>{student.standard} | ID: {student.id}</p>
            </div>
            <div style={{ textAlign: 'right' }}>
               <span style={{ backgroundColor: '#ECFDF5', color: '#059669', padding: '0.3rem 0.75rem', borderRadius: '50px', fontWeight: 800, fontSize: '0.7rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                 <FiCheckCircle /> Verified
               </span>
            </div>
          </div>

          <section style={{ display: 'grid', gap: '0.75rem' }}>
            {results.length === 0 ? (
              <div className="card-base" style={{ textAlign: 'center', padding: '3rem' }}>
                <FiFileText size={40} color="#CBD5E1" style={{ marginBottom: '1rem' }} />
                <h3 style={{ color: '#64748B', fontSize: '1rem' }}>No Records Found</h3>
                <p style={{ color: '#94A3B8', fontSize: '0.8rem' }}>Tests for your class will appear here once scheduled.</p>
              </div>
            ) : results.map(test => (
              <div key={test.id} className="card-base" style={{ padding: '1rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flex: 1 }}>
                  <div className="desktop-only" style={{ backgroundColor: '#F8FAFC', padding: '0.75rem', borderRadius: '10px', color: '#1A237E' }}>
                    <FiFileText size={20} />
                  </div>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '0.9rem', color: '#1E293B' }}>{test.name}</h4>
                    <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.7rem', color: '#64748B', marginTop: '4px' }}>
                      <span style={{ fontWeight: 700, textTransform: 'uppercase' }}>{test.subject}</span>
                      <span>•</span>
                      <span>{new Date(test.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', justifyContent: 'flex-end' }}>
                      <span style={{ fontSize: '1.1rem', fontWeight: 800, color: test.score !== 'N/A' ? '#10B981' : '#CBD5E1' }}>{test.score}</span>
                      <span style={{ color: '#94A3B8', fontWeight: 600, fontSize: '0.75rem' }}>/{test.total_marks || test.totalMarks}</span>
                    </div>
                  </div>

                  {test.solution_url ? (
                    <a href={test.solution_url} target="_blank" rel="noopener noreferrer" style={{ 
                      textDecoration: 'none', 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '0.3rem', 
                      backgroundColor: '#B8860B', 
                      color: 'white', 
                      padding: '0.4rem 0.75rem', 
                      borderRadius: '6px',
                      fontSize: '0.7rem',
                      fontWeight: 700
                    }}>
                      <FiDownload size={14} /> Key
                    </a>
                  ) : (
                    <div className="desktop-only" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: '#94A3B8', fontSize: '0.7rem', fontStyle: 'italic', backgroundColor: '#F8FAFC', padding: '0.4rem 0.75rem', borderRadius: '6px' }}>
                      <FiClock size={12} /> Pending
                    </div>
                  )}
                </div>
              </div>
            ))}
          </section>
        </div>
      </main>

      <footer className="landing-footer" style={{ marginTop: 'auto', background: '#F8FAFC', borderTop: '1px solid #E2E8F0', padding: '1.5rem' }}>
        <p style={{ color: '#94A3B8', fontSize: '0.75rem', margin: 0, textAlign: 'center' }}>&copy; 2026 Yashashrri Classes. Verified academic portal.</p>
      </footer>

      <style>{`
        @media (max-width: 768px) {
          .public-results-main { padding: 1.25rem !important; }
          .desktop-only { display: none !important; }
        }
      `}</style>
    </div>
  );
};

export default PublicResults;
