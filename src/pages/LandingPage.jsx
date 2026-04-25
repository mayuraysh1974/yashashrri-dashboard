import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import './LandingPage.css';

const LandingPage = ({ isAuthenticated }) => {
  const [galleryItems, setGalleryItems] = useState([]);
  const [enquiryForm, setEnquiryForm] = useState({ student_name: '', standard: '', phone: '' });
  const [enquiryStatus, setEnquiryStatus] = useState({ loading: false, success: false, error: null });

  useEffect(() => {
    fetchGallery();
  }, []);

  const fetchGallery = async () => {
    try {
      const { data, error } = await supabase
        .from('gallery_items')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(6);
      if (data) setGalleryItems(data);
    } catch (err) {
      console.error("Error fetching gallery:", err);
    }
  };

  const handleEnquirySubmit = async (e) => {
    e.preventDefault();
    setEnquiryStatus({ loading: true, success: false, error: null });
    try {
      const { error } = await supabase.from('enquiries').insert([enquiryForm]);
      if (error) throw error;
      setEnquiryStatus({ loading: false, success: true, error: null });
      setEnquiryForm({ student_name: '', standard: '', phone: '' });
    } catch (err) {
      setEnquiryStatus({ loading: false, success: false, error: err.message });
    }
  };

  return (
    <div className="landing-container">
      {/* Navigation */}
      <nav className="landing-nav">
        <div className="landing-logo" style={{ height: '100%', display: 'flex', alignItems: 'center' }}>
          <img src="/logo.png" alt="Yashashrri Logo" className="logo-img" style={{ height: '100%', width: 'auto', display: 'block', objectFit: 'contain' }} />
        </div>
        <div className="landing-nav-links desktop-only">
          <a href="#features">Features</a>
          <a href="#gallery">Gallery</a>
          <a href="#contact">Contact</a>
          <Link to="/admission" style={{ fontWeight: 'bold', color: '#B8860B' }}>Online Admission</Link>
          <Link to="/pay-fees" style={{ fontWeight: 'bold', color: '#B8860B' }}>Pay Fees</Link>
          <Link to="/portal" style={{ fontWeight: 'bold', color: '#B8860B' }}>Student Portal</Link>
        </div>
        <div className="nav-actions">
          {isAuthenticated && (
            <Link to="/dashboard" className="login-btn">ERP Portal</Link>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <header className="hero-section">
        <div className="hero-content">
          <h1>Empowering Minds, <br /><span className="text-highlight">Shaping Futures</span></h1>
          <p>Join Yashashrri Classes for a transformative educational experience that combines traditional excellence with modern innovation since 1999.</p>
          <div className="hero-cta" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <button className="cta-primary" onClick={() => document.getElementById('enquiry').scrollIntoView({ behavior: 'smooth' })}>Enquire Now</button>
            <Link to="/portal" className="cta-secondary" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1A237E', color: 'white', border: 'none' }}>Student Portal</Link>
            <Link to="/admission" className="cta-secondary" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Apply Online</Link>
          </div>
        </div>
        <div className="hero-image-container">
          <img src="/hero.png" alt="Yashashrri Classes Excellence" className="hero-img" onError={(e) => { e.target.onerror = null; e.target.src = 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'; }} />
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

      {/* Gallery Section */}
      <section id="gallery" style={{ padding: '6rem 5%', background: '#fff' }}>
        <div className="section-header">
          <h2>Campus <span className="text-highlight">Life</span></h2>
          <p>Glimpses of our vibrant learning environment and celebrations.</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', marginTop: '3rem' }}>
          {galleryItems.length > 0 ? galleryItems.map((item) => (
            <div key={item.id} style={{ borderRadius: '12px', overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', background: '#000', position: 'relative', paddingTop: '75%' }}>
              {item.type === 'photo' ? (
                <img src={item.url} alt={item.title} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.5s ease', cursor: 'pointer' }} onMouseOver={(e) => e.target.style.transform = 'scale(1.05)'} onMouseOut={(e) => e.target.style.transform = 'scale(1)'} />
              ) : (
                <video src={item.url} controls style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
              )}
              <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', padding: '1rem', background: 'linear-gradient(transparent, rgba(0,0,0,0.8))', color: '#fff' }}>
                <h4 style={{ margin: 0, fontSize: '1.1rem' }}>{item.title}</h4>
              </div>
            </div>
          )) : (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '4rem', color: '#64748b', background: '#F8FAFC', borderRadius: '12px' }}>
              <p>Check back later for photos and videos from our events!</p>
            </div>
          )}
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
          <h2>Submit an <span className="text-highlight">Enquiry</span></h2>
          <p>Fill out the form below and our counselor will get in touch with you shortly.</p>
        </div>
        <div style={{ maxWidth: '600px', margin: '0 auto', background: '#F8FAFC', padding: '3rem', borderRadius: '16px', boxShadow: '0 20px 40px rgba(0,0,0,0.05)', border: '1px solid #E2E8F0' }}>
          {enquiryStatus.success ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <div style={{ background: '#dcfce3', color: '#166534', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
                Thank you! Your enquiry has been received. We will contact you soon.
              </div>
              <button 
                onClick={() => setEnquiryStatus({ loading: false, success: false, error: null })}
                className="cta-secondary"
                style={{ background: 'transparent', border: '1px solid #B8860B', color: '#B8860B', padding: '0.5rem 1.5rem', borderRadius: '4px', cursor: 'pointer' }}
              >
                Submit another enquiry
              </button>
            </div>
          ) : (
            <form onSubmit={handleEnquirySubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {enquiryStatus.error && (
                <div style={{ padding: '1rem', background: '#fee2e2', color: '#991b1b', borderRadius: '4px' }}>
                  {enquiryStatus.error}
                </div>
              )}
              <div className="input-group">
                <label style={{ fontWeight: 600, color: '#1A237E', marginBottom: '0.5rem', display: 'block' }}>Student Name</label>
                <input 
                  type="text" 
                  value={enquiryForm.student_name}
                  onChange={(e) => setEnquiryForm({...enquiryForm, student_name: e.target.value})}
                  required
                  placeholder="Full Name" 
                  style={{ width: '100%', padding: '1rem', borderRadius: '8px', border: '1px solid #CBD5E1' }} 
                />
              </div>
              <div className="input-group">
                <label style={{ fontWeight: 600, color: '#1A237E', marginBottom: '0.5rem', display: 'block' }}>Standard / Class</label>
                <select 
                  value={enquiryForm.standard}
                  onChange={(e) => setEnquiryForm({...enquiryForm, standard: e.target.value})}
                  required
                  style={{ width: '100%', padding: '1rem', borderRadius: '8px', border: '1px solid #CBD5E1' }}
                >
                  <option value="">Select Standard</option>
                  <option value="VIII">VIII</option>
                  <option value="IX">IX</option>
                  <option value="X">X</option>
                  <option value="XI">XI</option>
                  <option value="XII">XII</option>
                </select>
              </div>
              <div className="input-group">
                <label style={{ fontWeight: 600, color: '#1A237E', marginBottom: '0.5rem', display: 'block' }}>Parent's Contact Phone</label>
                <input 
                  type="tel" 
                  value={enquiryForm.phone}
                  onChange={(e) => setEnquiryForm({...enquiryForm, phone: e.target.value})}
                  required
                  placeholder="+91 00000 00000" 
                  style={{ width: '100%', padding: '1rem', borderRadius: '8px', border: '1px solid #CBD5E1' }} 
                />
              </div>
              <button disabled={enquiryStatus.loading} type="submit" className="cta-primary" style={{ border: 'none', cursor: 'pointer' }}>
                {enquiryStatus.loading ? 'Submitting...' : 'Submit Enquiry'}
              </button>
            </form>
          )}
        </div>
      </section>

      {/* Location Section */}
      <section className="location-section" style={{ padding: '8rem 5%', background: '#F8FAFC' }}>
        <div className="section-header">
          <h2>Find <span className="text-highlight">Us</span></h2>
          <p>We have two branches in Talegaon Dabhade, Pune. Visit us anytime!</p>
        </div>

        {/* Branch Tab Switcher */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', margin: '2.5rem 0 2rem 0', flexWrap: 'wrap' }}>
          <button
            id="branch-tab-main"
            onClick={() => {
              document.getElementById('map-main').style.display = 'block';
              document.getElementById('map-branch2').style.display = 'none';
              document.getElementById('branch-tab-main').style.background = '#1A237E';
              document.getElementById('branch-tab-main').style.color = '#fff';
              document.getElementById('branch-tab-2').style.background = 'transparent';
              document.getElementById('branch-tab-2').style.color = '#1A237E';
            }}
            style={{ padding: '0.7rem 2rem', borderRadius: '8px', border: '2px solid #1A237E', background: '#1A237E', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '0.95rem', transition: 'all 0.2s' }}
          >
            📍 Main Branch — Vaidya Colony
          </button>
          <button
            id="branch-tab-2"
            onClick={() => {
              document.getElementById('map-main').style.display = 'none';
              document.getElementById('map-branch2').style.display = 'block';
              document.getElementById('branch-tab-2').style.background = '#1A237E';
              document.getElementById('branch-tab-2').style.color = '#fff';
              document.getElementById('branch-tab-main').style.background = 'transparent';
              document.getElementById('branch-tab-main').style.color = '#1A237E';
            }}
            style={{ padding: '0.7rem 2rem', borderRadius: '8px', border: '2px solid #1A237E', background: 'transparent', color: '#1A237E', fontWeight: 700, cursor: 'pointer', fontSize: '0.95rem', transition: 'all 0.2s' }}
          >
            📍 Silverwinds Branch — Dnyaneshwar Nagar
          </button>
        </div>

        {/* Branch Info Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '1.25rem 1.5rem', boxShadow: '0 4px 12px rgba(0,0,0,0.04)' }}>
            <div style={{ fontWeight: 800, color: '#1A237E', marginBottom: '0.4rem', fontSize: '1rem' }}>🏛️ Main Branch</div>
            <p style={{ color: '#475569', fontSize: '0.9rem', margin: 0, lineHeight: 1.6 }}>"Shree Ekveera Prasad", Vaidya Colony, Nr. Axis Bank ATM, Talegaon Dabhade, Pune – 410506</p>
          </div>
          <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '1.25rem 1.5rem', boxShadow: '0 4px 12px rgba(0,0,0,0.04)' }}>
            <div style={{ fontWeight: 800, color: '#1A237E', marginBottom: '0.4rem', fontSize: '1rem' }}>🏛️ Silverwinds Branch</div>
            <p style={{ color: '#475569', fontSize: '0.9rem', margin: 0, lineHeight: 1.6 }}>C2, Dnyaneshwar Nagar, Nr. Jijamata Chowk, Silverwinds, Talegaon Dabhade, Pune – 410506</p>
          </div>
        </div>

        {/* Map Container */}
        <div style={{ width: '100%', borderRadius: '12px', overflow: 'hidden', border: '3px solid #B8860B', boxShadow: '0 20px 40px rgba(0,0,0,0.1)' }}>
          {/* Main Branch Map */}
          <div id="map-main" style={{ width: '100%', height: '420px' }}>
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d1889.360987178125!2d73.6828063!3d18.720747700000003!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3bc2b1be0bbac2ab%3A0xafda9691d7bca1c4!2sYASHASHRRI%20CLASES!5e0!3m2!1sen!2sin!4v1712500000000!5m2!1sen!2sin"
              width="100%"
              height="100%"
              style={{ border: 0, display: 'block' }}
              allowFullScreen=""
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Main Branch Location"
            ></iframe>
          </div>
          {/* Silverwinds Branch Map */}
          <div id="map-branch2" style={{ width: '100%', height: '420px', display: 'none' }}>
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3778.1!2d73.6805!3d18.7195!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3bc2b1c000000001%3A0x0!2sSilverwinds%2C%20Dnyaneshwar%20Nagar%2C%20Talegaon%20Dabhade!5e0!3m2!1sen!2sin!4v1712500000001!5m2!1sen!2sin"
              width="100%"
              height="100%"
              style={{ border: 0, display: 'block' }}
              allowFullScreen=""
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Silverwinds Branch Location"
            ></iframe>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="testimonials-section" style={{ padding: '8rem 5%', background: '#FFFFFF' }}>
        <div className="section-header">
          <h2>Voices of <span className="text-highlight">Success</span></h2>
          <p>Read what our students and parents have to say about their journey with us.</p>
        </div>
        <div className="testimonials-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2.5rem', marginTop: '4rem' }}>
          <div className="testimonial-card" style={{ background: '#F8FAFC', padding: '3rem 2rem', borderRadius: '16px', boxShadow: '0 10px 30px rgba(0,0,0,0.05)', position: 'relative' }}>
            <div style={{ color: '#B8860B', fontSize: '3rem', position: 'absolute', top: '1rem', right: '2rem', opacity: 0.2 }}>"</div>
            <p style={{ fontStyle: 'italic', color: '#475569', marginBottom: '2rem', fontSize: '1.1rem', lineHeight: '1.7' }}>
              "The personalized attention at Yashashrri Classes is truly unique. My daughter's confidence in Mathematics grew significantly within just a few months."
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: 'linear-gradient(135deg, #1A237E, #B8860B)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>AM</div>
              <div>
                <h4 style={{ margin: 0, color: '#1A237E' }}>Anjali Maydeo</h4>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748B' }}>Parent of XII Student</p>
              </div>
            </div>
          </div>
          <div className="testimonial-card" style={{ background: '#F8FAFC', padding: '3rem 2rem', borderRadius: '16px', boxShadow: '0 10px 30px rgba(0,0,0,0.05)', position: 'relative' }}>
            <div style={{ color: '#B8860B', fontSize: '3rem', position: 'absolute', top: '1rem', right: '2rem', opacity: 0.2 }}>"</div>
            <p style={{ fontStyle: 'italic', color: '#475569', marginBottom: '2rem', fontSize: '1.1rem', lineHeight: '1.7' }}>
              "The digitized concepts and animations made complex physics topics so easy to visualize. It's not just rote learning here; it's true understanding."
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: 'linear-gradient(135deg, #1A237E, #B8860B)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>RS</div>
              <div>
                <h4 style={{ margin: 0, color: '#1A237E' }}>Rahul Shinde</h4>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748B' }}>Ex-Student, 2024 Batch</p>
              </div>
            </div>
          </div>
          <div className="testimonial-card" style={{ background: '#F8FAFC', padding: '3rem 2rem', borderRadius: '16px', boxShadow: '0 10px 30px rgba(0,0,0,0.05)', position: 'relative' }}>
            <div style={{ color: '#B8860B', fontSize: '3rem', position: 'absolute', top: '1rem', right: '2rem', opacity: 0.2 }}>"</div>
            <p style={{ fontStyle: 'italic', color: '#475569', marginBottom: '2rem', fontSize: '1.1rem', lineHeight: '1.7' }}>
              "Self-made assignments and notes provided by Yashashrri were my go-to resources during board exams. They cover everything perfectly."
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: 'linear-gradient(135deg, #1A237E, #B8860B)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>VG</div>
              <div>
                <h4 style={{ margin: 0, color: '#1A237E' }}>Vaishnavi G.</h4>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748B' }}>XII Student</p>
              </div>
            </div>
          </div>
          <div className="testimonial-card" style={{ background: '#F8FAFC', padding: '3rem 2rem', borderRadius: '16px', boxShadow: '0 10px 30px rgba(0,0,0,0.05)', position: 'relative' }}>
            <div style={{ color: '#B8860B', fontSize: '3rem', position: 'absolute', top: '1rem', right: '2rem', opacity: 0.2 }}>"</div>
            <p style={{ fontStyle: 'italic', color: '#475569', marginBottom: '2rem', fontSize: '1.05rem', lineHeight: '1.9' }}>
              "पालक म्हणून सांगायचे तर, गेल्या दोन वर्षात माझ्या पाल्यामध्ये झालेली प्रगती पाहून मी खूप समाधानी आहे. मयुरेश सर आणि उज्वला मॅडम, रश्मी मॅडम मुलांकडे वैयक्तिक लक्ष देतात, ज्यामुळे अभ्यासासोबतच त्यांची शिस्तही सुधारली आहे. तुमच्या मेहनतीबद्दल खूप खूप धन्यवाद!"
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: 'linear-gradient(135deg, #1A237E, #B8860B)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', flexShrink: 0, fontSize: '0.75rem' }}>रसु</div>
              <div>
                <h4 style={{ margin: 0, color: '#1A237E' }}>राजेश सुर्यवंशी</h4>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748B' }}>Parent of Std XII Student</p>
              </div>
            </div>
          </div>
          <div className="testimonial-card" style={{ background: '#F8FAFC', padding: '3rem 2rem', borderRadius: '16px', boxShadow: '0 10px 30px rgba(0,0,0,0.05)', position: 'relative' }}>
            <div style={{ color: '#B8860B', fontSize: '3rem', position: 'absolute', top: '1rem', right: '2rem', opacity: 0.2 }}>"</div>
            <p style={{ fontStyle: 'italic', color: '#475569', marginBottom: '2rem', fontSize: '1.05rem', lineHeight: '1.8' }}>
              "Joining Mayuraysh Sir's classes was a turning point for my Boards and CET preparation. The transition from regular syllabus to competitive testing was seamless. The constant support and mock tests gave me the confidence I needed. Truly grateful for the guidance!"
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: 'linear-gradient(135deg, #1A237E, #B8860B)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', flexShrink: 0 }}>PS</div>
              <div>
                <h4 style={{ margin: 0, color: '#1A237E' }}>Pranav Suryawanshi</h4>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748B' }}>XIIth Std Student</p>
              </div>
            </div>
          </div>
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
            <a href="#gallery">Gallery</a>
            <Link to="/admission">Online Admission</Link>
            <Link to="/pay-fees">Pay Fees Online</Link>
            <Link to="/portal">Student Portal</Link>
            <Link to="/login" style={{ marginTop: '1rem', color: '#64748b', fontSize: '0.9rem' }}>Staff Portal (Admin)</Link>
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
