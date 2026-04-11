import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

const Login = ({ setAuth }) => {
  const [email, setEmail] = useState(''); // Supabase uses email/password by default
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setError(error.message);
      } else if (data.session) {
        setAuth(true);
        navigate('/');
      }
    } catch (err) {
      setError('Could not connect to authentication server.');
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', backgroundColor: 'var(--primary-blue)', alignItems: 'center', justifyContent: 'center' }}>
      <div className="card-base" style={{ width: '100%', maxWidth: '400px', padding: '2.5rem', borderTop: '4px solid var(--accent-gold)' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <img src="/logo.png" alt="Yashashrri Logo" style={{ width: '100%', maxWidth: '250px', margin: '0 auto', display: 'block' }} onError={(e) => { e.target.onerror = null; e.target.style.display = 'none'; e.target.nextElementSibling.style.display = 'block'; }} />
          <div style={{ display: 'none' }}>
            <h1 style={{ fontSize: '1.5rem', color: 'var(--primary-blue)', marginBottom: '0.2rem' }}>YASHASHRRI CLASSES</h1>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', letterSpacing: '1px' }}>BUILDING BRIDGES TO SUCCESS</p>
          </div>
        </div>
        
        {error && <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger-red)', padding: '0.75rem', borderRadius: '4px', textAlign: 'center', marginBottom: '1.5rem', fontSize: '0.85rem' }}>{error}</div>}

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="input-group">
            <label>Admin Email</label>
            <input type="email" placeholder="e.g. admin@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div className="input-group">
            <label>Password</label>
            <input type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          <button type="submit" className="btn-primary" style={{ marginTop: '0.5rem', padding: '0.75rem' }}>Sign In</button>
        </form>

        <div style={{ marginTop: '2rem', textAlign: 'center' }}>
          <a href="/" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
            &larr; Back to Public Website
          </a>
        </div>
      </div>
    </div>
  );
};

export default Login;
