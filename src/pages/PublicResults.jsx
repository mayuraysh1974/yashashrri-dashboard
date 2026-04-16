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
    <div className="landing-container" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <nav className="landing-nav" style={{ position: 'relative', background: '#FFFFFF', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
        <div className="landing-logo">
          <img src="/logo.png" alt="Yashashrri Logo" style={{ height: '50px' }} />
        </div>
        <div className="nav-actions">
          <button onClick={handleLogout} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#EF4444', border: '1px solid #EF4444' }}>
            <FiLogOut /> Logout
          </button>
        </div>
      </nav>

      <main style={{ flex: 1, padding: '4rem 5%', backgroundColor: '#F8FAFC' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '3rem' }}>
            <div>
              <h1 style={{ color: '#1A237E', margin: 0, fontSize: '2rem' }}>Welcome, {student.name}</h1>
              <p style={{ color: '#64748B', fontWeight: 600, marginTop: '0.5rem' }}>{student.standard} | ID: {student.id}</p>
            </div>
            <div style={{ textAlign: 'right' }}>
               <span style={{ backgroundColor: '#10B98115', color: '#10B981', padding: '0.4rem 1rem', borderRadius: '50px', fontWeight: 700, fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                 <FiCheckCircle /> Verified Profile
               </span>
            </div>
          </div>

          <section style={{ display: 'grid', gap: '1.5rem' }}>
            {results.length === 0 ? (
              <div className="card-base" style={{ textAlign: 'center', padding: '4rem' }}>
                <FiFileText size={48} color="#CBD5E1" style={{ marginBottom: '1.5rem' }} />
                <h3 style={{ color: '#64748B' }}>No Academic Records Found</h3>
                <p style={{ color: '#94A3B8' }}>Tests assigned to your class will appear here once scheduled.</p>
              </div>
            ) : results.map(test => (
              <div key={test.id} className="card-base" style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.25rem' }}>
                <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                  <div style={{ backgroundColor: '#F1F5F9', padding: '1rem', borderRadius: '12px', color: '#1A237E' }}>
                    <FiFileText size={24} />
                  </div>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '1.1rem', color: '#1A237E' }}>{test.name}</h4>
                    <div style={{ display: 'flex', gap: '1rem', fontSize: '0.85rem', color: '#64748B', marginTop: '0.25rem' }}>
                      <span style={{ fontWeight: 600 }}>{test.subject}</span>
                      <span>•</span>
                      <span>{new Date(test.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '2.5rem', alignItems: 'center' }}>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: '0.7rem', color: '#94A3B8', textTransform: 'uppercase', marginBottom: '0.25rem', letterSpacing: '0.5px' }}>Performance</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'flex-end' }}>
                      <span style={{ fontSize: '1.75rem', fontWeight: 800, color: test.score !== 'N/A' ? '#10B981' : '#CBD5E1' }}>{test.score}</span>
                      <span style={{ color: '#94A3B8', fontWeight: 600 }}>/ {test.total_marks || test.totalMarks}</span>
                    </div>
                  </div>

                  {test.solution_url ? (
                    <a href={test.solution_url} target="_blank" rel="noopener noreferrer" className="btn-secondary" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#D4AF37', color: 'white', border: 'none', padding: '0.6rem 1.25rem', borderRadius: '8px' }}>
                      <FiDownload /> Get Solution
                    </a>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#94A3B8', fontSize: '0.8rem', fontStyle: 'italic', backgroundColor: '#F1F5F9', padding: '0.5rem 1rem', borderRadius: '8px' }}>
                      <FiClock /> Solution Pending
                    </div>
                  )}
                </div>
              </div>
            ))}
          </section>
        </div>
      </main>

      <footer className="landing-footer" style={{ marginTop: 'auto', background: '#F8FAFC', borderTop: '1px solid #E2E8F0', padding: '2rem' }}>
        <p style={{ color: '#94A3B8', fontSize: '0.85rem' }}>&copy; 2026 Yashashrri Classes. Dashboard secure & encrypted.</p>
      </footer>
    </div>
  );
};

export default PublicResults;
