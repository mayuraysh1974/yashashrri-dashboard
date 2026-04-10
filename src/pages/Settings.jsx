import React, { useState, useEffect } from 'react';
import { FiSave, FiLock, FiBell, FiShield, FiAlertTriangle, FiTrash2, FiActivity } from 'react-icons/fi';

const Settings = () => {
  const [sessions, setSessions] = useState([]);

  useEffect(() => {
    fetchSessions();
    const intervalId = setInterval(fetchSessions, 5000);
    return () => clearInterval(intervalId);
  }, []);

  const fetchSessions = async () => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch('/api/system/sessions', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) setSessions(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  const handleResetDatabase = async () => {
    const confirm1 = window.confirm('WARNING: You are about to clear ALL records (Students, Teachers, Fees) from the database. This action is PERMANENT and cannot be undone. Do you want to proceed?');
    if (!confirm1) return;

    const confirm2 = window.confirm('FINAL CONFIRMATION: Are you absolutely sure? All your data will be permanently erased.');
    if (!confirm2) return;

    const token = localStorage.getItem('token');
    try {
      const res = await fetch('/api/settings/reset', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        alert('Database has been successfully cleared.');
        window.location.reload(); // Refresh to show empty state
      } else {
        alert('Failed to reset database: ' + data.error);
      }
    } catch (err) {
      alert('Error connecting to server.');
    }
  };

  const parseDeviceDetails = (uaString) => {
    if (!uaString) return "Unknown Device";
    let os = 'Unknown OS';
    let browser = 'Unknown Browser';
    
    if (uaString.includes('Windows NT 10.0')) os = 'Windows 10/11';
    else if (uaString.includes('Windows NT 6.2')) os = 'Windows 8';
    else if (uaString.includes('Windows NT 6.1')) os = 'Windows 7';
    else if (uaString.includes('Mac OS X')) os = 'MacBook / MacOS';
    else if (uaString.includes('Linux')) os = 'Linux';
    else if (uaString.includes('Android')) os = 'Android Mobile';
    else if (uaString.includes('iPhone')) os = 'iPhone';
    else if (uaString.includes('iPad')) os = 'iPad';

    if (uaString.includes('Edg/')) browser = 'Microsoft Edge';
    else if (uaString.includes('Chrome/')) browser = 'Google Chrome';
    else if (uaString.includes('Firefox/')) browser = 'Mozilla Firefox';
    else if (uaString.includes('Safari/') && !uaString.includes('Chrome/')) browser = 'Apple Safari';

    return `${os} — ${browser}`;
  };

  const [passwords, setPasswords] = useState({ current: '', new: '' });

  const handleUpdatePassword = async () => {
    if (!passwords.current || !passwords.new) return alert('Please fill in both fields.');
    const token = localStorage.getItem('token');
    try {
      const res = await fetch('/api/settings/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ currentPassword: passwords.current, newPassword: passwords.new })
      });
      const data = await res.json();
      if (res.ok) {
        alert('Password updated successfully!');
        setPasswords({ current: '', new: '' });
      } else {
        alert(data.error || 'Failed to update password');
      }
    } catch (err) {
      alert('Network error. Check connection.');
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
            <label>Admin Username</label>
            <input type="text" value="admin" disabled style={{ backgroundColor: 'var(--bg-main)' }} />
          </div>
          <div className="input-group">
            <label>Current Password</label>
            <input 
              type="password" 
              placeholder="••••••••" 
              value={passwords.current} 
              onChange={e => setPasswords({ ...passwords, current: e.target.value })} 
            />
          </div>
          <div className="input-group">
            <label>New Password</label>
            <input 
              type="password" 
              placeholder="Enter new password" 
              value={passwords.new} 
              onChange={e => setPasswords({ ...passwords, new: e.target.value })} 
            />
          </div>
          <button className="btn-secondary" style={{ marginTop: '0.5rem' }} onClick={handleUpdatePassword}>
            <FiLock /> Update Password
          </button>
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

      {/* Active Sessions Monitoring */}
      <div className="card-base" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <h3 style={{ color: 'var(--primary-blue)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <FiActivity /> Active Network Sessions
        </h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
          Real-time tracking of machines currently accessing the ERP data over the network.
        </p>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border-color)', backgroundColor: 'var(--bg-main)' }}>
                <th style={{ padding: '0.75rem 1rem' }}>IP Address</th>
                <th style={{ padding: '0.75rem 1rem' }}>User Auth</th>
                <th style={{ padding: '0.75rem 1rem' }}>Last Activity (UTC)</th>
                <th style={{ padding: '0.75rem 1rem' }}>Device Details</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map(s => {
                let displayIp = s.ip;
                if (displayIp === '::1' || displayIp === '127.0.0.1') displayIp = 'localhost (Main PC)';
                else if (displayIp.includes('::ffff:')) displayIp = displayIp.split('::ffff:')[1];
                
                // If the last seen time is within the last 30 seconds, consider it Active.
                const diffSeconds = (new Date() - new Date(s.lastSeen)) / 1000;
                const isCurrentlyActive = diffSeconds < 30;
                
                return (
                  <tr key={s.ip} style={{ borderBottom: '1px solid var(--border-color)', opacity: isCurrentlyActive ? 1 : 0.6 }}>
                    <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace', fontWeight: 600, color: 'var(--primary-blue)' }}>{displayIp}</td>
                    <td style={{ padding: '0.75rem 1rem', color: s.user === 'Guest' ? 'var(--danger-red)' : 'var(--text-primary)', fontWeight: 500 }}>{s.user}</td>
                    <td style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)' }}>
                       <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
                          <span style={{ 
                            display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', 
                            backgroundColor: isCurrentlyActive ? 'var(--success-green)' : 'var(--danger-red)',
                            boxShadow: isCurrentlyActive ? '0 0 5px var(--success-green)' : 'none'
                          }}></span>
                          <span style={{ color: isCurrentlyActive ? 'var(--success-green)' : 'var(--danger-red)' }}>
                            {isCurrentlyActive ? 'Currently Active' : 'Inactive'}
                          </span>
                       </div>
                       <div style={{ fontSize: '0.7rem', marginTop: '0.2rem' }}>Last ping: {new Date(s.lastSeen).toLocaleTimeString()}</div>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', fontSize: '0.85rem' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{parseDeviceDetails(s.userAgent)}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{s.userAgent.slice(0, 50)}...</div>
                    </td>
                  </tr>
                );
              })}
              {sessions.length === 0 && (
                <tr><td colSpan="4" style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>No active sessions logged yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
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
