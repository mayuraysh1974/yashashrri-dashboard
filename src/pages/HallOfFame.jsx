import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { FiTrash2, FiUpload, FiAward, FiImage } from 'react-icons/fi';

const HallOfFame = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  
  // Form State
  const [studentName, setStudentName] = useState('');
  const [percentage, setPercentage] = useState('');
  const [marks, setMarks] = useState('');
  const [stream, setStream] = useState('Science');
  const [rank, setRank] = useState('1st Rank');
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [file, setFile] = useState(null);

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      const { data, error } = await supabase
        .from('hall_of_fame')
        .select('*')
        .order('year', { ascending: false })
        .order('rank', { ascending: true });
        
      if (error) {
        // If table doesn't exist yet, we just set empty array
        if (error.code === '42P01') {
          setItems([]);
        } else {
          throw error;
        }
      } else {
        setItems(data || []);
      }
    } catch (error) {
      console.error('Error fetching hall of fame items:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) {
      alert("Please select a photograph.");
      return;
    }

    setUploading(true);
    try {
      // 1. Upload file to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('gallery') // Reusing the gallery bucket to avoid needing to create a new one, but can create a 'hall_of_fame' bucket if preferred
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // 2. Get Public URL
      const { data: publicUrlData } = supabase.storage
        .from('gallery')
        .getPublicUrl(filePath);

      const publicUrl = publicUrlData.publicUrl;

      // 3. Save to database
      const { error: dbError } = await supabase
        .from('hall_of_fame')
        .insert([{ 
          student_name: studentName, 
          percentage, 
          marks,
          stream,
          rank,
          year,
          photo_url: publicUrl 
        }]);

      if (dbError) throw dbError;

      // Reset & Refresh
      setFile(null);
      setStudentName('');
      setPercentage('');
      setMarks('');
      setStream('Science');
      setRank('1st Rank');
      // keep year as is
      fetchItems();
    } catch (error) {
      alert('Error uploading: ' + error.message + '\n\nMake sure the "hall_of_fame" table exists in your database.');
      console.error(error);
    } finally {
      setUploading(false);
    }
  };

  const deleteItem = async (id, url) => {
    if (!window.confirm('Are you sure you want to delete this record?')) return;
    
    try {
      if (url) {
        // Extract filepath from URL
        const pathSegments = url.split('/');
        const fileName = pathSegments[pathSegments.length - 1];

        // Remove from storage
        await supabase.storage.from('gallery').remove([fileName]);
      }

      // Remove from DB
      const { error } = await supabase
        .from('hall_of_fame')
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
      <div className="header-actions" style={{ marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0, color: '#1A237E' }}>
            <FiAward size={24} /> Hall of Fame Management
          </h2>
          <p style={{ color: '#64748B', fontSize: '0.85rem', marginTop: '0.25rem' }}>
            Manage the list of toppers and achievers across different academic years.
          </p>
        </div>
      </div>
      
      <div className="card" style={{ marginBottom: '2rem', background: '#F8FAFC', padding: '1.5rem', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
        <h3 style={{ color: '#1E293B', marginBottom: '1.5rem', fontSize: '1.1rem' }}>Add New Topper</h3>
        <form onSubmit={handleUpload} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
            <div className="input-group" style={{ flex: '1 1 200px' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#64748B', textTransform: 'uppercase' }}>Academic Year</label>
              <input 
                type="text" 
                value={year} 
                onChange={(e) => setYear(e.target.value)} 
                placeholder="e.g. 2026"
                required
                className="form-control"
                style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #CBD5E1' }}
              />
            </div>
            <div className="input-group" style={{ flex: '2 1 300px' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#64748B', textTransform: 'uppercase' }}>Student Name</label>
              <input 
                type="text" 
                value={studentName} 
                onChange={(e) => setStudentName(e.target.value)} 
                placeholder="e.g. Meet Mhatre"
                required
                className="form-control"
                style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #CBD5E1' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
            <div className="input-group" style={{ flex: '1 1 150px' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#64748B', textTransform: 'uppercase' }}>Marks</label>
              <input 
                type="text" 
                value={marks} 
                onChange={(e) => setMarks(e.target.value)} 
                placeholder="e.g. 580/600"
                className="form-control"
                style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #CBD5E1' }}
              />
            </div>
            <div className="input-group" style={{ flex: '1 1 150px' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#64748B', textTransform: 'uppercase' }}>Percentage</label>
              <input 
                type="text" 
                value={percentage} 
                onChange={(e) => setPercentage(e.target.value)} 
                placeholder="e.g. 95.6%"
                required
                className="form-control"
                style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #CBD5E1' }}
              />
            </div>
            <div className="input-group" style={{ flex: '1 1 150px' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#64748B', textTransform: 'uppercase' }}>Stream</label>
              <select 
                value={stream} 
                onChange={(e) => setStream(e.target.value)} 
                className="form-control"
                style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #CBD5E1', backgroundColor: '#fff' }}
              >
                <option value="Science">Science</option>
                <option value="Commerce">Commerce</option>
                <option value="Arts">Arts</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="input-group" style={{ flex: '1 1 150px' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#64748B', textTransform: 'uppercase' }}>Rank (1-3)</label>
              <select 
                value={rank} 
                onChange={(e) => setRank(e.target.value)} 
                className="form-control"
                style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #CBD5E1', backgroundColor: '#fff' }}
              >
                <option value="1st Rank">1st Rank</option>
                <option value="2nd Rank">2nd Rank</option>
                <option value="3rd Rank">3rd Rank</option>
                <option value="Achiever">Achiever</option>
              </select>
            </div>
          </div>

          <div className="input-group">
            <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#64748B', textTransform: 'uppercase' }}>Photograph</label>
            <input 
              type="file" 
              accept="image/*" 
              onChange={(e) => setFile(e.target.files[0])}
              required
              className="form-control"
              style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #CBD5E1', backgroundColor: '#fff' }}
            />
          </div>

          <button 
            type="submit" 
            disabled={uploading || !file} 
            className="btn btn-primary" 
            style={{ 
              padding: '0.8rem 1.5rem', 
              fontSize: '1rem', 
              fontWeight: '600', 
              backgroundColor: '#4338CA', 
              color: 'white', 
              border: 'none', 
              borderRadius: '8px', 
              cursor: uploading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem'
            }}
          >
            <FiUpload /> {uploading ? 'Uploading...' : 'Upload & Add to Hall of Fame'}
          </button>
        </form>
      </div>

      <div className="card" style={{ background: '#fff', borderRadius: '12px', border: '1px solid #E2E8F0', overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #E2E8F0', backgroundColor: '#F8FAFC' }}>
          <h3 style={{ margin: 0, color: '#1E293B', fontSize: '1rem' }}>Added Toppers</h3>
        </div>
        
        {loading ? (
          <p style={{ padding: '2rem', textAlign: 'center', color: '#64748B' }}>Loading hall of fame...</p>
        ) : items.length === 0 ? (
          <p style={{ padding: '3rem', textAlign: 'center', color: '#94A3B8' }}>No toppers added yet.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#F1F5F9', borderBottom: '1px solid #E2E8F0' }}>
                  <th style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', color: '#64748B', fontWeight: 800 }}>YEAR</th>
                  <th style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', color: '#64748B', fontWeight: 800 }}>RANK</th>
                  <th style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', color: '#64748B', fontWeight: 800 }}>PHOTO</th>
                  <th style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', color: '#64748B', fontWeight: 800 }}>NAME</th>
                  <th style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', color: '#64748B', fontWeight: 800 }}>SCORE</th>
                  <th style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', color: '#64748B', fontWeight: 800 }}>STREAM</th>
                  <th style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', color: '#64748B', fontWeight: 800, textAlign: 'center' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} style={{ borderBottom: '1px solid #E2E8F0', transition: 'background-color 0.2s' }}>
                    <td style={{ padding: '1rem 1.5rem', fontWeight: '600', color: '#334155' }}>{item.year}</td>
                    <td style={{ padding: '1rem 1.5rem' }}>
                      <span style={{ 
                        padding: '0.25rem 0.75rem', 
                        borderRadius: '999px', 
                        fontSize: '0.8rem', 
                        fontWeight: '600',
                        backgroundColor: item.rank === '1st Rank' ? '#FEF08A' : item.rank === '2nd Rank' ? '#E2E8F0' : item.rank === '3rd Rank' ? '#FED7AA' : '#DBEAFE',
                        color: item.rank === '1st Rank' ? '#854D0E' : item.rank === '2nd Rank' ? '#475569' : item.rank === '3rd Rank' ? '#9A3412' : '#1E40AF'
                      }}>
                        {item.rank}
                      </span>
                    </td>
                    <td style={{ padding: '1rem 1.5rem' }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '50%', overflow: 'hidden', backgroundColor: '#E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {item.photo_url ? (
                          <img src={item.photo_url} alt={item.student_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <FiImage color="#94A3B8" />
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '1rem 1.5rem', fontWeight: '600', color: '#1E293B' }}>{item.student_name}</td>
                    <td style={{ padding: '1rem 1.5rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: 'bold', color: '#0F172A' }}>{item.percentage}</span>
                        {item.marks && <span style={{ fontSize: '0.75rem', color: '#64748B' }}>{item.marks}</span>}
                      </div>
                    </td>
                    <td style={{ padding: '1rem 1.5rem', color: '#475569' }}>{item.stream}</td>
                    <td style={{ padding: '1rem 1.5rem', textAlign: 'center' }}>
                      <button 
                        onClick={() => deleteItem(item.id, item.photo_url)} 
                        style={{ background: '#FEE2E2', color: '#EF4444', border: 'none', padding: '0.5rem', borderRadius: '6px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                        title="Delete Record"
                      >
                        <FiTrash2 size={16} /> 
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default HallOfFame;
