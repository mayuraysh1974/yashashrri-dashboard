import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { FiSearch, FiFileText, FiDownload, FiCheckCircle, FiChevronRight, FiClock } from 'react-icons/fi';
import './LandingPage.css'; // Reuse some landing page styles if applicable

const PublicResults = () => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [student, setStudent] = useState(null);
  const [results, setResults] = useState([]);
  const [error, setError] = useState(null);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!phoneNumber) return;

    setLoading(true);
    setError(null);
    setStudent(null);
    setResults([]);

    try {
      // 1. Find the student by parent phone or student phone
      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .select('*')
        .or(`parent_phone.eq.${phoneNumber},student_phone.eq.${phoneNumber}`)
        .single();

      if (studentError || !studentData) {
        throw new Error('No student found with this phone number. Please contact the office.');
      }

      setStudent(studentData);

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
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="landing-container" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Navigation (Simplified) */}
      <nav className="landing-nav" style={{ position: 'relative' }}>
        <div className="landing-logo">
          <img src="/logo.png" alt="Yashashrri Logo" style={{ height: '50px' }} />
        </div>
        <div className="landing-nav-links">
          <a href="/">Back to Home</a>
        </div>
      </nav>

      <main style={{ flex: 1, padding: '4rem 5%', backgroundColor: '#F8FAFC' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <header style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <h1 style={{ color: '#1A237E', fontSize: '2.5rem', marginBottom: '1rem' }}>Test <span className="text-highlight">Results</span></h1>
            <p style={{ color: '#64748B' }}>Enter your registered mobile number to view test marks and download solutions.</p>
          </header>

          <section className="card-base" style={{ padding: '2rem', marginBottom: '2rem', boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}>
            <form onSubmit={handleSearch} style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '250px' }}>
                <input 
                  type="tel" 
                  placeholder="Enter Registered Phone Number" 
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  style={{ width: '100%', padding: '1rem', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '1rem' }}
                />
              </div>
              <button disabled={loading} className="cta-primary" style={{ border: 'none', cursor: 'pointer', padding: '0 2rem' }}>
                {loading ? 'Searching...' : 'Check Marks'}
              </button>
            </form>
            {error && <p style={{ color: '#EF4444', marginTop: '1rem', fontWeight: 600 }}>{error}</p>}
          </section>

          {student && (
            <div className="animate-in">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', borderBottom: '2px solid #E2E8F0', paddingBottom: '1rem' }}>
                <div>
                  <h2 style={{ color: '#1A237E', margin: 0 }}>{student.name}</h2>
                  <p style={{ color: '#64748B', fontWeight: 600 }}>Standard: {student.standard}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ backgroundColor: '#D4AF3715', color: '#D4AF37', padding: '0.4rem 1rem', borderRadius: '50px', fontWeight: 700, fontSize: '0.9rem' }}>Student Portal</span>
                </div>
              </div>

              <div style={{ display: 'grid', gap: '1.5rem' }}>
                {results.length === 0 ? (
                  <p style={{ textAlign: 'center', padding: '3rem', color: '#64748B' }}>No tests found for your standard.</p>
                ) : results.map(test => (
                  <div key={test.id} className="card-base" style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                    <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                      <div style={{ backgroundColor: '#F1F5F9', padding: '1rem', borderRadius: '12px', color: '#1A237E' }}>
                        <FiFileText size={24} />
                      </div>
                      <div>
                        <h4 style={{ margin: 0, fontSize: '1.1rem', color: '#1A237E' }}>{test.name}</h4>
                        <div style={{ display: 'flex', gap: '1rem', fontSize: '0.85rem', color: '#64748B', marginTop: '0.25rem' }}>
                          <span>{test.subject}</span>
                          <span>•</span>
                          <span>{new Date(test.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ fontSize: '0.75rem', color: '#64748B', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Marks Obtained</p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'flex-end' }}>
                          <span style={{ fontSize: '1.75rem', fontWeight: 800, color: test.score !== 'N/A' ? '#10B981' : '#64748B' }}>{test.score}</span>
                          <span style={{ color: '#94A3B8', fontWeight: 600 }}>/ {test.total_marks || test.totalMarks}</span>
                        </div>
                      </div>

                      {test.solution_url ? (
                        <a href={test.solution_url} target="_blank" rel="noopener noreferrer" className="btn-secondary" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#D4AF37', color: 'white', border: 'none' }}>
                          <FiDownload /> Solution
                        </a>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#94A3B8', fontSize: '0.85rem', fontStyle: 'italic' }}>
                          <FiClock /> Solution Pending
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      <footer className="landing-footer" style={{ marginTop: 'auto' }}>
        <p>&copy; 2026 Yashashrri Classes. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default PublicResults;
