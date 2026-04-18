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
  const [authMode, setAuthMode] = useState('login'); // 'login', 'signup'
  
  // Login States
  const [studentId, setStudentId] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState(''); // for signup
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  // Data States
  const [results, setResults] = useState([]);
  const [library, setLibrary] = useState([]);
  const [payments, setPayments] = useState([]);
  const [photoFile, setPhotoFile] = useState(null);
  const [marksheetFile, setMarksheetFile] = useState(null);

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
    const { data: tests } = await supabase.from('tests').select('*').contains('standards', [studentData.standard]).order('date', { ascending: false });
    const { data: marks } = await supabase.from('test_results').select('*').eq('student_id', studentData.id);
    if (tests) {
      setResults(tests.map(t => ({
        ...t,
        score: marks?.find(m => m.test_id === t.id)?.score || 'N/A'
      })));
    }

    // Fetch Library (Notes)
    const { data: notes } = await supabase.from('library_resources').select('*').eq('standard', studentData.standard).order('date', { ascending: false });
    setLibrary(notes || []);

    // Fetch Payments
    const { data: payHistory } = await supabase.from('online_payments').select('*').eq('student_name', studentData.name).order('created_at', { ascending: false });
    setPayments(payHistory || []);
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
      if (!data.portal_enabled) throw new Error('Portal access disabled.');

      loginStudent(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      // Helper: strip country code and spaces for comparison
      const normalizePhone = (p) => (p || '').replace(/^\+91/, '').replace(/^0/, '').replace(/\s+/g, '').trim();

      // 1. Fetch student by ID
      const { data, error: err } = await supabase
        .from('students')
        .select('*')
        .eq('id', studentId.trim())
        .single();

      if (err || !data) throw new Error('Student ID not found. Please check and try again.');

      // 2. Compare phone numbers after normalizing both sides
      const inputPhone = normalizePhone(phone);
      const storedStudent = normalizePhone(data.student_phone);
      const storedParent = normalizePhone(data.parent_phone);

      if (inputPhone !== storedStudent && inputPhone !== storedParent) {
        throw new Error('Verification failed. Use the ID and Phone provided during admission.');
      }

      // 2. Upload Files if provided
      let photoUrl = data.photo;
      let marksheetUrl = data.marksheet_url;

      if (photoFile) {
        const fileExt = photoFile.name.split('.').pop();
        const fileName = `${data.id}_photo.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('gallery').upload(fileName, photoFile, { upsert: true });
        if (uploadError) throw new Error('Photo upload failed: ' + uploadError.message);
        const { data: publicUrl } = supabase.storage.from('gallery').getPublicUrl(fileName);
        photoUrl = publicUrl.publicUrl;
      }

      if (marksheetFile) {
        const fileExt = marksheetFile.name.split('.').pop();
        const fileName = `${data.id}_marksheet.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('gallery').upload(fileName, marksheetFile, { upsert: true });
        if (uploadError) throw new Error('Marksheet upload failed: ' + uploadError.message);
        const { data: publicUrl } = supabase.storage.from('gallery').getPublicUrl(fileName);
        marksheetUrl = publicUrl.publicUrl;
      }

      // 3. Update student record
      const { error: upError } = await supabase
        .from('students')
        .update({ 
          portal_password: password.trim(), 
          portal_enabled: true,
          photo: photoUrl,
          marksheet_url: marksheetUrl
        })
        .eq('id', data.id);

      if (upError) throw upError;

      alert('Account activated successfully with your documents! Please sign in.');
      setAuthMode('login');
      setPassword('');
      setPhotoFile(null);
      setMarksheetFile(null);
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
            <h2 style={{ color: '#1A237E', marginBottom: '1rem' }}>{authMode === 'login' ? 'Student Portal Login' : 'Activate Portal Account'}</h2>
            <p style={{ color: '#64748B', marginBottom: '2rem', fontSize: '0.9rem' }}>
              {authMode === 'login' 
                ? 'Sign in to access results, notes, and payments.' 
                : 'Enter your Student ID and registered phone to set your password.'}
            </p>

            <form onSubmit={authMode === 'login' ? handleLogin : handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
               <input 
                 type="text" 
                 placeholder="Student ID (e.g. 10S2026001)" 
                 value={studentId} 
                 onChange={e => setStudentId(e.target.value)} 
                 className="portal-input"
                 required
               />
               
               {authMode === 'signup' && (
                 <input 
                   type="tel" 
                   placeholder="Registered Phone Number" 
                   value={phone} 
                   onChange={e => setPhone(e.target.value)} 
                   className="portal-input"
                   required
                 />
               )}

               <input 
                 type="password" 
                 placeholder={authMode === 'login' ? 'Portal Password' : 'Set New Password'} 
                 value={password} 
                 onChange={e => setPassword(e.target.value)} 
                 className="portal-input"
                 required
               />

               {authMode === 'signup' && (
                 <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', textAlign: 'left' }}>
                    <div className="file-upload-box">
                      <label style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 600, display: 'block', marginBottom: '0.4rem' }}>PROFILE PHOTO</label>
                      <label className="portal-file-label">
                        <FiCamera /> {photoFile ? 'Selected' : 'Choose...'}
                        <input type="file" accept="image/*" onChange={e => setPhotoFile(e.target.files[0])} style={{ display: 'none' }} />
                      </label>
                    </div>
                    <div className="file-upload-box">
                      <label style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 600, display: 'block', marginBottom: '0.4rem' }}>MARKSHEET PDF</label>
                      <label className="portal-file-label">
                        <FiFile /> {marksheetFile ? 'Selected' : 'Choose...'}
                        <input type="file" accept=".pdf,image/*" onChange={e => setMarksheetFile(e.target.files[0])} style={{ display: 'none' }} />
                      </label>
                    </div>
                 </div>
               )}

               <button disabled={loading} className="cta-primary" style={{ border: 'none', margin: '1rem 0' }}>
                 {loading ? 'Processing...' : (authMode === 'login' ? 'Sign In' : 'Upload & Activate')}
               </button>
            </form>

            {error && <p style={{ color: '#EF4444', backgroundColor: '#FEE2E2', padding: '0.75rem', borderRadius: '8px', fontSize: '0.85rem' }}>{error}</p>}

            <div style={{ marginTop: '2rem', borderTop: '1px solid #E2E8F0', paddingTop: '1.5rem' }}>
               {authMode === 'login' ? (
                 <p style={{ fontSize: '0.9rem' }}>First time here? <button onClick={() => setAuthMode('signup')} style={{ color: '#B8860B', background: 'none', border: 'none', fontWeight: 700, cursor: 'pointer' }}>Activate your account</button></p>
               ) : (
                 <p style={{ fontSize: '0.9rem' }}>Already activated? <button onClick={() => setAuthMode('login')} style={{ color: '#B8860B', background: 'none', border: 'none', fontWeight: 700, cursor: 'pointer' }}>Sign In</button></p>
               )}
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="landing-container" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#F8FAFC' }}>
      {/* Portal Header */}
      <nav className="landing-nav" style={{ position: 'sticky', top: 0, zIndex: 100, backgroundColor: 'white', padding: '0 5%', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', height: '100px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', height: '100%' }}>
          <img src="/logo.png" style={{ height: '80%', objectFit: 'contain' }} alt="Logo" />
          <div style={{ borderLeft: '2px solid #E2E8F0', paddingLeft: '1rem' }}>
            <h4 style={{ margin: 0, color: '#1A237E' }}>{student.name}</h4>
            <span style={{ fontSize: '0.75rem', color: '#64748B' }}>{student.standard} • ID: {student.id}</span>
          </div>
        </div>
        <button onClick={logout} className="btn-secondary" style={{ color: '#EF4444', border: '1px solid #EF4444' }}><FiLogOut /> Exit</button>
      </nav>

      {/* Portal Content */}
      <div style={{ flex: 1, display: 'flex', gap: '2rem', padding: '2rem 5%' }}>
        
        {/* Sidebar Nav */}
        <aside style={{ width: '250px', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
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
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                   <div className="card-base" style={{ padding: '1.5rem', borderLeft: '4px solid #10B981' }}>
                      <p style={{ color: '#64748B', fontSize: '0.8rem', textTransform: 'uppercase' }}>Current Balance</p>
                      <h2 style={{ color: '#1A237E', margin: '0.5rem 0' }}>₹{(student.balance || 0).toLocaleString()}</h2>
                      <Link to="/pay-fees" style={{ fontSize: '0.85rem', color: '#B8860B', fontWeight: 600 }}>Pay Online <FiArrowRight /></Link>
                   </div>
                   <div className="card-base" style={{ padding: '1.5rem', borderLeft: '4px solid #B8860B' }}>
                      <p style={{ color: '#64748B', fontSize: '0.8rem', textTransform: 'uppercase' }}>Recent Test Score</p>
                      <h2 style={{ color: '#1A237E', margin: '0.5rem 0' }}>{results[0]?.score || 'N/A'}<span style={{ fontSize: '0.9rem', color: '#94A3B8' }}> / {results[0]?.total_marks || results[0]?.totalMarks || '-'}</span></h2>
                      <button onClick={() => setActiveTab('results')} style={{ fontSize: '0.85rem', color: '#B8860B', background: 'none', border: 'none', fontWeight: 600, cursor: 'pointer' }}>View All Results <FiArrowRight /></button>
                   </div>
                   <div className="card-base" style={{ padding: '1.5rem', borderLeft: '4px solid #1A237E' }}>
                      <p style={{ color: '#64748B', fontSize: '0.8rem', textTransform: 'uppercase' }}>Notes Available</p>
                      <h2 style={{ color: '#1A237E', margin: '0.5rem 0' }}>{library.length} Files</h2>
                      <button onClick={() => setActiveTab('library')} style={{ fontSize: '0.85rem', color: '#B8860B', background: 'none', border: 'none', fontWeight: 600, cursor: 'pointer' }}>Open Vault <FiArrowRight /></button>
                   </div>
                </div>

                <div className="card-base" style={{ padding: '2rem' }}>
                   <h3 style={{ marginBottom: '1.5rem', color: '#1A237E' }}>Student Notice Board</h3>
                   <div style={{ backgroundColor: '#F1F5F9', padding: '1.5rem', borderRadius: '12px', borderLeft: '4px solid #D4AF37' }}>
                      <p style={{ margin: 0, fontStyle: 'italic', color: '#475569' }}>"Welcome to your official Yashashrri Student Portal. Here you can track your academic growth and access premium notes curated by our faculty since 1999."</p>
                   </div>
                </div>
             </div>
           )}

           {activeTab === 'results' && (
             <div className="animate-in" style={{ display: 'grid', gap: '1rem' }}>
                <h3 style={{ color: '#1A237E', marginBottom: '1rem' }}>Performance Records</h3>
                {results.map(test => (
                  <div key={test.id} className="card-base" style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                     <div>
                        <h4 style={{ margin: 0 }}>{test.name}</h4>
                        <span style={{ fontSize: '0.8rem', color: '#64748B' }}>{test.subject} • {test.date}</span>
                     </div>
                     <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
                        <div style={{ textAlign: 'center' }}>
                           <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: test.score !== 'N/A' ? '#10B981' : '#CBD5E1' }}>{test.score}</p>
                           <span style={{ fontSize: '0.7rem', color: '#94A3B8' }}>/ {test.total_marks || test.totalMarks}</span>
                        </div>
                        {test.solution_url && <a href={test.solution_url} target="_blank" rel="noreferrer" className="btn-secondary" style={{ backgroundColor: '#B8860B', color: 'white', border: 'none' }}><FiDownload /> Solution</a>}
                     </div>
                  </div>
                ))}
             </div>
           )}

           {activeTab === 'library' && (
             <div className="animate-in" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
                {library.length === 0 ? <p style={{ gridColumn: '1/-1', textAlign: 'center', padding: '4rem', color: '#94A3B8' }}>No library resources assigned to your standard yet.</p> : library.map(file => (
                  <div key={file.id} className="card-base" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
                     <div style={{ padding: '1rem', backgroundColor: '#F1F5F9', borderRadius: '12px', marginBottom: '1rem', textAlign: 'center' }}>
                        <FiBookOpen size={40} color="#1A237E" />
                     </div>
                     <h4 style={{ margin: '0 0 0.5rem 0', flex: 1 }}>{file.name}</h4>
                     <p style={{ fontSize: '0.8rem', color: '#64748B', marginBottom: '1.5rem' }}>Uploaded: {file.date}</p>
                     <a href={file.video_link || file.videoLink} target="_blank" rel="noreferrer" className="btn-primary" style={{ textAlign: 'center', textDecoration: 'none' }}><FiDownload /> Download Note</a>
                  </div>
                ))}
             </div>
           )}

           {activeTab === 'payments' && (
             <div className="animate-in">
                <div className="card-base" style={{ padding: '2rem', marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(to right, #1A237E, #0D47A1)', color: 'white' }}>
                   <div>
                      <p style={{ margin: 0, opacity: 0.8 }}>Outstanding Balance</p>
                      <h1 style={{ margin: '0.5rem 0', fontSize: '2.5rem' }}>₹{(student.balance || 0).toLocaleString()}</h1>
                   </div>
                   <Link to="/pay-fees" className="btn-primary" style={{ backgroundColor: '#D4AF37', border: 'none', color: '#1A237E', fontWeight: 800, padding: '1rem 2rem' }}>Proceed to Payment</Link>
                </div>
                
                <h3 style={{ color: '#1A237E', marginBottom: '1rem' }}>Transaction History</h3>
                <div className="card-base" style={{ padding: 0, overflow: 'hidden' }}>
                   <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead style={{ backgroundColor: '#F8FAFC' }}>
                         <tr style={{ textAlign: 'left' }}>
                            <th style={{ padding: '1rem' }}>Date</th>
                            <th style={{ padding: '1rem' }}>Transaction ID</th>
                            <th style={{ padding: '1rem' }}>Amount</th>
                            <th style={{ padding: '1rem' }}>Status</th>
                         </tr>
                      </thead>
                      <tbody>
                         {payments.length === 0 ? <tr><td colSpan="4" style={{ padding: '2rem', textAlign: 'center', color: '#94A3B8' }}>No online payment records found.</td></tr> : payments.map(p => (
                            <tr key={p.id} style={{ borderTop: '1px solid #E2E8F0' }}>
                               <td style={{ padding: '1rem', fontSize: '0.9rem' }}>{new Date(p.created_at).toLocaleDateString()}</td>
                               <td style={{ padding: '1rem', fontSize: '0.9rem', fontFamily: 'monospace' }}>{p.transaction_id}</td>
                               <td style={{ padding: '1rem', fontWeight: 600 }}>₹{p.amount.toLocaleString()}</td>
                               <td style={{ padding: '1rem' }}><span style={{ backgroundColor: '#FEF3C7', color: '#92400E', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700 }}>{p.status}</span></td>
                            </tr>
                         ))}
                      </tbody>
                   </table>
                </div>
             </div>
           )}

           {activeTab === 'profile' && (
             <div className="animate-in" style={{ maxWidth: '600px', margin: '0 auto' }}>
                <div className="card-base" style={{ padding: '2.5rem', textAlign: 'center' }}>
                   <div style={{ width: '120px', height: '120px', borderRadius: '50%', backgroundColor: '#F1F5F9', margin: '0 auto 1.5rem', overflow: 'hidden', border: '4px solid white', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}>
                      {student.photo ? <img src={student.photo} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <FiUser size={50} color="#CBD5E1" style={{ marginTop: '30px' }} />}
                   </div>
                   <h2 style={{ color: '#1A237E', margin: '0 0 0.5rem 0' }}>{student.name}</h2>
                   <p style={{ color: '#64748B', fontWeight: 600 }}>ID: {student.id}</p>
                   
                   <div style={{ textAlign: 'left', marginTop: '2rem', display: 'grid', gap: '1rem', borderTop: '1px solid #E2E8F0', paddingTop: '2rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                         <span style={{ color: '#64748B' }}>Standard</span>
                         <span style={{ fontWeight: 600 }}>{student.standard}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                         <span style={{ color: '#64748B' }}>Phone number</span>
                         <span style={{ fontWeight: 600 }}>{student.student_phone || student.parent_phone}</span>
                      </div>
                      <div style={{ padding: '1.5rem', backgroundColor: '#F8FAFC', borderRadius: '12px', marginTop: '1rem' }}>
                         <p style={{ fontSize: '0.8rem', color: '#64748B', marginBottom: '0.75rem', fontWeight: 700 }}>VERIFIED DOCUMENTS</p>
                         <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <FiCheckCircle color="#10B981" />
                            <span style={{ flex: 1, fontSize: '0.9rem' }}>Previous Marksheet</span>
                            {student.marksheet_url ? (
                               <a href={student.marksheet_url} target="_blank" rel="noreferrer" style={{ color: '#B8860B', fontWeight: 700, fontSize: '0.8rem' }}>VIEW <FiExternalLink /></a>
                            ) : (
                               <span style={{ color: '#EF4444', fontSize: '0.8rem' }}>Missing</span>
                            )}
                         </div>
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
          padding: 1rem;
          border-radius: 8px;
          border: 1px solid #CBD5E1;
          font-size: 1rem;
          background-color: #F8FAFC;
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
          padding: 1rem 1.5rem;
          border: none;
          background: none;
          color: #64748B;
          font-weight: 600;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s;
          text-align: left;
        }
        .portal-nav-btn:hover {
          background-color: #F1F5F9;
          color: #1A237E;
        }
        .portal-nav-btn.active {
          background-color: #1A237E;
          color: white;
        }
        .portal-file-label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem;
          background: #F1F5F9;
          border: 1px dashed #CBD5E1;
          border-radius: 8px;
          font-size: 0.8rem;
          color: #1A237E;
          cursor: pointer;
          font-weight: 600;
          justify-content: center;
        }
        .portal-file-label:hover {
          background: #E2E8F0;
        }
      `}</style>
    </div>
  );
};

export default StudentPortal;
