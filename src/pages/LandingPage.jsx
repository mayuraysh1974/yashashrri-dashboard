import React from 'react';
import { Link } from 'react-router-dom';
import './LandingPage.css';

const LandingPage = ({ isAuthenticated }) => {
  return (
    <div className="landing-container">
      {/* Navigation */}
      <nav className="landing-nav">
        <div className="landing-logo" style={{ height: '100%', display: 'flex', alignItems: 'center' }}>
          <img src="/logo.png" alt="Yashashrri Logo" className="logo-img" style={{ height: '100%', width: 'auto', display: 'block', objectFit: 'contain' }} />
        </div>
        <div className="landing-nav-links desktop-only">
          <a href="#features">Features</a>
          <a href="#about">About</a>
          <a href="#contact">Contact</a>
        </div>
        <div className="nav-actions">
          {isAuthenticated ? (
            <Link to="/dashboard" className="login-btn">ERP Portal</Link>
          ) : (
            <Link to="/login" className="login-btn">Admin Login</Link>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <header className="hero-section">
        <div className="hero-content">
          <h1>Empowering Minds, <br /><span className="text-highlight">Shaping Futures</span></h1>
          <p>Join Yashashrri Classes for a transformative educational experience that combines traditional excellence with modern innovation since 1999.</p>
          <div className="hero-cta">
            <button className="cta-primary" onClick={() => document.getElementById('enquiry').scrollIntoView({ behavior: 'smooth' })}>Enrol Now</button>
            <button className="cta-secondary" onClick={() => document.getElementById('features').scrollIntoView({ behavior: 'smooth' })}>Explore Features</button>
          </div>
        </div>
        <div className="hero-image-container">
          <img src="/hero.png" alt="Yashashrri Classes Excellence" className="hero-img" />
          <div className="hero-badge" style={{ padding: '2rem 1.5rem', textAlign: 'center', minWidth: '220px' }}>
            <span className="badge-number">27 Years</span>
            <span className="badge-text">of Empirical Success in Education</span>
          </div>
        </div>
      </header>

      {/* Features Section */}
      <section id="features" className="features-section">
        <div className="section-header">
          <h2>Our <span className="text-highlight">Commitment</span> to Success</h2>
          <p>Delivering excellence through personalized care and superior academic resources.</p>
        </div>
        
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">👤</div>
            <h3>Personal Attention</h3>
            <p>Every student is unique. We provide focused guidance tailored to individual learning needs.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🪑</div>
            <h3>Limited Seats per Batch</h3>
            <p>Small batch sizes ensure meaningful interaction and a high-quality learning environment.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🤝</div>
            <h3>Regular Parent Interaction</h3>
            <p>Strong partnership between teachers and parents through consistent updates and meetings.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">📈</div>
            <h3>Personal Progress Analysis</h3>
            <p>Scientific tracking and data-driven feedback on every student's academic growth.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">📝</div>
            <h3>Self-made Assignments & Notes</h3>
            <p>Comprehensive, printed notes and exclusive assignments designed by our expert faculty.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">✨</div>
            <h3>Digitized Concepts</h3>
            <p>Interactive animations and visual aids to simplify and clarify complex scientific concepts.</p>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="stats-section">
        <div className="stat-item">
          <span className="stat-number">1000+</span>
          <span className="stat-label">Students Guided</span>
        </div>
        <div className="stat-item">
          <span className="stat-number">100%</span>
          <span className="stat-label">Success Rate</span>
        </div>
        <div className="stat-item">
          <span className="stat-number">3</span>
          <span className="stat-label">Experienced Mentors</span>
        </div>
        <div className="stat-item">
          <span className="stat-number">100%</span>
          <span className="stat-label">Commitment</span>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="about-section">
        <div className="about-content">
          <h2>Our <span className="text-highlight">Vision</span></h2>
          <p>At Yashashrri Classes, we believe in more than just academic results. Our mission is to foster critical thinking, creativity, and a lifelong passion for learning in every student.</p>
          <ul className="about-list">
            <li>Personalized Learning Paths</li>
            <li>Interactive Teaching Methods</li>
            <li>Holistic Development Programs</li>
          </ul>
        </div>
      </section>

      {/* Enquiry Section */}
      <section id="enquiry" className="enquiry-section" style={{ padding: '8rem 5%', background: '#FFFFFF' }}>
        <div className="section-header">
          <h2>Take the <span className="text-highlight">First Step</span></h2>
          <p>Fill out the form below and our counselor will get in touch with you shortly.</p>
        </div>
        <div style={{ maxWidth: '600px', margin: '0 auto', background: '#F8FAFC', padding: '3rem', borderRadius: '16px', boxShadow: '0 20px 40px rgba(0,0,0,0.05)', border: '1px solid #E2E8F0' }}>
          <form style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="input-group">
              <label style={{ fontWeight: 600, color: '#1A237E', marginBottom: '0.5rem', display: 'block' }}>Student Name</label>
              <input type="text" placeholder="Full Name" style={{ width: '100%', padding: '1rem', borderRadius: '8px', border: '1px solid #CBD5E1', focusBorderColor: '#B8860B' }} />
            </div>
            <div className="input-group">
              <label style={{ fontWeight: 600, color: '#1A237E', marginBottom: '0.5rem', display: 'block' }}>Standard / Class</label>
              <select style={{ width: '100%', padding: '1rem', borderRadius: '8px', border: '1px solid #CBD5E1' }}>
                <option>Select Standard</option>
                <option>8th Standard</option>
                <option>9th Standard</option>
                <option>10th Standard</option>
                <option>11th Science</option>
                <option>12th Science</option>
              </select>
            </div>
            <div className="input-group">
              <label style={{ fontWeight: 600, color: '#1A237E', marginBottom: '0.5rem', display: 'block' }}>Parent's Contact Phone</label>
              <input type="tel" placeholder="+91 00000 00000" style={{ width: '100%', padding: '1rem', borderRadius: '8px', border: '1px solid #CBD5E1' }} />
            </div>
            <button type="submit" className="cta-primary" style={{ border: 'none', cursor: 'pointer' }}>Submit Enquiry</button>
          </form>
        </div>
      </section>

      {/* Location Section */}
      <section className="location-section" style={{ padding: '8rem 5%', background: '#F8FAFC' }}>
        <div className="section-header">
          <h2>Find <span className="text-highlight">Us</span></h2>
          <p>Visit our main branch for a campus tour and career counseling.</p>
        </div>
        <div style={{ width: '100%', height: '450px', borderRadius: '12px', overflow: 'hidden', border: '3px solid #B8860B', boxShadow: '0 20px 40px rgba(0,0,0,0.1)' }}>
          <iframe 
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d1889.360987178125!2d73.6828063!3d18.720747700000003!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3bc2b1be0bbac2ab%3A0xafda9691d7bca1c4!2sYASHASHRRI%20CLASES!5e0!3m2!1sen!2sin!4v1712500000000!5m2!1sen!2sin" 
            width="100%" 
            height="100%" 
            style={{ border: 0 }} 
            allowFullScreen="" 
            loading="lazy" 
            referrerPolicy="no-referrer-when-downgrade"
            title="Main Branch Location"
          ></iframe>
        </div>
      </section>

      {/* Footer */}
      <footer id="contact" className="landing-footer">
        <div className="footer-grid">
          <div className="footer-info">
            <img src="/logo.png" alt="Yashashrri Logo" className="footer-logo" style={{ width: '600px', maxWidth: '100%', marginBottom: '2.5rem', display: 'block' }} />
            <p style={{ fontSize: '1.2rem' }}>Empowering students to achieve academic excellence since 1999.</p>
          </div>
          <div className="footer-links">
            <h4>Quick Links</h4>
            <a href="/">Home</a>
            <a href="#features">Features</a>
            <a href="#about">About</a>
          </div>
          <div className="footer-contact">
            <h4>Contact Details</h4>
            <p><strong>Main Branch:</strong> "Shree Ekveera Prasad", Vaidya Colony, Nr. Axis bank ATM, Talegaon Dabhade, PUNE - 410506</p>
            <p><strong>Silverwinds Branch:</strong> C2, Dnyaneshwar Nagar, Nr. Jijamata Chowk, Talegaon Dabhade, PUNE - 410506</p>
            <p><strong>Email:</strong> mayuraysh1974@gmail.com</p>
            <p><strong>Phone:</strong> +91 73874 20737</p>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; 2026 Yashashrri Classes. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
