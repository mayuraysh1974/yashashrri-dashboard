import React, { useState, useEffect } from 'react';
import { FiPlus, FiEdit2, FiTrash2, FiX } from 'react-icons/fi';
import { supabase } from '../supabaseClient';

const StandardMaster = () => {
  const [standards, setStandards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({ id: null, standard: '' });

  useEffect(() => {
    fetchStandards();
  }, []);

  const fetchStandards = async () => {
    const { data, error } = await supabase.from('standards').select('*').order('standard', { ascending: true });
    if (!error) setStandards(data || []);
    setLoading(false);
  };

  const handleSave = async () => {
    if (!formData.standard) return alert('Standard Name is required');
    let error;
    if (editMode) {
      ({ error } = await supabase.from('standards').update({ standard: formData.standard }).eq('id', formData.id));
    } else {
      ({ error } = await supabase.from('standards').insert({ standard: formData.standard }));
    }
    if (error) {
      alert('Failed to save standard: ' + error.message);
    } else {
      setShowModal(false);
      setEditMode(false);
      setFormData({ id: null, standard: '' });
      fetchStandards();
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this standard? It will affect linked student records.')) return;
    const { error } = await supabase.from('standards').delete().eq('id', id);
    if (!error) fetchStandards();
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Standard Master</h1>
          <p className="page-subtitle">Define the academic classes and standards offered</p>
        </div>
        <button className="btn-primary" onClick={() => { setEditMode(false); setFormData({ id: null, standard: '' }); setShowModal(true); }}>
          <FiPlus /> New Standard
        </button>
      </div>

      <div className="card-base" style={{ overflow: 'auto', flex: 1 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ backgroundColor: 'var(--bg-main)', borderBottom: '2px solid var(--border-color)' }}>
              <th style={{ padding: '1rem', color: 'var(--primary-blue)', fontWeight: 600 }}>Standard / Class Name</th>
              <th style={{ padding: '1rem', textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="2" style={{ padding: '2rem', textAlign: 'center' }}>Loading...</td></tr>
            ) : standards.map((s) => (
              <tr key={s.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td style={{ padding: '1rem', fontWeight: 600 }}>{s.standard}</td>
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

      {showModal && (
        <div className="modal-overlay">
          <div className="card-base" style={{ width: '100%', maxWidth: '400px', padding: '1.5rem', backgroundColor: 'var(--bg-surface)', borderTop: '4px solid var(--accent-gold)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', color: 'var(--primary-blue)' }}>{editMode ? 'Edit Standard' : 'Add Standard'}</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'transparent', color: 'var(--text-secondary)', fontSize: '1.25rem', cursor: 'pointer', border: 'none' }}><FiX /></button>
            </div>
            
            <div className="input-group" style={{ marginBottom: '2rem' }}>
              <label>Standard / Class Name</label>
              <input type="text" placeholder="e.g. 10th / FY Eng / UPSC" value={formData.standard} onChange={e => setFormData({...formData, standard: e.target.value})} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
              <button className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={handleSave}>Save Standard</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StandardMaster;
