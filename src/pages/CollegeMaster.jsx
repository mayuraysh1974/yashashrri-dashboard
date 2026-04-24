import React, { useState, useEffect } from 'react';
import { FiPlus, FiEdit2, FiTrash2, FiX } from 'react-icons/fi';
import { supabase } from '../supabaseClient';

const CollegeMaster = () => {
  const [colleges, setColleges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({ id: null, name: '' });

  useEffect(() => {
    fetchColleges();
  }, []);

  const fetchColleges = async () => {
    const { data, error } = await supabase.from('colleges').select('*').order('name', { ascending: true });
    if (!error) setColleges(data || []);
    setLoading(false);
  };

  const handleSave = async () => {
    if (!formData.name) return alert('School/College Name is required');
    let error;
    if (editMode) {
      ({ error } = await supabase.from('colleges').update({ name: formData.name }).eq('id', formData.id));
    } else {
      ({ error } = await supabase.from('colleges').insert({ name: formData.name }));
    }
    if (error) {
      alert('Failed to save record: ' + error.message);
    } else {
      setShowModal(false);
      setEditMode(false);
      setFormData({ id: null, name: '' });
      fetchColleges();
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this record? It will clear the institutional link from all associated students.')) return;
    const { error } = await supabase.from('colleges').delete().eq('id', id);
    if (!error) fetchColleges();
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">School/College Master</h1>
          <p className="page-subtitle">Define the educational institutions associated with your students</p>
        </div>
        <button className="btn-primary" onClick={() => { setEditMode(false); setFormData({ id: null, name: '' }); setShowModal(true); }}>
          <FiPlus /> New School/College
        </button>
      </div>

      <div className="card-base" style={{ overflow: 'auto', flex: 1 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ backgroundColor: 'var(--bg-main)', borderBottom: '2px solid var(--border-color)' }}>
              <th style={{ padding: '1rem', color: 'var(--primary-blue)', fontWeight: 600 }}>School/College Name</th>
              <th style={{ padding: '1rem', textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="2" style={{ padding: '2rem', textAlign: 'center' }}>Loading...</td></tr>
            ) : colleges.map((c) => (
              <tr key={c.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td style={{ padding: '1rem', fontWeight: 600 }}>{c.name}</td>
                <td style={{ padding: '1rem', textAlign: 'center' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
                      <button onClick={() => { setFormData(c); setEditMode(true); setShowModal(true); }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--primary-blue)' }}><FiEdit2 /></button>
                      <button onClick={() => handleDelete(c.id)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--danger-red)' }}><FiTrash2 /></button>
                    </div>
                </td>
              </tr>
            ))}
            {colleges.length === 0 && !loading && (
              <tr><td colSpan="2" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No colleges added yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="card-base" style={{ width: '100%', maxWidth: '500px', padding: '1.5rem', backgroundColor: 'var(--bg-surface)', borderTop: '4px solid var(--accent-gold)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', color: 'var(--primary-blue)' }}>{editMode ? 'Edit School/College' : 'Add School/College'}</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'transparent', color: 'var(--text-secondary)', fontSize: '1.25rem', cursor: 'pointer', border: 'none' }}><FiX /></button>
            </div>
            
            <div className="input-group" style={{ marginBottom: '2rem' }}>
              <label>School/College Name</label>
              <input type="text" placeholder="e.g. Fergusson College" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
              <button className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={handleSave}>Save Record</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CollegeMaster;
