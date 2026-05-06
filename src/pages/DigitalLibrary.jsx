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
  const [formData, setFormData] = useState({ name: '', standard: '', videoLink: '', category: 'General' });
  const [searchTerm, setSearchTerm] = useState('');
  const [deletingAll, setDeletingAll] = useState(false);

  const filteredResources = resources.filter(r => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return r.name?.toLowerCase().includes(searchLower) || r.video_link?.toLowerCase().includes(searchLower);
  });

  const CATEGORIES = ['Animations', 'Videos', 'PDF Notes', 'Assignments', 'General'];

  const parseResourceName = (name) => {
    const match = (name || '').match(/^\[(.*?)\]\s*(.*)$/);
    if (match) return { category: match[1], title: match[2] };
    return { category: 'General', title: name || 'Untitled' };
  };

  useEffect(() => {
    fetchResources();
    fetchStandards();
  }, []);

  const fetchStandards = async () => {
    const { data } = await supabase.from('standards').select('id, standard').order('standard');
    setStandards(data || []);
  };

  const fetchResources = async () => {
    const { data, error } = await supabase.from('library_resources').select('*');
    if (error) console.error('fetchResources error:', error);
    
    const sortedData = data ? data.sort((a,b) => new Date(b.date || 0) - new Date(a.date || 0)) : [];
    
    setResources(sortedData);
    setLoading(false);
  };

  const handleSaveResource = async () => {
    const isSingle = uploadFiles.length <= 1 && !formData.videoLink;
    if (isSingle && !formData.name) return alert('Resource title is required');
    if (uploadFiles.length === 0 && !formData.videoLink) return alert('Provide a file or video link');
    
    setUploading(true);
    try {
      if (uploadFiles.length > 0) {
        for (const file of uploadFiles) {
          const filePath = `${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
          
          const { error: storageError } = await supabase.storage
            .from('library-files')
            .upload(filePath, file);
          
          if (storageError) throw storageError;

          const { data: publicUrlData } = supabase.storage.from('library-files').getPublicUrl(filePath);
          const fileUrl = publicUrlData?.publicUrl || null;

          const baseName = uploadFiles.length > 1 ? file.name : (formData.name || file.name);
          const finalName = formData.category !== 'General' ? `[${formData.category}] ${baseName}` : baseName;

          const { error: insError } = await supabase.from('library_resources').insert({
            name: finalName,
            standard: formData.standard,
            video_link: fileUrl,
            type: 'file',
            date: new Date().toISOString().split('T')[0]
          });
          
          if (insError) throw insError;
        }
      } else if (formData.videoLink) {
        const finalName = formData.category !== 'General' ? `[${formData.category}] ${formData.name}` : formData.name;
        const { error } = await supabase.from('library_resources').insert({
          name: finalName,
          standard: formData.standard,
          video_link: formData.videoLink,
          type: 'video',
          date: new Date().toISOString().split('T')[0]
        });
        if (error) throw error;
      }

      setShowModal(false);
      setUploadFiles([]);
      setFormData({ name: '', standard: '', videoLink: '', category: 'General' });
      fetchResources();
    } catch (err) {
      console.error('Upload Error:', err);
      alert('Error during upload: ' + err.message + '\n\nPlease ensure you have created a PUBLIC storage bucket named "library-files" in your Supabase dashboard.');
    }
    setUploading(false);
  };

  const handleDelete = async (resource) => {
    if (!window.confirm('Delete this resource? This cannot be undone.')) return;
    
    if (resource.video_link && resource.video_link.includes('supabase.co')) {
      try {
        const urlParts = resource.video_link.split('/');
        const filePath = urlParts.slice(urlParts.indexOf('library-files') + 1).join('/');
        if (filePath) {
          await supabase.storage.from('library-files').remove([filePath]);
        }
      } catch (err) {
        console.error('Failed to delete file from storage:', err);
      }
    }

    const { error } = await supabase.from('library_resources').delete().eq('id', resource.id);
    if (error) {
       alert('Error deleting resource: ' + error.message);
    } else {
       fetchResources();
    }
  };

  const handleDeleteAll = async () => {
    if (!window.confirm(`Are you sure you want to delete ${filteredResources.length} filtered resources? This cannot be undone.`)) return;
    setDeletingAll(true);
    for (const resource of filteredResources) {
      if (resource.video_link && resource.video_link.includes('supabase.co')) {
        try {
          const urlParts = resource.video_link.split('/');
          const filePath = urlParts.slice(urlParts.indexOf('library-files') + 1).join('/');
          if (filePath) await supabase.storage.from('library-files').remove([filePath]);
        } catch (err) {
          console.error('Failed to delete file from storage:', err);
        }
      }
      await supabase.from('library_resources').delete().eq('id', resource.id);
    }
    setDeletingAll(false);
    fetchResources();
  };

  return (
    <div className="digital-library-container" style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '1.25rem' }}>
      <div className="page-header" style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title" style={{ fontSize: '1.5rem', color: '#1A237E', margin: 0 }}>Digital Library</h1>
          <p className="page-subtitle" style={{ color: '#64748B', fontSize: '0.85rem' }}>Manage PDFs and Video Resources</p>
        </div>
        <button className="btn-primary" onClick={() => setShowModal(true)} style={{ fontSize: '0.85rem', padding: '0.6rem 1.25rem' }}>
          <FiPlus /> New Resource
        </button>
      </div>

      <div className="library-layout" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 350px), 1fr))', gap: '1.5rem', flex: 1 }}>
        
        <div className="card-base" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '2px dashed #CBD5E1', backgroundColor: '#F8FAFC' }}>
          <div style={{ padding: '1.25rem', backgroundColor: 'rgba(184, 134, 11, 0.1)', borderRadius: '50%', color: '#B8860B', marginBottom: '1rem' }}>
            <FiUploadCloud size={40} />
          </div>
          <h3 style={{ color: '#1A237E', marginBottom: '0.5rem', fontSize: '1.1rem' }}>Cloud Repository</h3>
          <p style={{ color: '#64748B', fontSize: '0.85rem', textAlign: 'center', marginBottom: '1.5rem' }}>
            Upload academic notes, PDFs, or link YouTube videos directly to student portals.
          </p>
          <button className="btn-primary" style={{ padding: '0.7rem 1.5rem', fontSize: '0.85rem' }} onClick={() => setShowModal(true)}>Upload Notes</button>
        </div>

        <div className="card-base" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '1rem', borderBottom: '1px solid #E2E8F0', backgroundColor: '#F8FAFC', display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ color: '#1A237E', fontSize: '1rem', margin: 0 }}>Recent Uploads</h3>
            <div style={{ display: 'flex', gap: '0.5rem', flex: 1, minWidth: '250px', justifyContent: 'flex-end' }}>
              <input type="text" placeholder="Search title or extension (e.g. .html)" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{ padding: '0.4rem 0.8rem', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.85rem', flex: 1, maxWidth: '200px' }} />
              {searchTerm && filteredResources.length > 0 && (
                <button onClick={handleDeleteAll} disabled={deletingAll} style={{ backgroundColor: '#EF4444', color: 'white', border: 'none', padding: '0.4rem 0.8rem', borderRadius: '6px', fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                   <FiTrash2 /> {deletingAll ? 'Deleting...' : `Delete All (${filteredResources.length})`}
                </button>
              )}
            </div>
          </div>
          
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <div className="desktop-only">
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ backgroundColor: '#F1F5F9', borderBottom: '1px solid #E2E8F0' }}>
                    <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', color: '#64748B', fontWeight: 800 }}>FILE / TITLE</th>
                    <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', color: '#64748B', fontWeight: 800 }}>STANDARD</th>
                    <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', color: '#64748B', fontWeight: 800, textAlign: 'center' }}>ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan="3" style={{ padding: '2rem', textAlign: 'center' }}>Loading...</td></tr>
                  ) : filteredResources.length === 0 ? (
                    <tr><td colSpan="3" style={{ padding: '2rem', textAlign: 'center', color: '#94A3B8' }}>No records.</td></tr>
                  ) : filteredResources.map((r, i) => {
                    const parsed = parseResourceName(r.name);
                    return (
                    <tr key={r.id || i} style={{ borderBottom: '1px solid #E2E8F0' }}>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <FiFile color="#1A237E" size={18} />
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontWeight: 600, fontSize: '0.85rem', color: '#1E293B' }}>{parsed.title}</span>
                            {parsed.category !== 'General' && <span style={{ fontSize: '0.65rem', color: '#B8860B', fontWeight: 700 }}>📁 {parsed.category}</span>}
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '0.75rem 1rem', color: '#64748B', fontSize: '0.8rem', fontWeight: 700 }}>{r.standard}</td>
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
                          <a href={r.video_link || r.videoLink} target="_blank" rel="noopener noreferrer" style={{ color: '#B8860B' }}><FiEye size={16} /></a>
                          <button onClick={() => handleDelete(r)} style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer' }}><FiTrash2 size={16} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                  })}
                </tbody>
              </table>
            </div>

            <div className="mobile-only" style={{ display: 'grid', gap: '0.75rem', padding: '1rem' }}>
               {filteredResources.map((r, i) => {
                  const parsed = parseResourceName(r.name);
                  return (
                  <div key={r.id || i} className="card-base" style={{ padding: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F8FAFC' }}>
                     <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#1E293B' }}>{parsed.title}</div>
                        <div style={{ fontSize: '0.7rem', color: '#64748B', marginTop: '2px' }}>
                           {parsed.category !== 'General' && <span style={{ color: '#B8860B', fontWeight: 700, marginRight: '4px' }}>📁 {parsed.category}</span>}
                           Std: {r.standard} • {r.date}
                        </div>
                     </div>
                     <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <a href={r.video_link || r.videoLink} target="_blank" rel="noopener noreferrer" style={{ color: '#B8860B', padding: '0.5rem' }}><FiEye size={18} /></a>
                        <button onClick={() => handleDelete(r)} style={{ background: 'none', border: 'none', color: '#EF4444', padding: '0.5rem' }}><FiTrash2 size={18} /></button>
                     </div>
                  </div>
                  );
               })}
               {filteredResources.length === 0 && !loading && <p style={{ textAlign: 'center', color: '#94A3B8', padding: '2rem' }}>No resources found.</p>}
            </div>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="card-base" style={{ width: '90%', maxWidth: '400px', padding: '1.25rem', backgroundColor: 'white', borderTop: '4px solid #B8860B' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1.1rem', color: '#1A237E', margin: 0 }}>Add New Resource</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'transparent', color: '#64748B', fontSize: '1.25rem', cursor: 'pointer', border: 'none' }}><FiX /></button>
            </div>
            
            <div style={{ display: 'grid', gap: '1rem' }}>
              <div className="input-group">
                <label style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748B' }}>Folder / Category</label>
                <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #CBD5E1' }}>
                  {CATEGORIES.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="input-group">
                <label style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748B' }}>Title</label>
                <input type="text" placeholder="e.g. Physics Ch 2 Notes" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #CBD5E1' }} />
              </div>

              <div className="input-group">
                <label style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748B' }}>Standard</label>
                <select value={formData.standard} onChange={e => setFormData({...formData, standard: e.target.value})} style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #CBD5E1' }}>
                  <option value="">Choose Standard...</option>
                  {standards.map(s => (
                    <option key={s.id} value={s.standard}>{s.standard}</option>
                  ))}
                </select>
              </div>

              <div className="input-group">
                <label style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748B' }}>File Upload (PDF/Image/HTML)</label>
                <input type="file" multiple accept=".pdf,.doc,.docx,.jpg,.png,.html" onChange={e => setUploadFiles(Array.from(e.target.files))} style={{ width: '100%', fontSize: '0.8rem' }} />
              </div>

              <div style={{ textAlign: 'center', color: '#94A3B8', fontSize: '0.7rem', fontWeight: 800 }}>OR</div>

              <div className="input-group">
                <label style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748B' }}>Video URL</label>
                <input type="text" placeholder="YouTube link" value={formData.videoLink} onChange={e => setFormData({...formData, videoLink: e.target.value})} style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #CBD5E1' }} />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                <button className="btn-secondary" style={{ flex: 1 }} onClick={() => setShowModal(false)}>Cancel</button>
                <button className="btn-primary" style={{ flex: 2 }} onClick={handleSaveResource} disabled={uploading}>
                  {uploading ? 'Working...' : 'Save Resource'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          .desktop-only { display: none !important; }
        }
        @media (min-width: 769px) {
          .mobile-only { display: none !important; }
        }
      `}</style>
    </div>
  );
};

export default DigitalLibrary;
