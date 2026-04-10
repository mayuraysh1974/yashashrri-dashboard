import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, 
  PieChart, Pie, Cell 
} from 'recharts';
import { FiTrendingUp, FiUsers, FiAlertTriangle, FiCheckSquare } from 'react-icons/fi';

const COLORS = ['#1A237E', '#D4AF37', '#10B981', '#EF4444', '#64748B'];

const Reports = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch('/api/reports', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) setData(await res.json());
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
                <Bar dataKey="expected" name="Expected" fill="#E2E8F0" radius={[4, 4, 0, 0]} />
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
                 <Tooltip />
                 <Bar dataKey="avgScore" name="Avg Score" fill="var(--primary-blue)" radius={[4, 4, 0, 0]} />
               </BarChart>
             </ResponsiveContainer>
           </div>
        </div>

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
      </div>

      <div className="card-base" style={{ marginTop: '1.5rem', padding: '1.5rem' }}>
        <h3 style={{ color: 'var(--primary-blue)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <FiAlertTriangle style={{color: 'var(--danger-red)'}} /> Immediate Action: Top Arrears
        </h3>
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
      </div>
    </div>
  );
};

export default Reports;
