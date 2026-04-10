import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import MobileNav from './components/MobileNav';
import Dashboard from './pages/Dashboard';
import StudentManagement from './pages/StudentManagement';
import FeesPayment from './pages/FeesPayment';
import TestScheduler from './pages/TestScheduler';
import DigitalLibrary from './pages/DigitalLibrary';
import Login from './pages/Login';
import TeacherManagement from './pages/TeacherManagement';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import SubjectMaster from './pages/SubjectMaster';
import StandardMaster from './pages/StandardMaster';
import FeeReports from './pages/FeeReports';
import AttendanceRegistry from './pages/AttendanceRegistry';
import AlertAudit from './pages/AlertAudit';
import CollegeMaster from './pages/CollegeMaster';
import LandingPage from './pages/LandingPage';
import AttendanceReports from './pages/AttendanceReports';
import AcademicCalendar from './pages/AcademicCalendar';
import MobileMenu from './pages/MobileMenu';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      setIsAuthenticated(true);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      const pingInterval = setInterval(() => {
        const token = localStorage.getItem('token');
        if (token) {
          fetch('/api/system/ping', { headers: { 'Authorization': `Bearer ${token}` } }).catch(() => null);
        }
      }, 10000); // 10s heartbeat
      return () => clearInterval(pingInterval);
    }
  }, [isAuthenticated]);

  if (loading) return null;

  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage isAuthenticated={isAuthenticated} />} />
        <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" /> : <Login setAuth={setIsAuthenticated} />} />

        {/* Protected Dashboard Area */}
        {isAuthenticated ? (
          <Route path="/*" element={
            <div className="app-layout">
              <Sidebar />
              <div className="main-workspace">
                <Header />
                <MobileNav />
                <div className="content-area">
                  <Routes>
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/students" element={<StudentManagement />} />
                    <Route path="/teachers" element={<TeacherManagement />} />
                    <Route path="/fees" element={<FeesPayment />} />
                    <Route path="/tests" element={<TestScheduler />} />
                    <Route path="/library" element={<DigitalLibrary />} />
                    <Route path="/subjects" element={<SubjectMaster />} />
                    <Route path="/reports" element={<Reports />} />
                    <Route path="/colleges" element={<CollegeMaster />} />
                    <Route path="/standards" element={<StandardMaster />} />
                    <Route path="/fee-reports" element={<FeeReports />} />
                    <Route path="/attendance" element={<AttendanceRegistry />} />
                    <Route path="/attendance-reports" element={<AttendanceReports />} />
                    <Route path="/academic-calendar" element={<AcademicCalendar />} />
                    <Route path="/alerts" element={<AlertAudit />} />
                    <Route path="/settings" element={<Settings />} />
                    <Route path="/menu" element={<MobileMenu />} />
                    <Route path="*" element={<Navigate to="/dashboard" />} />
                  </Routes>
                </div>
              </div>
            </div>
          } />
        ) : (
          <Route path="*" element={<Navigate to="/" />} />
        )}
      </Routes>
    </Router>
  );
}

export default App;
