import React, { useState, useEffect } from 'react';
import { FiSearch, FiCheckCircle, FiXCircle, FiX, FiEdit2, FiTrash2, FiPlus, FiDollarSign, FiActivity, FiArrowRight, FiPrinter } from 'react-icons/fi';
import { supabase } from '../supabaseClient';

const TeacherManagement = () => {
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showFinanceModal, setShowFinanceModal] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [financeData, setFinanceData] = useState({ shares: [], payments: [], summary: { totalEarned: 0, totalPaid: 0, balance: 0 } });
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({ id: '', name: '', subject: '', totalShare: 0 });
  const [shareForm, setShareForm] = useState({ description: '', amount: 0, date: new Date().toISOString().split('T')[0] });
  const [paymentForm, setPaymentForm] = useState({ amount: 0, date: new Date().toISOString().split('T')[0], paymentMode: 'Cash', remarks: '' });

  useEffect(() => {
    fetchTeachers();
  }, []);

  const fetchTeachers = async () => {
    try {
      setLoading(true);
      // Fetch teachers and their finance data
      const { data: teacherData, error: tErr } = await supabase.from('teachers').select('*').order('name');
      if (tErr) throw tErr;

      // Fetch all shares and payments to calculate summaries on the fly
      const { data: sharesData } = await supabase.from('teacher_shares').select('teacher_id, amount');
      const { data: paymentsData } = await supabase.from('teacher_payments').select('teacher_id, amount');

      const enriched = teacherData.map(t => {
        const totalEarned = sharesData?.filter(s => s.teacher_id === t.id).reduce((sum, s) => sum + (s.amount || 0), 0) || 0;
        const totalPaid = paymentsData?.filter(p => p.teacher_id === t.id).reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
        return {
          ...t,
          totalEarned,
          totalPaid,
          balance: totalEarned - totalPaid
        };
      });

      setTeachers(enriched);
    } catch (err) {
      console.error('Error fetching teachers:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTeacher = async () => {
    if (!formData.id || !formData.name || !formData.subject) return alert('ID, Name, and Subject are required');
    
    try {
      const { error } = await supabase
        .from('teachers')
        .upsert({ 
          id: formData.id, 
          name: formData.name, 
          subject: formData.subject 
        });

      if (error) throw error;

      setShowModal(false);
      setEditMode(false);
      setFormData({ id: '', name: '', subject: '', totalShare: 0 });
      fetchTeachers();
    } catch (err) {
      alert(`Error saving teacher: ${err.message}`);
    }
  };

  const handleEdit = (teacher) => {
    setFormData({ id: teacher.id, name: teacher.name, subject: teacher.subject, totalShare: teacher.totalShare || 0 });
    setEditMode(true);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this teacher record? This action cannot be undone.')) return;
    const { error } = await supabase.from('teachers').delete().eq('id', id);
    if (error) alert('Error deleting: ' + error.message);
    else fetchTeachers();
  };

  const fetchFinanceDetails = async (id) => {
    const { data: shares, error: e1 } = await supabase.from('teacher_shares').select('*').eq('teacher_id', id).order('date', { ascending: false });
    const { data: payments, error: e2 } = await supabase.from('teacher_payments').select('*').eq('teacher_id', id).order('date', { ascending: false });
    
    if (e1) console.error("Error fetching shares:", e1);
    if (e2) console.error("Error fetching payments:", e2);

    const totalEarned = shares?.reduce((sum, s) => sum + (s.amount || 0), 0) || 0;
    const totalPaid = payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;

    setFinanceData({
      shares: shares || [],
      payments: payments || [],
      summary: { totalEarned, totalPaid, balance: totalEarned - totalPaid }
    });
  };

  const handleFinanceOpen = (teacher) => {
    setSelectedTeacher(teacher);
    fetchFinanceDetails(teacher.id);
    setShowFinanceModal(true);
  };

  const handleAddShare = async () => {
    if (!shareForm.amount || !shareForm.description) return alert('Amount and description required');
    const { error } = await supabase.from('teacher_shares').insert({
      teacher_id: selectedTeacher.id,
      description: shareForm.description,
      amount: shareForm.amount,
      date: shareForm.date
    });
    if (error) return alert(error.message);
    setShareForm({ description: '', amount: 0, date: new Date().toISOString().split('T')[0] });
    fetchFinanceDetails(selectedTeacher.id);
    fetchTeachers();
  };

  const handleAddPayment = async () => {
    if (!paymentForm.amount) return alert('Amount required');
    const { error } = await supabase.from('teacher_payments').insert({
      teacher_id: selectedTeacher.id,
      amount: paymentForm.amount,
      date: paymentForm.date,
      payment_mode: paymentForm.paymentMode,
      remarks: paymentForm.remarks
    });
    if (error) return alert(error.message);
    setPaymentForm({ amount: 0, date: new Date().toISOString().split('T')[0], paymentMode: 'Cash', remarks: '' });
    fetchFinanceDetails(selectedTeacher.id);
    fetchTeachers();
  };

  const filteredTeachers = teachers.filter(t => t.name.toLowerCase().includes(searchTerm.toLowerCase()));

  const PrintHeader = ({ title, subTitle }) => (
    <div className="print-header" style={{ display: 'none', textAlign: 'center', marginBottom: '30px' }}>
      <div style={{ marginBottom: '10px' }}>
        <img src="/logo.png" alt="Yashashrri Logo" style={{ maxWidth: '450px', height: 'auto' }} onError={(e) => { e.target.onerror = null; e.target.style.display = 'none'; e.target.parentNode.nextElementSibling.style.display = 'block'; }} />
      </div>
      <div style={{ display: 'none' }}>
        <h1 style={{ color: '#1A237E', margin: 0, fontSize: '28px', letterSpacing: '2px' }}>YASHASHRRI CLASSES</h1>
        <div style={{ color: '#D4AF37', fontWeight: 700, fontSize: '13px', marginBottom: '10px' }}>BUILDING BRIDGES TO SUCCESS</div>
      </div>
      <div style={{ fontSize: '11px', color: '#64748B', lineHeight: '1.6' }}>
        Main Br: "Shree Ekveera Prasad", Vaidya Colony, Nr. Axis bank ATM, Talegaon Dabhade, PUNE - 410506<br />
        Branch 2: Silverwinds, C2, Dnyaneshwar Nagar, Nr. Jijamata Chowk, Talegaon Dabhade, PUNE - 410506<br />
        Contact: +91 73874 20737 | Email: mayuraysh1974@gmail.com
      </div>
      <hr style={{ border: 'none', borderTop: '2px solid #1A237E', margin: '20px 0' }} />
      <h2 style={{ fontSize: '16px', color: '#1A237E', margin: '10px 0', textTransform: 'uppercase' }}>{title}</h2>
      <p style={{ fontSize: '12px', color: '#64748B' }}>{subTitle}</p>
    </div>
  );

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="page-header no-print">
        <div>
          <h1 className="page-title">Teacher Management</h1>
          <p className="page-subtitle">Faculty directory, share entitlements, and payment tracking</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            className="btn-primary"
            onClick={async () => { 
              setEditMode(false);
              setShowModal(true);
              const { data } = await supabase
                .from('teachers')
                .select('id')
                .order('id', { ascending: false })
                .limit(1);

              let nextNum = 1;
              if (data && data.length > 0) {
                const lastId = data[0].id;
                const matches = lastId.match(/\d+$/);
                if (matches) nextNum = parseInt(matches[0]) + 1;
              }
              const nextId = `T${String(nextNum).padStart(3, '0')}`;
              setFormData({ id: nextId, name: '', subject: '', totalShare: 0 });
            }}
          >
            <FiPlus /> Add Faculty
          </button>
        </div>
      </div>

      <div className="card-base no-print" style={{ marginBottom: '1.5rem', padding: '1rem', display: 'flex' }}>
        <div className="search-bar" style={{ backgroundColor: 'var(--bg-main)', flex: 1, maxWidth: '400px' }}>
          <FiSearch style={{ color: 'var(--text-secondary)' }} />
          <input 
            type="text" 
            className="search-input" 
            placeholder="Search faculty..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="card-base no-print table-container" style={{ flex: 1 }}>
        <div style={{ height: '100%' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead className="no-print" style={{ backgroundColor: 'var(--bg-main)', borderBottom: '1px solid var(--border-color)', position: 'sticky', top: 0 }}>
              <tr>
                <th style={{ padding: '1rem', color: 'var(--primary-blue)', fontWeight: 600 }}>ID</th>
                <th style={{ padding: '1rem', color: 'var(--primary-blue)', fontWeight: 600 }}>Name</th>
                <th style={{ padding: '1rem', color: 'var(--primary-blue)', fontWeight: 600 }}>Specialization</th>
                <th style={{ padding: '1rem', color: 'var(--primary-blue)', fontWeight: 600 }}>Total Earned</th>
                <th style={{ padding: '1rem', color: 'var(--primary-blue)', fontWeight: 600 }}>Total Paid</th>
                <th style={{ padding: '1rem', color: 'var(--primary-blue)', fontWeight: 600 }}>Balance</th>
                <th style={{ padding: '1rem', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="7" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</td></tr>
              ) : filteredTeachers.map((t, idx) => (
                <tr key={t.id} style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: idx % 2 === 0 ? 'var(--bg-surface)' : 'var(--bg-hover)' }}>
                  <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>{t.id}</td>
                  <td style={{ padding: '1rem', fontWeight: 500 }}>{t.name}</td>
                  <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>{t.subject}</td>
                  <td style={{ padding: '1rem', fontWeight: 600 }}>₹{(t.totalEarned || 0).toLocaleString()}</td>
                  <td style={{ padding: '1rem', fontWeight: 600, color: 'var(--success-green)' }}>₹{(t.totalPaid || 0).toLocaleString()}</td>
                  <td style={{ padding: '1rem', fontWeight: 700, color: (t.balance || 0) > 0 ? 'var(--danger-red)' : 'var(--text-secondary)' }}>
                    ₹{(t.balance || 0).toLocaleString()}
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'center' }} className="no-print">
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
                      <button onClick={() => handleFinanceOpen(t)} className="btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }} title="Finance Ledger"><FiDollarSign /> Ledger</button>
                      <button onClick={() => handleEdit(t)} style={{ background: 'transparent', padding: '0.5rem', border: 'none', cursor: 'pointer', color: 'var(--primary-blue)' }} title="Edit"><FiEdit2 /></button>
                      <button onClick={() => handleDelete(t.id)} style={{ background: 'transparent', padding: '0.5rem', border: 'none', cursor: 'pointer', color: 'var(--danger-red)' }} title="Delete"><FiTrash2 /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && filteredTeachers.length === 0 && (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              No faculty found
            </div>
          )}
        </div>
      </div>

      {/* Finance Ledger Modal */}
      {showFinanceModal && selectedTeacher && (
        <div className="modal-overlay">
          <div className="card-base" style={{ width: '95%', maxWidth: '1000px', maxHeight: '90vh', overflowY: 'auto', padding: '2rem', position: 'relative' }}>
            <div className="no-print" style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', zIndex: 50 }}>
               <button className="btn-secondary" onClick={() => window.print()} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem' }}><FiPrinter /> Print Ledger</button>
               <button onClick={() => setShowFinanceModal(false)} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', cursor: 'pointer', boxShadow: 'var(--shadow-sm)' }}><FiX /></button>
            </div>
            
            <div style={{ marginBottom: '1.5rem' }} className="no-print">
                <h2 style={{ marginBottom: '0.4rem', color: 'var(--primary-blue)' }}>Finance Ledger: {selectedTeacher.name}</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Manage share entitlements and record payments for this faculty member.</p>
            </div>

            <PrintHeader title="Faculty Financial Ledger" subTitle={`Ledger for: ${selectedTeacher.name} | ID: ${selectedTeacher.id} | Dept: ${selectedTeacher.subject}`} />

            <div className="responsive-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', marginBottom: '2.5rem' }}>
              <div style={{ background: 'var(--bg-main)', padding: '1.25rem', borderRadius: '12px' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Total Share Earned</span>
                <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>₹{financeData.summary.totalEarned.toLocaleString()}</div>
              </div>
              <div style={{ background: 'var(--bg-main)', padding: '1.25rem', borderRadius: '12px' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Total Paid</span>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--success-green)' }}>₹{financeData.summary.totalPaid.toLocaleString()}</div>
              </div>
              <div style={{ background: 'rgba(239, 68, 68, 0.05)', padding: '1.25rem', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.1)' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Balance Outstanding</span>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--danger-red)' }}>₹{financeData.summary.balance.toLocaleString()}</div>
              </div>
            </div>

            <div className="responsive-grid-2col">
              {/* Entitlement Form */}
              <div className="card-base" style={{ padding: '1.5rem', backgroundColor: '#fcfcfc' }}>
                <h3 className="no-print" style={{ fontSize: '1rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><FiActivity /> Add Share Entitlement</h3>
                <h3 className="print-only" style={{ display: 'none', marginBottom: '1rem' }}>Detailed Earnings History</h3>
                
                <div className="no-print" style={{ display: 'grid', gap: '1rem' }}>
                    <div className="input-group">
                        <label>Description (e.g. March 2026 Batch X Share)</label>
                        <input type="text" value={shareForm.description} onChange={e => setShareForm({...shareForm, description: e.target.value})} placeholder="Batch / Period details..." />
                    </div>
                    <div className="responsive-grid-2col" style={{ gap: '1rem' }}>
                        <div className="input-group">
                            <label>Amount (₹)</label>
                            <input type="number" value={shareForm.amount} onChange={e => setShareForm({...shareForm, amount: Number(e.target.value)})} />
                        </div>
                        <div className="input-group">
                            <label>Date</label>
                            <input type="date" value={shareForm.date} onChange={e => setShareForm({...shareForm, date: e.target.value})} />
                        </div>
                    </div>
                    <button className="btn-primary" onClick={handleAddShare} style={{ marginTop: '0.5rem' }}>Add Entitlement</button>
                </div>
                
                <div style={{ maxHeight: '400px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '8px', marginTop: '1rem' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                      <thead style={{ backgroundColor: '#f8fafc' }}>
                         <tr style={{ textAlign: 'left' }}>
                            <th style={{ padding: '0.5rem' }}>Description</th>
                            <th style={{ padding: '0.5rem', textAlign: 'right' }}>Amount</th>
                         </tr>
                      </thead>
                      <tbody>
                        {financeData.shares.map(s => (
                            <tr key={s.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                <td style={{ padding: '0.5rem' }}>
                                   <div style={{ fontWeight: 600 }}>{s.description}</div>
                                   <div style={{ fontSize: '0.7rem', color: '#64748B' }}>{s.date}</div>
                                </td>
                                <td style={{ padding: '0.5rem', textAlign: 'right', fontWeight: 700 }}>₹{s.amount.toLocaleString()}</td>
                            </tr>
                        ))}
                      </tbody>
                    </table>
                </div>
              </div>

              {/* Payment Form */}
              <div className="card-base" style={{ padding: '1.5rem', backgroundColor: '#fcfcfc' }}>
                <h3 className="no-print" style={{ fontSize: '1rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><FiDollarSign /> Record Payment</h3>
                <h3 className="print-only" style={{ display: 'none', marginBottom: '1rem' }}>Recent Payments Record</h3>
                
                <div className="no-print" style={{ display: 'grid', gap: '1rem' }}>
                    <div className="responsive-grid-2col" style={{ gap: '1rem' }}>
                        <div className="input-group">
                            <label>Paid Amount (₹)</label>
                            <input type="number" value={paymentForm.amount} onChange={e => setPaymentForm({...paymentForm, amount: Number(e.target.value)})} />
                        </div>
                        <div className="input-group">
                            <label>Payment Date</label>
                            <input type="date" value={paymentForm.date} onChange={e => setPaymentForm({...paymentForm, date: e.target.value})} />
                        </div>
                    </div>
                    <div className="responsive-grid-2col" style={{ gap: '1rem' }}>
                        <div className="input-group">
                            <label>Mode</label>
                            <select value={paymentForm.paymentMode} onChange={e => setPaymentForm({...paymentForm, paymentMode: e.target.value})}>
                                <option>Cash</option>
                                <option>UPI / Online</option>
                                <option>Cheque</option>
                                <option>Bank Transfer</option>
                            </select>
                        </div>
                        <div className="input-group">
                            <label>Remarks</label>
                            <input type="text" value={paymentForm.remarks} onChange={e => setPaymentForm({...paymentForm, remarks: e.target.value})} placeholder="e.g. Paid via UPI" />
                        </div>
                    </div>
                    <button className="btn-primary" onClick={handleAddPayment} style={{ marginTop: '0.5rem', backgroundColor: 'var(--success-green)' }}>Confirm Payment</button>
                </div>

                <div style={{ maxHeight: '400px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '8px', marginTop: '1rem' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                      <thead style={{ backgroundColor: '#f8fafc' }}>
                         <tr style={{ textAlign: 'left' }}>
                            <th style={{ padding: '0.5rem' }}>Payment Info</th>
                            <th style={{ padding: '0.5rem', textAlign: 'right' }}>Amount</th>
                         </tr>
                      </thead>
                      <tbody>
                        {financeData.payments.map(p => (
                            <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                <td style={{ padding: '0.5rem' }}>
                                   <div style={{ fontWeight: 600 }}>{p.paymentMode} - {p.remarks || 'No remarks'}</div>
                                   <div style={{ fontSize: '0.7rem', color: '#64748B' }}>{p.date}</div>
                                </td>
                                <td style={{ padding: '0.5rem', textAlign: 'right', fontWeight: 700, color: 'var(--success-green)' }}>- ₹{p.amount.toLocaleString()}</td>
                            </tr>
                        ))}
                      </tbody>
                    </table>
                </div>
              </div>
            </div>

            <div className="print-only" style={{ marginTop: '50px', display: 'flex', justifyContent: 'flex-end' }}>
               <div style={{ textAlign: 'center' }}>
                  <div style={{ width: '180px', borderBottom: '1px solid #000', marginBottom: '8px' }}></div>
                  <div style={{ fontWeight: 700, fontSize: '14px' }}>Administrative Head</div>
                  <div style={{ fontSize: '12px', color: '#64748B' }}>Yashashrri Classes</div>
               </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-header { display: block !important; }
          .print-only { display: block !important; }
          .card-base { border: none !important; box-shadow: none !important; padding: 0 !important; width: 100% !important; margin: 0 !important; }
          body { background: white !important; }
          .app-layout { padding: 0 !important; }
          .main-workspace { padding: 0 !important; }
          .content-area { padding: 0 !important; position: static !important; }
          table { width: 100% !important; border: 1px solid #ddd !important; }
          th { -webkit-print-color-adjust: exact; }
          .modal-overlay { position: static !important; padding: 0 !important; background: transparent !important; }
        }
        .responsive-grid { display: grid; gap: 1.5rem; }
        .responsive-grid-2col { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1.5rem; }
      `}</style>

      {showModal && (
        <div className="modal-overlay">
          <div className="card-base" style={{ width: '100%', maxWidth: '500px', padding: '1.5rem', backgroundColor: 'var(--bg-surface)', borderTop: '4px solid var(--accent-gold)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', color: 'var(--primary-blue)' }}>{editMode ? 'Edit Faculty' : 'Add New Faculty'}</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'transparent', color: 'var(--text-secondary)', fontSize: '1.25rem', cursor: 'pointer', border: 'none' }}><FiX /></button>
            </div>
            
            <div className="responsive-grid-2col" style={{ gap: '1rem' }}>
              <div className="input-group">
                <label>Faculty ID</label>
                <input type="text" placeholder="e.g. T005" value={formData.id} onChange={e => setFormData({...formData, id: e.target.value})} disabled={editMode} style={{ backgroundColor: editMode ? 'var(--bg-main)' : 'inherit' }} />
              </div>
              <div className="input-group">
                <label>Full Name</label>
                <input type="text" placeholder="e.g. Jane Smith" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
            </div>

            <div className="input-group" style={{ marginBottom: '2.5rem' }}>
              <label>Subject Specialization</label>
              <input type="text" placeholder="e.g. Physics" value={formData.subject} onChange={e => setFormData({...formData, subject: e.target.value})} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
              <button className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={handleSaveTeacher}>{editMode ? 'Update Record' : 'Save Record'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherManagement;
