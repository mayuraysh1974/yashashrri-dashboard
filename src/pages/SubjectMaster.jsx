import React, { useState, useEffect } from 'react';
import { FiPlus, FiEdit2, FiTrash2, FiX, FiBook } from 'react-icons/fi';

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
    const token = localStorage.getItem('token');
    const res = await fetch('/api/subjects', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) setSubjects(await res.json());
    setLoading(false);
  };

  const handleSave = async () => {
    const token = localStorage.getItem('token');
    if (!formData.name || formData.fees === '') return alert('Name and Fees are required');
    
    const url = editMode ? `/api/subjects/${formData.id}` : '/api/subjects';
    const method = editMode ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(formData)
      });
      
      const result = await res.json();
      
      if (res.ok) {
        setShowModal(false);
        setEditMode(false);
        setFormData({ id: null, name: '', fees: '' });
        fetchSubjects();
      } else {
        alert(`Failed to save subject: ${result.error || result.message || 'Unknown Error'}`);
      }
    } catch (err) {
      console.error("Save error:", err);
      alert("Network Error: Could not connect to the server.");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this subject? It will affect linked student records.')) return;
    const token = localStorage.getItem('token');
    await fetch(`/api/subjects/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    fetchSubjects();
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

      <div className="card-base" style={{ overflow: 'auto', flex: 1 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ backgroundColor: 'var(--bg-main)', borderBottom: '2px solid var(--border-color)' }}>
              <th style={{ padding: '1rem', color: 'var(--primary-blue)', fontWeight: 600 }}>Subject Name</th>
              <th style={{ padding: '1rem', color: 'var(--primary-blue)', fontWeight: 600 }}>Standard Fees (₹)</th>
              <th style={{ padding: '1rem', textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="3" style={{ padding: '2rem', textAlign: 'center' }}>Loading...</td></tr>
            ) : subjects.map((s) => (
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
