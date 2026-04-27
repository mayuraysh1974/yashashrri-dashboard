import React, { useState, useEffect } from 'react';
import { FiCalendar, FiPlus, FiTrash2, FiClock, FiCoffee, FiAlertCircle } from 'react-icons/fi';
import { supabase } from '../supabaseClient';

const AcademicCalendar = () => {
    const [holidays, setHolidays] = useState([]);
    const [workingDays, setWorkingDays] = useState([]);
    const [standards, setStandards] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [loading, setLoading] = useState(true);

    const [holidayForm, setHolidayForm] = useState({ 
        startDate: '', 
        endDate: '', 
        description: '', 
        type: 'Holiday',
        targetStandards: [],
        targetSubjects: []
    });

    const toggleAllStandards = () => {
        if (holidayForm.targetStandards.length === standards.length) {
            setHolidayForm({...holidayForm, targetStandards: []});
        } else {
            setHolidaysForm({...holidayForm, targetStandards: standards.map(s => s.standard)});
        }
    };

    // Correcting the state update in the helper
    const handleToggleAllStandards = () => {
        setHolidayForm(prev => ({
            ...prev,
            targetStandards: prev.targetStandards.length === standards.length ? [] : standards.map(s => s.standard)
        }));
    };

    const handleToggleAllSubjects = () => {
        const visibleSubjects = getFilteredSubjects();
        const allVisibleSelected = visibleSubjects.every(s => holidayForm.targetSubjects.includes(s.name));
        
        setHolidayForm(prev => {
            let newSubs;
            if (allVisibleSelected) {
                // If all visible are selected, remove them
                const visibleNames = visibleSubjects.map(s => s.name);
                newSubs = prev.targetSubjects.filter(name => !visibleNames.includes(name));
            } else {
                // Otherwise, add all visible (avoiding duplicates)
                const visibleNames = visibleSubjects.map(s => s.name);
                newSubs = Array.from(new Set([...prev.targetSubjects, ...visibleNames]));
            }
            return { ...prev, targetSubjects: newSubs };
        });
    };

    const getFilteredSubjects = () => {
        if (holidayForm.targetStandards.length === 0) return subjects;
        return subjects.filter(sub => 
            holidayForm.targetStandards.some(std => 
                sub.name.startsWith(std + ' ') || sub.name.startsWith(std + '-') || sub.name === std
            )
        );
    };
    const [workingDayForm, setWorkingDayForm] = useState({ month: new Date().toISOString().slice(0, 7), days: 24 });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        const [{ data: hData }, { data: wData }, { data: sData }, { data: subData }] = await Promise.all([
            supabase.from('holidays').select('*').order('date', { ascending: true }),
            supabase.from('working_days').select('*').order('month', { ascending: true }),
            supabase.from('standards').select('*').order('standard', { ascending: true }),
            supabase.from('subjects').select('*').order('name', { ascending: true })
        ]);
        setHolidays(hData || []);
        setWorkingDays(wData || []);
        setStandards(sData || []);
        setSubjects(subData || []);
        setLoading(false);
    };

    const getDatesInRange = (start, end) => {
        const dates = [];
        let curr = new Date(start);
        const last = new Date(end || start);
        while (curr <= last) {
            dates.push(new Date(curr).toISOString().split('T')[0]);
            curr.setDate(curr.getDate() + 1);
        }
        return dates;
    };

    const handleAddHoliday = async () => {
        if (!holidayForm.startDate || !holidayForm.description) return alert('Start Date and description are required');
        
        const dates = getDatesInRange(holidayForm.startDate, holidayForm.endDate || holidayForm.startDate);
        
        // Format description with tags
        let finalDesc = holidayForm.description;
        if (holidayForm.targetStandards.length > 0) {
            finalDesc = `[Std: ${holidayForm.targetStandards.join(', ')}] ${finalDesc}`;
        }
        if (holidayForm.targetSubjects.length > 0) {
            finalDesc = `[Sub: ${holidayForm.targetSubjects.join(', ')}] ${finalDesc}`;
        }

        const inserts = dates.map(d => ({
            date: d,
            description: finalDesc,
            type: holidayForm.type
        }));

        const { error } = await supabase.from('holidays').insert(inserts);
        
        if (!error) {
            setHolidayForm({ 
                startDate: '', endDate: '', description: '', type: 'Holiday',
                targetStandards: [], targetSubjects: []
            });
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
        await supabase.from('holidays').insert(inserts);
        fetchData();
        alert(`Successfully marked ${sundays.length} Sundays as holidays.`);
    };

    return (
        <div className="academic-calendar-container" style={{ padding: '1.25rem' }}>
            <div className="page-header" style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h1 className="page-title" style={{ fontSize: '1.5rem', color: '#1A237E', margin: 0 }}>Academic Calendar</h1>
                    <p className="page-subtitle" style={{ color: '#64748B', fontSize: '0.85rem' }}>Working days, holidays, and closures</p>
                </div>
                <button className="btn-secondary" onClick={handleAutoMarkSundays} style={{ fontSize: '0.8rem', padding: '0.5rem 1rem' }}>
                    <FiCoffee /> Mark Sundays
                </button>
            </div>

            <div className="calendar-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 350px), 1fr))', gap: '1.5rem' }}>
                
                {/* Working Days Section */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div className="card-base" style={{ padding: '1.25rem' }}>
                        <h3 style={{ color: '#1A237E', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem' }}>
                            <FiClock /> Monthly Targets
                        </h3>
                        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                            <div className="input-group" style={{ marginBottom: 0 }}>
                                <label style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748B' }}>Month</label>
                                <input type="month" value={workingDayForm.month} onChange={e => setWorkingDayForm({...workingDayForm, month: e.target.value})} style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid #CBD5E1', width: '100%' }} />
                            </div>
                            <div className="input-group" style={{ marginBottom: 0 }}>
                                <label style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748B' }}>Days</label>
                                <input type="number" value={workingDayForm.days} onChange={e => setWorkingDayForm({...workingDayForm, days: parseInt(e.target.value)})} style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid #CBD5E1', width: '100%' }} />
                            </div>
                        </div>
                        <button className="btn-primary" onClick={handleSetWorkingDays} style={{ width: '100%', padding: '0.75rem', fontSize: '0.85rem' }}>Update Month Target</button>
                    </div>

                    <div className="card-base" style={{ padding: '1rem', flex: 1 }}>
                        <h4 style={{ fontSize: '0.8rem', marginBottom: '0.75rem', color: '#64748B', fontWeight: 800, textTransform: 'uppercase' }}>Recent Targets</h4>
                        <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                            {workingDays.map(w => (
                                <div key={w.month} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', borderBottom: '1px solid #E2E8F0' }}>
                                    <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#1E293B' }}>{w.month}</span>
                                    <span style={{ padding: '2px 8px', background: '#F1F5F9', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>{w.days} Working Days</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Holidays Section */}
                <div className="card-base" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column' }}>
                    <h3 style={{ color: '#1A237E', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem' }}>
                        <FiCalendar /> Holidays & Closures
                    </h3>
                    
                    {/* Add Holiday Form */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem', backgroundColor: '#F8FAFC', padding: '1.25rem', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem' }}>
                            <div className="input-group" style={{ marginBottom: 0 }}>
                                <label style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748B' }}>Start Date</label>
                                <input type="date" value={holidayForm.startDate} onChange={e => setHolidayForm({...holidayForm, startDate: e.target.value})} style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid #CBD5E1', width: '100%' }} />
                            </div>
                            <div className="input-group" style={{ marginBottom: 0 }}>
                                <label style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748B' }}>End Date (Opt)</label>
                                <input type="date" value={holidayForm.endDate} onChange={e => setHolidayForm({...holidayForm, endDate: e.target.value})} style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid #CBD5E1', width: '100%' }} />
                            </div>
                            <div className="input-group" style={{ marginBottom: 0 }}>
                                <label style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748B' }}>Type</label>
                                <select value={holidayForm.type} onChange={e => setHolidayForm({...holidayForm, type: e.target.value})} style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid #CBD5E1', width: '100%' }}>
                                    <option value="Holiday">Full Holiday</option>
                                    <option value="No Class">No Class</option>
                                    <option value="Half Day">Half Day</option>
                                </select>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div className="input-group" style={{ marginBottom: 0 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                                    <label style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748B', margin: 0 }}>Target Classes</label>
                                    <button onClick={handleToggleAllStandards} style={{ fontSize: '0.65rem', background: 'none', border: 'none', color: 'var(--primary-blue)', cursor: 'pointer', fontWeight: 700, padding: 0 }}>
                                        {holidayForm.targetStandards.length === standards.length ? 'Clear All' : 'Select All'}
                                    </button>
                                </div>
                                <div style={{ 
                                    display: 'flex', flexWrap: 'wrap', gap: '0.4rem', maxHeight: '140px', overflowY: 'auto',
                                    padding: '0.5rem', background: '#fff', borderRadius: '8px', border: '1px solid #CBD5E1'
                                }}>
                                    {standards.map(s => {
                                        const isSelected = holidayForm.targetStandards.includes(s.standard);
                                        return (
                                            <div 
                                                key={s.id}
                                                onClick={() => {
                                                    const newStds = isSelected 
                                                        ? holidayForm.targetStandards.filter(i => i !== s.standard)
                                                        : [...holidayForm.targetStandards, s.standard];
                                                    setHolidayForm({...holidayForm, targetStandards: newStds});
                                                }}
                                                style={{ 
                                                    padding: '0.35rem 0.75rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600,
                                                    cursor: 'pointer', transition: 'all 0.2s',
                                                    backgroundColor: isSelected ? 'var(--primary-blue)' : '#F1F5F9',
                                                    color: isSelected ? '#fff' : '#475569',
                                                    border: `1px solid ${isSelected ? 'var(--primary-blue)' : '#E2E8F0'}`,
                                                }}
                                            >
                                                {s.standard}
                                            </div>
                                        );
                                    })}
                                    {standards.length === 0 && <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>No standards found</span>}
                                </div>
                            </div>

                            <div className="input-group" style={{ marginBottom: 0 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                                    <label style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748B', margin: 0 }}>Target Subjects</label>
                                    <button onClick={handleToggleAllSubjects} style={{ fontSize: '0.65rem', background: 'none', border: 'none', color: 'var(--primary-blue)', cursor: 'pointer', fontWeight: 700, padding: 0 }}>
                                        {getFilteredSubjects().every(s => holidayForm.targetSubjects.includes(s.name)) && getFilteredSubjects().length > 0 ? 'Clear All' : 'Select All'}
                                    </button>
                                </div>
                                <div style={{ 
                                    display: 'flex', flexWrap: 'wrap', gap: '0.4rem', maxHeight: '140px', overflowY: 'auto',
                                    padding: '0.5rem', background: '#fff', borderRadius: '8px', border: '1px solid #CBD5E1'
                                }}>
                                    {getFilteredSubjects().map(sub => {
                                        const isSelected = holidayForm.targetSubjects.includes(sub.name);
                                        return (
                                            <div 
                                                key={sub.id}
                                                onClick={() => {
                                                    const newSubs = isSelected 
                                                        ? holidayForm.targetSubjects.filter(i => i !== sub.name)
                                                        : [...holidayForm.targetSubjects, sub.name];
                                                    setHolidayForm({...holidayForm, targetSubjects: newSubs});
                                                }}
                                                style={{ 
                                                    padding: '0.35rem 0.75rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600,
                                                    cursor: 'pointer', transition: 'all 0.2s',
                                                    backgroundColor: isSelected ? 'var(--success-green)' : '#F1F5F9',
                                                    color: isSelected ? '#fff' : '#475569',
                                                    border: `1px solid ${isSelected ? 'var(--success-green)' : '#E2E8F0'}`,
                                                }}
                                            >
                                                {sub.name}
                                            </div>
                                        );
                                    })}
                                    {getFilteredSubjects().length === 0 && (
                                        <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>
                                            {holidayForm.targetStandards.length > 0 ? 'No subjects found for selected classes' : 'No subjects found'}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="input-group" style={{ marginBottom: 0 }}>
                            <label style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748B' }}>Description / Reason</label>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <input type="text" placeholder="e.g. Diwali Break / Exam Prep" value={holidayForm.description} onChange={e => setHolidayForm({...holidayForm, description: e.target.value})} style={{ flex: 1, padding: '0.5rem', borderRadius: '6px', border: '1px solid #CBD5E1' }} />
                                <button className="btn-primary" onClick={handleAddHoliday} style={{ padding: '0.5rem 1rem' }}><FiPlus /> Save Holiday(s)</button>
                            </div>
                        </div>
                    </div>

                    <div style={{ flex: 1, overflowY: 'auto' }}>
                        {/* Desktop Table View */}
                        <div className="desktop-only" style={{ border: '1px solid #E2E8F0', borderRadius: '8px', overflow: 'hidden' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead style={{ backgroundColor: '#F8FAFC' }}>
                                    <tr style={{ textAlign: 'left', borderBottom: '1px solid #E2E8F0' }}>
                                        <th style={{ padding: '0.75rem', fontSize: '0.75rem', color: '#64748B' }}>Date</th>
                                        <th style={{ padding: '0.75rem', fontSize: '0.75rem', color: '#64748B' }}>Event</th>
                                        <th style={{ padding: '0.75rem', fontSize: '0.75rem', color: '#64748B' }}>Type</th>
                                        <th style={{ padding: '0.75rem', textAlign: 'center' }}></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {holidays.map(h => {
                                        // Parse tags
                                        const stdMatch = h.description.match(/\[Std: (.*?)\]/);
                                        const subMatch = h.description.match(/\[Sub: (.*?)\]/);
                                        const cleanDesc = h.description.replace(/\[Std: .*?\]/g, '').replace(/\[Sub: .*?\]/g, '').trim();

                                        return (
                                            <tr key={h.id} style={{ borderBottom: '1px solid #E2E8F0' }}>
                                                <td style={{ padding: '0.75rem', fontSize: '0.8rem' }}>{new Date(h.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</td>
                                                <td style={{ padding: '0.75rem' }}>
                                                    <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{cleanDesc}</div>
                                                    <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.25rem' }}>
                                                        {stdMatch && <span style={{ fontSize: '0.65rem', background: '#E0F2FE', color: '#0369A1', padding: '1px 6px', borderRadius: '4px', fontWeight: 700 }}>{stdMatch[1]}</span>}
                                                        {subMatch && <span style={{ fontSize: '0.65rem', background: '#F0FDF4', color: '#166534', padding: '1px 6px', borderRadius: '4px', fontWeight: 700 }}>{subMatch[1]}</span>}
                                                    </div>
                                                </td>
                                                <td style={{ padding: '0.75rem' }}>
                                                    <span style={{ 
                                                        fontSize: '0.65rem', padding: '2px 8px', borderRadius: '12px',
                                                        background: h.type === 'Holiday' ? '#FEE2E2' : h.type === 'Half Day' ? '#FEF3C7' : '#E0E7FF',
                                                        color: h.type === 'Holiday' ? '#B91C1C' : h.type === 'Half Day' ? '#92400E' : '#3730A3',
                                                        fontWeight: 800, textTransform: 'uppercase'
                                                    }}>{h.type}</span>
                                                </td>
                                                <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                                                    <button onClick={() => handleDeleteHoliday(h.id)} style={{ color: '#EF4444', background: 'transparent', border: 'none', cursor: 'pointer' }}><FiTrash2 /></button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile List View */}
                        <div className="mobile-only" style={{ display: 'grid', gap: '0.75rem' }}>
                            {holidays.map(h => {
                                const stdMatch = h.description.match(/\[Std: (.*?)\]/);
                                const subMatch = h.description.match(/\[Sub: (.*?)\]/);
                                const cleanDesc = h.description.replace(/\[Std: .*?\]/g, '').replace(/\[Sub: .*?\]/g, '').trim();

                                return (
                                    <div key={h.id} className="card-base" style={{ padding: '0.75rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F8FAFC' }}>
                                        <div>
                                            <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#1E293B' }}>{cleanDesc}</div>
                                            <div style={{ fontSize: '0.7rem', color: '#64748B', marginTop: '2px' }}>
                                                {h.date} • {h.type}
                                                {(stdMatch || subMatch) && (
                                                    <span style={{ marginLeft: '0.5rem', color: 'var(--primary-blue)', fontWeight: 600 }}>
                                                        ({stdMatch ? stdMatch[1] : ''}{stdMatch && subMatch ? ' - ' : ''}{subMatch ? subMatch[1] : ''})
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <button onClick={() => handleDeleteHoliday(h.id)} style={{ color: '#EF4444', background: 'none', border: 'none', padding: '0.5rem' }}><FiTrash2 /></button>
                                    </div>
                                );
                            })}
                        </div>

                        {holidays.length === 0 && !loading && (
                            <div style={{ padding: '2rem', textAlign: 'center', color: '#94A3B8' }}>
                                <FiAlertCircle size={30} style={{ marginBottom: '0.5rem', opacity: 0.3 }} />
                                <p style={{ fontSize: '0.85rem' }}>No holidays defined yet.</p>
                            </div>
                        )}
                    </div>
                </div>

            </div>

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

export default AcademicCalendar;
