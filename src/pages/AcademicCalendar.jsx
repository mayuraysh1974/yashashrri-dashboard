import React, { useState, useEffect } from 'react';
import { FiCalendar, FiPlus, FiTrash2, FiClock, FiCoffee, FiAlertCircle } from 'react-icons/fi';
import { supabase } from '../supabaseClient';

const AcademicCalendar = () => {
    const [holidays, setHolidays] = useState([]);
    const [workingDays, setWorkingDays] = useState([]);
    const [loading, setLoading] = useState(true);

    const [holidayForm, setHolidayForm] = useState({ date: '', description: '', type: 'Holiday' });
    const [workingDayForm, setWorkingDayForm] = useState({ month: new Date().toISOString().slice(0, 7), days: 24 });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        const [{ data: hData }, { data: wData }] = await Promise.all([
            supabase.from('holidays').select('*').order('date', { ascending: true }),
            supabase.from('working_days').select('*').order('month', { ascending: true })
        ]);
        setHolidays(hData || []);
        setWorkingDays(wData || []);
        setLoading(false);
    };

    const handleAddHoliday = async () => {
        if (!holidayForm.date || !holidayForm.description) return alert('Date and description are required');
        const { error } = await supabase.from('holidays').insert({
            date: holidayForm.date,
            description: holidayForm.description,
            type: holidayForm.type
        });
        if (!error) {
            setHolidayForm({ date: '', description: '', type: 'Holiday' });
            fetchData();
        } else {
            alert('Error: ' + error.message);
        }
    };

    const handleDeleteHoliday = async (id) => {
        if (!window.confirm('Delete this holiday?')) return;
        const { error } = await supabase.from('holidays').delete().eq('id', id);
        if (!error) fetchData();
    };

    const handleSetWorkingDays = async () => {
        const { error } = await supabase.from('working_days').upsert(
            { month: workingDayForm.month, days: workingDayForm.days },
            { onConflict: 'month' }
        );
        if (!error) {
            fetchData();
            alert('Working days updated for ' + workingDayForm.month);
        } else {
            alert('Error: ' + error.message);
        }
    };

    const handleAutoMarkSundays = async () => {
        const year = new Date().getFullYear();
        if (!window.confirm(`Auto-mark all Sundays of ${year} as Holidays?`)) return;

        const sundays = [];
        let d = new Date(year, 0, 1);
        while (d.getDay() !== 0) d.setDate(d.getDate() + 1);
        while (d.getFullYear() === year) {
            sundays.push(new Date(d));
            d.setDate(d.getDate() + 7);
        }

        setLoading(true);
        const inserts = sundays.map(sun => ({
            date: sun.toISOString().split('T')[0],
            description: 'Sunday (Weekly Off)',
            type: 'Holiday'
        }));
        await supabase.from('holidays').upsert(inserts, { onConflict: 'date' });
        fetchData();
        alert(`Successfully marked ${sundays.length} Sundays as holidays.`);
    };

    return (
        <div style={{ padding: '1.5rem' }}>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Academic Calendar</h1>
                    <p className="page-subtitle">Configure working days, holidays, and class closures</p>
                </div>
                <button className="btn-secondary" onClick={handleAutoMarkSundays}>
                    <FiCoffee /> Mark Sundays as Holidays
                </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '2rem' }}>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div className="card-base" style={{ padding: '1.5rem' }}>
                        <h3 style={{ color: 'var(--primary-blue)', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <FiClock /> Monthly Working Days
                        </h3>
                        <div className="input-group">
                            <label>Target Month</label>
                            <input type="month" value={workingDayForm.month} onChange={e => setWorkingDayForm({...workingDayForm, month: e.target.value})} />
                        </div>
                        <div className="input-group">
                            <label>No. of Working Days</label>
                            <input type="number" value={workingDayForm.days} onChange={e => setWorkingDayForm({...workingDayForm, days: parseInt(e.target.value)})} />
                        </div>
                        <button className="btn-primary" onClick={handleSetWorkingDays} style={{ width: '100%', marginTop: '0.5rem' }}>Update Month Target</button>
                    </div>

                    <div className="card-base" style={{ padding: '1.5rem', flex: 1 }}>
                        <h4 style={{ fontSize: '0.9rem', marginBottom: '1rem', color: 'var(--text-secondary)' }}>Current Targets</h4>
                        <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                            {workingDays.map(w => (
                                <div key={w.month} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', borderBottom: '1px solid var(--border-color)' }}>
                                    <span style={{ fontWeight: 600 }}>{w.month}</span>
                                    <span style={{ padding: '2px 8px', background: 'var(--bg-main)', borderRadius: '4px', fontSize: '0.85rem' }}>{w.days} Days</span>
                                </div>
                            ))}
                            {workingDays.length === 0 && !loading && (
                                <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '1rem' }}>No targets set yet.</p>
                            )}
                        </div>
                    </div>
                </div>

                <div className="card-base" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
                    <h3 style={{ color: 'var(--primary-blue)', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <FiCalendar /> Holidays & Closures
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.5fr 1fr auto', gap: '1rem', marginBottom: '1.5rem', alignItems: 'flex-end' }}>
                        <div className="input-group" style={{ marginBottom: 0 }}>
                            <label>Date</label>
                            <input type="date" value={holidayForm.date} onChange={e => setHolidayForm({...holidayForm, date: e.target.value})} />
                        </div>
                        <div className="input-group" style={{ marginBottom: 0 }}>
                            <label>Description</label>
                            <input type="text" placeholder="e.g. Diwali Break" value={holidayForm.description} onChange={e => setHolidayForm({...holidayForm, description: e.target.value})} />
                        </div>
                        <div className="input-group" style={{ marginBottom: 0 }}>
                            <label>Type</label>
                            <select value={holidayForm.type} onChange={e => setHolidayForm({...holidayForm, type: e.target.value})}>
                                <option value="Holiday">Full Holiday</option>
                                <option value="No Class">No Class (Subject)</option>
                                <option value="Half Day">Half Day</option>
                            </select>
                        </div>
                        <button className="btn-primary" onClick={handleAddHoliday} style={{ padding: '0.75rem' }}><FiPlus /></button>
                    </div>

                    <div style={{ flex: 1, overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead style={{ backgroundColor: 'var(--bg-main)', position: 'sticky', top: 0 }}>
                                <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border-color)' }}>
                                    <th style={{ padding: '0.75rem' }}>Date</th>
                                    <th style={{ padding: '0.75rem' }}>Description</th>
                                    <th style={{ padding: '0.75rem' }}>Type</th>
                                    <th style={{ padding: '0.75rem', textAlign: 'center' }}>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {holidays.map(h => (
                                    <tr key={h.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                        <td style={{ padding: '0.75rem', fontSize: '0.85rem' }}>{h.date}</td>
                                        <td style={{ padding: '0.75rem', fontWeight: 500 }}>{h.description}</td>
                                        <td style={{ padding: '0.75rem' }}>
                                            <span style={{ 
                                                fontSize: '0.75rem', padding: '2px 8px', borderRadius: '12px',
                                                background: h.type === 'Holiday' ? 'rgba(239, 68, 68, 0.1)' : h.type === 'Half Day' ? 'rgba(212, 175, 55, 0.1)' : 'rgba(26, 35, 126, 0.1)',
                                                color: h.type === 'Holiday' ? 'var(--danger-red)' : h.type === 'Half Day' ? 'var(--accent-gold)' : 'var(--primary-blue)',
                                                fontWeight: 800
                                            }}>{h.type}</span>
                                        </td>
                                        <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                                            <button onClick={() => handleDeleteHoliday(h.id)} style={{ color: 'var(--danger-red)', background: 'transparent', border: 'none', cursor: 'pointer' }}><FiTrash2 /></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {holidays.length === 0 && (
                            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                <FiAlertCircle style={{ fontSize: '2rem', marginBottom: '0.5rem', opacity: 0.3 }} />
                                <p>No holidays or closures defined yet.</p>
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
};

export default AcademicCalendar;
