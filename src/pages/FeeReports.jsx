import React, { useState, useEffect } from 'react';
import { FiPrinter, FiSearch, FiCalendar, FiDollarSign, FiFilter, FiChevronRight, FiX, FiActivity } from 'react-icons/fi';
import { supabase } from '../supabaseClient';

const FeeReports = () => {
  const [activeTab, setActiveTab] = useState('arrears');
  const [arrears, setArrears] = useState([]);
  const [collection, setCollection] = useState({ collections: [], summary: { totalCollection: 0, transactions: 0 } });
  const [facultySummary, setFacultySummary] = useState([]);
  const [, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState({ 
    start: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0], 
    end: new Date().toISOString().split('T')[0] 
  });
  const [stdFilter, setStdFilter] = useState('');
  const [standards, setStandards] = useState([]);
  const [showFinanceModal, setShowFinanceModal] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [financeData, setFinanceData] = useState({ teacher: {}, shares: [], payments: [], summary: { totalEarned: 0, totalPaid: 0, balance: 0 } });

  const fetchFinanceDetails = async (teacherId) => {
    try {
      const { data: shares } = await supabase.from('teacher_shares').select('*').eq('teacher_id', teacherId).order('date', { ascending: false });
      const { data: payments } = await supabase.from('teacher_payments').select('*').eq('teacher_id', teacherId).order('date', { ascending: false });
      const totalEarned = (shares || []).reduce((sum, s) => sum + (s.amount || 0), 0);
      const totalPaid = (payments || []).reduce((sum, p) => sum + (p.amount || 0), 0);
      setFinanceData({
        teacher: selectedTeacher || {},
        shares: shares || [],
        payments: payments || [],
        summary: { totalEarned, totalPaid, balance: totalEarned - totalPaid }
      });
    } catch (e) { console.error(e); }
  };

  const handleFinanceOpen = (teacher) => {
    setSelectedTeacher(teacher);
    setFinanceData({ teacher: {}, shares: [], payments: [], summary: { totalEarned: 0, totalPaid: 0, balance: 0 } });
    fetchFinanceDetails(teacher.id);
    setShowFinanceModal(true);
  };

  const handleLedgerPrint = () => {
    const modal = document.getElementById('fee-ledger-modal-card');
    const scrollables = document.querySelectorAll('.scrollable-print-content');
    const origModalMaxH = modal ? modal.style.maxHeight : null;
    const origModalOvY = modal ? modal.style.overflowY : null;
    const origStyles = [];
    if (modal) {
      modal.style.maxHeight = 'none';
      modal.style.overflowY = 'visible';
    }
    scrollables.forEach(el => {
      origStyles.push({ el, maxHeight: el.style.maxHeight, overflowY: el.style.overflowY });
      el.style.maxHeight = 'none';
      el.style.overflowY = 'visible';
    });
    window.print();
    setTimeout(() => {
      if (modal) {
        modal.style.maxHeight = origModalMaxH;
        modal.style.overflowY = origModalOvY;
      }
      origStyles.forEach(({ el, maxHeight, overflowY }) => {
        el.style.maxHeight = maxHeight;
        el.style.overflowY = overflowY;
      });
    }, 1000);
  };

  const fetchArrears = async () => {
    setLoading(true);
    try {
      const { data: students } = await supabase.from('students').select('*').gt('balance', 0).order('standard', { ascending: true });
      const arrearsData = (students || []).map(s => ({
        id: s.id,
        name: s.name,
        standard: s.standard,
        subjects: '-', 
        feesPaid: s.fees_paid || 0,
        balance: s.balance || 0
      }));
      setArrears(arrearsData);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const fetchCollection = async () => {
    setLoading(true);
    try {
      // In Supabase we compare dates directly via ISO string filters usually
      const { data: feeData } = await supabase.from('fees')
         .select('*, students(name, standard)')
         .gte('payment_date', `${dateFilter.start}T00:00:00`)
         .lte('payment_date', `${dateFilter.end}T23:59:59`)
         .order('payment_date', { ascending: false });
         
      const collections = (feeData || []).map(f => ({
         id: f.id,
         paymentDate: new Date(f.payment_date).toLocaleDateString('en-IN'),
         studentName: f.students?.name || 'Unknown',
         standard: f.students?.standard || '',
         paymentMode: f.payment_mode || 'Cash',
         remarks: f.remarks || '',
         amountPaid: f.amount_paid || 0
      }));
      setCollection({
         collections,
         summary: {
           totalCollection: collections.reduce((s, c) => s + c.amountPaid, 0),
           transactions: collections.length
         }
      });
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const fetchFacultySummary = async () => {
    setLoading(true);
    try {
      const { data: teachersData } = await supabase.from('teachers').select('*');
      const { data: sharesData } = await supabase.from('teacher_shares').select('teacher_id, amount');
      const { data: paymentsData } = await supabase.from('teacher_payments').select('teacher_id, amount');

      const summary = (teachersData || []).map(t => {
        const totalEarned = (sharesData || []).filter(s => s.teacher_id === t.id).reduce((sum, s) => sum + (s.amount || 0), 0);
        const totalPaid = (paymentsData || []).filter(p => p.teacher_id === t.id).reduce((sum, p) => sum + (p.amount || 0), 0);
        return {
          id: t.id,
          name: t.name,
          subject: t.subject,
          totalEarned,
          totalPaid,
          balance: totalEarned - totalPaid
        };
      });
      setFacultySummary(summary);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const handlePrint = () => {
    window.print();
  };

  const fetchStandards = async () => {
    const { data } = await supabase.from('standards').select('*').order('standard');
    setStandards(data || []);
  };

  // eslint-disable-next-line
  useEffect(() => {
    fetchStandards();
  }, []);

  // eslint-disable-next-line
  useEffect(() => {
    if (activeTab === 'arrears') fetchArrears();
    else if (activeTab === 'collection') fetchCollection();
    else fetchFacultySummary();
  }, [activeTab, dateFilter]);

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
        Branch 1: Silverwinds, C2, Dnyaneshwar Nagar, Nr. Jijamata Chowk, Talegaon Dabhade, PUNE - 410506<br />
        Contact: +91 73874 20737 | https://yashashrri-dashboard.vercel.app
      </div>
      <hr style={{ border: 'none', borderTop: '2px solid #1A237E', margin: '20px 0' }} />
      <h2 style={{ fontSize: '16px', color: '#1A237E', margin: '10px 0', textTransform: 'uppercase' }}>{title}</h2>
      {subTitle && <p style={{ fontSize: '13px', color: '#64748B', fontWeight: 600 }}>{subTitle}</p>}
    </div>
  );

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="page-header no-print">
        <div>
          <h1 className="page-title">Financial Reports</h1>
          <p className="page-subtitle">Centralized audit of income, arrears, and faculty liabilities</p>
        </div>
        <button className="btn-secondary" onClick={handlePrint}>
          <FiPrinter /> Print Report
        </button>
      </div>

      <div className="card-base no-print" style={{ marginBottom: '1.5rem', padding: '0.5rem', display: 'flex', alignItems: 'center', gap: '1.5rem', backgroundColor: 'var(--bg-main)', flexWrap: 'wrap', borderRadius: '12px' }}>
        <div style={{ display: 'inline-flex', gap: '0.25rem' }}>
          <button 
            onClick={() => setActiveTab('arrears')}
            style={{ 
              backgroundColor: activeTab === 'arrears' ? 'var(--bg-surface)' : 'transparent',
              color: activeTab === 'arrears' ? 'var(--primary-blue)' : 'var(--text-secondary)',
              boxShadow: activeTab === 'arrears' ? 'var(--shadow-sm)' : 'none',
              padding: '0.6rem 1.2rem', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem'
            }}
          >
            Student Arrears
          </button>
          <button 
            onClick={() => setActiveTab('collection')}
            style={{ 
              backgroundColor: activeTab === 'collection' ? 'var(--bg-surface)' : 'transparent',
              color: activeTab === 'collection' ? 'var(--primary-blue)' : 'var(--text-secondary)',
              boxShadow: activeTab === 'collection' ? 'var(--shadow-sm)' : 'none',
              padding: '0.6rem 1.2rem', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem'
            }}
          >
            Income History
          </button>
          <button 
            onClick={() => setActiveTab('faculty')}
            style={{ 
              backgroundColor: activeTab === 'faculty' ? 'var(--bg-surface)' : 'transparent',
              color: activeTab === 'faculty' ? 'var(--primary-blue)' : 'var(--text-secondary)',
              boxShadow: activeTab === 'faculty' ? 'var(--shadow-sm)' : 'none',
              padding: '0.6rem 1.2rem', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem'
            }}
          >
            Faculty Ledger
          </button>
        </div>

        {activeTab !== 'arrears' && (
           <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginLeft: '1rem' }}>
              <select 
                value={stdFilter} 
                onChange={e => setStdFilter(e.target.value)} 
                style={{ padding: '0.4rem', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '0.85rem', backgroundColor: 'white' }}
              >
                <option value="">All Classes</option>
                {standards.map(s => <option key={s.id} value={s.standard}>{s.standard}</option>)}
              </select>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                 <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>From:</span>
                 <input type="date" value={dateFilter.start} onChange={e => setDateFilter({...dateFilter, start: e.target.value})} style={{ padding: '0.4rem', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '0.85rem' }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                 <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>To:</span>
                 <input type="date" value={dateFilter.end} onChange={e => setDateFilter({...dateFilter, end: e.target.value})} style={{ padding: '0.4rem', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '0.85rem' }} />
              </div>
           </div>
        )}

        {activeTab === 'arrears' && (
           <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginLeft: '1rem' }}>
              <select 
                value={stdFilter} 
                onChange={e => setStdFilter(e.target.value)} 
                style={{ padding: '0.4rem', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '0.85rem', backgroundColor: 'white' }}
              >
                <option value="">All Classes</option>
                {standards.map(s => <option key={s.id} value={s.standard}>{s.standard}</option>)}
              </select>
           </div>
        )}
        
        <div className="search-bar" style={{ backgroundColor: 'var(--bg-surface)', flex: 1, minWidth: '200px', maxWidth: '300px', marginLeft: 'auto' }}>
          <FiSearch style={{ color: 'var(--text-secondary)' }} />
          <input 
            type="text" 
            className="search-input" 
            placeholder={`Filter records...`} 
            value={searchQuery} 
            onChange={(e) => setSearchQuery(e.target.value)} 
          />
        </div>
      </div>

      {activeTab === 'collection' && (
        <div className="card-base no-print" style={{ padding: '0.75rem', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--accent-gold-light)', border: '1px solid var(--accent-gold-faded)' }}>
           <div style={{ textAlign: 'left' }}>
              <p style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase', margin: 0 }}>Period Total</p>
              <h2 style={{ fontSize: '1.25rem', color: 'var(--success-green)', margin: 0 }}>₹{collection.summary?.totalCollection?.toLocaleString() || 0}</h2>
           </div>
           <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase', margin: 0 }}>Txns</p>
              <h2 style={{ fontSize: '1.25rem', color: 'var(--primary-blue)', margin: 0 }}>{collection.summary?.transactions || 0}</h2>
           </div>
        </div>
      )}

      {/* Printable Area */}
      <div className="card-base" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: '0.5rem', background: 'transparent', border: 'none', boxShadow: 'none' }}>
        <PrintHeader 
          title={
            activeTab === 'arrears' ? "Pending Fees (Arrears) Report" : 
            activeTab === 'collection' ? "Consolidated Collection Report" : 
            "Consolidated Faculty Financial Ledger"
          } 
          subTitle={activeTab !== 'arrears' ? `Report Period: ${new Date(dateFilter.start).toLocaleDateString('en-IN')} to ${new Date(dateFilter.end).toLocaleDateString('en-IN')}` : ""}
        />

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {activeTab === 'arrears' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {/* Desktop Table */}
              <div className="desktop-only card-base" style={{ padding: 0 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#1A237E', color: 'white', borderBottom: '2px solid var(--border-color)', textAlign: 'left' }}>
                      <th style={{ padding: '0.75rem' }}>Student Name</th>
                      <th style={{ padding: '0.75rem' }}>Standard</th>
                      <th style={{ padding: '0.75rem' }}>Enrolled Subjects</th>
                      <th style={{ padding: '0.75rem', textAlign: 'right' }}>Paid</th>
                      <th style={{ padding: '0.75rem', textAlign: 'right' }}>Pending</th>
                    </tr>
                  </thead>
                  <tbody>
                    {arrears
                      .filter(s => !stdFilter || s.standard === stdFilter)
                      .filter(s => (s.name || '').toLowerCase().includes(searchQuery.toLowerCase()))
                      .map((s) => (
                      <tr key={s.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '0.75rem', fontWeight: 600 }}>{s.name} <br/><span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>ID: {s.id}</span></td>
                        <td style={{ padding: '0.75rem' }}>{s.standard}</td>
                        <td style={{ padding: '0.75rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{s.subjects}</td>
                        <td style={{ padding: '0.75rem', textAlign: 'right', color: 'var(--success-green)' }}>₹{s.feesPaid.toLocaleString()}</td>
                        <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 700, color: 'var(--danger-red)' }}>₹{s.balance.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="mobile-only">
                {arrears
                  .filter(s => !stdFilter || s.standard === stdFilter)
                  .filter(s => (s.name || '').toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((s) => (
                  <div key={s.id} className="card-base" style={{ padding: '1rem', marginBottom: '0.75rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                       <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{s.name}</div>
                       <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{s.standard}</div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                       <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Paid: ₹{s.feesPaid.toLocaleString()}</div>
                       <div style={{ fontWeight: 800, color: 'var(--danger-red)', fontSize: '1rem' }}>₹{s.balance.toLocaleString()}</div>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="card-base" style={{ padding: '1rem', fontWeight: 800, backgroundColor: 'var(--bg-main)', display: 'flex', justifyContent: 'space-between' }}>
                 <span>Filtered Total Outstanding:</span>
                 <span style={{ color: 'var(--danger-red)' }}>₹{arrears.filter(s => !stdFilter || s.standard === stdFilter).filter(s => (s.name || '').toLowerCase().includes(searchQuery.toLowerCase())).reduce((acc, s) => acc + s.balance, 0).toLocaleString()}</span>
              </div>
            </div>
          )}

          {activeTab === 'collection' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {/* Desktop Table */}
              <div className="desktop-only card-base" style={{ padding: 0 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#1A237E', color: 'white', borderBottom: '2px solid var(--border-color)', textAlign: 'left' }}>
                      <th style={{ padding: '0.75rem' }}>Date</th>
                      <th style={{ padding: '0.75rem' }}>Student Name</th>
                      <th style={{ padding: '0.75rem' }}>Mode</th>
                      <th style={{ padding: '0.75rem' }}>Remarks</th>
                      <th style={{ padding: '0.75rem', textAlign: 'right' }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {collection.collections
                      .filter(f => !stdFilter || f.standard === stdFilter)
                      .filter(f => (f.studentName || '').toLowerCase().includes(searchQuery.toLowerCase()))
                      .map((f) => (
                      <tr key={f.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '0.75rem' }}>{f.paymentDate}</td>
                        <td style={{ padding: '0.75rem', fontWeight: 600 }}>{f.studentName} <br/><span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{f.standard}</span></td>
                        <td style={{ padding: '0.75rem' }}>{f.paymentMode}</td>
                        <td style={{ padding: '0.75rem', fontSize: '0.8rem' }}>{f.remarks}</td>
                        <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 600, color: f.amountPaid < 0 ? 'var(--danger-red)' : '' }}>
                          {f.amountPaid < 0 ? `- ₹${Math.abs(f.amountPaid).toLocaleString()}` : `₹${f.amountPaid.toLocaleString()}`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="mobile-only">
                {collection.collections
                  .filter(f => !stdFilter || f.standard === stdFilter)
                  .filter(f => (f.studentName || '').toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((f) => (
                  <div key={f.id} className="card-base" style={{ padding: '1rem', marginBottom: '0.75rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                       <div style={{ fontWeight: 700 }}>{f.studentName}</div>
                       <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{f.paymentDate}</div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                       <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{f.paymentMode} {f.remarks && `• ${f.remarks}`}</div>
                       <div style={{ fontWeight: 800, color: f.amountPaid < 0 ? 'var(--danger-red)' : 'var(--success-green)' }}>
                         {f.amountPaid < 0 ? `- ₹${Math.abs(f.amountPaid).toLocaleString()}` : `₹${f.amountPaid.toLocaleString()}`}
                       </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="card-base" style={{ padding: '1rem', fontWeight: 800, backgroundColor: 'var(--bg-main)', display: 'flex', justifyContent: 'space-between' }}>
                 <span>Filtered Total Collection:</span>
                 <span style={{ color: 'var(--success-green)' }}>
                   ₹{collection.collections.filter(f => !stdFilter || f.standard === stdFilter).filter(f => (f.studentName || '').toLowerCase().includes(searchQuery.toLowerCase())).reduce((acc, f) => acc + f.amountPaid, 0).toLocaleString()}
                 </span>
              </div>
            </div>
          )}

          {activeTab === 'faculty' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {/* Desktop Table */}
              <div className="desktop-only card-base" style={{ padding: 0 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#1A237E', color: 'white', borderBottom: '2px solid var(--border-color)', textAlign: 'left' }}>
                      <th style={{ padding: '0.75rem' }}>Faculty ID</th>
                      <th style={{ padding: '0.75rem' }}>Faculty Name</th>
                      <th style={{ padding: '0.75rem' }}>Specialization</th>
                      <th style={{ padding: '0.75rem', textAlign: 'right' }}>Total Earned</th>
                      <th style={{ padding: '0.75rem', textAlign: 'right' }}>Total Paid</th>
                      <th style={{ padding: '0.75rem', textAlign: 'right' }}>Balance Due</th>
                      <th className="no-print" style={{ padding: '0.75rem', textAlign: 'center' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {facultySummary
                      .filter(t => (t.name || '').toLowerCase().includes(searchQuery.toLowerCase()))
                      .map((t) => (
                      <tr key={t.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '0.75rem' }}>{t.id}</td>
                        <td style={{ padding: '0.75rem', fontWeight: 600 }}>{t.name}</td>
                        <td style={{ padding: '0.75rem' }}>{t.subject}</td>
                        <td style={{ padding: '0.75rem', textAlign: 'right' }}>₹{t.totalEarned.toLocaleString()}</td>
                        <td style={{ padding: '0.75rem', textAlign: 'right', color: 'var(--success-green)' }}>₹{t.totalPaid.toLocaleString()}</td>
                        <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 700, color: t.balance > 0 ? 'var(--danger-red)' : 'var(--text-secondary)' }}>₹{t.balance.toLocaleString()}</td>
                        <td className="no-print" style={{ padding: '0.75rem', textAlign: 'center' }}>
                           <button onClick={() => handleFinanceOpen(t)} className="btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}><FiDollarSign /> Ledger</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="mobile-only">
                {facultySummary
                  .filter(t => (t.name || '').toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((t) => (
                  <div key={t.id} className="card-base" style={{ padding: '1rem', marginBottom: '0.75rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                       <div>
                         <div style={{ fontWeight: 700 }}>{t.name}</div>
                         <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{t.subject}</div>
                       </div>
                       <button onClick={() => handleFinanceOpen(t)} className="btn-secondary" style={{ padding: '0.4rem', borderRadius: '50%' }}><FiDollarSign /></button>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--bg-main)', padding: '0.5rem', borderRadius: '6px' }}>
                       <div style={{ fontSize: '0.75rem' }}>Due: <span style={{ fontWeight: 700, color: 'var(--danger-red)' }}>₹{t.balance.toLocaleString()}</span></div>
                       <div style={{ fontSize: '0.75rem' }}>Paid: <span style={{ fontWeight: 700, color: 'var(--success-green)' }}>₹{t.totalPaid.toLocaleString()}</span></div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="card-base" style={{ padding: '1rem', fontWeight: 800, backgroundColor: 'var(--bg-main)', display: 'flex', justifyContent: 'space-between' }}>
                 <span>Grand Total Liabilities:</span>
                 <span style={{ color: 'var(--danger-red)' }}>₹{facultySummary.reduce((acc, t) => acc + t.balance, 0).toLocaleString()}</span>
              </div>
            </div>
          )}
        </div>

        <div className="print-only" style={{ marginTop: '50px', display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: '150px', borderBottom: '1px solid #000', marginBottom: '10px' }}></div>
            <div style={{ fontSize: '12px', fontWeight: 700 }}>Authorized Signatory</div>
          </div>
        </div>
      </div>
      
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-header { display: block !important; }
          .print-only { display: block !important; }
          .card-base { border: none !important; box-shadow: none !important; width: 100% !important; margin: 0 !important; height: auto !important; overflow: visible !important; }
          body { background: white !important; height: auto !important; overflow: visible !important; }
          .app-layout { padding: 0 !important; height: auto !important; overflow: visible !important; }
          .main-workspace { padding: 0 !important; height: auto !important; overflow: visible !important; }
          .content-area { padding: 0 !important; position: static !important; height: auto !important; overflow: visible !important; }
          table { width: 100% !important; border: 1px solid #ddd !important; }
          th { background-color: #1A237E !important; color: white !important; -webkit-print-color-adjust: exact; }
          tfoot tr { background-color: #f8fafc !important; -webkit-print-color-adjust: exact; }
          .scrollable-print-content { max-height: none !important; height: auto !important; overflow: visible !important; }
        }
      `}</style>
      {showFinanceModal && selectedTeacher && (
        <div className="modal-overlay">
          <div id="fee-ledger-modal-card" className="card-base" style={{ width: '95%', maxWidth: '1000px', maxHeight: '90vh', overflowY: 'auto', padding: '2rem', position: 'relative' }}>
            <div className="no-print" style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', zIndex: 50 }}>
               <button className="btn-secondary" onClick={handleLedgerPrint} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem' }}><FiPrinter /> Print Ledger</button>
               <button onClick={() => setShowFinanceModal(false)} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', cursor: 'pointer', boxShadow: 'var(--shadow-sm)' }}><FiX /></button>
            </div>
            
            <div style={{ marginBottom: '1.5rem' }} className="no-print">
                <h2 style={{ marginBottom: '0.4rem', color: 'var(--primary-blue)' }}>Finance Ledger: {selectedTeacher.name}</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Detailed breakdown of share entitlements and actual payments.</p>
            </div>

            <PrintHeader title="Faculty Financial Ledger" subTitle={`Ledger for: ${selectedTeacher.name} | ID: ${selectedTeacher.id} | Dept: ${selectedTeacher.subject}`} />

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <div style={{ background: 'var(--bg-main)', padding: '1rem', borderRadius: '12px' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Total Share Earned</span>
                <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>₹{financeData.summary.totalEarned.toLocaleString()}</div>
              </div>
              <div style={{ background: 'var(--bg-main)', padding: '1rem', borderRadius: '12px' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Total Paid</span>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--success-green)' }}>₹{financeData.summary.totalPaid.toLocaleString()}</div>
              </div>
              <div style={{ background: 'rgba(239, 68, 68, 0.05)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.1)' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Balance Outstanding</span>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--danger-red)' }}>₹{financeData.summary.balance.toLocaleString()}</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '1rem', marginBottom: '1rem' }}>Earnings History</h3>
                <div className="scrollable-print-content" style={{ maxHeight: '400px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '8px', backgroundColor: 'white' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem 0.8rem', backgroundColor: '#f8fafc', borderBottom: '1px solid var(--border-color)', fontSize: '0.75rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>
                        <span>Description</span>
                        <span>Amount</span>
                    </div>
                    {financeData.shares.map(s => (
                        <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '0.6rem 0.8rem', borderBottom: '1px solid #f1f5f9', gap: '1rem' }}>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#1E293B', wordBreak: 'break-word' }}>{s.description}</div>
                                <div style={{ fontSize: '0.65rem', color: '#64748B', marginTop: '2px' }}>{s.date}</div>
                            </div>
                            <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#1A237E', whiteSpace: 'nowrap' }}>₹{s.amount.toLocaleString()}</div>
                        </div>
                    ))}
                </div>
              </div>

              <div>
                <h3 style={{ fontSize: '1rem', marginBottom: '1rem' }}>Recent Payments Record</h3>
                <div className="scrollable-print-content" style={{ maxHeight: '400px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '8px', backgroundColor: 'white' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem 0.8rem', backgroundColor: '#f8fafc', borderBottom: '1px solid var(--border-color)', fontSize: '0.75rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>
                        <span>Payment Info</span>
                        <span>Amount</span>
                    </div>
                    {financeData.payments.map(p => (
                        <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '0.6rem 0.8rem', borderBottom: '1px solid #f1f5f9', gap: '1rem' }}>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#1E293B', wordBreak: 'break-word' }}>{p.paymentMode} - {p.remarks || 'No remarks'}</div>
                                <div style={{ fontSize: '0.65rem', color: '#64748B', marginTop: '2px' }}>{p.date}</div>
                            </div>
                            <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--success-green)', whiteSpace: 'nowrap' }}>- ₹{p.amount.toLocaleString()}</div>
                        </div>
                    ))}
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
    </div>
  );
};

export default FeeReports;
