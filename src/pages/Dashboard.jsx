import React, { useState, useEffect } from 'react';
import { FiUsers, FiClock, FiDollarSign, FiAlertCircle, FiUserCheck } from 'react-icons/fi';
import MetricCard from '../components/MetricCard';
import ActivityFeed from '../components/ActivityFeed';

const Dashboard = () => {
  const [metrics, setMetrics] = useState({ totalStudents: 0, feesCollected: 0, defaulters: 0, presentTeachers: 0, totalTeachers: 0, activities: [] });

  useEffect(() => {
    const fetchMetrics = async () => {
      const token = localStorage.getItem('token');
      try {
        const res = await fetch(`/api/reports?t=${Date.now()}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setMetrics({
            totalStudents: data.students?.totalStudents || 0,
            feesCollected: data.revenue || 0,
            defaulters: data.students?.defaulters || 0,
            presentTeachers: data.teachers?.totalTeachers || 0,
            totalTeachers: data.teachers?.totalTeachers || 0,
            activities: data.activities || []
          });
        }
      } catch (err) {
        console.error("Failed to fetch metrics");
      }
    };
    fetchMetrics();
  }, []);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard Overview</h1>
          <p className="page-subtitle">Welcome back, Admin. Real-time insights from the database.</p>
        </div>
      </div>

      <div style={{ 
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem' 
      }}>
        <MetricCard title="Total Students" value={metrics.totalStudents} subtitle="Active Students" icon={<FiUsers size={24} />} />
        <MetricCard title="Fees Collected" value={`₹${(metrics.feesCollected || 0).toLocaleString()}`} subtitle="In Total" icon={<FiDollarSign size={24} />} color="var(--success-green)" />
        <MetricCard title="Fee Alerts" value={metrics.defaulters} subtitle="Active Defaulters" icon={<FiAlertCircle size={24} />} color="var(--danger-red)" />
        <MetricCard title="Teachers" value={`${metrics.presentTeachers} / ${metrics.totalTeachers}`} subtitle="Total Faculty Count" icon={<FiUserCheck size={24} />} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem', alignItems: 'start', maxWidth: '800px' }}>
        <ActivityFeed data={metrics.activities} />
      </div>
    </div>
  );
};

export default Dashboard;
