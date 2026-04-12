import React, { useState, useEffect } from 'react';
import { FiMessageSquare, FiClock, FiUser, FiInfo, FiSmartphone, FiCalendar } from 'react-icons/fi';
import { supabase } from '../supabaseClient';

const AlertAudit = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('alerts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);
    if (!error) setHistory(data || []);
    setLoading(false);
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Alert & Communication Audit</h1>
          <p className="page-subtitle">Track simulated automated messages sent to parents and students</p>
        </div>
        <button className="btn-secondary" onClick={fetchHistory}><FiClock /> Refresh Logs</button>
      </div>

      <div className="card-base" style={{ flex: 1, overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ position: 'sticky', top: 0, backgroundColor: 'var(--bg-surface)', zIndex: 1, borderBottom: '2px solid var(--border-color)' }}>
            <tr style={{ textAlign: 'left' }}>
              <th style={{ padding: '1rem' }}>Timestamp</th>
              <th style={{ padding: '1rem' }}>Recipient Student</th>
              <th style={{ padding: '1rem' }}>Contact Number</th>
              <th style={{ padding: '1rem' }}>Message Content</th>
              <th style={{ padding: '1rem', textAlign: 'center' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="5" style={{ padding: '2rem', textAlign: 'center' }}>Loading audit logs...</td></tr>
            ) : history.length === 0 ? (
              <tr><td colSpan="5" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No communication logs found yet.</td></tr>
            ) : history.map(log => (
              <tr key={log.id} style={{ borderBottom: '1px solid var(--border-color)', fontSize: '0.85rem' }}>
                <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><FiCalendar size={12} /> {new Date(log.created_at).toLocaleDateString()}</div>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem' }}><FiClock size={12} /> {new Date(log.created_at).toLocaleTimeString()}</div>
                </td>
                <td style={{ padding: '1rem', fontWeight: 600 }}>
                   <FiUser size={12} style={{ marginRight: '0.4rem' }} /> {log.student_name || 'General'}
                </td>
                <td style={{ padding: '1rem' }}>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <FiSmartphone size={12} color="var(--primary-blue)" /> {log.recipient}
                   </div>
                </td>
                <td style={{ padding: '1rem', maxWidth: '400px', lineHeight: '1.4' }}>
                   {log.message}
                </td>
                <td style={{ padding: '1rem', textAlign: 'center' }}>
                   <span style={{ 
                      padding: '0.2rem 0.6rem', 
                      borderRadius: '20px', 
                      backgroundColor: 'rgba(16, 185, 129, 0.1)', 
                      color: 'var(--success-green)', 
                      fontSize: '0.7rem', 
                      fontWeight: 700,
                      textTransform: 'uppercase'
                   }}>
                     {log.status || 'Simulated'}
                   </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: '1.5rem', padding: '1rem', backgroundColor: 'var(--bg-main)', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '1rem' }}>
         <FiInfo size={24} color="var(--primary-blue)" />
         <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
           <strong>Note:</strong> Messages listed here are currently simulated logs. To enable real SMS/WhatsApp/Email dispatch, the system requires integration with a premium gateway like Twilio or MSG91.
         </p>
      </div>
    </div>
  );
};

export default AlertAudit;
