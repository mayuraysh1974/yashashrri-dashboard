import React from 'react';

const MetricCard = ({ title, value, subtitle, icon, color = "var(--primary-blue)" }) => {
  return (
    <div className="card" style={{ borderTopColor: color }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h3 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>{title}</h3>
          <h2 style={{ fontSize: '1.8rem', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>{value}</h2>
          {subtitle && <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{subtitle}</p>}
        </div>
        <div style={{ padding: '0.75rem', backgroundColor: `color-mix(in srgb, ${color} 10%, transparent)`, borderRadius: '12px', color: color }}>
          {icon}
        </div>
      </div>
    </div>
  );
};

export default MetricCard;
