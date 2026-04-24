import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { 
  FiSearch, FiFilter, FiEdit2, FiTrash2, FiX, FiUser, 
  FiUpload, FiFile, FiTrendingUp, FiCheckCircle, FiExternalLink, FiPhone, FiMail, FiMapPin, FiPrinter, FiDownload, FiCreditCard
} from 'react-icons/fi';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

const StudentManagement = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [subjectSearch, setSubjectSearch] = useState('');
  const [collegeFilter, setCollegeFilter] = useState('');
  const [standardFilter, setStandardFilter] = useState('');
  const [sortBy, setSortBy] = useState('');
  const [printMode, setPrintMode] = useState('directory');
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [standards, setStandards] = useState([]);
  const [colleges, setColleges] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showTransitionModal, setShowTransitionModal] = useState(false);
  const [showProfile, setShowProfile] = useState(null); // student object
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({ 
    id: '', name: '', standard: '', feesPaid: 0, balance: 0, concession: 0, 
    status: 'Active', subjectIds: [], photo: null,
    parentName: '', parentPhone: '', studentPhone: '', email: '', address: '', collegeId: '', installments: 1,
    portal_enabled: true, portal_password: 'yash123'
  });
  const [performanceData, setPerformanceData] = useState([]);
  const [documents, setDocuments] = useState([]);

  useEffect(() => {
    fetchStudents();
    fetchStandards();
    fetchColleges();
    fetchSubjects();
  }, []);

  useEffect(() => {
    if (showProfile) {
      fetchPerformance(showProfile.id);
      fetchDocuments(showProfile.id);
    }
  }, [showProfile]);

  const fetchSubjects = async () => {
    const { data } = await supabase.from('subjects').select('*');
    if (data) setSubjects(data);
  };

  const fetchColleges = async () => {
    const { data } = await supabase.from('colleges').select('*');
    if (data) setColleges(data);
  };

  const fetchStandards = async () => {
    const { data } = await supabase.from('standards').select('*');
    if (data) setStandards(data);
  };

  const fetchStudents = async () => {
    const { data } = await supabase
      .from('students')
      .select('*, colleges(name), student_subjects(subject_id)')
      .order('name');
    
    if (data) {
      const formatted = data.map(s => ({
        ...s,
        collegeName: s.colleges?.name,
        feesPaid: s.fees_paid || 0,
        parentName: s.parent_name || '',
        parentPhone: s.parent_phone || '',
        studentPhone: s.student_phone || '',
        collegeId: s.college_id || null,
        portal_enabled: s.portal_enabled ?? true,
        portal_password: s.portal_password || 'yash123',
        subjectIds: s.student_subjects ? s.student_subjects.map(ss => ss.subject_id) : []
      }));
      setStudents(formatted);
    }
    setLoading(false);
  };

  const fetchPerformance = async (id) => {
    const { data } = await supabase
      .from('student_performance')
      .select('*')
      .eq('student_id', id)
      .order('date', { ascending: true });
    if (data) setPerformanceData(data);
  };

  const fetchDocuments = async (id) => {
    const { data } = await supabase
      .from('student_documents')
      .select('*')
      .eq('student_id', id);
    if (data) setDocuments(data);
  };

  const fetchNextStudentId = async (standard) => {
    if (!standard) return;
    try {
      // Logic to find the highest ID for this standard and increment
      const { data } = await supabase
        .from('students')
        .select('id')
        .eq('standard', standard)
        .order('id', { ascending: false })
        .limit(1);

      let nextNum = null;
      const currentYear = new Date().getFullYear();
      
      if (data && data.length > 0) {
        const lastId = data[0].id;
        const matches = lastId.match(/\d+$/);
        if (matches) nextNum = parseInt(matches[0]) + 1;
      }
      
      if (!nextNum) {
        nextNum = parseInt(`${currentYear}001`);
      }
      
      const newId = `${standard}${nextNum}`;
      setFormData(prev => ({ ...prev, id: newId }));
    } catch (e) {
      console.error('Failed to generate next student ID', e);
    }
  };

  const handleSaveStudent = async () => {
    if (!formData.id || !formData.name) return alert('ID and Name are required');
    
    // In Supabase, we can upsert
    const studentData = {
      id: formData.id,
      name: formData.name,
      standard: formData.standard,
      fees_paid: formData.feesPaid,
      balance: formData.balance,
      concession: formData.concession,
      status: formData.status,
      parent_name: formData.parentName,
      parent_phone: formData.parentPhone,
      student_phone: formData.studentPhone,
      email: formData.email,
      address: formData.address,
      college_id: formData.collegeId ? Number(formData.collegeId) : null,
      installments: formData.installments,
      portal_enabled: formData.portal_enabled,
      portal_password: formData.portal_password
    };

    const { error } = await supabase
      .from('students')
      .upsert(studentData);

    if (error) {
      alert('Error saving student: ' + error.message);
    } else {
      // 1. Delete existing subjects for this student
      await supabase.from('student_subjects').delete().eq('student_id', formData.id);
      
      // 2. Insert new subject selections
      if (formData.subjectIds && formData.subjectIds.length > 0) {
        const subInserts = formData.subjectIds.map(sid => ({
          student_id: formData.id,
          subject_id: sid
        }));
        await supabase.from('student_subjects').insert(subInserts);
      }

      setShowModal(false);
      fetchStudents();
    }
  };

  const handleFileUpload = async (id, type, file, docName = '') => {
    if (!file) return;
    
    try {
      setLoading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${id}-${Math.random()}.${fileExt}`;
      const bucket = type === 'photo' ? 'student-photos' : 'student-documents';
      const filePath = `${fileName}`;

      let { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);

      if (type === 'photo') {
        const { error: updateError } = await supabase
          .from('students')
          .update({ photo: publicUrl })
          .eq('id', id);
        
        if (updateError) throw updateError;
        alert('Photo updated successfully!');
        fetchStudents();
        if (showProfile) setShowProfile(prev => ({...prev, photo: publicUrl}));
      } else {
        const { error: insertError } = await supabase
          .from('student_documents')
          .insert({ 
            student_id: id, 
            name: docName || file.name, 
            file_url: publicUrl,
            upload_date: new Date().toISOString()
          });
          
        if (insertError) throw insertError;
        alert('Document uploaded successfully!');
        fetchDocuments(id);
      }
    } catch (error) {
      alert('Error uploading file: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this record?')) return;
    const { error } = await supabase
      .from('students')
      .delete()
      .eq('id', id);
    
    if (error) {
      alert('Error deleting: ' + error.message);
    } else {
      fetchStudents();
    }
  };

  const recalculateBalance = (subjectIds, concession, feesPaid) => {
    const totalFees = subjectIds.reduce((sum, id) => {
      const sub = subjects.find(x => x.id === id);
      return sum + (sub?.fees || 0);
    }, 0);
    return totalFees - (Number(concession) || 0) - (Number(feesPaid) || 0);
  };

  const filteredStudents = students
    .filter(s => {
      const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            (s.id && s.id.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesCollege = collegeFilter ? s.collegeId === Number(collegeFilter) : true;
      const matchesStandard = standardFilter ? s.standard === standardFilter : true;
      return matchesSearch && matchesCollege && matchesStandard;
    })
    .sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'id') return a.id.localeCompare(b.id);
      return 0;
    });

  const exportToCSV = () => {
    const headers = ['Student ID', 'Name', 'Standard', 'School/College Name', 'Parent Name', 'Parent Phone', 'Student Phone', 'Fees Paid', 'Balance', 'Status', 'Address'];
    const csvRows = [headers.join(',')];
    filteredStudents.forEach(s => {
      const row = [
        s.id,
        `"${s.name}"`,
        `"${s.standard}"`,
        `"${s.collegeName || ''}"`,
        `"${s.parentName || ''}"`,
        `"${s.parentPhone || ''}"`,
        `"${s.studentPhone || ''}"`,
        s.feesPaid,
        s.balance,
        `"${s.status}"`,
        `"${(s.address || '').replace(/"/g, '""')}"`
      ];
      csvRows.push(row.join(','));
    });
    
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Yashashrri_Students_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Student Management</h1>
          <p className="page-subtitle">Manage records, performance, and communication</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'flex-end' }} className="no-print">
          <button className="btn-secondary" onClick={() => setShowTransitionModal(true)}><FiTrendingUp /> Bulk Promote</button>
          <button className="btn-secondary" onClick={exportToCSV}><FiDownload /> Export CSV</button>
          <button className="btn-secondary" onClick={() => { setPrintMode('idcards'); setTimeout(() => window.print(), 50); }}><FiCreditCard /> Print ID Cards</button>
          <button className="btn-secondary" onClick={() => { setPrintMode('directory'); setTimeout(() => window.print(), 50); }}><FiPrinter /> Print Directory</button>
          <button className="btn-primary" onClick={() => { setEditMode(false); setFormData({ id: '', name: '', standard: '', feesPaid: 0, balance: 0, concession: 0, status: 'Active', subjectIds: [], photo: null, parentName: '', parentPhone: '', studentPhone: '', email: '', address: '', collegeId: '', installments: 1, portal_enabled: true, portal_password: 'yash123' }); setShowModal(true); }}>Add Student</button>
        </div>
      </div>

      <div className="card-base no-print" style={{ display: 'flex', gap: '0.75rem', padding: '1rem', marginBottom: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <div className="search-bar" style={{ backgroundColor: 'var(--bg-main)', flex: 1, minWidth: '100%', marginBottom: '0.5rem' }}>
          <FiSearch style={{ color: 'var(--text-secondary)' }} />
          <input type="text" className="search-input" placeholder="Search students..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        
        <div style={{ display: 'flex', gap: '0.5rem', width: '100%' }}>
          <select value={collegeFilter} onChange={(e) => setCollegeFilter(e.target.value)} style={{ flex: 1, padding: '0.6rem', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-main)', fontSize: '0.8rem' }}>
             <option value="">All Schools/Colleges</option>
             {colleges.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>

          <select value={standardFilter} onChange={(e) => setStandardFilter(e.target.value)} style={{ flex: 1, padding: '0.6rem', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-main)', fontSize: '0.8rem' }}>
             <option value="">All Classes</option>
             {standards.map(s => <option key={s.id} value={s.standard}>{s.standard}</option>)}
          </select>
        </div>
      </div>

      <div className="card-base no-print" style={{ flex: 1, overflow: 'auto', padding: 0, background: 'transparent', border: 'none', boxShadow: 'none' }}>
        {/* Desktop Table */}
        <div className="desktop-only card-base" style={{ padding: 0 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '2px solid var(--border-color)', backgroundColor: 'var(--bg-main)' }}>
                <th style={{ padding: '1rem' }}>Student Details</th>
                <th style={{ padding: '1rem' }}>Parent Contact</th>
                <th style={{ padding: '1rem' }}>Standard</th>
                <th style={{ padding: '1rem' }}>School/College</th>
                <th style={{ padding: '1rem', textAlign: 'right' }}>Balance</th>
                <th style={{ padding: '1rem', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map(s => (
                <tr key={s.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                     <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--bg-main)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {s.photo ? <img src={`${s.photo}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <FiUser size={20} color="#cbd5e1" />}
                     </div>
                     <div>
                       <div style={{ fontWeight: 600 }}>{s.name}</div>
                       <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>ID: {s.id}</div>
                     </div>
                  </td>
                  <td style={{ padding: '1rem' }}>
                     <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{s.parentName || 'N/A'}</div>
                     <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span><FiPhone size={10} /> {s.parentPhone || 'N/A'}</span>
                     </div>
                  </td>
                  <td style={{ padding: '1rem' }}>{s.standard}</td>
                  <td style={{ padding: '1rem', fontSize: '0.85rem' }}>{s.collegeName || 'N/A'}</td>
                  <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 700, color: s.balance > 0 ? 'var(--danger-red)' : 'var(--success-green)' }}>₹{s.balance.toLocaleString()}</td>
                  <td style={{ padding: '1rem', textAlign: 'center' }}>
                     <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
                        <button className="btn-secondary" style={{ padding: '0.4rem' }} onClick={() => setShowProfile(s)}><FiTrendingUp /></button>
                        <button className="btn-secondary" style={{ padding: '0.4rem' }} onClick={() => { setFormData({...s, subjectIds: s.subjectIds || []}); setEditMode(true); setShowModal(true); }}><FiEdit2 /></button>
                        <button className="btn-secondary" style={{ padding: '0.4rem', color: 'var(--danger-red)' }} onClick={() => handleDelete(s.id)}><FiTrash2 /></button>
                     </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="mobile-only">
          {filteredStudents.map(s => (
            <div key={s.id} className="card-base" style={{ padding: '1rem', marginBottom: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ width: '50px', height: '50px', borderRadius: '12px', backgroundColor: 'var(--bg-main)', overflow: 'hidden', flexShrink: 0 }}>
                  {s.photo ? <img src={`${s.photo}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <FiUser size={24} color="#cbd5e1" style={{ margin: '13px' }} />}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--primary-blue)' }}>{s.name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>ID: {s.id} • {s.standard}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Balance</div>
                  <div style={{ fontWeight: 800, color: s.balance > 0 ? 'var(--danger-red)' : 'var(--success-green)' }}>₹{s.balance.toLocaleString()}</div>
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '0.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
                <button className="btn-secondary" style={{ flex: 1, fontSize: '0.75rem', padding: '0.5rem' }} onClick={() => setShowProfile(s)}><FiTrendingUp /> Profile</button>
                <button className="btn-secondary" style={{ flex: 1, fontSize: '0.75rem', padding: '0.5rem' }} onClick={() => { setFormData({...s, subjectIds: s.subjectIds || []}); setEditMode(true); setShowModal(true); }}><FiEdit2 /> Edit</button>
                {s.parentPhone && (
                  <a href={`tel:${s.parentPhone}`} className="btn-secondary" style={{ flex: 1, fontSize: '0.75rem', padding: '0.5rem', justifyContent: 'center' }}><FiPhone /> Call</a>
                )}
              </div>
            </div>
          ))}
          {filteredStudents.length === 0 && <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>No students found matching your filters.</div>}
        </div>
      </div>

      {/* Enroll Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="card-base" style={{ width: '100%', maxWidth: '750px', padding: '2rem', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '1.5rem', color: 'var(--primary-blue)' }}>{editMode ? 'Update Student Record' : 'Enroll New Student'}</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'transparent' }}><FiX size={24} /></button>
            </div>
            
            <div className="responsive-grid" style={{ gridTemplateColumns: '1.5fr 1fr' }}>
               {/* Left Column: Core Data */}
               <div>
                  <div style={{ borderBottom: '1px solid var(--border-color)', marginBottom: '1rem', paddingBottom: '0.5rem', fontWeight: 700, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>ACADEMIC & PERSONAL</div>
                  <div className="responsive-grid-2col" style={{ gap: '1rem' }}>
                    <div className="input-group">
                      <label>Full Name</label>
                      <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                    </div>
                    <div className="input-group">
                      <label>Student ID</label>
                      <input type="text" value={formData.id} onChange={e => setFormData({...formData, id: e.target.value})} disabled={editMode} />
                    </div>
                    <div className="input-group">
                      <label>Standard</label>
                      <select 
                        value={formData.standard} 
                        onChange={async e => {
                          const val = e.target.value;
                          setFormData(prev => ({...prev, standard: val}));
                          // Only auto-generate ID when adding a new student (id is empty)
                          if (!editMode) {
                            await fetchNextStudentId(val);
                          }
                        }}
                      >
                        <option value="">Select...</option>
                        {standards.map(s => <option key={s.id} value={s.standard}>{s.standard}</option>)}
                      </select>
                    </div>
                    <div className="input-group">
                      <label>School/College Name</label>
                      <select 
                        value={formData.collegeId || ''} 
                        onChange={e => setFormData({...formData, collegeId: e.target.value})}
                      >
                        <option value="">No School/College</option>
                        {colleges.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                    <div className="input-group">
                      <label>Parent/Guardian Name</label>
                      <input type="text" value={formData.parentName} onChange={e => setFormData({...formData, parentName: e.target.value})} />
                    </div>
                    <div className="input-group">
                      <label>Parent Alert Phone</label>
                      <input type="text" value={formData.parentPhone} onChange={e => setFormData({...formData, parentPhone: e.target.value})} />
                    </div>
                    <div className="input-group">
                      <label>Student Phone</label>
                      <input type="text" value={formData.studentPhone} onChange={e => setFormData({...formData, studentPhone: e.target.value})} />
                    </div>
                  </div>

                  <div style={{ borderBottom: '1px solid var(--border-color)', margin: '1.5rem 0 1rem 0', paddingBottom: '0.5rem', fontWeight: 700, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>STUDENT PORTAL AUTHENTICATION</div>
                  <div className="responsive-grid-2col" style={{ gap: '1rem' }}>
                    <div className="input-group">
                      <label>Portal Access</label>
                      <select value={formData.portal_enabled ? 'true' : 'false'} onChange={e => setFormData({...formData, portal_enabled: e.target.value === 'true'})}>
                        <option value="true">Enabled</option>
                        <option value="false">Disabled / Revoked</option>
                      </select>
                    </div>
                    <div className="input-group">
                      <label>Portal Password</label>
                      <input type="text" value={formData.portal_password || 'yash123'} onChange={e => setFormData({...formData, portal_password: e.target.value})} placeholder="Set portal password" />
                    </div>
                  </div>

                  <div style={{ marginTop: '1.5rem' }} className="input-group">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                       <label style={{ margin: 0 }}>Select Enrolled Subjects</label>
                       <div className="search-bar" style={{ backgroundColor: 'var(--bg-main)', border: '1px solid var(--border-color)', padding: '0.2rem', width: '200px' }}>
                         <FiSearch style={{ color: 'var(--text-secondary)', marginLeft: '10px' }} />
                         <input 
                           type="text" 
                           className="search-input" 
                           placeholder="Filter subjects..." 
                           value={subjectSearch} 
                           onChange={e => setSubjectSearch(e.target.value)} 
                           style={{ fontSize: '0.75rem' }}
                         />
                       </div>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', maxHeight: '150px', overflowY: 'auto', padding: '0.75rem', border: '1px solid var(--border-color)', borderRadius: '8px', backgroundColor: 'var(--bg-main)' }}>
                      {subjects.filter(s => s.name.toLowerCase().includes(subjectSearch.toLowerCase())).map(s => {
                        const isSelected = formData.subjectIds.includes(s.id);
                        return (
                          <button
                            key={s.id}
                            type="button"
                            onClick={(e) => {
                               e.preventDefault();
                               const newIds = isSelected 
                                 ? formData.subjectIds.filter(idx => idx !== s.id)
                                 : [...formData.subjectIds, s.id];
                               setFormData({
                                 ...formData, 
                                 subjectIds: newIds, 
                                 balance: recalculateBalance(newIds, formData.concession, formData.feesPaid)
                               });
                            }}
                            style={{
                              padding: '0.4rem 0.8rem',
                              borderRadius: '50px',
                              border: `1px solid ${isSelected ? 'var(--primary-blue)' : 'var(--border-color)'}`,
                              backgroundColor: isSelected ? 'var(--primary-blue)' : '#ffffff',
                              color: isSelected ? '#ffffff' : 'var(--text-primary)',
                              fontSize: '0.8rem',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.4rem',
                              transition: 'all 0.2s',
                              boxShadow: isSelected ? '0 2px 4px rgba(37,99,235,0.2)' : 'none'
                            }}
                          >
                            <span style={{ fontWeight: isSelected ? 600 : 400 }}>{s.name}</span>
                            <span style={{ fontSize: '0.7rem', opacity: isSelected ? 0.9 : 0.6 }}>₹{s.fees}</span>
                            {isSelected && <FiCheckCircle size={14} />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
               </div>

               {/* Right Column: Fees & Finance */}
               <div style={{ backgroundColor: 'var(--bg-main)', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
                  <div style={{ marginBottom: '1.5rem', fontWeight: 700, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>FEE SUMMARY</div>
                  
                  <div className="input-group">
                    <label>Applicable Concession (₹)</label>
                    <input type="number" value={formData.concession} onChange={e => setFormData({...formData, concession: Number(e.target.value), balance: recalculateBalance(formData.subjectIds, e.target.value, formData.feesPaid)})} />
                  </div>
                  
                  <div className="input-group">
                    <label>Total Fees Paid (₹)</label>
                    <input type="number" value={formData.feesPaid} disabled style={{ backgroundColor: 'var(--bg-main)', cursor: 'not-allowed', opacity: 0.7 }} title="Use the Fees Section to process payments and refunds." />
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>* Manage payments tightly via the Fees Section.</span>
                  </div>

                  <div className="input-group">
                    <label>Expected Installments</label>
                    <input type="number" min="1" max="12" value={formData.installments || 1} onChange={e => setFormData({...formData, installments: Number(e.target.value)})} />
                  </div>

                  <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '2px dashed var(--border-color)' }}>
                     <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Total Outstanding Balance</p>
                     <h2 style={{ fontSize: '2rem', color: formData.balance < 0 ? 'var(--success-green)' : 'var(--danger-red)', fontWeight: 800 }}>
                        {formData.balance < 0 ? `+ ₹${Math.abs(formData.balance).toLocaleString()} (Credit)` : `₹${formData.balance.toLocaleString()}`}
                     </h2>
                     {formData.balance < 0 && (
                        <p style={{ color: 'var(--danger-red)', fontSize: '0.85rem', marginTop: '0.75rem', fontWeight: 600, padding: '0.5rem', backgroundColor: '#fee2e2', borderRadius: '4px' }}>
                           Warning: Overpaid by ₹{Math.abs(formData.balance).toLocaleString()} (Subject removed). Please go to the Fees section to issue a refund.
                        </p>
                     )}
                  </div>

                  <div className="input-group" style={{ marginTop: '1.5rem' }}>
                    <label>Account Status</label>
                    <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                      <option value="Active">Active</option>
                      <option value="Defaulter">Defaulter</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
               </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
               <button className="btn-secondary" onClick={() => setShowModal(false)} style={{ padding: '0.75rem 2.5rem' }}>Discard</button>
               <button className="btn-primary" onClick={handleSaveStudent} style={{ padding: '0.75rem 2.5rem' }}>{editMode ? 'Update Record' : 'Complete Enrollment'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Detailed Profile Modal... (remains as is) */}
      {showProfile && (
        <div className="modal-overlay">
          <div className="card-base" style={{ width: '100%', maxWidth: '850px', padding: '2.5rem', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2.5rem' }}>
              <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
                 <div style={{ position: 'relative' }}>
                    <div style={{ width: '100px', height: '100px', borderRadius: '16px', backgroundColor: 'var(--bg-main)', overflow: 'hidden', border: '4px solid white', boxShadow: 'var(--shadow-md)' }}>
                       {showProfile.photo ? <img src={`${showProfile.photo}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <FiUser size={40} color="#cbd5e1" style={{ margin: '30px' }} />}
                    </div>
                    <label style={{ position: 'absolute', bottom: '-5px', right: '-5px', backgroundColor: 'var(--primary-blue)', color: 'white', padding: '8px', borderRadius: '50%', cursor: 'pointer', boxShadow: 'var(--shadow-sm)' }}>
                       <FiUpload size={14} />
                       <input type="file" style={{ display: 'none' }} onChange={(e) => handleFileUpload(showProfile.id, 'photo', e.target.files[0])} />
                    </label>
                 </div>
                 <div>
                    <h1 style={{ fontSize: '1.75rem', marginBottom: '0.4rem' }}>{showProfile.name}</h1>
                    <div style={{ display: 'flex', gap: '1rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                       <span><strong>Standard:</strong> {showProfile.standard}</span>
                       <span><strong>School/College:</strong> {showProfile.collegeName || 'N/A'}</span>
                       <span><strong>ID:</strong> {showProfile.id}</span>
                    </div>
                 </div>
              </div>
              <button onClick={() => setShowProfile(null)} style={{ background: 'transparent' }}><FiX size={28} /></button>
            </div>

            <div className="responsive-grid-2col">
               <div>
                  <div style={{ backgroundColor: 'var(--bg-main)', borderRadius: '16px', padding: '1.5rem', marginBottom: '2rem' }}>
                     <h3 style={{ fontSize: '1.1rem', marginBottom: '1.25rem', color: 'var(--primary-blue)' }}>Contact Information</h3>
                     <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                           <div style={{ padding: '0.5rem', backgroundColor: 'white', borderRadius: '8px' }}><FiUser size={16} /></div>
                           <div>
                              <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Parent Name</p>
                              <p style={{ fontWeight: 600 }}>{showProfile.parentName || 'Not Set'}</p>
                           </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                           <div style={{ padding: '0.5rem', backgroundColor: 'white', borderRadius: '8px' }}><FiPhone size={16} /></div>
                           <div>
                              <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Parent Phone (Alerts)</p>
                              <p style={{ fontWeight: 600 }}>{showProfile.parentPhone || 'Not Set'}</p>
                           </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                           <div style={{ padding: '0.5rem', backgroundColor: 'white', borderRadius: '8px' }}><FiMail size={16} /></div>
                           <div>
                              <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Email</p>
                              <p style={{ fontWeight: 600 }}>{showProfile.email || 'Not Set'}</p>
                           </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                           <div style={{ padding: '0.5rem', backgroundColor: 'white', borderRadius: '8px' }}><FiMapPin size={16} /></div>
                           <div>
                              <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Address</p>
                              <p style={{ fontWeight: 600, fontSize: '0.85rem' }}>{showProfile.address || 'Not Set'}</p>
                           </div>
                        </div>
                     </div>
                  </div>

                  <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}><FiFile /> Documents</h3>
                  <div style={{ border: '2px dashed var(--border-color)', borderRadius: '16px', padding: '1.25rem' }}>
                      <input 
                        type="file" 
                        id="doc-upload" 
                        style={{ display: 'none' }} 
                        onChange={(e) => {
                          const file = e.target.files[0];
                          if (file) {
                            const docName = prompt('Enter document name:', file.name);
                            if (docName !== null) {
                              handleFileUpload(showProfile.id, 'document', file, docName);
                            }
                          }
                        }} 
                      />
                     <button className="btn-secondary" style={{ width: '100%', marginBottom: '1rem' }} onClick={() => document.getElementById('doc-upload').click()}><FiUpload /> Upload New Attachment</button>
                     <div style={{ maxHeight: '150px', overflowY: 'auto' }}>
                        {documents.map(doc => (
                           <div key={doc.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', backgroundColor: 'var(--bg-main)', borderRadius: '10px', marginBottom: '0.5rem' }}>
                              <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{doc.name}</span>
                              <a href={`${doc.file_url}`} target="_blank" rel="noreferrer" style={{ color: 'var(--primary-blue)' }}><FiExternalLink /></a>
                           </div>
                        ))}
                     </div>
                  </div>
               </div>

               <div>
                  <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}><FiTrendingUp /> Academic Journey</h3>
                  <div style={{ height: '250px', backgroundColor: 'var(--bg-main)', borderRadius: '16px', padding: '1.5rem' }}>
                     {performanceData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                           <LineChart data={performanceData}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                              <XAxis dataKey="date" hide />
                              <YAxis domain={[0, 100]} fontSize={10} tickFormatter={(val) => `${val}%`} />
                              <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: 'var(--shadow-md)' }} />
                              <Line type="monotone" dataKey="score" stroke="var(--primary-blue)" strokeWidth={4} dot={{ r: 6, fill: 'var(--primary-blue)', strokeWidth: 2, stroke: 'white' }} />
                           </LineChart>
                        </ResponsiveContainer>
                     ) : (
                        <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>No progression data yet</div>
                     )}
                  </div>
                  
                  <div style={{ marginTop: '2rem', padding: '1.25rem', backgroundColor: 'var(--accent-gold-light)', borderRadius: '16px', border: '1px solid var(--accent-gold)' }}>
                     <h3 style={{ fontSize: '0.9rem', color: 'var(--dark-gold)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Financial Summary</h3>
                     <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <div>
                           <p style={{ fontSize: '0.75rem' }}>Total Paid</p>
                           <p style={{ fontSize: '1.25rem', fontWeight: 800 }}>₹{showProfile.feesPaid.toLocaleString()}</p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                           <p style={{ fontSize: '0.75rem' }}>Remaining Arrears</p>
                           <p style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--danger-red)' }}>₹{showProfile.balance.toLocaleString()}</p>
                        </div>
                     </div>
                  </div>
               </div>
            </div>
          </div>
        </div>
      )}

      {showTransitionModal && (
        <BulkPromotionModal 
           onClose={() => setShowTransitionModal(false)}
           standards={standards}
           students={students}
           onSuccess={() => { setShowTransitionModal(false); fetchStudents(); }}
        />
      )}

      {/* Printable Area - Controlled by printMode state */}
      <div className="print-only" style={{ padding: '2rem', color: '#000' }}>
        {printMode === 'directory' && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: '2rem', borderBottom: '2px solid #000', paddingBottom: '1rem' }}>
               <img src="/logo.png" alt="Yashashrri Logo" style={{ maxWidth: '450px', height: 'auto' }} onError={(e) => { e.target.style.display = 'none'; }} />
               <p style={{ margin: '1rem 0 0.2rem 0', fontSize: '0.75rem', color: '#333', lineHeight: '1.5', whiteSpace: 'nowrap' }}>
                 Main Br: "Shree Ekveera Prasad", Vaidya Colony, Nr. Axis bank ATM, Talegaon Dabhade, PUNE - 410506<br />
                 Branch 2: Silverwinds, C2, Dnyaneshwar Nagar, Nr. Jijamata Chowk, Talegaon Dabhade, PUNE - 410506
               </p>
               <h3 style={{ marginTop: '1.5rem', textDecoration: 'underline', textTransform: 'uppercase', fontSize: '1.2rem' }}>Student Directory Report {searchTerm && `(Filtered: ${searchTerm})`}</h3>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.95rem' }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '2px solid #000', backgroundColor: '#f3f4f6' }}>
                  <th style={{ padding: '0.75rem', border: '1px solid #ccc' }}>Student Name</th>
                  <th style={{ padding: '0.75rem', border: '1px solid #ccc' }}>Standard</th>
                  <th style={{ padding: '0.75rem', border: '1px solid #ccc' }}>Student Phone</th>
                  <th style={{ padding: '0.75rem', border: '1px solid #ccc' }}>Parent Name</th>
                  <th style={{ padding: '0.75rem', border: '1px solid #ccc' }}>Parent Phone</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.length > 0 ? filteredStudents.map(s => (
                  <tr key={s.id} style={{ borderBottom: '1px solid #ddd' }}>
                     <td style={{ padding: '0.6rem', border: '1px solid #ccc', fontWeight: 600 }}>{s.name}</td>
                     <td style={{ padding: '0.6rem', border: '1px solid #ccc' }}>{s.standard}</td>
                     <td style={{ padding: '0.6rem', border: '1px solid #ccc' }}>{s.studentPhone || 'N/A'}</td>
                     <td style={{ padding: '0.6rem', border: '1px solid #ccc' }}>{s.parentName || 'N/A'}</td>
                     <td style={{ padding: '0.6rem', border: '1px solid #ccc' }}>{s.parentPhone || 'N/A'}</td>
                  </tr>
                )) : (
                  <tr><td colSpan="5" style={{ padding: '1rem', textAlign: 'center', border: '1px solid #ccc' }}>No students found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        
        {printMode === 'idcards' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem', pageBreakInside: 'avoid' }}>
            {filteredStudents.map(s => (
              <div key={s.id} style={{ border: '2px solid #1A237E', borderRadius: '12px', padding: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', height: '350px', backgroundColor: '#fff', pageBreakInside: 'avoid', overflow: 'hidden' }}>
                <div style={{ width: '100%', borderBottom: '2px solid #D4AF37', paddingBottom: '0.5rem', textAlign: 'center', marginBottom: '1rem' }}>
                  <img src="/logo.png" alt="Yashashrri Logo" style={{ maxHeight: '40px' }} onError={(e) => { e.target.style.display = 'none'; }} />
                  <div style={{ fontSize: '0.65rem', color: '#64748B', marginTop: '0.2rem', fontWeight: 600 }}>BUILDING BRIDGES TO SUCCESS</div>
                </div>
                
                <div style={{ width: '90px', height: '110px', backgroundColor: '#f1f5f9', border: '2px solid #1A237E', borderRadius: '8px', overflow: 'hidden', marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {s.photo ? <img src={`${s.photo}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ color: '#aaa', fontSize: '0.7rem' }}>Photo</span>}
                </div>
                
                <h3 style={{ margin: '0 0 0.25rem 0', color: '#1A237E', fontSize: '1.2rem', textTransform: 'uppercase', textAlign: 'center' }}>{s.name}</h3>
                <div style={{ backgroundColor: '#1A237E', color: '#fff', padding: '0.2rem 1rem', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '1rem' }}>{s.standard}</div>
                
                <div style={{ width: '100%', display: 'grid', gridTemplateColumns: '80px 1fr', gap: '0.25rem', fontSize: '0.8rem', color: '#333' }}>
                  <div style={{ fontWeight: 'bold', color: '#64748B' }}>ID No:</div><div>{s.id}</div>
                  <div style={{ fontWeight: 'bold', color: '#64748B' }}>Contact:</div><div>{s.parentPhone || s.studentPhone || 'N/A'}</div>
                </div>
                
                <div style={{ position: 'absolute', bottom: '1.3rem', right: '1rem', textAlign: 'center' }}>
                  <div style={{ borderBottom: '1px solid #000', width: '80px', height: '30px' }}></div>
                  <div style={{ fontSize: '0.6rem', marginTop: '0.2rem', fontWeight: 'bold' }}>Principal</div>
                </div>
                
                <div style={{ position: 'absolute', bottom: '0', left: '0', width: '100%', backgroundColor: '#1A237E', height: '12px' }}></div>
              </div>
            ))}
            {filteredStudents.length === 0 && <p style={{ gridColumn: 'span 2', textAlign: 'center' }}>No students available in this filter.</p>}
          </div>
        )}
      </div>

    </div>
  );
};

const BulkPromotionModal = ({ onClose, standards, students, onSuccess }) => {
  const [fromStd, setFromStd] = useState('');
  const [toStd, setToStd] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const eligibleCount = students.filter(s => s.standard === fromStd && s.status === 'Active').length;

  const handlePromote = async () => {
    if (!fromStd || !toStd) return alert("Select both source and target standards.");
    if (fromStd === toStd) return alert("Source and Target standard cannot be the same.");
    if (eligibleCount === 0) return alert("No active students found in the selected standard.");
    
    if (!window.confirm(`WARNING: You are about to irrevocably transfer ${eligibleCount} students from ${fromStd} to ${toStd}. Are you absolutely sure?`)) return;

    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from('students')
        .update({ standard: toStd })
        .eq('standard', fromStd)
        .eq('status', 'Active');

      if (error) {
        alert('Promotion failed: ' + error.message);
      } else {
        alert(`Success! ${eligibleCount} students have been successfully promoted to ${toStd}.`);
        onSuccess();
      }
    } catch (e) {
      alert('Error: ' + e.message);
    }
    setIsProcessing(false);
  };

  return (
    <div className="modal-overlay no-print">
      <div className="card-base" style={{ width: '100%', maxWidth: '500px', padding: '2rem', backgroundColor: 'var(--bg-surface)' }}>
         <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.25rem', color: 'var(--primary-blue)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FiTrendingUp /> Academic Promotion Tool
            </h2>
            <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: 'var(--text-secondary)' }}><FiX /></button>
         </div>
         
         <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
           Easily move an entire batch of active students from one standard to another at the end of the academic year.
         </p>

         <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
            <div className="input-group">
               <label>From Previous Standard</label>
               <select value={fromStd} onChange={e => setFromStd(e.target.value)}>
                 <option value="">Select standard...</option>
                 {standards.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
               </select>
            </div>
            <div className="input-group">
               <label>Promote To Standard</label>
               <select value={toStd} onChange={e => setToStd(e.target.value)}>
                 <option value="">Select standard...</option>
                 {standards.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
               </select>
            </div>
         </div>

         {fromStd && (
           <div style={{ padding: '1rem', backgroundColor: eligibleCount > 0 ? '#eff6ff' : '#fee2e2', borderRadius: '8px', border: `1px solid ${eligibleCount > 0 ? '#bfdbfe' : '#fecaca'}`, marginBottom: '1.5rem', textAlign: 'center', color: eligibleCount > 0 ? 'var(--primary-blue)' : 'var(--danger-red)' }}>
             <strong style={{ fontSize: '1.1rem' }}>{eligibleCount}</strong> active students found in {fromStd}
           </div>
         )}

         <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
            <button className="btn-secondary" onClick={onClose}>Cancel</button>
            <button className="btn-primary" onClick={handlePromote} disabled={isProcessing || eligibleCount === 0 || !toStd}>
              {isProcessing ? 'Processing...' : 'Execute Promotion'}
            </button>
         </div>
      </div>
    </div>
  );
};

export default StudentManagement;
