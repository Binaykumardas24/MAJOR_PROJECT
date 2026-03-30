import React from 'react';
import Navbar from '../components/Navbar';
import '../App.css';

const AboutUs = () => {
  return (
    <>
      <Navbar />
      <div className="about-container">
        <div className="about-card about-intro section-fade-in">
          <h1>About Us</h1>
          <p>Your gateway to smarter, faster, and more effective interview preparation.</p>
        </div>

        <div className="about-card about-mission section-slide-in-left">
          <h2>Mission & Vision</h2>
          <p>Empowering candidates and recruiters with AI-driven tools for seamless, unbiased, and insightful interview experiences.</p>
        </div>

        <div className="about-card about-features section-slide-in-right">
          <h2>Features / What Makes Us Special</h2>
          <ul>
            <li>Real-time AI feedback</li>
            <li>Mock interviews with instant scoring</li>
            <li>Comprehensive analytics dashboard</li>
            <li>Personalized question sets</li>
            <li>Face and voice analysis</li>
          </ul>
        </div>

        <div className="about-card about-team section-fade-in">
          <h2>Team</h2>
          <div className="about-team-row">
            {[1,2,3,4].map((n) => (
              <div key={n} className="about-team-member">
                <div className="about-team-avatar">
                  <span>Photo</span>
                </div>
                <div className="about-team-name">Name</div>
                <div className="about-team-role">Role</div>
              </div>
            ))}
          </div>
          <p>Our passionate team of developers, data scientists, and HR experts is dedicated to revolutionizing the interview process.</p>
        </div>

        <div className="about-card about-techstack section-slide-in-left">
          <h2>Tech Stack</h2>
          <ul>
            <li>React.js, Node.js, Express</li>
            <li>Python, FastAPI</li>
            <li>Machine Learning & Deep Learning</li>
            <li>PostgreSQL, MongoDB</li>
            <li>Docker, AWS</li>
          </ul>
        </div>

        <div className="about-card about-why section-slide-in-right">
          <h2>Why We Built This</h2>
          <p>To bridge the gap between talent and opportunity by leveraging AI for fair, efficient, and insightful interviews.</p>
        </div>

        <div className="about-card about-contact section-fade-in">
          <h2>Contact</h2>
          <p>Email: contact@ai-interview.com</p>
          <p>LinkedIn: <a href="https://linkedin.com/company/ai-interview" target="_blank" rel="noopener noreferrer">AI Interview</a></p>
        </div>
      </div>
    </>
  );
};

export default AboutUs;
