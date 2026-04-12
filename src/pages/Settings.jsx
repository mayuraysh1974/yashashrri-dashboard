import React, { useState } from 'react';
import { FiSave, FiLock, FiBell, FiShield, FiAlertTriangle, FiTrash2, FiActivity } from 'react-icons/fi';
import { supabase } from '../supabaseClient';

const Settings = () => {
  const [passwords, setPasswords] = useState({ current: '', new: '' });
  const [pwLoading, setPwLoading] = useState(false);

  const handleUpdatePassword = async () => {
    if (!passwords.new || passwords.new.length < 6) return alert('New password must be at least 6 characters.');
    setPwLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: passwords.new });
      if (error) {
        alert('Failed to update password: ' + error.message);
      } else {
        alert('Password updated successfully! You may need to log in again.');
        setPasswords({ current: '', new: '' });
      }
    } catch (err) {
      alert('Error: ' + err.message);
    }
    setPwLoading(false);
  };

  const handleResetDatabase = async () => {
    const confirm1 = window.confirm('WARNING: You are about to clear ALL records (Students, Teachers, Fees) from the database. This action is PERMANENT and cannot be undone. Do you want to proceed?');
    if (!confirm1) return;
    const confirm2 = window.confirm('FINAL CONFIRMATION: Are you absolutely sure? All your data will be permanently erased.');
    if (!confirm2) return;

    try {
      // Delete all records from all major tables
      await Promise.all([
        supabase.from('fees').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
        supabase.from('attendance').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
        supabase.from('test_results').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
        supabase.from('message_log').delete().neq('id', 0),
      ]);
      await Promise.all([
        supabase.from('students').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
        supabase.from('teachers').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
        supabase.from('tests').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
      ]);
      alert('Database has been successfully cleared.');
      window.location.reload();
    } catch (err) {
      alert('Error resetting database: ' + err.message);
    }
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">System Settings</h1>
          <p className="page-subtitle">Configure application settings, security, and sessions</p>
        </div>
        <button className="btn-primary" onClick={() => alert('Settings Saved!')}><FiSave /> Save Changes</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '1.5rem', marginBottom: '1.5rem' }}>
        
        {/* Security Settings */}
        <div className="card-base" style={{ padding: '1.5rem' }}>
          <h3 style={{ color: 'var(--primary-blue)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FiShield /> Security
          </h3>
          <div className="input-group">
            <label>Admin Email</label>
            <input type="text" value="Managed via Supabase Auth" disabled style={{ backgroundColor: 'var(--bg-main)' }} />
          </div>
          <div className="input-group">
            <label>New Password</label>
            <input 
              type="password" 
              placeholder="Enter new password (min. 6 chars)" 
              value={passwords.new} 
              onChange={e => setPasswords({ ...passwords, new: e.target.value })} 
            />
          </div>
          <button className="btn-secondary" style={{ marginTop: '0.5rem' }} onClick={handleUpdatePassword} disabled={pwLoading}>
            <FiLock /> {pwLoading ? 'Updating...' : 'Update Password'}
          </button>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.75rem' }}>
            Password is managed securely by Supabase Auth. No current password is needed.
          </p>
        </div>

        {/* Configurations */}
        <div className="card-base" style={{ padding: '1.5rem' }}>
          <h3 style={{ color: 'var(--primary-blue)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FiBell /> Platform Configuration
          </h3>
          <div className="input-group">
            <label>Academic Year</label>
            <select defaultValue="2026-2027">
              <option value="2026-2027">2026-2027</option>
              <option value="2025-2026">2025-2026</option>
            </select>
          </div>
          
          <div style={{ marginTop: '2rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', cursor: 'pointer' }}>
              <input type="checkbox" defaultChecked style={{ width: '18px', height: '18px', accentColor: 'var(--primary-blue)' }} />
              <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>Enable SMS Notifications</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', cursor: 'pointer' }}>
              <input type="checkbox" defaultChecked style={{ width: '18px', height: '18px', accentColor: 'var(--primary-blue)' }} />
              <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>Send Auto-Receipts to WhatsApp</span>
            </label>
          </div>
        </div>

      </div>

      {/* Active Sessions — replaced with Supabase Auth info */}
      <div className="card-base" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <h3 style={{ color: 'var(--primary-blue)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <FiActivity /> Session & Security Info
        </h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.7' }}>
          Authentication is now managed by <strong>Supabase Auth</strong>. Active session monitoring is handled directly in the Supabase dashboard under <em>Authentication → Users</em>.<br /><br />
          Your JWT session auto-refreshes and is stored securely in the browser. To terminate all sessions, update your password — this invalidates all existing tokens.
        </p>
        <a 
          href={`${import.meta.env.VITE_SUPABASE_URL?.replace('.supabase.co', '.supabase.co')}/dashboard`} 
          target="_blank"
          rel="noopener noreferrer"
          className="btn-secondary"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginTop: '1rem', fontSize: '0.85rem' }}
        >
          Open Supabase Dashboard
        </a>
      </div>

      {/* Danger Zone */}
      <div className="card-base" style={{ padding: '1.5rem', border: '1px solid #fee2e2', backgroundColor: '#fffafb' }}>
        <h3 style={{ color: 'var(--danger-red)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <FiAlertTriangle /> Danger Zone
        </h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
          The following actions are destructive and cannot be reversed. Please proceed with extreme caution.
        </p>
        <button 
          onClick={handleResetDatabase}
          className="btn-secondary" 
          style={{ 
            color: 'var(--danger-red)', 
            borderColor: 'var(--danger-red)', 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: '0.5rem', 
            backgroundColor: 'transparent' 
          }}
        >
          <FiTrash2 /> Reset Entire Database
        </button>
      </div>
    </div>
  );
};

export default Settings;
