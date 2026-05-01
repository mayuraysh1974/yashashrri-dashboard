import React from 'react';

const MetricCard = ({ title, value, subtitle, icon, color = "var(--primary-blue)" }) => {
  return (
    <div className="card app-card-mobile" style={{ borderTopColor: color }}>
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
      <style>{`
        @media (max-width: 768px) {
           .app-card-mobile {
              flex: 0 0 240px;
              scroll-snap-align: start;
              box-shadow: 0 8px 20px rgba(0,0,0,0.05);
              border-radius: 20px;
              border: 1px solid #F1F5F9;
              padding: 20px !important;
              background: white;
           }
        }
      `}</style>
    </div>
  );
};

export default MetricCard;
