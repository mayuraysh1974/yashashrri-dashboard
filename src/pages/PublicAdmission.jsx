import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import './LandingPage.css';

const PublicAdmission = () => {
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    standard: '',
    gender: '',
    dob: '',
    address: ''
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase
        .from('online_admissions')
        .insert([formData]);
      
      if (error) throw error;
      setSuccess(true);
      setFormData({ full_name: '', email: '', phone: '', standard: '', gender: '', dob: '', address: '' });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="landing-container" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#F8FAFC' }}>
      <nav className="landing-nav" style={{ position: 'sticky', top: 0, zIndex: 100, background: 'white' }}>
        <div className="landing-logo" style={{ height: '100%', display: 'flex', alignItems: 'center' }}>
          <Link to="/">
            <img src="/logo.png" alt="Yashashrri Logo" className="logo-img" style={{ height: '75px', width: 'auto', display: 'block', objectFit: 'contain' }} />
          </Link>
        </div>
        <div className="nav-actions">
          <Link to="/" className="login-btn" style={{ background: 'transparent', color: '#1A237E', border: '1px solid #1A237E' }}>Back to Home</Link>
        </div>
      </nav>

      <div style={{ flex: 1, padding: '4rem 5%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ maxWidth: '800px', width: '100%', background: 'white', padding: '3rem', borderRadius: '16px', boxShadow: '0 20px 40px rgba(0,0,0,0.05)', border: '1px solid #E2E8F0' }}>
          <h2 style={{ color: '#1A237E', fontSize: '2.5rem', marginBottom: '1rem', textAlign: 'center' }}>Online Admission</h2>
          <p style={{ textAlign: 'center', color: '#64748b', marginBottom: '2rem' }}>Fill out the application form to start your journey with Yashashrri Classes.</p>
          
          {success ? (
            <div style={{ padding: '2rem', background: '#dcfce3', color: '#166534', borderRadius: '8px', textAlign: 'center' }}>
              <h3 style={{ marginBottom: '0.5rem' }}>Application Submitted successfully!</h3>
              <p>Our team will review your application and contact you soon.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {error && <div style={{ padding: '1rem', background: '#fee2e2', color: '#991b1b', borderRadius: '8px' }}>{error}</div>}
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <div className="input-group" style={{ gridColumn: 'span 2' }}>
                  <label style={{ fontWeight: 600, color: '#1A237E', marginBottom: '0.5rem', display: 'block' }}>Student Full Name</label>
                  <input type="text" name="full_name" value={formData.full_name} onChange={handleChange} required placeholder="Full Name" style={{ width: '100%', padding: '1rem', borderRadius: '8px', border: '1px solid #CBD5E1' }} />
                </div>
                
                <div className="input-group">
                  <label style={{ fontWeight: 600, color: '#1A237E', marginBottom: '0.5rem', display: 'block' }}>Standard / Class</label>
                  <select name="standard" value={formData.standard} onChange={handleChange} required style={{ width: '100%', padding: '1rem', borderRadius: '8px', border: '1px solid #CBD5E1' }}>
                    <option value="">Select Standard</option>
                    <option value="VIII">VIII</option>
                    <option value="IX">IX</option>
                    <option value="X">X</option>
                    <option value="XI">XI</option>
                    <option value="XII">XII</option>
                  </select>
                </div>

                <div className="input-group">
                  <label style={{ fontWeight: 600, color: '#1A237E', marginBottom: '0.5rem', display: 'block' }}>Date of Birth</label>
                  <input type="date" name="dob" value={formData.dob} onChange={handleChange} required style={{ width: '100%', padding: '1rem', borderRadius: '8px', border: '1px solid #CBD5E1' }} />
                </div>

                <div className="input-group">
                  <label style={{ fontWeight: 600, color: '#1A237E', marginBottom: '0.5rem', display: 'block' }}>Email Address</label>
                  <input type="email" name="email" value={formData.email} onChange={handleChange} required placeholder="Email Address" style={{ width: '100%', padding: '1rem', borderRadius: '8px', border: '1px solid #CBD5E1' }} />
                </div>

                <div className="input-group">
                  <label style={{ fontWeight: 600, color: '#1A237E', marginBottom: '0.5rem', display: 'block' }}>Phone Number</label>
                  <input type="tel" name="phone" value={formData.phone} onChange={handleChange} required placeholder="+91 00000 00000" style={{ width: '100%', padding: '1rem', borderRadius: '8px', border: '1px solid #CBD5E1' }} />
                </div>
                
                <div className="input-group">
                  <label style={{ fontWeight: 600, color: '#1A237E', marginBottom: '0.5rem', display: 'block' }}>Gender</label>
                  <select name="gender" value={formData.gender} onChange={handleChange} required style={{ width: '100%', padding: '1rem', borderRadius: '8px', border: '1px solid #CBD5E1' }}>
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                
                <div className="input-group" style={{ gridColumn: 'span 2' }}>
                  <label style={{ fontWeight: 600, color: '#1A237E', marginBottom: '0.5rem', display: 'block' }}>Residential Address</label>
                  <textarea name="address" value={formData.address} onChange={handleChange} required rows="3" placeholder="Enter full address" style={{ width: '100%', padding: '1rem', borderRadius: '8px', border: '1px solid #CBD5E1' }}></textarea>
                </div>
              </div>
              
              <button type="submit" disabled={loading} className="cta-primary" style={{ border: 'none', cursor: 'pointer', marginTop: '1rem', padding: '1rem', fontSize: '1.1rem' }}>
                {loading ? 'Submitting...' : 'Submit Application'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default PublicAdmission;
