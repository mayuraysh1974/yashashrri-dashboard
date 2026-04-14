import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { FiTrash2, FiUpload, FiImage, FiVideo } from 'react-icons/fi';

const GalleryManagement = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [title, setTitle] = useState('');
  const [file, setFile] = useState(null);
  const [type, setType] = useState('photo');

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      const { data, error } = await supabase
        .from('gallery_items')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      setItems(data || []);
    } catch (error) {
      console.error('Error fetching gallery items:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return;

    setUploading(true);
    try {
      // 1. Upload file to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('gallery')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // 2. Get Public URL
      const { data: publicUrlData } = supabase.storage
        .from('gallery')
        .getPublicUrl(filePath);

      const publicUrl = publicUrlData.publicUrl;

      // 3. Save to database
      const { error: dbError } = await supabase
        .from('gallery_items')
        .insert([{ title, url: publicUrl, type }]);

      if (dbError) throw dbError;

      // Reset & Refresh
      setFile(null);
      setTitle('');
      fetchItems();
    } catch (error) {
      alert('Error uploading: ' + error.message + '\n\nMake sure you have created a public storage bucket named "gallery" in Supabase!');
      console.error(error);
    } finally {
      setUploading(false);
    }
  };

  const deleteItem = async (id, url) => {
    if (!window.confirm('Are you sure you want to delete this media?')) return;
    
    try {
      // Extract filepath from URL
      const pathSegments = url.split('/');
      const fileName = pathSegments[pathSegments.length - 1];

      // Remove from storage
      await supabase.storage.from('gallery').remove([fileName]);

      // Remove from DB
      const { error } = await supabase
        .from('gallery_items')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      fetchItems();
    } catch (error) {
      console.error('Error deleting item:', error.message);
    }
  };

  return (
    <div className="dashboard-content">
      <div className="header-actions">
        <h2>Gallery Management</h2>
      </div>
      
      <div className="card" style={{ marginBottom: '2rem', background: '#fff', padding: '1.5rem', borderRadius: '8px' }}>
        <h3>Add New Media</h3>
        <p style={{ color: '#666', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
          * Ensure you have created a PUBLIC Storage bucket named "gallery" in your Supabase project. Setup RLS to allow authenticated inserts.
        </p>
        <form onSubmit={handleUpload} style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="input-group" style={{ flex: 1, minWidth: '200px' }}>
            <label>Title / Description</label>
            <input 
              type="text" 
              value={title} 
              onChange={(e) => setTitle(e.target.value)} 
              placeholder="E.g. Annual Function 2026"
              required
              className="form-control"
            />
          </div>
          <div className="input-group" style={{ width: '150px' }}>
            <label>Media Type</label>
            <select value={type} onChange={(e) => setType(e.target.value)} className="form-control">
              <option value="photo">Photo</option>
              <option value="video">Video (MP4)</option>
            </select>
          </div>
          <div className="input-group" style={{ flex: 1, minWidth: '250px' }}>
            <label>Select File</label>
            <input 
              type="file" 
              accept={type === 'photo' ? 'image/*' : 'video/mp4'} 
              onChange={(e) => setFile(e.target.files[0])}
              required
              className="form-control"
            />
          </div>
          <button type="submit" disabled={uploading || !file} className="btn btn-primary" style={{ padding: '0.7rem 1.5rem', height: '42px' }}>
            <FiUpload style={{ marginRight: '0.5rem' }} /> {uploading ? 'Uploading...' : 'Upload'}
          </button>
        </form>
      </div>

      <div className="card">
        <h3>Published Media</h3>
        {loading ? (
          <p>Loading gallery items...</p>
        ) : items.length === 0 ? (
          <p style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>No media found. Upload something to show on the website.</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1.5rem', marginTop: '1rem' }}>
            {items.map((item) => (
              <div key={item.id} style={{ border: '1px solid #eee', borderRadius: '8px', overflow: 'hidden', background: '#f9f9f9', display: 'flex', flexDirection: 'column' }}>
                <div style={{ position: 'relative', paddingBottom: '75%', background: '#eee' }}>
                  {item.type === 'photo' ? (
                    <img src={item.url} alt={item.title} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <video src={item.url} controls style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                  )}
                  <div style={{ position: 'absolute', top: '10px', right: '10px', background: 'rgba(0,0,0,0.6)', color: 'white', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {item.type === 'photo' ? <FiImage /> : <FiVideo />}
                    {item.type}
                  </div>
                </div>
                <div style={{ padding: '1rem', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem', color: '#333' }}>{item.title}</h4>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
                    <span style={{ fontSize: '0.8rem', color: '#888' }}>{new Date(item.created_at).toLocaleDateString()}</span>
                    <button onClick={() => deleteItem(item.id, item.url)} className="btn btn-sm" style={{ background: '#fee2e2', color: '#dc2626', border: 'none', padding: '0.4rem 0.8rem', borderRadius: '4px', cursor: 'pointer' }}>
                      <FiTrash2 /> 
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default GalleryManagement;
