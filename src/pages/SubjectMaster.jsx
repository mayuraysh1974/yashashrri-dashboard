import React, { useState, useEffect } from 'react';
import { FiPlus, FiEdit2, FiTrash2, FiX, FiBook } from 'react-icons/fi';
import { supabase } from '../supabaseClient';

const SubjectMaster = () => {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({ id: null, name: '', fees: '' });

  useEffect(() => {
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {
    const { data, error } = await supabase.from('subjects').select('*').order('name', { ascending: true });
    if (!error) setSubjects(data || []);
    setLoading(false);
  };

  const handleSave = async () => {
    if (!formData.name || formData.fees === '') return alert('Name and Fees are required');
    const payload = { name: formData.name, fees: Number(formData.fees) };
    let error;
    if (editMode) {
      ({ error } = await supabase.from('subjects').update(payload).eq('id', formData.id));
    } else {
      ({ error } = await supabase.from('subjects').insert(payload));
    }
    if (error) {
      alert('Failed to save subject: ' + error.message);
    } else {
      setShowModal(false);
      setEditMode(false);
      setFormData({ id: null, name: '', fees: '' });
      fetchSubjects();
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this subject? It will affect linked student records.')) return;
    const { error } = await supabase.from('subjects').delete().eq('id', id);
    if (!error) fetchSubjects();
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Subject Master</h1>
          <p className="page-subtitle">Manage subjects and their individual fee structures</p>
        </div>
        <button className="btn-primary" onClick={() => { setEditMode(false); setFormData({ id: null, name: '', fees: '' }); setShowModal(true); }}>
          <FiPlus /> New Subject
        </button>
      </div>

      <div className="card-base" style={{ overflow: 'auto', flex: 1, padding: 0, background: 'transparent', border: 'none', boxShadow: 'none' }}>
        {/* Desktop Table */}
        <div className="desktop-only card-base" style={{ padding: 0 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--bg-main)', borderBottom: '2px solid var(--border-color)' }}>
                <th style={{ padding: '1rem', color: 'var(--primary-blue)', fontWeight: 600 }}>Subject Name</th>
                <th style={{ padding: '1rem', color: 'var(--primary-blue)', fontWeight: 600 }}>Standard Fees (₹)</th>
                <th style={{ padding: '1rem', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {subjects.map((s) => (
                <tr key={s.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '1rem', fontWeight: 600 }}>{s.name}</td>
                  <td style={{ padding: '1rem', color: 'var(--success-green)', fontWeight: 600 }}>₹{s.fees.toLocaleString()}</td>
                  <td style={{ padding: '1rem', textAlign: 'center' }}>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
                        <button onClick={() => { setFormData(s); setEditMode(true); setShowModal(true); }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--primary-blue)' }}><FiEdit2 /></button>
                        <button onClick={() => handleDelete(s.id)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--danger-red)' }}><FiTrash2 /></button>
                      </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="mobile-only">
           {subjects.map((s) => (
             <div key={s.id} className="card-base" style={{ padding: '1rem', marginBottom: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
               <div>
                 <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--primary-blue)' }}>{s.name}</div>
                 <div style={{ fontSize: '0.85rem', color: 'var(--success-green)', fontWeight: 700 }}>₹{s.fees.toLocaleString()}</div>
               </div>
               <div style={{ display: 'flex', gap: '0.5rem' }}>
                 <button className="btn-secondary" style={{ padding: '0.5rem' }} onClick={() => { setFormData(s); setEditMode(true); setShowModal(true); }}><FiEdit2 /></button>
                 <button className="btn-secondary" style={{ padding: '0.5rem', color: 'var(--danger-red)' }} onClick={() => handleDelete(s.id)}><FiTrash2 /></button>
               </div>
             </div>
           ))}
        </div>

        {loading && <div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>}
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="card-base" style={{ width: '100%', maxWidth: '400px', padding: '1.5rem', backgroundColor: 'var(--bg-surface)', borderTop: '4px solid var(--accent-gold)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', color: 'var(--primary-blue)' }}>{editMode ? 'Edit Subject' : 'Add New Subject'}</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'transparent', color: 'var(--text-secondary)', fontSize: '1.25rem', cursor: 'pointer', border: 'none' }}><FiX /></button>
            </div>
            
            <div className="input-group">
              <label>Subject Name</label>
              <input type="text" placeholder="e.g. Mathematics" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
            </div>

            <div className="input-group" style={{ marginBottom: '2rem' }}>
              <label>Subject Fee (₹)</label>
              <input type="number" placeholder="10000" value={formData.fees} onChange={e => setFormData({...formData, fees: e.target.value})} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
              <button className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={handleSave}>Save Subject</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubjectMaster;
