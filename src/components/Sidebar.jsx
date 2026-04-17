import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  FiHome, 
  FiUsers, 
  FiUserCheck, 
  FiDollarSign, 
  FiCalendar, 
  FiBarChart2, 
  FiSettings, 
  FiBookOpen,
  FiFileText,
  FiLayers,
  FiCheckCircle,
  FiBell,
  FiTrendingUp
} from 'react-icons/fi';

const Sidebar = () => {
  const routes = [
    { path: '/dashboard', name: 'Dashboard', icon: <FiHome /> },
    { path: '/students', name: 'Student Management', icon: <FiUsers /> },
    { path: '/teachers', name: 'Teacher Management', icon: <FiUserCheck /> },
    { path: '/fees', name: 'Fee Section', icon: <FiDollarSign /> },
    { path: '/tests', name: 'Test Scheduler', icon: <FiFileText /> },
    { path: '/library', name: 'Digital Library', icon: <FiBookOpen /> },
    { path: '/attendance', name: 'Student Attendance', icon: <FiCheckCircle /> },
    { path: '/attendance-reports', name: 'Attendance Reports', icon: <FiBarChart2 /> },
    { path: '/academic-calendar', name: 'Academic Calendar', icon: <FiCalendar /> },
    { path: '/alerts', name: 'Communication Logs', icon: <FiBell /> },
    { path: '/colleges', name: 'College Master', icon: <FiFileText /> },
    {"path": "/subjects", "name": "Subject Master", "icon": <FiFileText />},
    { path: '/standards', name: 'Standard Master', icon: <FiLayers /> },
    { path: '/fee-reports', name: 'Fee Reports', icon: <FiDollarSign /> },
    { path: '/academic-reports', name: 'Academic Reports', icon: <FiTrendingUp /> },
    { path: '/reports', name: 'Dashboard Analytics', icon: <FiBarChart2 /> },
    { path: '/settings', name: 'Settings', icon: <FiSettings /> },
    { path: '/enquiries', name: 'Web Enquiries', icon: <FiBarChart2 /> },
    { path: '/gallery-management', name: 'Gallery Management', icon: <FiLayers /> },
  ];

  return (
    <div className="sidebar no-print">
      <div className="brand">
        <img src="/logo.png" alt="Yashashrri Logo" style={{ width: '100%', maxWidth: '260px', margin: '0 auto', display: 'block' }} onError={(e) => { e.target.onerror = null; e.target.style.display = 'none'; e.target.nextElementSibling.style.display = 'block'; }} />
        <div style={{ display: 'none', textAlign: 'center' }}>
          <div className="brand-title">YASHASHRRI CLASSES</div>
          <div className="brand-tagline">BUILDING BRIDGES TO SUCCESS</div>
        </div>
      </div>
      <div className="nav-links">
        {routes.map((route) => (
          <NavLink 
            key={route.path} 
            to={route.path} 
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            {route.icon}
            <span>{route.name}</span>
          </NavLink>
        ))}
      </div>
    </div>
  );
};

export default Sidebar;
