import React from 'react';
import { FiCheckCircle, FiClock, FiAlertCircle } from 'react-icons/fi';

const ActivityFeed = ({ data = [] }) => {
  return (
    <div className="card" style={{ height: '100%' }}>
      <h3 style={{ marginBottom: '1.5rem', fontSize: '1.1rem' }}>Recent Activity</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {data.length === 0 ? (
           <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center', padding: '1rem' }}>No recent activities logged.</p>
        ) : data.map((activity, idx) => (
          <div key={idx} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
            <div style={{ 
              color: activity.type === 'success' ? 'var(--success-green)' : activity.type === 'warning' ? 'var(--accent-gold)' : 'var(--primary-blue)', 
              marginTop: '0.2rem' 
            }}>
              {activity.type === 'success' ? <FiCheckCircle /> : <FiClock />}
            </div>
            <div>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: 500 }}>{activity.text}</p>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{activity.time}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ActivityFeed;
