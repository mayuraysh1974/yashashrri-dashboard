import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import './LandingPage.css';

const PublicFeesPayment = () => {
  const [formData, setFormData] = useState({
    student_name: '',
    phone: '',
    amount: '',
    transaction_id: ''
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
        .from('online_payments')
        .insert([formData]);
      
      if (error) throw error;
      setSuccess(true);
      setFormData({ student_name: '', phone: '', amount: '', transaction_id: '' });
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
        <div style={{ maxWidth: '600px', width: '100%', background: 'white', padding: '3rem', borderRadius: '16px', boxShadow: '0 20px 40px rgba(0,0,0,0.05)', border: '1px solid #E2E8F0' }}>
          <h2 style={{ color: '#1A237E', fontSize: '2.5rem', marginBottom: '1rem', textAlign: 'center' }}>Online Fees Verification</h2>
          <p style={{ textAlign: 'center', color: '#64748b', marginBottom: '2rem' }}>Please pay via UPI or Bank Transfer and submit the transaction details here.</p>
          
          <div style={{ background: '#f1f5f9', padding: '1.5rem', borderRadius: '8px', marginBottom: '2rem', border: '1px solid #cbd5e1' }}>
            <h4 style={{ marginBottom: '0.5rem', color: '#0f172a' }}>Bank Details for Payment:</h4>
            <p><strong>Bank:</strong> State Bank of India</p>
            <p><strong>Account Name:</strong> Yashashrri Classes</p>
            <p><strong>A/C Number:</strong> 123456789012</p>
            <p><strong>IFSC Code:</strong> SBIN0001234</p>
            <p><strong>UPI ID:</strong> yashashrri@sbi</p>
          </div>

          {success ? (
            <div style={{ padding: '2rem', background: '#dcfce3', color: '#166534', borderRadius: '8px', textAlign: 'center' }}>
              <h3 style={{ marginBottom: '0.5rem' }}>Details Submitted!</h3>
              <p>Our administration will verify the transaction and generate a receipt shortly.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {error && <div style={{ padding: '1rem', background: '#fee2e2', color: '#991b1b', borderRadius: '8px' }}>{error}</div>}
              
              <div className="input-group">
                <label style={{ fontWeight: 600, color: '#1A237E', marginBottom: '0.5rem', display: 'block' }}>Student Name</label>
                <input type="text" name="student_name" value={formData.student_name} onChange={handleChange} required placeholder="Full Name" style={{ width: '100%', padding: '1rem', borderRadius: '8px', border: '1px solid #CBD5E1' }} />
              </div>
              
              <div className="input-group">
                <label style={{ fontWeight: 600, color: '#1A237E', marginBottom: '0.5rem', display: 'block' }}>Registered Phone Number</label>
                <input type="tel" name="phone" value={formData.phone} onChange={handleChange} required placeholder="+91 00000 00000" style={{ width: '100%', padding: '1rem', borderRadius: '8px', border: '1px solid #CBD5E1' }} />
              </div>

              <div className="input-group">
                <label style={{ fontWeight: 600, color: '#1A237E', marginBottom: '0.5rem', display: 'block' }}>Amount Paid (₹)</label>
                <input type="number" name="amount" value={formData.amount} onChange={handleChange} required placeholder="e.g. 5000" style={{ width: '100%', padding: '1rem', borderRadius: '8px', border: '1px solid #CBD5E1' }} />
              </div>
              
              <div className="input-group">
                <label style={{ fontWeight: 600, color: '#1A237E', marginBottom: '0.5rem', display: 'block' }}>Transaction ID / UTR No.</label>
                <input type="text" name="transaction_id" value={formData.transaction_id} onChange={handleChange} required placeholder="Enter Transaction Ref Number" style={{ width: '100%', padding: '1rem', borderRadius: '8px', border: '1px solid #CBD5E1' }} />
              </div>
              
              <button type="submit" disabled={loading} className="cta-primary" style={{ border: 'none', cursor: 'pointer', marginTop: '1rem', padding: '1rem', fontSize: '1.1rem' }}>
                {loading ? 'Submitting...' : 'Submit Payment Details'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default PublicFeesPayment;
