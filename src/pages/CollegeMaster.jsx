import React, { useState, useEffect } from 'react';
import { FiPlus, FiEdit2, FiTrash2, FiX } from 'react-icons/fi';

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
    const token = localStorage.getItem('token');
    const res = await fetch('/api/colleges', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) setColleges(await res.json());
    setLoading(false);
  };

  const handleSave = async () => {
    const token = localStorage.getItem('token');
    if (!formData.name) return alert('College Name is required');
    
    const url = editMode ? `/api/colleges/${formData.id}` : '/api/colleges';
    const method = editMode ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(formData)
      });
      
      if (res.ok) {
        setShowModal(false);
        setEditMode(false);
        setFormData({ id: null, name: '' });
        fetchColleges();
      } else {
        const err = await res.json();
        alert('Failed to save college: ' + (err.error || 'Server error'));
      }
    } catch (err) {
      alert('Network error. Is the server running?');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this college? It will clear the college link from all associated students.')) return;
    const token = localStorage.getItem('token');
    await fetch(`/api/colleges/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    fetchColleges();
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">College Master</h1>
          <p className="page-subtitle">Define the colleges associated with your students</p>
        </div>
        <button className="btn-primary" onClick={() => { setEditMode(false); setFormData({ id: null, name: '' }); setShowModal(true); }}>
          <FiPlus /> New College
        </button>
      </div>

      <div className="card-base" style={{ overflow: 'auto', flex: 1 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ backgroundColor: 'var(--bg-main)', borderBottom: '2px solid var(--border-color)' }}>
              <th style={{ padding: '1rem', color: 'var(--primary-blue)', fontWeight: 600 }}>College Name</th>
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
              <h2 style={{ fontSize: '1.25rem', color: 'var(--primary-blue)' }}>{editMode ? 'Edit College' : 'Add College'}</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'transparent', color: 'var(--text-secondary)', fontSize: '1.25rem', cursor: 'pointer', border: 'none' }}><FiX /></button>
            </div>
            
            <div className="input-group" style={{ marginBottom: '2rem' }}>
              <label>College Name</label>
              <input type="text" placeholder="e.g. Fergusson College" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
              <button className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={handleSave}>Save College</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CollegeMaster;
