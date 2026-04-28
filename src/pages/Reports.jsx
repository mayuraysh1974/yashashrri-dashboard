import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, 
  PieChart, Pie, Cell 
} from 'recharts';
import { FiTrendingUp, FiUsers, FiAlertTriangle, FiCheckSquare } from 'react-icons/fi';
import { supabase } from '../supabaseClient';

const COLORS = ['#1A237E', '#D4AF37', '#10B981', '#EF4444', '#64748B'];

const Reports = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      // Total revenue
      const { data: feesData } = await supabase.from('fees').select('amount_paid');
      const revenue = (feesData || []).reduce((sum, f) => sum + (f.amount_paid || 0), 0);

      // Students
      const { count: totalStudents } = await supabase.from('students').select('*', { count: 'exact', head: true });
      const { count: defaulterCount } = await supabase.from('students').select('*', { count: 'exact', head: true }).eq('status', 'Defaulter');

      // Teachers payroll
      const { data: teachersData } = await supabase.from('teachers').select('salary');
      const totalPayroll = (teachersData || []).reduce((sum, t) => sum + (t.salary || 0), 0);

      // Monthly revenue — last 6 months
      const now = new Date();
      const monthlyRevenue = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const label = d.toLocaleString('default', { month: 'short' });
        
        const startDate = `${year}-${month}-01`;
        const nextMonthDate = new Date(year, d.getMonth() + 1, 1);
        const endDate = `${nextMonthDate.getFullYear()}-${String(nextMonthDate.getMonth() + 1).padStart(2, '0')}-01`;

        const { data: mFees } = await supabase
          .from('fees')
          .select('amount_paid')
          .gte('payment_date', startDate)
          .lt('payment_date', endDate);

        const collected = (mFees || []).reduce((s, f) => s + (f.amount_paid || 0), 0);
        monthlyRevenue.push({ name: label, collected, expected: 0 });
      }

      // Subject stats (students per subject)
      const { data: studs } = await supabase.from('students').select('subjects');
      const subjectMap = {};
      (studs || []).forEach(s => {
        if (Array.isArray(s.subjects)) {
          s.subjects.forEach(sub => {
            subjectMap[sub] = (subjectMap[sub] || 0) + 1;
          });
        }
      });
      const subjectStats = Object.entries(subjectMap).map(([name, value]) => ({ name, value }));

      // Test performance
      const { data: testsData } = await supabase.from('tests').select('id, name, total_marks');
      const testPerformance = [];
      for (const test of (testsData || []).slice(0, 6)) {
        const { data: results } = await supabase.from('test_results').select('score').eq('test_id', test.id);
        if (results && results.length > 0) {
          const avg = results.reduce((s, r) => s + r.score, 0) / results.length;
          const pct = test.total_marks > 0 ? Math.round((avg / test.total_marks) * 100) : 0;
          testPerformance.push({ name: test.name, avgScore: pct });
        }
      }

      // Top defaulters
      const { data: defaulters } = await supabase.from('students').select('id, name, standard, balance').eq('status', 'Defaulter').order('balance', { ascending: true }).limit(10);

      setData({
        revenue,
        students: { totalStudents: totalStudents || 0, defaulters: defaulterCount || 0 },
        teachers: { totalPayroll },
        monthlyRevenue,
        subjectStats,
        testPerformance,
        defaulters: (defaulters || []).map(d => ({ ...d, balance: Math.abs(d.balance || 0) }))
      });
    } catch (err) {
      console.error('Failed to fetch reports:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !data) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading Analytics...</div>;
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Reports & Analytics</h1>
          <p className="page-subtitle">Interactive trends, enrollment, and collection metrics</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
        <div className="card-base" style={{ padding: '1.5rem', borderLeft: '4px solid var(--success-green)' }}>
          <h3 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Total Revenue</h3>
          <p style={{ fontSize: '1.8rem', color: 'var(--primary-blue)', fontWeight: 700 }}>₹{data.revenue?.toLocaleString() || 0}</p>
        </div>
        <div className="card-base" style={{ padding: '1.5rem', borderLeft: '4px solid var(--accent-gold)' }}>
          <h3 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Defaulters</h3>
          <p style={{ fontSize: '1.8rem', color: 'var(--danger-red)', fontWeight: 700 }}>{data.students?.defaulters || 0} <span style={{fontSize: '1rem', color: 'var(--text-muted)'}}>/ {data.students?.totalStudents || 0}</span></p>
        </div>
        <div className="card-base" style={{ padding: '1.5rem', borderLeft: '4px solid var(--primary-blue)' }}>
          <h3 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Monthly Payroll</h3>
          <p style={{ fontSize: '1.8rem', color: 'var(--primary-blue)', fontWeight: 700 }}>₹{data.teachers?.totalPayroll?.toLocaleString() || 0}</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '1.5rem' }}>
        <div className="card-base" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ color: 'var(--primary-blue)', marginBottom: '1rem', fontSize: '1rem' }}><FiTrendingUp /> Monthly Collection Trend</h3>
          <div style={{ flex: 1, minHeight: '250px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.monthlyRevenue}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={12} />
                <YAxis axisLine={false} tickLine={false} tickFormatter={(val) => `₹${val/1000}k`} fontSize={12} />
                <Tooltip />
                <Legend />
                <Bar dataKey="collected" name="Collected" fill="var(--accent-gold)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card-base" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column' }}>
           <h3 style={{ color: 'var(--primary-blue)', marginBottom: '1rem', fontSize: '1rem' }}><FiCheckSquare /> Test Performance (% Avg)</h3>
           <div style={{ flex: 1, minHeight: '250px' }}>
             <ResponsiveContainer width="100%" height="100%">
               <BarChart data={data.testPerformance}>
                 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                 <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={12} />
                 <YAxis axisLine={false} tickLine={false} tickFormatter={(val) => `${val}%`} fontSize={10} />
                 <Tooltip formatter={(value) => [`${value}%`, 'Avg. Performance']} />
                 <Bar dataKey="avgScore" name="Avg. Performance" fill="var(--primary-blue)" radius={[4, 4, 0, 0]} />
               </BarChart>
             </ResponsiveContainer>
           </div>
        </div>

        {data.subjectStats.length > 0 && (
          <div className="card-base" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ color: 'var(--primary-blue)', marginBottom: '1rem', fontSize: '1rem' }}><FiUsers /> Subject Distribution</h3>
            <div style={{ flex: 1, minHeight: '250px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie 
                    data={data.subjectStats} dataKey="value" nameKey="name" cx="50%" cy="50%" 
                    innerRadius={50} outerRadius={80} paddingAngle={5} label={{ fontSize: 10 }}
                  >
                    {data.subjectStats?.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend iconSize={10} wrapperStyle={{ fontSize: '10px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      <div className="card-base" style={{ marginTop: '1.5rem', padding: '1.5rem' }}>
        <h3 style={{ color: 'var(--primary-blue)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <FiAlertTriangle style={{color: 'var(--danger-red)'}} /> Immediate Action: Top Arrears
        </h3>
        {data.defaulters?.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '1rem' }}>No defaulters currently. 🎉</p>
        ) : (
          <table style={{width: '100%', borderCollapse: 'collapse'}}>
            <thead>
              <tr style={{textAlign: 'left', borderBottom: '2px solid var(--border-color)'}}>
                <th style={{padding: '1rem 0.5rem'}}>Student Name</th>
                <th style={{padding: '1rem 0.5rem'}}>Standard</th>
                <th style={{padding: '1rem 0.5rem', textAlign: 'right'}}>Pending Amount</th>
              </tr>
            </thead>
            <tbody>
              {data.defaulters?.map(d => (
                <tr key={d.id} style={{borderBottom: '1px solid var(--border-color)'}}>
                  <td style={{padding: '0.75rem 0.5rem', fontWeight: 600}}>{d.name}</td>
                  <td style={{padding: '0.75rem 0.5rem', color: 'var(--text-secondary)', fontSize: '0.85rem'}}>{d.standard}</td>
                  <td style={{padding: '0.75rem 0.5rem', textAlign: 'right', fontWeight: 700, color: 'var(--danger-red)'}}>₹{d.balance.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default Reports;
