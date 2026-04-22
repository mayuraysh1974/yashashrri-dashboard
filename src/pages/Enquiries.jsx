import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { FiCheck, FiTrash2, FiMessageCircle, FiCheckCircle, FiFileText, FiUser } from 'react-icons/fi';

const Enquiries = () => {
  const [enquiries, setEnquiries] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState({});
  const [activeTab, setActiveTab] = useState('enquiries');

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      // Fetch quick enquiries
      const { data: enqData, error: enqError } = await supabase
        .from('enquiries')
        .select('*')
        .order('created_at', { ascending: false });
      if (enqError) throw enqError;
      setEnquiries(enqData || []);

      // Fetch full online applications
      const { data: appData, error: appError } = await supabase
        .from('online_admissions')
        .select('*')
        .order('created_at', { ascending: false });
      if (appError) throw appError;
      setApplications(appData || []);
    } catch (error) {
      console.error('Error fetching data:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id, status, notes = '') => {
    try {
      const { error } = await supabase
        .from('enquiries')
        .update({ status, reply_notes: notes })
        .eq('id', id);
      if (error) throw error;
      fetchAll();
    } catch (error) {
      console.error('Error updating enquiry:', error.message);
    }
  };

  const confirmAdmission = async (enq) => {
    if (!window.confirm(`Confirm admission for ${enq.student_name || enq.full_name}? This will create an official student record.`)) return;
    try {
      setLoading(true);
      const currentYear = new Date().getFullYear();
      const studentName = enq.student_name || enq.full_name;
      const studentPhone = enq.phone;

      const { data: existingStudents } = await supabase
        .from('students')
        .select('id')
        .eq('standard', enq.standard)
        .order('id', { ascending: false })
        .limit(1);

      let nextNum = 1;
      if (existingStudents && existingStudents.length > 0) {
        const matches = existingStudents[0].id.match(/\d+$/);
        if (matches) nextNum = parseInt(matches[0].slice(-3)) + 1;
      }

      // Smart Prefix Mapping
      let prefix = enq.standard;
      if (enq.standard.includes('11') || enq.standard === 'XI') prefix = 'XI';
      else if (enq.standard.includes('12') || enq.standard === 'XII') prefix = 'XII';
      else if (enq.standard.includes('10') || enq.standard === 'X') prefix = 'X';
      else if (enq.standard.includes('9') || enq.standard === 'IX') prefix = 'IX';
      else if (enq.standard.includes('8') || enq.standard === 'VIII') prefix = 'VIII';

      const sequence = String(nextNum).padStart(3, '0');
      const newId = `${prefix}${currentYear}${sequence}`;

      const { error: studentError } = await supabase
        .from('students')
        .insert({
          id: newId,
          name: studentName,
          standard: enq.standard,
          student_phone: studentPhone,
          status: 'Active',
          portal_enabled: true,
          portal_password: 'yash123',
          fees_paid: 0,
          balance: 0,
          concession: 0
        });
      if (studentError) throw studentError;

      // Update status based on source table
      if (enq._source === 'application') {
        await supabase.from('online_admissions').update({ status: 'Admitted' }).eq('id', enq.id);
      } else {
        await supabase.from('enquiries')
          .update({ status: 'Admitted', reply_notes: `Admitted on ${new Date().toLocaleDateString()} with ID: ${newId}` })
          .eq('id', enq.id);
      }

      alert(`Success! ${studentName} is now admitted.\n\nStudent ID: ${newId}\nPortal Password: yash123\n\nPlease share login details with the student.`);
      fetchAll();
    } catch (error) {
      alert('Error during admission: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteEnquiry = async (id) => {
    if (!window.confirm('Are you sure you want to delete this enquiry?')) return;
    try {
      const { error } = await supabase.from('enquiries').delete().eq('id', id);
      if (error) throw error;
      fetchAll();
    } catch (error) {
      console.error('Error deleting enquiry:', error.message);
    }
  };

  const deleteApplication = async (id) => {
    if (!window.confirm('Are you sure you want to delete this application?')) return;
    try {
      const { error } = await supabase.from('online_admissions').delete().eq('id', id);
      if (error) throw error;
      fetchAll();
    } catch (error) {
      console.error('Error deleting application:', error.message);
    }
  };

  const handleReplyChange = (id, text) => {
    setReplyText({ ...replyText, [id]: text });
  };

  if (loading) return <div className="loading-spinner">Loading...</div>;

  const tabStyle = (tab) => ({
    padding: '0.85rem 2.2rem',
    borderRadius: '10px 10px 0 0',
    border: 'none',
    cursor: 'pointer',
    fontWeight: 700,
    fontSize: '1rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    background: activeTab === tab ? 'var(--primary-blue)' : '#E2E8F0',
    color: activeTab === tab ? 'white' : '#475569',
    transition: 'all 0.2s',
    boxShadow: activeTab === tab ? '0 -2px 8px rgba(26,35,126,0.15)' : 'none'
  });

  return (
    <div className="dashboard-content">
      <div className="header-actions">
        <h2>Web Enquiries & Applications</h2>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1rem', marginTop: '1rem' }}>
        <button style={tabStyle('enquiries')} onClick={() => setActiveTab('enquiries')}>
          <FiMessageCircle /> Quick ({enquiries.length})
        </button>
        <button style={tabStyle('applications')} onClick={() => setActiveTab('applications')}>
          <FiFileText /> Apps ({applications.length})
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {/* ---- ENQUIRIES TAB ---- */}
        {activeTab === 'enquiries' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {enquiries.length === 0 ? (
              <div className="card-base" style={{ textAlign: 'center', padding: '2rem', color: '#64748B' }}>No enquiries received.</div>
            ) : enquiries.map((enq) => (
              <div key={enq.id} className="card-base" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--primary-blue)' }}>{enq.student_name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{enq.standard} • {new Date(enq.created_at).toLocaleDateString()}</div>
                  </div>
                  <span className={`status-badge ${enq.status === 'New' ? 'bg-danger' : (enq.status === 'Admitted' ? 'bg-success' : 'bg-primary')}`} style={{ padding: '0.3rem 0.6rem', fontSize: '0.65rem' }}>
                    {enq.status}
                  </span>
                </div>
                
                <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{enq.phone}</div>

                {enq.status !== 'Admitted' ? (
                  <div style={{ display: 'flex', gap: '0.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
                    <button className="btn-secondary" style={{ flex: 1, padding: '0.5rem', fontSize: '0.75rem' }} onClick={() => confirmAdmission(enq)}><FiCheck /> Admit</button>
                    <a href={`tel:${enq.phone}`} className="btn-secondary" style={{ flex: 1, padding: '0.5rem', fontSize: '0.75rem', justifyContent: 'center' }}><FiMessageCircle /> Call</a>
                    <button className="btn-secondary" style={{ flex: 0.3, padding: '0.5rem', color: 'var(--danger-red)' }} onClick={() => deleteEnquiry(enq.id)}><FiTrash2 /></button>
                  </div>
                ) : (
                  <div style={{ fontSize: '0.8rem', color: 'var(--success-green)', fontWeight: 700, backgroundColor: '#ECFDF5', padding: '0.5rem', borderRadius: '8px', textAlign: 'center' }}>
                    <FiCheckCircle /> Admission Confirmed
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ---- APPLICATIONS TAB ---- */}
        {activeTab === 'applications' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {applications.length === 0 ? (
              <div className="card-base" style={{ textAlign: 'center', padding: '2rem', color: '#64748B' }}>No online applications received.</div>
            ) : applications.map((app) => (
              <div key={app.id} className="card-base" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--primary-blue)' }}>{app.full_name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Std: {app.standard} • {new Date(app.created_at).toLocaleDateString()}</div>
                  </div>
                  <span style={{ padding: '0.3rem 0.6rem', borderRadius: '50px', fontSize: '0.65rem', fontWeight: 700, background: app.status === 'Admitted' ? '#ECFDF5' : '#FFF7ED', color: app.status === 'Admitted' ? '#16A34A' : '#EA580C' }}>
                    {app.status || 'Pending'}
                  </span>
                </div>
                
                <div style={{ fontSize: '0.85rem' }}>
                  <div><strong>Phone:</strong> {app.phone}</div>
                  <div><strong>Email:</strong> {app.email}</div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
                  {app.status !== 'Admitted' ? (
                    <button className="btn-secondary" style={{ flex: 1, padding: '0.5rem', fontSize: '0.75rem' }} onClick={() => confirmAdmission({ ...app, student_name: app.full_name, _source: 'application' })}><FiCheck /> Admit</button>
                  ) : (
                    <div style={{ flex: 1, fontSize: '0.8rem', color: 'var(--success-green)', fontWeight: 700, textAlign: 'center' }}><FiCheckCircle /> Admitted</div>
                  )}
                  <button className="btn-secondary" style={{ flex: 0.3, padding: '0.5rem', color: 'var(--danger-red)' }} onClick={() => deleteApplication(app.id)}><FiTrash2 /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Enquiries;
