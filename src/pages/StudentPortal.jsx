import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { 
  FiLock, FiUser, FiFileText, FiDownload, FiCheckCircle, 
  FiClock, FiLogOut, FiBookOpen, FiCreditCard, FiGrid, FiArrowRight,
  FiUpload, FiCamera, FiFile, FiExternalLink
} from 'react-icons/fi';
import './LandingPage.css';

const StudentPortal = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [student, setStudent] = useState(null);
  const [studentId, setStudentId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  // Data States
  const [results, setResults] = useState([]);
  const [library, setLibrary] = useState([]);
  const [payments, setPayments] = useState([]);
  const [selectedFolder, setSelectedFolder] = useState(null);

  // Profile Edit States
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [profileMsg, setProfileMsg] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);

  useEffect(() => {
    const saved = sessionStorage.getItem('student_session');
    if (saved) {
      const data = JSON.parse(saved);
      setStudent(data);
      fetchAllData(data);
    }
  }, []);

  const fetchAllData = async (studentData) => {
    // Fetch Results
    const { data: tests } = await supabase.from('tests').select('*').eq('standard', studentData.standard).order('date', { ascending: false });
    const { data: marks } = await supabase.from('test_results').select('*').eq('student_id', studentData.id);
    
    if (tests) {
      setResults(tests.map(t => {
        const studentMark = marks?.find(m => m.test_id === t.id);
        const score = studentMark?.score || 'N/A';
        const isCompleted = studentMark !== undefined;
        const isPast = new Date(t.date) < new Date();

        return {
          ...t,
          score,
          hasSolutionAccess: isPast || isCompleted
        };
      }));
    }

    // Fetch Library (Notes)
    const { data: allNotes } = await supabase.from('library_resources').select('*');
    let notes = [];
    if (allNotes) {
       const studentStd = (studentData.standard || '').trim().toLowerCase();
       // Fallback map for unmigrated database records
       const fallbackMap = {
         'xii': ['12', '12th'],
         'xi': ['11', '11th'],
         'x': ['10', '10th'],
         'ix': ['9', '9th'],
         'viii': ['8', '8th']
       };
       const acceptedValues = [studentStd, ...(fallbackMap[studentStd] || [])];

       notes = allNotes.filter(n => {
          const noteStd = (n.standard || '').trim().toLowerCase();
          if (Array.isArray(n.standards) && n.standards.some(s => acceptedValues.includes(s.trim().toLowerCase()))) return true;
          return acceptedValues.some(val => noteStd === val || noteStd.includes(val));
       });
    }
    const sortedNotes = notes.sort((a, b) => new Date(b.date || b.created_at || 0) - new Date(a.date || a.created_at || 0));
    setLibrary(sortedNotes);

    // Fetch Payments
    const { data: payHistory, error: feeErr } = await supabase
      .from('fees')
      .select('*')
      .eq('student_id', studentData.id)
      .order('payment_date', { ascending: false });
    
    const { data: onlineHistory } = await supabase
      .from('online_payments')
      .select('*')
      .eq('student_name', studentData.name)
      .order('created_at', { ascending: false });

    // Combine both sources to ensure nothing is missed
    let merged = [...(payHistory || [])];
    
    // Add online payments if they don't already exist in fees (prevent duplicates)
    if (onlineHistory) {
      onlineHistory.forEach(op => {
        const exists = merged.some(p => p.remarks === op.transaction_id || p.id === op.id);
        if (!exists) {
          merged.push({
            id: op.id || op.transaction_id,
            payment_date: op.created_at,
            payment_mode: 'Online (Portal)',
            remarks: op.transaction_id,
            amount_paid: op.amount,
            status: op.status
          });
        }
      });
    }

    // Final sort by date
    merged.sort((a, b) => new Date(b.payment_date || 0) - new Date(a.payment_date || 0));
    setPayments(merged);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('students')
        .select('*')
        .eq('id', studentId.trim())
        .eq('portal_password', password.trim())
        .single();

      if (err || !data) throw new Error('Invalid ID or Password.');
      if (!data.portal_enabled) {
        // Automatically enable portal if it's their first login
        const { error: upError } = await supabase.from('students').update({ portal_enabled: true }).eq('id', data.id);
        if (upError) console.error('Failed to enable portal access:', upError);
      }

      loginStudent(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loginStudent = (data) => {
    setStudent(data);
    sessionStorage.setItem('student_session', JSON.stringify(data));
    fetchAllData(data);
  };

  const logout = () => {
    sessionStorage.removeItem('student_session');
    setStudent(null);
    setResults([]);
    setLibrary([]);
    setPayments([]);
    setSelectedFolder(null);
  };

  const parseResourceName = (name) => {
    const match = (name || '').match(/^\[(.*?)\]\s*(.*)$/);
    if (match) return { category: match[1], title: match[2] };
    return { category: 'General', title: name || 'Untitled' };
  };

  const groupedLibrary = React.useMemo(() => {
    const groups = {};
    library.forEach(file => {
      const parsed = parseResourceName(file.name);
      if (!groups[parsed.category]) groups[parsed.category] = [];
      groups[parsed.category].push({ ...file, parsedTitle: parsed.title });
    });
    return groups;
  }, [library]);

  const handleResourceClick = async (e, url) => {
    if (!url) return;
    if (url.toLowerCase().endsWith('.html') || url.toLowerCase().includes('.html?')) {
      e.preventDefault();
      try {
        const response = await fetch(url);
        const html = await response.text();
        const newWindow = window.open('', '_blank');
        newWindow.document.write(html);
        newWindow.document.close();
      } catch (err) {
        console.error("Failed to load HTML", err);
        window.open(url, '_blank');
      }
    }
  };


  if (!student) {
    return (
      <div className="landing-container" style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #1A237E 0%, #0D47A1 100%)', display: 'flex', flexDirection: 'column' }}>
        <nav className="landing-nav" style={{ background: 'transparent', border: 'none', height: '100px' }}>
           <img src="/logo.png" style={{ height: '80%', objectFit: 'contain' }} alt="Logo" />
           <Link to="/" style={{ color: 'white', fontWeight: 600 }}>Back Home</Link>
        </nav>
        
        <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
          <div className="card-base" style={{ width: '100%', maxWidth: '450px', padding: '3rem', textAlign: 'center' }}>
            <h2 style={{ color: '#1A237E', marginBottom: '1rem' }}>Student Portal Login</h2>
            <p style={{ color: '#64748B', marginBottom: '2rem', fontSize: '0.9rem' }}>Sign in to access results, notes, and payments.</p>
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <input type="text" placeholder="Student ID (e.g. XI2026001)" value={studentId} onChange={e => setStudentId(e.target.value)} className="portal-input" required />
              <input type="password" placeholder="Portal Password" value={password} onChange={e => setPassword(e.target.value)} className="portal-input" required />
              <button disabled={loading} className="cta-primary" style={{ border: 'none', margin: '1rem 0' }}>
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>
            {error && <p style={{ color: '#EF4444', backgroundColor: '#FEE2E2', padding: '0.75rem', borderRadius: '8px', fontSize: '0.85rem' }}>{error}</p>}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="landing-container" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#F8FAFC' }}>
      {/* Portal Header */}
      <nav className="landing-nav portal-header-nav" style={{ 
        position: 'sticky', 
        top: 0, 
        zIndex: 100, 
        backgroundColor: 'white', 
        padding: '0 5%', 
        boxShadow: '0 2px 10px rgba(0,0,0,0.05)', 
        height: '80px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', height: '100%' }}>
          <img src="/logo.png" style={{ height: '50px', objectFit: 'contain' }} alt="Logo" />
          <div style={{ borderLeft: '2px solid #E2E8F0', paddingLeft: '0.75rem' }} className="desktop-only">
            <h4 style={{ margin: 0, color: '#1A237E', fontSize: '0.95rem' }}>{student.name}</h4>
            <span style={{ fontSize: '0.7rem', color: '#64748B' }}>{student.standard} • {student.id}</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ textAlign: 'right' }} className="mobile-only">
             <h4 style={{ margin: 0, color: '#1A237E', fontSize: '0.85rem' }}>{student.name.split(' ')[0]}</h4>
             <span style={{ fontSize: '0.65rem', color: '#64748B' }}>{student.standard}</span>
          </div>
          <button onClick={logout} className="btn-secondary" style={{ color: '#EF4444', border: '1px solid #EF4444', padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}><FiLogOut /> Exit</button>
        </div>
      </nav>

      {error && (
        <div style={{ backgroundColor: '#FEE2E2', color: '#DC2626', padding: '1rem', textAlign: 'center', fontWeight: 'bold' }}>
          DEBUG ERROR: {error}
        </div>
      )}

      {/* Mobile Tab Navigation */}
      <div className="mobile-only portal-mobile-tabs" style={{ 
        position: 'sticky', 
        top: '80px', 
        zIndex: 90, 
        backgroundColor: 'white', 
        borderBottom: '1px solid #E2E8F0',
        padding: '0.5rem',
        display: 'flex',
        overflowX: 'auto',
        gap: '0.5rem',
        WebkitOverflowScrolling: 'touch'
      }}>
          {[
            { id: 'dashboard', icon: <FiGrid />, label: 'Home' },
            { id: 'results', icon: <FiFileText />, label: 'Tests' },
            { id: 'library', icon: <FiBookOpen />, label: 'Vault' },
            { id: 'payments', icon: <FiCreditCard />, label: 'Fees' },
            { id: 'profile', icon: <FiUser />, label: 'Profile' }
          ].map(tab => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{ 
                flex: '0 0 auto',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                border: 'none',
                background: activeTab === tab.id ? '#1A237E' : '#F1F5F9',
                color: activeTab === tab.id ? 'white' : '#64748B',
                fontSize: '0.75rem',
                fontWeight: 600,
                transition: 'all 0.2s'
              }}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
      </div>

      {/* Portal Content */}
      <div className="portal-content-wrapper" style={{ flex: 1, display: 'flex', gap: '2rem', padding: '1.5rem 5%' }}>
        
        {/* Sidebar Nav (Desktop) */}
        <aside className="desktop-only" style={{ width: '220px', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
           <button onClick={() => setActiveTab('dashboard')} className={`portal-nav-btn ${activeTab === 'dashboard' ? 'active' : ''}`}><FiGrid /> Dashboard</button>
           <button onClick={() => setActiveTab('results')} className={`portal-nav-btn ${activeTab === 'results' ? 'active' : ''}`}><FiFileText /> Test Results</button>
           <button onClick={() => setActiveTab('library')} className={`portal-nav-btn ${activeTab === 'library' ? 'active' : ''}`}><FiBookOpen /> Digital Library</button>
           <button onClick={() => setActiveTab('payments')} className={`portal-nav-btn ${activeTab === 'payments' ? 'active' : ''}`}><FiCreditCard /> Payments</button>
           <button onClick={() => setActiveTab('profile')} className={`portal-nav-btn ${activeTab === 'profile' ? 'active' : ''}`}><FiUser /> My Profile</button>
        </aside>

        {/* Main Panel */}
        <main style={{ flex: 1 }}>
           
           {activeTab === 'dashboard' && (
             <div className="animate-in">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                   <div className="card-base" style={{ padding: '1.25rem', borderLeft: '4px solid #10B981' }}>
                      <p style={{ color: '#64748B', fontSize: '0.65rem', textTransform: 'uppercase', fontWeight: 800, marginBottom: '0.5rem' }}>Balance Due</p>
                      <h2 style={{ color: '#1A237E', margin: '0', fontSize: '1.5rem' }}>₹{(student.balance || 0).toLocaleString()}</h2>
                      <div style={{ marginTop: '0.75rem' }}>
                        <Link to="/pay-fees" style={{ fontSize: '0.75rem', color: '#B8860B', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>Pay Online <FiArrowRight /></Link>
                      </div>
                   </div>
                   <div className="card-base" style={{ padding: '1.25rem', borderLeft: '4px solid #B8860B' }}>
                      <p style={{ color: '#64748B', fontSize: '0.65rem', textTransform: 'uppercase', fontWeight: 800, marginBottom: '0.5rem' }}>Latest Score</p>
                      <h2 style={{ color: '#1A237E', margin: '0', fontSize: '1.5rem' }}>
                        {results[0]?.score || 'N/A'}
                        <span style={{ fontSize: '0.8rem', color: '#94A3B8', marginLeft: '4px' }}>/ {results[0]?.total_marks || results[0]?.totalMarks || '-'}</span>
                      </h2>
                      <div style={{ marginTop: '0.75rem' }}>
                        <button onClick={() => setActiveTab('results')} style={{ fontSize: '0.75rem', color: '#B8860B', background: 'none', border: 'none', fontWeight: 700, cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>Performance <FiArrowRight /></button>
                      </div>
                   </div>
                   <div className="card-base" style={{ padding: '1.25rem', borderLeft: '4px solid #1A237E' }}>
                      <p style={{ color: '#64748B', fontSize: '0.65rem', textTransform: 'uppercase', fontWeight: 800, marginBottom: '0.5rem' }}>Vault Resources</p>
                      <h2 style={{ color: '#1A237E', margin: '0', fontSize: '1.5rem' }}>{library.length} Files</h2>
                      <div style={{ marginTop: '0.75rem' }}>
                        <button onClick={() => setActiveTab('library')} style={{ fontSize: '0.75rem', color: '#B8860B', background: 'none', border: 'none', fontWeight: 700, cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>Access Notes <FiArrowRight /></button>
                      </div>
                   </div>
                </div>

                <div className="card-base" style={{ padding: '1.5rem' }}>
                   <h3 style={{ marginBottom: '1rem', color: '#1A237E', fontSize: '1.1rem' }}>Latest Announcement</h3>
                   <div style={{ backgroundColor: '#F8FAFC', padding: '1.25rem', borderRadius: '12px', borderLeft: '4px solid #D4AF37' }}>
                      <p style={{ margin: 0, fontSize: '0.85rem', lineHeight: '1.6', color: '#475569' }}>"Welcome to your official Yashashrri Student Portal. Here you can track your academic growth and access premium notes curated by our faculty."</p>
                      <div style={{ marginTop: '0.75rem', fontSize: '0.7rem', color: '#94A3B8', fontWeight: 600 }}>POSTED BY ADMIN • ACADEMIC YEAR 2026-27</div>
                   </div>
                </div>
             </div>
           )}

           {activeTab === 'results' && (
             <div className="animate-in" style={{ display: 'grid', gap: '0.75rem' }}>
                 <h3 style={{ color: '#1A237E', marginBottom: '0.5rem', fontSize: '1.1rem' }}>Academic Performance</h3>
                 {results.length === 0 ? <p style={{ textAlign: 'center', padding: '3rem', color: '#94A3B8' }}>No test records found yet.</p> : results.map(test => {
                  const isTestPast = new Date().toISOString().split('T')[0] >= test.date;
                  const isAbsent = Number(test.score) === -1 || String(test.score).toLowerCase() === 'absent';
                  const isMarksEntered = test.score !== 'N/A' && test.score !== undefined && test.score !== null;
                  const canViewSolution = isMarksEntered && !isAbsent && test.hasSolutionAccess;

                  return (
                    <div key={test.id} className="card-base" style={{ padding: '1rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                       <div style={{ flex: 1 }}>
                          <h4 style={{ margin: 0, fontSize: '0.9rem', color: '#1E293B' }}>{test.name}</h4>
                          <div style={{ fontSize: '0.7rem', color: '#64748B', marginTop: '4px' }}>{test.subject} • {new Date(test.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</div>
                       </div>
                       <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
                          <div style={{ textAlign: 'right' }}>
                             <div style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: isAbsent ? '#EF4444' : (isMarksEntered ? '#10B981' : '#CBD5E1') }}>
                                {isAbsent ? 'ABS' : test.score}
                                <span style={{ fontSize: '0.7rem', color: '#94A3B8', marginLeft: '2px', fontWeight: 500 }}>/{test.total_marks || test.totalMarks}</span>
                             </div>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem' }}>
                            {test.solution_url && canViewSolution && (
                               <a href={test.solution_url} target="_blank" rel="noreferrer" style={{ 
                                 backgroundColor: '#B8860B', 
                                 color: 'white', 
                                 padding: '0.4rem 0.8rem', 
                                 borderRadius: '6px', 
                                 fontSize: '0.7rem', 
                                 fontWeight: 700, 
                                 textDecoration: 'none',
                                 display: 'flex',
                                 alignItems: 'center',
                                 gap: '0.3rem'
                               }}>
                                  <FiDownload size={12} /> Key
                               </a>
                            )}
                          </div>
                       </div>
                    </div>
                  );
                })}
             </div>
           )}

           {activeTab === 'library' && (
             <div className="animate-in">
               {!selectedFolder ? (
                 <>
                   <h3 style={{ color: '#1A237E', marginBottom: '1rem', fontSize: '1.1rem' }}>Resource Folders</h3>
                   <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 200px), 1fr))', gap: '1.25rem' }}>
                     {Object.keys(groupedLibrary).length === 0 ? <p style={{ gridColumn: '1/-1', textAlign: 'center', padding: '4rem', color: '#94A3B8' }}>No library resources assigned yet.</p> : null}
                     
                     {Object.entries(groupedLibrary).map(([category, files]) => (
                       <div key={category} className="card-base" onClick={() => setSelectedFolder(category)} style={{ padding: '1.5rem', cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                         <div style={{ fontSize: '3rem' }}>📁</div>
                         <h4 style={{ margin: 0, color: '#1A237E', fontSize: '1rem' }}>{category}</h4>
                         <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748B', fontWeight: 600 }}>{files.length} items</p>
                       </div>
                     ))}
                   </div>
                 </>
               ) : (
                 <>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                     <button onClick={() => setSelectedFolder(null)} className="btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>← Back to Folders</button>
                     <h3 style={{ color: '#1A237E', margin: 0, fontSize: '1.1rem' }}>📁 {selectedFolder}</h3>
                   </div>
                   <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 240px), 1fr))', gap: '1rem' }}>
                      {groupedLibrary[selectedFolder]?.map(file => (
                        <div key={file.id} className="card-base" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                           <div style={{ padding: '1rem', backgroundColor: '#F8FAFC', borderRadius: '10px', textAlign: 'center' }}>
                              <FiBookOpen size={30} color="#1A237E" />
                           </div>
                           <div style={{ flex: 1 }}>
                              <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '0.85rem', color: '#1E293B', lineHeight: '1.4' }}>{file.parsedTitle}</h4>
                              <p style={{ fontSize: '0.65rem', color: '#64748B', fontWeight: 600 }}>Added: {file.date}</p>
                           </div>
                            <a href={file.video_link || file.videoLink} onClick={(e) => handleResourceClick(e, file.video_link || file.videoLink)} target="_blank" rel="noreferrer" style={{ 
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '0.5rem',
                              backgroundColor: '#1A237E',
                              color: 'white',
                              padding: '0.75rem',
                              borderRadius: '8px',
                              fontSize: '0.8rem',
                              fontWeight: 700,
                              textDecoration: 'none'
                            }}>
                              <FiDownload /> Access Resource
                            </a>
                        </div>
                      ))}
                   </div>
                 </>
               )}
             </div>
           )}

           {activeTab === 'payments' && (
             <div className="animate-in">
                <div className="card-base" style={{ padding: '1.5rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(135deg, #1A237E, #0D47A1)', color: 'white', borderRadius: '16px', boxShadow: '0 8px 20px rgba(26, 35, 126, 0.2)' }}>
                   <div>
                      <p style={{ margin: 0, fontSize: '0.7rem', opacity: 0.8, textTransform: 'uppercase', fontWeight: 800, color: 'white' }}>Account Balance</p>
                      <div style={{ margin: '0.25rem 0', fontSize: '2rem', fontWeight: 800, color: '#FFFFFF' }}>₹{(student.balance || 0).toLocaleString()}</div>
                      <p style={{ margin: 0, fontSize: '0.7rem', color: 'rgba(255,255,255,0.6)' }}>Due as of today</p>
                   </div>
                   <Link to="/pay-fees" style={{ 
                     backgroundColor: '#D4AF37', 
                     border: 'none', 
                     color: '#1A237E', 
                     fontWeight: 800, 
                     padding: '0.75rem 1.25rem', 
                     borderRadius: '10px', 
                     fontSize: '0.8rem', 
                     textDecoration: 'none' 
                   }}>Pay Now</Link>
                </div>
                
                <h3 style={{ color: '#1A237E', marginBottom: '0.75rem', fontSize: '1.1rem' }}>Recent Transactions</h3>
                <div className="card-base" style={{ padding: 0, overflow: 'hidden', backgroundColor: 'transparent', border: 'none', boxShadow: 'none' }}>
                   {/* Desktop Table */}
                   <div className="desktop-only card-base" style={{ padding: 0, overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead style={{ backgroundColor: '#F8FAFC' }}>
                          <tr style={{ textAlign: 'left' }}>
                              <th style={{ padding: '1rem', fontSize: '0.75rem', color: '#64748B' }}>Date</th>
                              <th style={{ padding: '1rem', fontSize: '0.75rem', color: '#64748B' }}>Mode / Remarks</th>
                              <th style={{ padding: '1rem', fontSize: '0.75rem', color: '#64748B' }}>Amount</th>
                              <th style={{ padding: '1rem', fontSize: '0.75rem', color: '#64748B', textAlign: 'right' }}>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {payments.length === 0 ? <tr><td colSpan="4" style={{ padding: '3rem', textAlign: 'center', color: '#94A3B8' }}>No transaction history.</td></tr> : payments.map(p => (
                              <tr key={p.id} style={{ borderTop: '1px solid #E2E8F0', backgroundColor: 'white' }}>
                                <td style={{ padding: '1rem', fontSize: '0.85rem' }}>{p.payment_date ? new Date(p.payment_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}</td>
                                <td style={{ padding: '1rem', fontSize: '0.8rem', color: '#64748B' }}>{p.payment_mode || '-'} {p.remarks ? `(${p.remarks})` : ''}</td>
                                <td style={{ padding: '1rem', fontWeight: 700, color: (p.amount_paid || 0) < 0 ? '#EF4444' : '#1A237E' }}>{(p.amount_paid || 0) < 0 ? `- ₹${Math.abs(p.amount_paid || 0).toLocaleString()}` : `₹${(p.amount_paid || 0).toLocaleString()}`}</td>
                                <td style={{ padding: '1rem', textAlign: 'right' }}><span style={{ backgroundColor: '#ECFDF5', color: '#059669', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 800 }}>Paid</span></td>
                              </tr>
                          ))}
                        </tbody>
                    </table>
                   </div>

                   {/* Mobile Cards */}
                   <div className="mobile-only" style={{ display: 'grid', gap: '0.75rem' }}>
                      {payments.length === 0 ? <p style={{ textAlign: 'center', color: '#94A3B8', padding: '2rem' }}>No records found.</p> : payments.map(p => (
                        <div key={p.id} className="card-base" style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                           <div>
                              <div style={{ fontWeight: 700, fontSize: '0.85rem', color: (p.amount_paid || 0) < 0 ? '#EF4444' : '#1E293B' }}>{(p.amount_paid || 0) < 0 ? `- ₹${Math.abs(p.amount_paid || 0).toLocaleString()}` : `₹${(p.amount_paid || 0).toLocaleString()}`}</div>
                              <div style={{ fontSize: '0.65rem', color: '#64748B', marginTop: '2px' }}>{p.payment_date ? new Date(p.payment_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'} • {p.payment_mode || '-'}</div>
                           </div>
                           <span style={{ 
                             backgroundColor: '#ECFDF5', 
                             color: '#059669', 
                             padding: '0.2rem 0.5rem', 
                             borderRadius: '4px', 
                             fontSize: '0.65rem', 
                             fontWeight: 800,
                             textTransform: 'uppercase'
                           }}>PAID</span>
                        </div>
                      ))}
                   </div>
                </div>
             </div>
           )}

           {activeTab === 'profile' && (
             <div className="animate-in" style={{ maxWidth: '640px', margin: '0 auto', display: 'grid', gap: '1rem' }}>

                {/* Profile Card */}
                <div className="card-base" style={{ padding: '1.5rem', textAlign: 'center' }}>
                   <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: '#F1F5F9', margin: '0 auto 1rem', overflow: 'hidden', border: '3px solid white', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}>
                      {student.photo ? <img src={student.photo} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Profile" /> : <FiUser size={30} color="#CBD5E1" style={{ marginTop: '25px' }} />}
                   </div>
                   <h2 style={{ color: '#1A237E', margin: '0 0 0.25rem 0', fontSize: '1.25rem' }}>{student.name}</h2>
                   <p style={{ color: '#64748B', fontWeight: 600, margin: 0, fontSize: '0.8rem' }}>{student.id} &nbsp;|&nbsp; Std: {student.standard}</p>
                   
                   <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1.25rem', borderTop: '1px solid #E2E8F0', paddingTop: '1.25rem' }}>
                      <div>
                        <p style={{ margin: 0, fontSize: '0.65rem', color: '#94A3B8', fontWeight: 800, textTransform: 'uppercase' }}>Phone</p>
                        <p style={{ margin: '2px 0 0 0', fontWeight: 700, fontSize: '0.85rem' }}>{student.student_phone || student.parent_phone || '—'}</p>
                      </div>
                      <div>
                        <p style={{ margin: 0, fontSize: '0.65rem', color: '#94A3B8', fontWeight: 800, textTransform: 'uppercase' }}>Document</p>
                        {student.marksheet_url
                          ? <a href={student.marksheet_url} target="_blank" rel="noreferrer" style={{ color: '#B8860B', fontWeight: 700, fontSize: '0.85rem', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}>View <FiExternalLink size={12} /></a>
                          : <span style={{ color: '#EF4444', fontSize: '0.8rem' }}>Pending</span>}
                      </div>
                   </div>
                </div>

                {profileMsg && (
                  <div style={{ padding: '0.75rem', borderRadius: '8px', background: profileMsg.type === 'success' ? '#ECFDF5' : '#FEE2E2', color: profileMsg.type === 'success' ? '#16A34A' : '#DC2626', fontWeight: 600, textAlign: 'center', fontSize: '0.8rem' }}>
                    {profileMsg.text}
                  </div>
                )}

                {/* Change Password */}
                <div className="card-base" style={{ padding: '1.25rem' }}>
                   <h3 style={{ color: '#1A237E', marginTop: 0, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem' }}><FiLock /> Change Password</h3>
                   <div style={{ display: 'grid', gap: '0.75rem' }}>
                      <input className="portal-input" style={{ padding: '0.75rem', fontSize: '0.9rem' }} type="password" placeholder="New Password" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
                      <input className="portal-input" style={{ padding: '0.75rem', fontSize: '0.9rem' }} type="password" placeholder="Confirm Password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
                      <button className="cta-primary" style={{ border: 'none', cursor: 'pointer', padding: '0.75rem', fontSize: '0.85rem' }} disabled={profileLoading} onClick={async () => {
                        if (!newPassword || newPassword.length < 4) return setProfileMsg({ type: 'error', text: 'Password must be at least 4 characters.' });
                        if (newPassword !== confirmPassword) return setProfileMsg({ type: 'error', text: 'Passwords do not match.' });
                        setProfileLoading(true); setProfileMsg(null);
                        const { error } = await supabase.from('students').update({ portal_password: newPassword }).eq('id', student.id);
                        setProfileLoading(false);
                        if (error) return setProfileMsg({ type: 'error', text: 'Failed: ' + error.message });
                        setProfileMsg({ type: 'success', text: '✅ Password updated!' });
                        setNewPassword(''); setConfirmPassword('');
                      }}>{profileLoading ? 'Saving...' : 'Update Password'}</button>
                   </div>
                </div>

                {/* Upload Documents */}
                <div className="card-base" style={{ padding: '1.25rem' }}>
                   <h3 style={{ color: '#1A237E', marginTop: 0, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem' }}><FiUpload /> Upload Documents</h3>
                   <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div className="file-upload-box">
                        <label className="portal-file-label" style={{ padding: '0.6rem', fontSize: '0.7rem' }}>
                          <FiCamera size={14} /> Profile Photo
                          <input type="file" accept="image/*" onChange={async e => {
                            const file = e.target.files[0];
                            if (!file) return;
                            setProfileLoading(true); setProfileMsg(null);
                            const fileExt = file.name.split('.').pop();
                            const fileName = `${student.id}_photo.${fileExt}`;
                            const { error } = await supabase.storage.from('gallery').upload(fileName, file, { upsert: true });
                            if (error) { setProfileMsg({ type: 'error', text: 'Upload failed' }); setProfileLoading(false); return; }
                            const { data: publicUrl } = supabase.storage.from('gallery').getPublicUrl(fileName);
                            await supabase.from('students').update({ photo: publicUrl.publicUrl }).eq('id', student.id);
                            setStudent(prev => ({ ...prev, photo: publicUrl.publicUrl }));
                            sessionStorage.setItem('student_session', JSON.stringify({ ...student, photo: publicUrl.publicUrl }));
                            setProfileMsg({ type: 'success', text: '✅ Photo updated!' });
                            setProfileLoading(false);
                          }} style={{ display: 'none' }} disabled={profileLoading} />
                        </label>
                      </div>
                      <div className="file-upload-box">
                        <label className="portal-file-label" style={{ padding: '0.6rem', fontSize: '0.7rem' }}>
                          <FiFile size={14} /> Marksheet
                          <input type="file" accept=".pdf,image/*" onChange={async e => {
                            const file = e.target.files[0];
                            if (!file) return;
                            setProfileLoading(true); setProfileMsg(null);
                            const fileExt = file.name.split('.').pop();
                            const fileName = `${student.id}_marksheet.${fileExt}`;
                            const { error } = await supabase.storage.from('gallery').upload(fileName, file, { upsert: true });
                            if (error) { setProfileMsg({ type: 'error', text: 'Upload failed' }); setProfileLoading(false); return; }
                            const { data: publicUrl } = supabase.storage.from('gallery').getPublicUrl(fileName);
                            await supabase.from('students').update({ marksheet_url: publicUrl.publicUrl }).eq('id', student.id);
                            setStudent(prev => ({ ...prev, marksheet_url: publicUrl.publicUrl }));
                            sessionStorage.setItem('student_session', JSON.stringify({ ...student, marksheet_url: publicUrl.publicUrl }));
                            setProfileMsg({ type: 'success', text: '✅ Marksheet updated!' });
                            setProfileLoading(false);
                          }} style={{ display: 'none' }} disabled={profileLoading} />
                        </label>
                      </div>
                   </div>
                </div>

             </div>
           )}

        </main>
      </div>

      <style>{`
        .portal-input {
          width: 100%;
          border-radius: 8px;
          border: 1px solid #CBD5E1;
          background-color: white;
          transition: all 0.2s;
        }
        .portal-input:focus {
          border-color: #B8860B;
          outline: none;
          box-shadow: 0 0 0 3px rgba(184, 134, 11, 0.1);
        }
        .portal-nav-btn {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 0.85rem 1.25rem;
          border: none;
          background: none;
          color: #64748B;
          font-weight: 600;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s;
          text-align: left;
          font-size: 0.9rem;
        }
        .portal-nav-btn:hover {
          background-color: #F1F5F9;
          color: #1A237E;
        }
        .portal-nav-btn.active {
          background-color: #1A237E;
          color: white;
          box-shadow: 0 4px 12px rgba(26, 35, 126, 0.2);
        }
        .portal-file-label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: #F8FAFC;
          border: 1px dashed #CBD5E1;
          border-radius: 8px;
          color: #1A237E;
          cursor: pointer;
          font-weight: 700;
          justify-content: center;
          transition: all 0.2s;
        }
        .portal-file-label:hover {
          background: #F1F5F9;
          border-color: #1A237E;
        }
        
        @media (max-width: 768px) {
          .desktop-only { display: none !important; }
          .portal-content-wrapper { padding: 1rem !important; }
          .portal-header-nav { height: 70px !important; }
          .portal-mobile-tabs::-webkit-scrollbar { display: none; }
          .card-base { padding: 1rem !important; }
        }
        @media (min-width: 769px) {
          .mobile-only { display: none !important; }
        }
      `}</style>
    </div>
  );
};

export default StudentPortal;
