import React, { useState, useEffect } from 'react';
import { FiUploadCloud, FiFile, FiVideo, FiMoreVertical, FiX, FiPlus, FiEye, FiTrash2 } from 'react-icons/fi';
import { supabase } from '../supabaseClient';

const DigitalLibrary = () => {
  const [resources, setResources] = useState([]);
  const [standards, setStandards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadFiles, setUploadFiles] = useState([]);
  const [formData, setFormData] = useState({ name: '', standard: '', videoLink: '' });

  useEffect(() => {
    fetchResources();
    fetchStandards();
  }, []);

  const fetchStandards = async () => {
    const { data } = await supabase.from('standards').select('id, standard').order('standard');
    setStandards(data || []);
  };

  const fetchResources = async () => {
    const { data } = await supabase.from('library_resources').select('*').order('created_at', { ascending: false });
    setResources(data || []);
    setLoading(false);
  };

  const handleSaveResource = async () => {
    // If multiple files, name is optional as we use filename. If 1 file/video, name is required.
    const isSingle = uploadFiles.length <= 1 && !formData.videoLink;
    if (isSingle && !formData.name) return alert('Resource title is required');
    if (uploadFiles.length === 0 && !formData.videoLink) return alert('Provide a file or video link');
    
    setUploading(true);
    try {
      if (uploadFiles.length > 0) {
        for (const file of uploadFiles) {
          const filePath = `library/${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
          
          const { error: storageError } = await supabase.storage
            .from('library-files')
            .upload(filePath, file, { cacheControl: '3600', upsert: false });
          
          if (storageError) throw storageError;

          const { data: publicUrlData } = supabase.storage.from('library-files').getPublicUrl(filePath);
          const fileUrl = publicUrlData?.publicUrl || null;

          // If multiple files, use filename for individual entries, otherwise use the title provided
          const recordName = uploadFiles.length > 1 ? file.name : (formData.name || file.name);

          const { error: insError } = await supabase.from('library_resources').insert({
            name: recordName,
            standard: formData.standard,
            video_link: fileUrl,
            date: new Date().toISOString().split('T')[0]
          });
          
          if (insError) throw insError;
        }
      } else if (formData.videoLink) {
        const { error } = await supabase.from('library_resources').insert({
          name: formData.name,
          standard: formData.standard,
          video_link: formData.videoLink,
          date: new Date().toISOString().split('T')[0]
        });
        if (error) throw error;
      }

      setShowModal(false);
      setUploadFiles([]);
      setFormData({ name: '', standard: '', videoLink: '' });
      fetchResources();
    } catch (err) {
      alert('Error during upload: ' + err.message);
    }
    setUploading(false);
  };

  const handleDelete = async (resource) => {
    if (!window.confirm('Delete this resource?')) return;
    await supabase.from('library_resources').delete().eq('id', resource.id);
    fetchResources();
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Digital Library</h1>
          <p className="page-subtitle">Cloud PDF Uploads and Academic Repository</p>
        </div>
        <button className="btn-primary" onClick={() => setShowModal(true)}>
          <FiPlus /> New Resource
        </button>
      </div>

      <div style={{ display: 'flex', gap: '1.5rem', flex: 1, minHeight: 0, flexDirection: 'row' }}>
        
        <div className="card-base" style={{ flex: '1', padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '2px dashed var(--border-color)', backgroundColor: 'var(--bg-main)', minWidth: '300px' }}>
          <div style={{ padding: '1.5rem', backgroundColor: 'rgba(212, 175, 55, 0.1)', borderRadius: '50%', color: 'var(--accent-gold)', marginBottom: '1.5rem' }}>
            <FiUploadCloud size={60} />
          </div>
          <h3 style={{ color: 'var(--primary-blue)', marginBottom: '0.5rem' }}>Cloud File Storage</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', textAlign: 'center', marginBottom: '2.5rem' }}>
            Upload PDFs to Supabase Storage. Files are stored permanently in the cloud and accessible from anywhere.
          </p>
          <button className="btn-primary" style={{ padding: '0.75rem 2rem' }} onClick={() => setShowModal(true)}>Upload Notes (PDF)</button>
        </div>

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
                ) : resources.length === 0 ? (
                  <tr><td colSpan="4" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No resources uploaded yet.</td></tr>
                ) : resources.map((r, i) => (
                  <tr key={r.id || i} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                        <div style={{ padding: '0.4rem', backgroundColor: 'var(--bg-main)', borderRadius: '4px' }}>
                            <FiFile color="var(--primary-blue)" size={20} />
                        </div>
                        <div>
                          <p style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem' }}>{r.name}</p>
                          {(r.video_link || r.videoLink) && (
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', color: 'var(--primary-blue)', fontSize: '0.75rem', marginTop: '0.4rem', backgroundColor: 'rgba(212,175,55,0.1)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontWeight: 600 }}>
                              <FiVideo /> Linked
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '1rem', color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 500 }}>{r.standard}</td>
                    <td style={{ padding: '1rem', color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 500 }}>{r.date || (r.created_at ? r.created_at.split('T')[0] : '')}</td>
                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
                        {(r.video_link || r.videoLink) && (
                          <a 
                            href={r.video_link || r.videoLink} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="btn-secondary" 
                            style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                          >
                           <FiEye /> View
                          </a>
                        )}
                        <button onClick={() => handleDelete(r)} style={{ background: 'transparent', padding: '0.4rem', color: 'var(--danger-red)', border: 'none', cursor: 'pointer' }}><FiTrash2 size={16} /></button>
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
              <h2 style={{ fontSize: '1.25rem', color: 'var(--primary-blue)' }}>Upload Resource</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'transparent', color: 'var(--text-secondary)', fontSize: '1.25rem', cursor: 'pointer', border: 'none' }}><FiX /></button>
            </div>
            
            <div className="input-group">
              <label>Resource Title</label>
              <input type="text" placeholder="e.g. Maths Chapter 1 Notes" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
            </div>

            <div className="input-group">
              <label>Select Standard</label>
              <select value={formData.standard} onChange={e => setFormData({...formData, standard: e.target.value})}>
                <option value="">Choose Standard...</option>
                {standards.map(s => (
                  <option key={s.id} value={s.standard}>{s.standard}</option>
                ))}
              </select>
            </div>

            <div className="input-group">
              <label>Select Files (PDF, Images, etc.)</label>
              <input type="file" multiple accept=".pdf,.doc,.docx,.ppt,.pptx,.html,.mp4,.jpg,.png" onChange={e => setUploadFiles(Array.from(e.target.files))} />
              {uploadFiles.length > 0 && (
                <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--success-green)', fontWeight: 600 }}>
                  {uploadFiles.length} files selected
                </div>
              )}
            </div>

            <div style={{ textAlign: 'center', color: 'var(--text-secondary)', margin: '1rem 0', fontSize: '0.8rem' }}>OR</div>

            <div className="input-group">
              <label>External Video / YouTube Link</label>
              <input type="text" placeholder="https://youtu.be/..." value={formData.videoLink} onChange={e => setFormData({...formData, videoLink: e.target.value})} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
              <button className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={handleSaveResource} disabled={uploading}>
                {uploading ? 'Uploading...' : 'Upload & Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DigitalLibrary;
