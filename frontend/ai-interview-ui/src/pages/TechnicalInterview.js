import React from "react";
import { useNavigate } from "react-router-dom";
import "../App.css";
import MiniNavbar from "../components/MiniNavbar";

import techImg from "../assets/tech.png";
import mistakeImg from "../assets/mistake.png";

function TechnicalInterview() {
  const navigate = useNavigate();

  return (
    <div className="mock-page reveal">
      <MiniNavbar />

      {/* ✅ HERO */}
      <div className="mock-hero tech-hero">
        <div>
          <h1>Technical Interview</h1>
          <p>
            Prepare for coding rounds, algorithms, system design, and core CS
            concepts with AI guidance.
          </p>

          <button
            className="mock-btn"
            onClick={() => navigate("/topics/technical")}
          >
            Start Technical Mock Interview →
          </button>
        </div>

        <img
          src={techImg}
          alt="Technical Interview"
          className="mock-hero-img"
        />
      </div>

      {/* ✅ INTERVIEW MODES SECTION */}
      <div className="mock-section">
        {/* ✅ Header Row Like HR */}
        <div className="section-header-row">
          <h2 className="section-title">Interview Modes</h2>

          <button
            className="small-start-btn"
            onClick={() => navigate("/topics/technical")}
          >
            Start Technical Mock Interview →
          </button>
        </div>

        {/* ✅ CONSOLIDATED CONTENT SECTIONS */}
        <div style={{ marginTop: '30px' }}>
          {/* What you'll learn box */}
          <div style={{
            position: 'relative',
            padding: '24px',
            backgroundColor: '#f8f9fa',
            borderRadius: '12px',
            border: '1px solid #e9ecef',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            transition: 'background-color 0.3s ease, box-shadow 0.3s ease',
            marginBottom: '32px'
          }}>
            {/* Header design top left */}
            <div style={{
              position: 'absolute',
              top: '-18px',
              left: '24px',
              background: 'linear-gradient(90deg, #FFD600 0%, #FF9800 100%)',
              borderRadius: '24px 24px 0 0',
              color: '#fff',
              fontWeight: 'bold',
              fontSize: '20px',
              padding: '10px 32px 8px 32px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              zIndex: 2
            }}>
              What you'll learn
            </div>
            <ul style={{ marginTop: '32px', marginBottom: 0, paddingLeft: '24px', color: '#333', fontSize: '17px', boxShadow: 'none' }}>
              <li style={{ boxShadow: 'none', background: 'none', transform: 'none' }}>Core computer science fundamentals and theoretical knowledge</li>
              <li style={{ boxShadow: 'none', background: 'none', transform: 'none' }}>Problem-solving techniques and efficient coding practices</li>
              <li style={{ boxShadow: 'none', background: 'none', transform: 'none' }}>Designing scalable and robust software systems</li>
            </ul>
          </div>

          {/* Question types box */}
          <div style={{
            position: 'relative',
            padding: '24px',
            backgroundColor: '#f0f8ff',
            borderRadius: '12px',
            border: '1px solid #b3d9ff',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            transition: 'background-color 0.3s ease, box-shadow 0.3s ease'
          }}>
            {/* Header design top left */}
            <div style={{
              position: 'absolute',
              top: '-18px',
              left: '24px',
              background: 'linear-gradient(90deg, #D32F2F 0%, #B71C1C 100%)',
              borderRadius: '24px 24px 0 0',
              color: '#fff',
              fontWeight: 'bold',
              fontSize: '20px',
              padding: '10px 32px 8px 32px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              zIndex: 2
            }}>
              Question types
            </div>
            <ul style={{ marginTop: '32px', marginBottom: 0, paddingLeft: '24px', color: '#333', fontSize: '17px', boxShadow: 'none' }}>
              <li style={{ boxShadow: 'none', background: 'none', transform: 'none' }}>DBMS queries, OS concepts, Network protocols, OOPS principles, Data structures basics</li>
              <li style={{ boxShadow: 'none', background: 'none', transform: 'none' }}>Array/string algorithms, Tree/graph problems, Dynamic programming, Sorting/searching algorithms</li>
              <li style={{ boxShadow: 'none', background: 'none', transform: 'none' }}>Designing large-scale applications, Database schema design, API architecture, Caching strategies, Load balancing</li>
            </ul>
          </div>
        </div>
      </div>

      {/* ✅ COMMON MISTAKES BOX */}
      <div className="mistake-box">
        <div>
          <h2>⚠ Common Mistakes</h2>
          <ul>
            <li>Jumping into coding without understanding the problem</li>
            <li>Ignoring edge cases and constraints</li>
            <li>Not explaining your approach clearly</li>
          </ul>
        </div>

        <img
          src={mistakeImg}
          alt="Technical Mistakes Illustration"
          className="mistake-img"
        />
      </div>

      {/* ✅ FOOTER */}
      <div className="bottom-footer">
        Prepared by AI Powered Interview System
      </div>
    </div>
  );
}

export default TechnicalInterview;
