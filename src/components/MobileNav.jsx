import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  FiHome, 
  FiUsers, 
  FiDollarSign, 
  FiCheckCircle, 
  FiMoreHorizontal 
} from 'react-icons/fi';
import './MobileNav.css';

const MobileNav = () => {
  return (
    <nav className="mobile-nav no-print">
      <NavLink to="/dashboard" className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}>
        <FiHome />
        <span>Home</span>
      </NavLink>
      <NavLink to="/students" className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}>
        <FiUsers />
        <span>Students</span>
      </NavLink>
      <NavLink to="/attendance" className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}>
        <FiCheckCircle />
        <span>Attendance</span>
      </NavLink>
      <NavLink to="/fees" className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}>
        <FiDollarSign />
        <span>Fees</span>
      </NavLink>
      <NavLink to="/menu" className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}>
        <FiMoreHorizontal />
        <span>More</span>
      </NavLink>
    </nav>
  );
};

export default MobileNav;
