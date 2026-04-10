import React, { useState, useEffect } from 'react';
import { FiUploadCloud, FiFile, FiVideo, FiFolder, FiMoreVertical, FiX, FiPlus, FiEye } from 'react-icons/fi';

const DigitalLibrary = () => {
  const [resources, setResources] = useState([]);
  const [standards, setStandards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [formData, setFormData] = useState({ name: '', standard: '', type: 'pdf', videoLink: '' });

  useEffect(() => {
    fetchResources();
    fetchStandards();
  }, []);

  const fetchStandards = async () => {
    const token = localStorage.getItem('token');
    const res = await fetch('/api/standards', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) setStandards(await res.json());
  };

  const fetchResources = async () => {
    const token = localStorage.getItem('token');
    const res = await fetch('/api/library', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) setResources(await res.json());
    setLoading(false);
  };

  const handleSaveResource = async () => {
    const token = localStorage.getItem('token');
    if (!uploadFile && !formData.videoLink) return alert('Provide a file or video link');
    
    // Use FormData for real file upload
    const data = new FormData();
    if (uploadFile) data.append('file', uploadFile);
    data.append('name', formData.name);
    data.append('standard', formData.standard);
    data.append('type', formData.type);
    data.append('videoLink', formData.videoLink);

    const res = await fetch('/api/library/upload', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }, // Form-data will set the boundary header automatically
      body: data
    });
    
    if (res.status === 401 || res.status === 403) {
      localStorage.removeItem('token');
      window.location.reload();
      return;
    }

    if (res.ok) {
      setShowModal(false);
      setUploadFile(null);
      setFormData({ name: '', standard: 'Std X', type: 'pdf', videoLink: '' });
      fetchResources();
    }
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Digital Library</h1>
          <p className="page-subtitle">REAL PDF Uploads and Academic Repository</p>
        </div>
        <button className="btn-primary" onClick={() => setShowModal(true)}>
          <FiPlus /> New Resource
        </button>
      </div>

      <div style={{ display: 'flex', gap: '1.5rem', flex: 1, minHeight: 0, flexDirection: 'row' }}>
        
        {/* Left Side: Drag & Drop Zone */}
        <div className="card-base" style={{ flex: '1', padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '2px dashed var(--border-color)', backgroundColor: 'var(--bg-main)', minWidth: '300px' }}>
          <div style={{ padding: '1.5rem', backgroundColor: 'rgba(212, 175, 55, 0.1)', borderRadius: '50%', color: 'var(--accent-gold)', marginBottom: '1.5rem' }}>
            <FiUploadCloud size={60} />
          </div>
          <h3 style={{ color: 'var(--primary-blue)', marginBottom: '0.5rem' }}>Permanent File Storage</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', textAlign: 'center', marginBottom: '2.5rem' }}>
            Upload PDFs directly to your server. They will be saved in your academic repository permanently.
          </p>
          <button className="btn-primary" style={{ padding: '0.75rem 2rem' }} onClick={() => setShowModal(true)}>Upload Notes (PDF)</button>
        </div>

        {/* Right Side: File List */}
        <div className="card-base" style={{ flex: '2', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '1.2rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--bg-surface)' }}>
            <h3 style={{ color: 'var(--primary-blue)', fontSize: '1.1rem' }}>Resource Repository</h3>
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--bg-main)', borderBottom: '1px solid var(--border-color)' }}>
                  <th style={{ padding: '1rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>File Name</th>
                  <th style={{ padding: '1rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Standard</th>
                  <th style={{ padding: '1rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Upload Date</th>
                  <th style={{ padding: '1rem', textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="4" style={{ padding: '2rem', textAlign: 'center' }}>Loading...</td></tr>
                ) : resources.map((r, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border-color)' }} className="table-row-hover">
                    <td style={{ padding: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                        <div style={{ padding: '0.4rem', backgroundColor: 'var(--bg-main)', borderRadius: '4px' }}>
                            <FiFile color="var(--primary-blue)" size={20} />
                        </div>
                        <div>
                          <p style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem' }}>{r.name}</p>
                          {r.videoLink && (
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', color: 'var(--primary-blue)', fontSize: '0.75rem', marginTop: '0.4rem', backgroundColor: 'var(--accent-gold-light)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontWeight: 600 }}>
                              <FiVideo /> {r.videoLink.includes('uploads') ? 'Stored Locally' : 'External Link'}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '1rem', color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 500 }}>{r.standard}</td>
                    <td style={{ padding: '1rem', color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 500 }}>{r.date}</td>
                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
                        {r.videoLink && (
                          <a 
                            href={r.videoLink.startsWith('/') ? `${r.videoLink}` : r.videoLink} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="btn-secondary" 
                            style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                          >
                           <FiEye /> View
                          </a>
                        )}
                        <button style={{ background: 'transparent', padding: '0.4rem', color: 'var(--text-secondary)', border: 'none', cursor: 'pointer' }}><FiMoreVertical size={18} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="card-base" style={{ width: '100%', maxWidth: '450px', padding: '1.5rem', backgroundColor: 'var(--bg-surface)', borderTop: '4px solid var(--accent-gold)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', color: 'var(--primary-blue)' }}>Upload Real Resource</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'transparent', color: 'var(--text-secondary)', fontSize: '1.25rem', cursor: 'pointer', border: 'none' }}><FiX /></button>
            </div>
            
            <div className="input-group">
              <label>Resource Title</label>
              <input type="text" placeholder="e.g. Maths Chapter 1 Notes" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
            </div>

            <div className="input-group">
              <label>Select Standard</label>
              <select 
                value={formData.standard} 
                onChange={e => setFormData({...formData, standard: e.target.value})}
              >
                <option value="">Choose Standard...</option>
                {standards.map(s => (
                  <option key={s.id} value={s.standard}>{s.standard}</option>
                ))}
              </select>
            </div>

            <div className="input-group">
              <label>Select File (PDF, HTML, Video, etc.)</label>
              <input type="file" onChange={e => setUploadFile(e.target.files[0])} />
            </div>

            <div style={{ textAlign: 'center', color: 'var(--text-secondary)', margin: '1rem 0', fontSize: '0.8rem' }}>OR</div>

            <div className="input-group">
              <label>External Video / CapCut Link</label>
              <input type="text" placeholder="https://youtu.be/..." value={formData.videoLink} onChange={e => setFormData({...formData, videoLink: e.target.value})} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
              <button className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={handleSaveResource}>Upload & Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DigitalLibrary;
