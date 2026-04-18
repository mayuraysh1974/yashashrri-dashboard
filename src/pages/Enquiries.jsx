import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { FiCheck, FiTrash2, FiMessageCircle, FiCheckCircle } from 'react-icons/fi';

const Enquiries = () => {
  const [enquiries, setEnquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState({});

  useEffect(() => {
    fetchEnquiries();
  }, []);

  const fetchEnquiries = async () => {
    try {
      const { data, error } = await supabase
        .from('enquiries')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      setEnquiries(data || []);
    } catch (error) {
      console.error('Error fetching enquiries:', error.message);
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
      fetchEnquiries();
    } catch (error) {
      console.error('Error updating enquiry:', error.message);
    }
  };

  const confirmAdmission = async (enq) => {
    if (!window.confirm(`Confirm admission for ${enq.student_name}? This will create an official student record.`)) return;
    
    try {
      setLoading(true);
      
      // 1. Generate a Student ID (Standard + Year + Next Number)
      const currentYear = new Date().getFullYear();
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
      
      const sequence = String(nextNum).padStart(3, '0');
      const newId = `${enq.standard}${currentYear}${sequence}`;

      // 2. Create the Student Record
      const { error: studentError } = await supabase
        .from('students')
        .insert({
          id: newId,
          name: enq.student_name,
          standard: enq.standard,
          student_phone: enq.phone,
          status: 'Active',
          portal_enabled: true,
          portal_password: 'yash123',
          fees_paid: 0,
          balance: 0,
          concession: 0
        });

      if (studentError) throw studentError;

      // 3. Update Enquiry Status
      const { error: updateError } = await supabase
        .from('enquiries')
        .update({ status: 'Admitted', reply_notes: `Admitted on ${new Date().toLocaleDateString()} with ID: ${newId}` })
        .eq('id', enq.id);

      if (updateError) throw updateError;

      alert(`Success! ${enq.student_name} is now admitted.\n\nStudent ID: ${newId}\nPortal Password: yash123\n\nPlease ask the student to visit the Student Portal and upload documents using their phone number (${enq.phone}).`);
      
      fetchEnquiries();
    } catch (error) {
      alert('Error during admission: ' + error.message);
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const deleteEnquiry = async (id) => {
    if (!window.confirm('Are you sure you want to delete this enquiry?')) return;
    
    try {
      const { error } = await supabase
        .from('enquiries')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      fetchEnquiries();
    } catch (error) {
      console.error('Error deleting enquiry:', error.message);
    }
  };

  const handleReplyChange = (id, text) => {
    setReplyText({ ...replyText, [id]: text });
  };

  if (loading) return <div className="loading-spinner">Loading...</div>;

  return (
    <div className="dashboard-content">
      <div className="header-actions">
        <h2>Web Enquiries</h2>
      </div>

      <div className="card">
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Student info</th>
                <th>Contact</th>
                <th>Status</th>
                <th>Admin Actions</th>
              </tr>
            </thead>
            <tbody>
              {enquiries.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '2rem' }}>No enquiries found.</td>
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
                      <span className={`status-badge ${enq.status === 'New' ? 'bg-danger' : (enq.status === 'Admitted' ? 'bg-success' : 'bg-primary')}`} style={{ padding: '0.4rem 0.8rem', borderRadius: '50px', fontSize: '0.75rem', fontWeight: 700 }}>
                        {enq.status}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.75rem', flexDirection: 'column', width: '100%', minWidth: '200px' }}>
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
                              <button 
                                className="btn btn-sm" 
                                style={{ backgroundColor: 'var(--success-green)', color: 'white', border: 'none', flex: 1, padding: '0.5rem' }}
                                onClick={() => confirmAdmission(enq)}
                              >
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
                        <button className="btn btn-sm" style={{ background: '#fee2e2', color: '#dc2626', border: 'none', marginTop: '0.5rem' }} onClick={() => deleteEnquiry(enq.id)}>
                          <FiTrash2 /> Delete enquiry
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Enquiries;
