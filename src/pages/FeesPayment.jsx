import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { FiDollarSign, FiPlus, FiPrinter, FiX, FiCheckCircle, FiSearch, FiTrash2 } from 'react-icons/fi';

const FeesPayment = () => {
  const [students, setStudents] = useState([]);
  const [history, setHistory] = useState([]);
  const [filterStd, setFilterStd] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showDefaultersModal, setShowDefaultersModal] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');
  const [historySearch, setHistorySearch] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [successReceipt, setSuccessReceipt] = useState(null);
  const [formData, setFormData] = useState({
    studentId: '',
    amountPaid: '',
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMode: 'Cash',
    remarks: 'Monthly Fees'
  });
  const [refundData, setRefundData] = useState({
    studentId: '',
    refundAmount: '',
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMode: 'Online',
    remarks: 'Dropped Subject Refund'
  });

  const fetchStudents = async () => {
    const { data: stuData } = await supabase.from('students').select('*, student_subjects(subject_id)').order('name');
    const { data: subData } = await supabase.from('subjects').select('id, name');
    
    if (stuData && subData) {
      const subMap = subData.reduce((acc, s) => { acc[s.id] = s.name; return acc; }, {});
      
      const flat = stuData.map(s => {
        const subjectNames = s.student_subjects && s.student_subjects.length > 0
          ? s.student_subjects.map(ss => subMap[ss.subject_id]).filter(Boolean).join(', ')
          : 'All Standard Subjects';
          
        return {
          ...s,
          feesPaid: s.fees_paid,
          subjectNames,
          enrolledSubjectIds: s.student_subjects ? s.student_subjects.map(ss => Number(ss.subject_id)) : []
        };
      });
      setStudents(flat);
    }
  };

  const fetchHistory = async () => {
    const { data } = await supabase
      .from('fees')
      .select('*, students(name, standard, balance, fees_paid, concession)')
      .order('payment_date', { ascending: false });
    
    if (data) {
      setHistory(data.map(f => ({
        ...f,
        studentName: f.students?.name,
        standard: f.students?.standard,
        currentBalance: f.students?.balance,
        totalPaid: f.students?.fees_paid,
        concession: f.students?.concession,
        studentId: f.student_id,
        amountPaid: f.amount_paid,
        paymentDate: f.payment_date,
        paymentMode: f.payment_mode
      })));
    }
  };

  // eslint-disable-next-line
  useEffect(() => {
    fetchStudents();
    fetchHistory();
  }, []);

  // Update document title for professional PDF filename on print
  useEffect(() => {
    if (successReceipt) {
      const { studentName, totalPaid, grossFees, amountPaid } = successReceipt;
      const studentObj = students.find(s => s.id === successReceipt.studentId);
      
      let suffix = '';
      if (amountPaid < 0) {
        suffix = ' Refund';
      } else if (studentObj && studentObj.installments > 1) {
        const instSize = Math.max(1, Math.round(grossFees / studentObj.installments));
        const currentInst = Math.ceil(totalPaid / instSize);
        suffix = ` ${Math.min(currentInst, studentObj.installments)}`;
      } else {
        suffix = ' Receipt';
      }

      const prevTitle = document.title;
      document.title = `${studentName}${suffix}`.trim();
      
      return () => {
        document.title = prevTitle;
      };
    }
  }, [successReceipt, students]);

  const handleSavePayment = async () => {
    if (!formData.studentId || !formData.amountPaid) return alert('Select Student and Amount');
    const studentObj = students.find(s => s.id === formData.studentId);
    const amount = Number(formData.amountPaid);

    // 1. Record the receipt
    const { error: feeErr } = await supabase.from('fees').insert({
      student_id: formData.studentId,
      amount_paid: amount,
      payment_date: formData.paymentDate,
      payment_mode: formData.paymentMode,
      remarks: formData.remarks
    });

    if (feeErr) return alert(feeErr.message);

    // 2. Update Student Balance
    const newFeesPaid = (studentObj.fees_paid || 0) + amount;
    const newBalance = (studentObj.balance || 0) - amount;

    const { error: stuErr } = await supabase
      .from('students')
      .update({ fees_paid: newFeesPaid, balance: newBalance })
      .eq('id', formData.studentId);

    if (stuErr) {
      alert('Payment recorded but balance update failed: ' + stuErr.message);
    } else {
      setSuccessReceipt({ 
        ...formData, 
        studentName: studentObj ? studentObj.name : 'Deleted Student', 
        standard: studentObj ? studentObj.standard : 'N/A',
        subjects: studentObj ? studentObj.subjectNames : 'All Standard Subjects',
        newBalance: newBalance,
        totalPaid: newFeesPaid,
        concession: studentObj.concession || 0,
        grossFees: (newBalance + newFeesPaid + (studentObj.concession || 0))
      });
      setShowModal(false);
      setStudentSearch('');
      fetchStudents();
      fetchHistory();
    }
  };

  const handleSaveRefund = async () => {
    if (!refundData.studentId || !refundData.refundAmount) return alert('Select Student and Refund Amount');
    const studentObj = students.find(s => s.id === refundData.studentId);
    const amount = -Math.abs(Number(refundData.refundAmount));

    // 1. Record the refund as a negative fee
    const { error: feeErr } = await supabase.from('fees').insert({
      student_id: refundData.studentId,
      amount_paid: amount,
      payment_date: refundData.paymentDate,
      payment_mode: refundData.paymentMode,
      remarks: refundData.remarks
    });

    if (feeErr) return alert(feeErr.message);

    // 2. Update Student Balance
    const newFeesPaid = (studentObj.fees_paid || 0) + amount;
    const newBalance = (studentObj.balance || 0) - amount;

    const { error: stuErr } = await supabase
      .from('students')
      .update({ fees_paid: newFeesPaid, balance: newBalance })
      .eq('id', refundData.studentId);

    if (stuErr) {
      alert('Refund recorded but balance update failed: ' + stuErr.message);
    } else {
      setSuccessReceipt({ 
        ...refundData, 
        amountPaid: amount,
        studentName: studentObj ? studentObj.name : 'Deleted Student', 
        standard: studentObj ? studentObj.standard : 'N/A',
        subjects: studentObj ? studentObj.subjectNames : 'All Standard Subjects',
        newBalance: newBalance,
        totalPaid: newFeesPaid,
        concession: studentObj.concession || 0,
        grossFees: (newBalance + newFeesPaid + (studentObj.concession || 0))
      });
      setShowRefundModal(false);
      setStudentSearch('');
      fetchStudents();
      fetchHistory();
    }
  };

  const handleReprint = (fee) => {
    const studentObj = students.find(s => s.id === fee.studentId);
    setSuccessReceipt({
      studentId: fee.studentId,
      amountPaid: fee.amountPaid,
      paymentDate: fee.paymentDate,
      paymentMode: fee.paymentMode,
      remarks: fee.remarks,
      studentName: fee.studentName,
      standard: fee.standard,
      subjects: studentObj ? studentObj.subjectNames : 'All Standard Subjects',
      newBalance: fee.currentBalance,
      totalPaid: fee.totalPaid,
      concession: fee.concession,
      grossFees: (fee.currentBalance + fee.totalPaid + fee.concession)
    });
  };

  const handleDeleteFee = async (id) => {
    if (!window.confirm('Are you absolutely sure you want to permanently delete this record? This will reverse the amount paid and update the student balance.')) return;
    
    const fee = history.find(f => f.id === id);
    if (!fee) return;

    // 1. Delete the fee record
    const { error: delErr } = await supabase.from('fees').delete().eq('id', id);
    if (delErr) return alert(delErr.message);

    // 2. Reverse balance update
    const studentObj = students.find(s => s.id === fee.studentId);
    if (studentObj) {
        const newFeesPaid = (studentObj.fees_paid || 0) - fee.amount_paid;
        const newBalance = (studentObj.balance || 0) + fee.amount_paid;
        await supabase.from('students').update({ fees_paid: newFeesPaid, balance: newBalance }).eq('id', fee.studentId);
    }

    fetchHistory();
    fetchStudents();
  };

  const handlePrint = () => {
    window.print();
  };

  const selectedStudentData = students.find(s => s.id === formData.studentId);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="page-header no-print">
        <div>
          <h1 className="page-title">Fee Section</h1>
          <p className="page-subtitle">Track payments, arrears, and generate receipts</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <select value={filterStd} onChange={e => setFilterStd(e.target.value)} style={{ padding: '0.6rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)', outline: 'none' }}>
            <option value="">All Standards Filter</option>
            {Array.from(new Set(students.map(s => s.standard))).map(std => <option key={std} value={std}>{std}</option>)}
          </select>
          <button className="btn-primary" onClick={() => { setStudentSearch(''); setShowModal(true); }}>
            <FiPlus /> New Fee Record
          </button>
        </div>
      </div>

      <div className="no-print" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        <div className="card-base" style={{ padding: '1.5rem', display: 'flex', gap: '1.5rem', alignItems: 'center', borderTop: '4px solid var(--accent-gold)' }}>
          <div style={{ padding: '1.5rem', backgroundColor: 'var(--accent-gold-light)', borderRadius: '12px', color: 'var(--accent-gold)' }}>
            <FiDollarSign size={32} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.1rem', color: 'var(--primary-blue)', marginBottom: '0.25rem' }}>Quick Collection</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem', fontSize: '0.85rem' }}>Automated receipt generation for immediate payments.</p>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn-primary" onClick={() => setShowModal(true)}>Collect Fees Now</button>
              <button className="btn-secondary" style={{ backgroundColor: '#fee2e2', color: 'var(--danger-red)', borderColor: '#fecaca', whiteSpace: 'nowrap' }} onClick={() => { setStudentSearch(''); setShowRefundModal(true); }}>Process Refund</button>
            </div>
          </div>
        </div>
        
        <div className="card-base" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Top Arrears {filterStd && `(${filterStd})`}</h3>
            <button className="btn-secondary" style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }} onClick={() => setShowDefaultersModal(true)}>View All Reminders</button>
          </div>
          <div style={{ display: 'flex', gap: '1rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
             {students.filter(s => s.balance > 0 && (!filterStd || s.standard === filterStd)).sort((a,b) => b.balance - a.balance).slice(0, 5).map(s => (
               <div key={s.id} style={{ minWidth: '150px', padding: '0.75rem', backgroundColor: 'var(--bg-main)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                 <div style={{ fontSize: '0.85rem', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.name}</div>
                 <div style={{ fontSize: '0.9rem', color: 'var(--danger-red)', fontWeight: 800 }}>₹{s.balance.toLocaleString()}</div>
               </div>
             ))}
          </div>
        </div>
      </div>

      <div className="card-base no-print" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '1.5rem', overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3 style={{ color: 'var(--primary-blue)', margin: 0 }}>Recent Payment History</h3>
          <div className="search-bar" style={{ backgroundColor: 'var(--bg-main)', minWidth: '200px', maxWidth: '300px' }}>
            <FiSearch style={{ color: 'var(--text-secondary)' }} />
            <input 
              type="text" 
              className="search-input" 
              placeholder="Search history by student name..." 
              value={historySearch} 
              onChange={(e) => setHistorySearch(e.target.value)} 
            />
          </div>
        </div>
        <div style={{ overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--bg-main)', borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.85rem' }}>Student Name</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.85rem' }}>Date</th>
                <th style={{ padding: '1rem', textAlign: 'right', fontSize: '0.85rem' }}>Amount</th>
                <th style={{ padding: '1rem', textAlign: 'center', fontSize: '0.85rem' }}>Mode</th>
                <th style={{ padding: '1rem', textAlign: 'center', fontSize: '0.85rem' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {history
                .filter(fee => !filterStd || fee.standard === filterStd)
                .filter(fee => (fee.studentName || '').toLowerCase().includes(historySearch.toLowerCase()))
                .map(fee => (
                <tr key={fee.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{fee.studentName}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Standard: {fee.standard}</div>
                  </td>
                  <td style={{ padding: '1rem', fontSize: '0.9rem' }}>{fee.paymentDate}</td>
                  <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 700, color: fee.amountPaid < 0 ? 'var(--danger-red)' : 'var(--primary-blue)' }}>
                    {fee.amountPaid < 0 ? `- ₹${Math.abs(fee.amountPaid).toLocaleString()}` : `₹${fee.amountPaid.toLocaleString()}`}
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'center' }}>
                    <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.6rem', backgroundColor: 'var(--bg-main)', borderRadius: '4px' }}>{fee.paymentMode}</span>
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'center', display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
                    <button className="btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', gap: '0.3rem' }} onClick={() => handleReprint(fee)}>
                      <FiPrinter size={12} /> Reprint
                    </button>
                    <button className="btn-secondary" style={{ padding: '0.4rem 0.6rem', color: 'var(--danger-red)', borderColor: '#fecaca' }} onClick={() => handleDeleteFee(fee.id)} title="Delete Record">
                      <FiTrash2 size={12} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {history.filter(fee => !filterStd || fee.standard === filterStd).length === 0 && <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No recent payments found {filterStd && `for ${filterStd}`}.</p>}
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay no-print">
          <div className="card-base" style={{ width: '100%', maxWidth: '500px', padding: '1.5rem', backgroundColor: 'var(--bg-surface)', borderTop: '4px solid var(--accent-gold)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', color: 'var(--primary-blue)' }}>Record Payment</h2>
              <button onClick={() => { setShowModal(false); setStudentSearch(''); }} style={{ background: 'transparent', color: 'var(--text-secondary)', fontSize: '1.25rem', cursor: 'pointer', border: 'none' }}><FiX /></button>
            </div>
            
            <div className="input-group" style={{ position: 'relative' }}>
              <label>Search & Select Student {filterStd && `(Filtered to ${filterStd})`}</label>
              <div className="search-bar" style={{ backgroundColor: 'var(--bg-surface)', padding: '0.2rem', marginBottom: '0.5rem', border: '1px solid var(--border-color)' }}>
                <FiSearch style={{ color: 'var(--text-secondary)', marginLeft: '10px' }} />
                <input 
                   type="text"
                   className="search-input"
                   placeholder="Type name or ID to search..." 
                   value={studentSearch}
                   onFocus={() => setIsDropdownOpen(true)}
                   onBlur={() => setTimeout(() => setIsDropdownOpen(false), 200)}
                   onChange={e => setStudentSearch(e.target.value)}
                />
              </div>
              
              {isDropdownOpen && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, maxHeight: '200px', overflowY: 'auto', backgroundColor: '#fff', border: '1px solid var(--border-color)', borderRadius: '8px', zIndex: 10, boxShadow: 'var(--shadow-md)' }}>
                  {students.filter(s => !filterStd || s.standard === filterStd)
                           .filter(s => s.name.toLowerCase().includes(studentSearch.toLowerCase()) || s.id.toLowerCase().includes(studentSearch.toLowerCase()))
                           .map(st => (
                    <div 
                      key={st.id} 
                      style={{ padding: '0.75rem', cursor: 'pointer', borderBottom: '1px solid var(--bg-main)', display: 'flex', justifyContent: 'space-between' }}
                      onMouseDown={() => {
                        setStudentSearch(`${st.name} (${st.id})`);
                        let autoAmount = '';
                        if (st.installments > 1 && st.balance > 0) {
                            const gross = st.feesPaid + st.balance;
                            autoAmount = Math.round(gross / st.installments).toString();
                        } else if (st.installments === 1 && st.balance > 0) {
                            autoAmount = st.balance.toString();
                        }
                        setFormData({...formData, studentId: st.id, amountPaid: autoAmount});
                        setIsDropdownOpen(false);
                      }}
                    >
                      <span style={{ fontWeight: 600 }}>{st.name}</span>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{st.id}</span>
                    </div>
                  ))}
                  {students.filter(s => !filterStd || s.standard === filterStd)
                           .filter(s => s.name.toLowerCase().includes(studentSearch.toLowerCase()) || s.id.toLowerCase().includes(studentSearch.toLowerCase())).length === 0 && (
                    <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)' }}>No students found matching your search.</div>
                  )}
                </div>
              )}
            </div>

            {selectedStudentData && (
              <div style={{ padding: '1rem', backgroundColor: 'var(--bg-main)', borderRadius: '8px', marginBottom: '1.5rem', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.85rem' }}>Current Balance: </span>
                  <span style={{ fontWeight: 700, color: 'var(--danger-red)' }}>₹{selectedStudentData.balance.toLocaleString()}</span>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Standard: {selectedStudentData.standard}</div>
                {selectedStudentData.installments > 1 && (() => {
                  const grossFees = selectedStudentData.feesPaid + selectedStudentData.balance;
                  const instSize = Math.max(1, Math.round(grossFees / selectedStudentData.installments));
                  const paidCount = Math.floor(selectedStudentData.feesPaid / instSize);
                  return (
                    <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px dashed var(--border-color)', fontSize: '0.8rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                         <span>Installments Progress:</span>
                         <span style={{ fontWeight: 600 }}>{Math.min(paidCount, selectedStudentData.installments)} of {selectedStudentData.installments} Paid</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                         <span>Suggested Installment Amount:</span>
                         <span style={{ fontWeight: 600, color: 'var(--primary-blue)' }}>₹{instSize.toLocaleString()}</span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            <div className="input-group">
              <label>Amount Collected (₹)</label>
              <input type="number" placeholder="Enter amount" value={formData.amountPaid} onChange={e => setFormData({...formData, amountPaid: e.target.value})} />
            </div>

            <div className="input-group">
              <label>Payment Method</label>
              <select value={formData.paymentMode} onChange={e => setFormData({...formData, paymentMode: e.target.value})}>
                <option value="Cash">Cash</option>
                <option value="Online">Online / GPay</option>
                <option value="Cheque">Cheque</option>
              </select>
            </div>

            <div className="input-group" style={{ marginBottom: '2rem' }}>
                <label>Remarks</label>
                <input type="text" value={formData.remarks} onChange={e => setFormData({...formData, remarks: e.target.value})} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
              <button className="btn-secondary" onClick={() => { setShowModal(false); setStudentSearch(''); }}>Cancel</button>
              <button className="btn-primary" onClick={handleSavePayment}>Confirm & Generate Receipt</button>
            </div>
          </div>
        </div>
      )}

      {showRefundModal && (
        <div className="modal-overlay no-print">
          <div className="card-base" style={{ width: '100%', maxWidth: '500px', padding: '1.5rem', backgroundColor: 'var(--bg-surface)', borderTop: '4px solid var(--danger-red)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', color: 'var(--danger-red)' }}>Process Refund (Credit Note)</h2>
              <button onClick={() => { setShowRefundModal(false); setStudentSearch(''); }} style={{ background: 'transparent', color: 'var(--text-secondary)', fontSize: '1.25rem', cursor: 'pointer', border: 'none' }}><FiX /></button>
            </div>
            
            <div className="input-group" style={{ position: 'relative' }}>
              <label>Search & Select Student</label>
              <div className="search-bar" style={{ backgroundColor: 'var(--bg-surface)', padding: '0.2rem', marginBottom: '0.5rem', border: '1px solid var(--border-color)' }}>
                <FiSearch style={{ color: 'var(--text-secondary)', marginLeft: '10px' }} />
                <input 
                   type="text"
                   className="search-input"
                   placeholder="Type name or ID to search..." 
                   value={studentSearch}
                   onFocus={() => setIsDropdownOpen(true)}
                   onBlur={() => setTimeout(() => setIsDropdownOpen(false), 200)}
                   onChange={e => setStudentSearch(e.target.value)}
                />
              </div>
              
              {isDropdownOpen && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, maxHeight: '200px', overflowY: 'auto', backgroundColor: '#fff', border: '1px solid var(--border-color)', borderRadius: '8px', zIndex: 10, boxShadow: 'var(--shadow-md)' }}>
                  {students.filter(s => s.name.toLowerCase().includes(studentSearch.toLowerCase()) || s.id.toLowerCase().includes(studentSearch.toLowerCase()))
                           .map(st => (
                    <div 
                      key={st.id} 
                      style={{ padding: '0.75rem', cursor: 'pointer', borderBottom: '1px solid var(--bg-main)', display: 'flex', justifyContent: 'space-between' }}
                      onMouseDown={() => {
                        setStudentSearch(`${st.name} (${st.id})`);
                        setRefundData({...refundData, studentId: st.id});
                        setIsDropdownOpen(false);
                      }}
                    >
                      <span style={{ fontWeight: 600 }}>{st.name}</span>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{st.id}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {students.find(s => s.id === refundData.studentId) && (() => {
              const selected = students.find(s => s.id === refundData.studentId);
              return (
                <div style={{ padding: '1rem', backgroundColor: '#fee2e2', borderRadius: '8px', marginBottom: '1.5rem', border: '1px solid #fecaca' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--danger-red)' }}>Total Fees Paid: </span>
                    <span style={{ fontWeight: 700, color: 'var(--danger-red)' }}>₹{selected.feesPaid.toLocaleString()}</span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--danger-red)' }}>Standard: {selected.standard}</div>
                </div>
              );
            })()}

            <div className="input-group">
              <label>Refund Amount (₹)</label>
              <input type="number" placeholder="Enter amount to refund" value={refundData.refundAmount} onChange={e => setRefundData({...refundData, refundAmount: e.target.value})} />
            </div>

            <div className="input-group">
              <label>Reimbursement Method</label>
              <select value={refundData.paymentMode} onChange={e => setRefundData({...refundData, paymentMode: e.target.value})}>
                <option value="Online">Online / GPay</option>
                <option value="Cash">Cash</option>
                <option value="Cheque">Cheque</option>
              </select>
            </div>

            <div className="input-group" style={{ marginBottom: '2rem' }}>
                <label>Remarks / Reason</label>
                <input type="text" value={refundData.remarks} onChange={e => setRefundData({...refundData, remarks: e.target.value})} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
              <button className="btn-secondary" onClick={() => { setShowRefundModal(false); setStudentSearch(''); }}>Cancel</button>
              <button className="btn-primary" style={{ backgroundColor: 'var(--danger-red)', border: 'none' }} onClick={handleSaveRefund}>Process Refund</button>
            </div>
          </div>
        </div>
      )}

      {successReceipt && (
        <div className="modal-overlay no-print">
          <div className="card-base" style={{ width: '100%', maxWidth: '400px', padding: '2rem', textAlign: 'center' }}>
            <FiCheckCircle size={50} color="var(--success-green)" style={{ marginBottom: '1rem' }} />
            <h2 style={{ color: 'var(--primary-blue)', marginBottom: '0.5rem' }}>Payment Successful!</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>The record has been saved and student balance updated.</p>
            
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button className="btn-primary" style={{ flex: 1 }} onClick={handlePrint}><FiPrinter /> Print Invoice</button>
              <button className="btn-secondary" style={{ flex: 1 }} onClick={() => setSuccessReceipt(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {showDefaultersModal && (
        <div className="modal-overlay no-print">
          <div className="card-base" style={{ width: '100%', maxWidth: '800px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-surface)' }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                 <h2 style={{ fontSize: '1.25rem', color: 'var(--danger-red)', margin: 0 }}>Arrears & Reminders List</h2>
                 <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Send pre-filled WhatsApp reminders in 1-Click.</p>
              </div>
              <button onClick={() => setShowDefaultersModal(false)} style={{ background: 'transparent', color: 'var(--text-secondary)', fontSize: '1.25rem', cursor: 'pointer', border: 'none' }}><FiX /></button>
            </div>
            
            <div style={{ overflowY: 'auto', padding: '1.5rem' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--bg-main)', borderBottom: '2px solid var(--border-color)' }}>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.85rem' }}>Student</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.85rem' }}>Standard</th>
                    <th style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.85rem' }}>Pending Balance</th>
                    <th style={{ padding: '0.75rem', textAlign: 'center', fontSize: '0.85rem' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {students.filter(s => s.balance > 0 && (!filterStd || s.standard === filterStd)).sort((a,b) => b.balance - a.balance).map(s => (
                    <tr key={s.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '0.75rem' }}>
                        <div style={{ fontWeight: 600 }}>{s.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Parent: {s.parentName || 'N/A'} ({s.parentPhone || 'N/A'})</div>
                      </td>
                      <td style={{ padding: '0.75rem' }}>{s.standard}</td>
                      <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 'bold', color: 'var(--danger-red)' }}>₹{s.balance.toLocaleString()}</td>
                      <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                        {s.parentPhone || s.studentPhone ? (
                          <a 
                            href={`https://wa.me/91${(s.parentPhone || s.studentPhone).replace(/\D/g, '')}?text=${encodeURIComponent(`Hello ${s.parentName || 'Parent'},\n\nGentle reminder from Yashashrri Classes: ${s.name} has a pending tuition fee balance of *₹${s.balance.toLocaleString()}*.\n\nKindly clear the dues at your earliest convenience.\n\nThank you!`)}`} 
                            target="_blank" 
                            rel="noreferrer" 
                            style={{ 
                              display: 'inline-flex', alignItems: 'center', gap: '0.4rem', 
                              backgroundColor: '#25D366', color: '#fff', padding: '0.4rem 0.8rem', 
                              borderRadius: '6px', textDecoration: 'none', fontSize: '0.8rem', fontWeight: 600 
                            }}
                          >
                            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                               <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86s.274.072.376-.043c.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564.289.13.332.202c.045.072.045.419-.099.824zm-3.423-14.416c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm.029 18.88c-1.161 0-2.305-.292-3.318-.844l-3.677.964.984-3.595c-.607-1.052-.927-2.246-.926-3.468.001-5.824 4.74-10.563 10.564-10.563 5.826 0 10.564 4.738 10.564 10.561s-4.738 10.565-10.564 10.565z"/>
                            </svg>
                            Remind
                          </a>
                        ) : (
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>No Phone</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {students.filter(s => s.balance > 0 && (!filterStd || s.standard === filterStd)).length === 0 && (
                     <tr><td colSpan="4" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No pending arrears! Excellent.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {successReceipt && (
        <div className="print-only">
          <div style={{ width: '100%', maxWidth: '800px', margin: '0 auto', padding: '40px', border: '1px solid #ddd', backgroundColor: '#fff', position: 'relative' }}>
            {/* Watermark/Logo Header */}
            <div style={{ textAlign: 'center', marginBottom: '30px' }}>
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
            </div>

            <hr style={{ border: 'none', borderTop: '2px solid #1A237E', margin: '20px 0' }} />

             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '30px' }}>
                <div style={{ flex: 1, paddingRight: '20px' }}>
                   <h4 style={{ margin: '0 0 10px', color: '#64748B', textTransform: 'uppercase', fontSize: '11px' }}>Receipt For</h4>
                   <div style={{ fontSize: '18px', fontWeight: 700, color: '#1A237E' }}>{successReceipt.studentName}</div>
                   <div style={{ fontSize: '14px', color: '#475569' }}>Student ID: {successReceipt.studentId}</div>
                   <div style={{ fontSize: '14px', color: '#475569' }}>Standard: {successReceipt.standard}</div>
                   <div style={{ fontSize: '14px', color: '#475569', marginTop: '4px' }}><strong>Subjects:</strong> {successReceipt.subjects}</div>
                </div>
                <div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                   <h4 style={{ margin: '0 0 10px', color: '#64748B', textTransform: 'uppercase', fontSize: '11px' }}>Receipt Details</h4>
                   <div style={{ fontSize: '14px' }}><strong>No:</strong> RE-{String(successReceipt.receiptNo || successReceipt.studentId || "000").slice(-6)}</div>
                   <div style={{ fontSize: '14px' }}><strong>Date:</strong> {successReceipt.paymentDate}</div>
                   <div style={{ fontSize: '14px' }}><strong>Method:</strong> {successReceipt.paymentMode}</div>
                </div>
             </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '30px' }}>
              <thead>
                <tr style={{ backgroundColor: '#1A237E', color: '#fff' }}>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px' }}>Particulars</th>
                  <th style={{ padding: '12px', textAlign: 'right', fontSize: '13px' }}>Amount (INR)</th>
                </tr>
              </thead>
              <tbody>
                 <tr style={{ borderBottom: '1px solid #E2E8F0' }}>
                   <td style={{ padding: '12px' }}>
                      <div style={{ fontWeight: 600 }}>{successReceipt.amountPaid < 0 ? 'Fee Refund (Credit Note)' : 'Tuition Fees / Monthly Installment'}</div>
                      <div style={{ fontSize: '12px', color: '#64748B' }}>{successReceipt.remarks}</div>
                   </td>
                   <td style={{ padding: '12px', textAlign: 'right', fontWeight: 600, color: successReceipt.amountPaid < 0 ? 'red' : 'black' }}>
                      {successReceipt.amountPaid < 0 ? `- ₹${Math.abs(successReceipt.amountPaid).toLocaleString()}` : `₹${Number(successReceipt.amountPaid).toLocaleString()}`}
                   </td>
                 </tr>
              </tbody>
            </table>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '50px' }}>
               <div style={{ width: '250px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: '13px' }}>
                    <span>Gross Total Course Fees:</span>
                    <span>₹{successReceipt.grossFees.toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: '13px', color: '#10B981' }}>
                    <span>Total Concession:</span>
                    <span>- ₹{successReceipt.concession.toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: '13px', borderBottom: '1px solid #ddd' }}>
                    <span>{successReceipt.amountPaid < 0 ? 'Adjusted Paid Amount:' : 'Previously Paid:'}</span>
                    <span>₹{(successReceipt.totalPaid - (successReceipt.amountPaid > 0 ? successReceipt.amountPaid : 0)).toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', fontSize: '16px', fontWeight: 800, color: successReceipt.amountPaid < 0 ? 'red' : '#1A237E' }}>
                    <span>{successReceipt.amountPaid < 0 ? 'Refund Processed:' : 'Current Payment:'}</span>
                    <span>{successReceipt.amountPaid < 0 ? `- ₹${Math.abs(successReceipt.amountPaid).toLocaleString()}` : `₹${Number(successReceipt.amountPaid).toLocaleString()}`}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', fontSize: '14px', fontWeight: 700, backgroundColor: '#FEF3C7' }}>
                    <span>Balance Remaining:</span>
                    <span>₹{successReceipt.newBalance.toLocaleString()}</span>
                  </div>
               </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '60px' }}>
               <div style={{ fontSize: '11px', color: '#94A3B8', maxWidth: '300px' }}>
                  <strong>Terms & Conditions:</strong><br />
                  1. Fees once paid are non-refundable.<br />
                  2. This is a computer generated receipt and does not require a physical signature.<br />
                  3. Please keep this receipt for future reference.
               </div>
               <div style={{ textAlign: 'center' }}>
                  <div style={{ width: '150px', borderBottom: '1px solid #000', marginBottom: '10px' }}></div>
                  <div style={{ fontSize: '12px', fontWeight: 700 }}>Authorized Signatory</div>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FeesPayment;
