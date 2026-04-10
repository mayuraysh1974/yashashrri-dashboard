import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  FiUserCheck, 
  FiFileText, 
  FiBookOpen, 
  FiBarChart2, 
  FiCalendar, 
  FiBell, 
  FiLayers, 
  FiSettings,
  FiChevronRight
} from 'react-icons/fi';
import './MobileMenu.css';

const MobileMenu = () => {
  const menuItems = [
    { path: '/teachers', name: 'Teacher Management', icon: <FiUserCheck /> },
    { path: '/tests', name: 'Test Scheduler', icon: <FiFileText /> },
    { path: '/library', name: 'Digital Library', icon: <FiBookOpen /> },
    { path: '/attendance-reports', name: 'Attendance Reports', icon: <FiBarChart2 /> },
    { path: '/academic-calendar', name: 'Academic Calendar', icon: <FiCalendar /> },
    { path: '/alerts', name: 'Communication Logs', icon: <FiBell /> },
    { path: '/colleges', name: 'College Master', icon: <FiFileText /> },
    { path: '/subjects', name: 'Subject Master', icon: <FiFileText /> },
    { path: '/standards', name: 'Standard Master', icon: <FiLayers /> },
    { path: '/fee-reports', name: 'Fee Reports', icon: <FiBarChart2 /> },
    { path: '/settings', name: 'Settings', icon: <FiSettings /> },
  ];

  return (
    <div className="mobile-menu-container">
      <h2 className="menu-title">Main Menu</h2>
      <div className="menu-grid">
        {menuItems.map((item) => (
          <NavLink key={item.path} to={item.path} className="menu-list-item">
            <div className="item-left">
              <span className="item-icon">{item.icon}</span>
              <span className="item-name">{item.name}</span>
            </div>
            <FiChevronRight className="chevron" />
          </NavLink>
        ))}
      </div>
    </div>
  );
};

export default MobileMenu;
