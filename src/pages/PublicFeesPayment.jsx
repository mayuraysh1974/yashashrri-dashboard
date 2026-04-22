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
      <nav className="landing-nav" style={{ 
        position: 'sticky', 
        top: 0, 
        zIndex: 100, 
        background: 'white',
        height: '70px',
        display: 'flex',
        alignItems: 'center',
        padding: '0 5%',
        boxShadow: '0 2px 10px rgba(0,0,0,0.05)'
      }}>
        <div className="landing-logo">
          <Link to="/">
            <img src="/logo.png" alt="Yashashrri Logo" style={{ height: '45px' }} />
          </Link>
        </div>
        <div className="nav-actions">
          <Link to="/" className="btn-secondary" style={{ 
            textDecoration: 'none', 
            fontSize: '0.8rem', 
            padding: '0.4rem 0.75rem',
            color: '#1A237E', 
            border: '1px solid #1A237E',
            fontWeight: 700
          }}>Home</Link>
        </div>
      </nav>

      <div className="fees-payment-main" style={{ flex: 1, padding: '2rem 1.25rem', display: 'flex', justifyContent: 'center', alignItems: 'flex-start' }}>
        <div style={{ maxWidth: '500px', width: '100%', background: 'white', padding: '1.5rem', borderRadius: '16px', boxShadow: '0 10px 25px rgba(0,0,0,0.05)', border: '1px solid #E2E8F0' }}>
          <h2 style={{ color: '#1A237E', fontSize: '1.5rem', marginBottom: '0.5rem', textAlign: 'center' }}>Fees Verification</h2>
          <p style={{ textAlign: 'center', color: '#64748b', marginBottom: '1.5rem', fontSize: '0.85rem' }}>Submit transaction details after paying via UPI or Bank.</p>
          
          <div style={{ background: '#F8FAFC', padding: '1rem', borderRadius: '12px', marginBottom: '1.5rem', border: '1px solid #E2E8F0' }}>
            <h4 style={{ marginBottom: '0.75rem', color: '#1A237E', fontSize: '0.9rem', borderBottom: '1px solid #E2E8F0', paddingBottom: '0.5rem' }}>Beneficiary Details:</h4>
            <div style={{ display: 'grid', gap: '0.5rem', fontSize: '0.8rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><strong>Bank:</strong> <span>SBI</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><strong>Name:</strong> <span>Yashashrri Classes</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><strong>A/C:</strong> <span style={{ fontFamily: 'monospace' }}>123456789012</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><strong>UPI ID:</strong> <span style={{ color: '#B8860B', fontWeight: 700 }}>yashashrri@sbi</span></div>
            </div>
          </div>

          {success ? (
            <div style={{ padding: '2rem', background: '#ECFDF5', color: '#065F46', borderRadius: '12px', textAlign: 'center' }}>
              <FiCheckCircle size={40} style={{ marginBottom: '1rem' }} />
              <h3 style={{ marginBottom: '0.5rem', fontSize: '1.1rem' }}>Submission Successful!</h3>
              <p style={{ fontSize: '0.85rem' }}>Verification usually takes 24-48 hours. Receipt will be generated soon.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {error && <div style={{ padding: '0.75rem', background: '#FEE2E2', color: '#B91C1C', borderRadius: '8px', fontSize: '0.8rem' }}>{error}</div>}
              
              <div className="input-group">
                <label style={{ fontWeight: 700, color: '#1A237E', marginBottom: '0.4rem', display: 'block', fontSize: '0.75rem', textTransform: 'uppercase' }}>Student Full Name</label>
                <input type="text" name="student_name" value={formData.student_name} onChange={handleChange} required placeholder="As per records" style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.9rem' }} />
              </div>
              
              <div className="input-group">
                <label style={{ fontWeight: 700, color: '#1A237E', marginBottom: '0.4rem', display: 'block', fontSize: '0.75rem', textTransform: 'uppercase' }}>Registered Phone</label>
                <input type="tel" name="phone" value={formData.phone} onChange={handleChange} required placeholder="10-digit number" style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.9rem' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="input-group">
                  <label style={{ fontWeight: 700, color: '#1A237E', marginBottom: '0.4rem', display: 'block', fontSize: '0.75rem', textTransform: 'uppercase' }}>Amount (₹)</label>
                  <input type="number" name="amount" value={formData.amount} onChange={handleChange} required placeholder="e.g. 5000" style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.9rem' }} />
                </div>
                <div className="input-group">
                  <label style={{ fontWeight: 700, color: '#1A237E', marginBottom: '0.4rem', display: 'block', fontSize: '0.75rem', textTransform: 'uppercase' }}>Transaction ID</label>
                  <input type="text" name="transaction_id" value={formData.transaction_id} onChange={handleChange} required placeholder="UTR / Ref No." style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.9rem' }} />
                </div>
              </div>
              
              <button type="submit" disabled={loading} className="cta-primary" style={{ border: 'none', cursor: 'pointer', marginTop: '0.5rem', padding: '0.9rem', fontSize: '1rem', fontWeight: 700, backgroundColor: '#1A237E' }}>
                {loading ? 'Verifying...' : 'Submit Details'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default PublicFeesPayment;
