import React from 'react';
import { FiSearch, FiBell } from 'react-icons/fi';

const Header = () => {
  return (
    <div className="top-header no-print">
      <div className="header-brand">
         <span style={{ fontWeight: 800, color: 'var(--primary-blue)', fontSize: '1.2rem' }}>YASHASHRRI</span>
         <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginLeft: '0.5rem' }}>ERP</span>
      </div>

      <div className="header-actions">
        <button style={{ background: 'transparent', fontSize: '1.25rem', color: 'var(--text-secondary)', padding: '0.4rem' }}>
          <FiBell />
        </button>
        <div className="user-profile" style={{ cursor: 'pointer' }} onClick={() => { localStorage.removeItem('token'); window.location.reload(); }}>
          <div className="avatar" style={{ backgroundColor: 'var(--danger-red)', color: 'white' }}>L</div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>Logout</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Click to sign out</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Header;
