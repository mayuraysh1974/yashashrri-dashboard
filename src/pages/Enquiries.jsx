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
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0', marginTop: '1rem' }}>
        <button style={tabStyle('enquiries')} onClick={() => setActiveTab('enquiries')}>
          <FiMessageCircle />
          Quick Enquiries ({enquiries.length})
        </button>
        <button style={tabStyle('applications')} onClick={() => setActiveTab('applications')}>
          <FiFileText />
          Online Applications ({applications.length})
        </button>
      </div>

      <div className="card" style={{ borderRadius: '0 12px 12px 12px', padding: '0' }}>
        <div className="table-responsive">

          {/* ---- ENQUIRIES TAB ---- */}
          {activeTab === 'enquiries' && (
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ padding: '1rem 1.5rem', whiteSpace: 'nowrap' }}>Date</th>
                  <th style={{ padding: '1rem 1.5rem', minWidth: '180px' }}>Student Info</th>
                  <th style={{ padding: '1rem 1.5rem', minWidth: '130px' }}>Contact</th>
                  <th style={{ padding: '1rem 1.5rem' }}>Status</th>
                  <th style={{ padding: '1rem 1.5rem', minWidth: '220px' }}>Admin Actions</th>
                </tr>
              </thead>
              <tbody>
                {enquiries.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', padding: '2rem', color: '#64748B' }}>
                      No quick enquiries received yet.
                    </td>
                  </tr>
                ) : (
                  enquiries.map((enq) => (
                    <tr key={enq.id}>
                      <td style={{ padding: '1.25rem' }}>{new Date(enq.created_at).toLocaleDateString()}</td>
                      <td style={{ padding: '1.25rem' }}>
                        <div className="fw-bold" style={{ fontSize: '1rem', color: 'var(--primary-blue)' }}>{enq.student_name}</div>
                        <div style={{ fontSize: '0.85rem', color: '#64748B', marginTop: '0.2rem' }}>{enq.standard}</div>
                      </td>
                      <td style={{ padding: '1.25rem', fontWeight: 600 }}>{enq.phone}</td>
                      <td style={{ padding: '1.25rem' }}>
                        <span className={`status-badge ${enq.status === 'New' ? 'bg-danger' : (enq.status === 'Admitted' ? 'bg-success' : 'bg-primary')}`}
                          style={{ padding: '0.4rem 0.8rem', borderRadius: '50px', fontSize: '0.75rem', fontWeight: 700 }}>
                          {enq.status}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.75rem', flexDirection: 'column', minWidth: '200px' }}>
                          {enq.status !== 'Admitted' ? (
                            <>
                              {enq.status === 'New' && (
                                <textarea
                                  placeholder="Add reply notes..."
                                  value={replyText[enq.id] || ''}
                                  onChange={(e) => handleReplyChange(enq.id, e.target.value)}
                                  rows="2"
                                  style={{ padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '0.85rem' }}
                                ></textarea>
                              )}
                              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                {enq.status === 'New' && (
                                  <button className="btn btn-sm btn-primary" onClick={() => updateStatus(enq.id, 'Replied', replyText[enq.id])} style={{ flex: 1 }}>
                                    <FiCheck /> Mark Replied
                                  </button>
                                )}
                                <button className="btn btn-sm"
                                  style={{ backgroundColor: 'var(--success-green)', color: 'white', border: 'none', flex: 1, padding: '0.5rem' }}
                                  onClick={() => confirmAdmission(enq)}>
                                  <FiCheck /> Confirm Admission
                                </button>
                              </div>
                              {enq.status === 'Replied' && enq.reply_notes && (
                                <div style={{ fontSize: '0.8rem', color: '#64748B', fontStyle: 'italic', backgroundColor: '#F1F5F9', padding: '0.5rem', borderRadius: '6px' }}>
                                  <FiMessageCircle /> Note: {enq.reply_notes}
                                </div>
                              )}
                            </>
                          ) : (
                            <div style={{ fontSize: '0.9rem', color: 'var(--success-green)', fontWeight: 700, backgroundColor: '#ECFDF5', padding: '0.75rem', borderRadius: '8px', textAlign: 'center' }}>
                              <FiCheckCircle /> {enq.reply_notes || 'Admission Confirmed'}
                            </div>
                          )}
                          <button className="btn btn-sm" style={{ background: '#fee2e2', color: '#dc2626', border: 'none' }} onClick={() => deleteEnquiry(enq.id)}>
                            <FiTrash2 /> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}

          {/* ---- APPLICATIONS TAB ---- */}
          {activeTab === 'applications' && (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Student Info</th>
                  <th>Contact & Email</th>
                  <th>Gender / DOB</th>
                  <th>Status</th>
                  <th>Admin Actions</th>
                </tr>
              </thead>
              <tbody>
                {applications.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: '#64748B' }}>
                      No online applications received yet.
                    </td>
                  </tr>
                ) : (
                  applications.map((app) => (
                    <tr key={app.id}>
                      <td style={{ padding: '1.25rem' }}>{new Date(app.created_at).toLocaleDateString()}</td>
                      <td style={{ padding: '1.25rem' }}>
                        <div className="fw-bold" style={{ fontSize: '1rem', color: 'var(--primary-blue)' }}>
                          <FiUser style={{ marginRight: '0.3rem' }} />{app.full_name}
                        </div>
                        <div style={{ fontSize: '0.85rem', color: '#64748B', marginTop: '0.2rem' }}>Std: {app.standard}</div>
                        {app.address && <div style={{ fontSize: '0.8rem', color: '#94A3B8', marginTop: '0.2rem' }}>{app.address}</div>}
                      </td>
                      <td style={{ padding: '1.25rem' }}>
                        <div style={{ fontWeight: 600 }}>{app.phone}</div>
                        <div style={{ fontSize: '0.85rem', color: '#64748B' }}>{app.email}</div>
                      </td>
                      <td style={{ padding: '1.25rem', fontSize: '0.9rem' }}>
                        <div>{app.gender}</div>
                        <div style={{ color: '#64748B' }}>{app.dob}</div>
                      </td>
                      <td style={{ padding: '1.25rem' }}>
                        <span style={{
                          padding: '0.4rem 0.8rem', borderRadius: '50px', fontSize: '0.75rem', fontWeight: 700,
                          background: app.status === 'Admitted' ? '#ECFDF5' : '#FFF7ED',
                          color: app.status === 'Admitted' ? '#16A34A' : '#EA580C'
                        }}>
                          {app.status || 'Pending'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.5rem', flexDirection: 'column', minWidth: '180px' }}>
                          {app.status !== 'Admitted' && (
                            <button className="btn btn-sm"
                              style={{ backgroundColor: 'var(--success-green)', color: 'white', border: 'none', padding: '0.5rem' }}
                              onClick={() => confirmAdmission({ ...app, student_name: app.full_name, _source: 'application' })}>
                              <FiCheck /> Confirm Admission
                            </button>
                          )}
                          {app.status === 'Admitted' && (
                            <div style={{ fontSize: '0.9rem', color: 'var(--success-green)', fontWeight: 700, backgroundColor: '#ECFDF5', padding: '0.75rem', borderRadius: '8px', textAlign: 'center' }}>
                              <FiCheckCircle /> Admitted
                            </div>
                          )}
                          <button className="btn btn-sm" style={{ background: '#fee2e2', color: '#dc2626', border: 'none' }} onClick={() => deleteApplication(app.id)}>
                            <FiTrash2 /> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}

        </div>
      </div>
    </div>
  );
};

export default Enquiries;
