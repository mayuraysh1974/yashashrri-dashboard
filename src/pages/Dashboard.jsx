import React, { useState, useEffect } from 'react';
import { FiUsers, FiClock, FiDollarSign, FiAlertCircle, FiUserCheck } from 'react-icons/fi';
import MetricCard from '../components/MetricCard';
import ActivityFeed from '../components/ActivityFeed';
import { supabase } from '../supabaseClient';

const Dashboard = () => {
  const [metrics, setMetrics] = useState({ totalStudents: 0, feesCollected: 0, defaulters: 0, presentTeachers: 0, totalTeachers: 0, activities: [] });

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        // Fetch Total Students
        const { count: studentCount } = await supabase
          .from('students')
          .select('*', { count: 'exact', head: true });

        // Fetch Total Fees Collected
        const { data: feesData } = await supabase
          .from('fees')
          .select('amount_paid');
        const revenue = feesData?.reduce((sum, f) => sum + (f.amount_paid || 0), 0) || 0;

        // Fetch Defaulters
        const { count: defaulterCount } = await supabase
          .from('students')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'Defaulter');

        // Fetch Teachers
        const { count: teacherCount } = await supabase
          .from('teachers')
          .select('*', { count: 'exact', head: true });

        setMetrics({
          totalStudents: studentCount || 0,
          feesCollected: revenue,
          defaulters: defaulterCount || 0,
          presentTeachers: teacherCount || 0, // Simplified for now
          totalTeachers: teacherCount || 0,
          activities: [] // Activities can be implemented later with a separate table
        });
      } catch (err) {
        console.error("Failed to fetch metrics", err);
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
