import React from "react";
import { useNavigate } from "react-router-dom";
import "../App.css";
import MiniNavbar from "../components/MiniNavbar";

import hrImg from "../assets/hr.png";
import mistakeImg from "../assets/mistake.png";

function HRInterview() {
  const navigate = useNavigate();

  return (
    <div className="mock-page reveal">
      <MiniNavbar />

      {/* ✅ HERO */}
      <div className="mock-hero beh-hero">
        <div>
          <h1>HR & Behavioral Interview</h1>
          <p>
            Practice communication, confidence, personality-based HR questions, teamwork, leadership, and STAR-based behavioral questions with AI feedback.
          </p>
          <button
            className="mock-btn"
            onClick={() => navigate("/topics/hr")}
          >
            Start HR/Behavioral Mock Interview →
          </button>
        </div>
        <img src={hrImg} alt="HR Interview" className="mock-hero-img" />
      </div>

      {/* ✅ PRACTICE MODES HEADER ROW */}
      <div className="mock-section">
        <div className="section-header-row">
          <h2 className="section-title">Practice Modes</h2>

          <button
            className="small-start-btn"
            onClick={() => navigate("/topics/hr")}
          >
            Start HR Mock Interview →
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
              <li style={{ boxShadow: 'none', background: 'none', transform: 'none' }}>Basic communication skills and interview etiquette</li>
              <li style={{ boxShadow: 'none', background: 'none', transform: 'none' }}>Structured answering techniques and company research</li>
              <li style={{ boxShadow: 'none', background: 'none', transform: 'none' }}>Negotiation skills and handling difficult questions</li>
              <li style={{ boxShadow: 'none', background: 'none', transform: 'none' }}>Effective communication and conflict resolution in teams</li>
              <li style={{ boxShadow: 'none', background: 'none', transform: 'none' }}>STAR method (Situation, Task, Action, Result) for structured answers</li>
              <li style={{ boxShadow: 'none', background: 'none', transform: 'none' }}>Managing stress and maintaining composure under pressure</li>
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
              <li style={{ boxShadow: 'none', background: 'none', transform: 'none' }}>Tell me about yourself, Why this company, Basic strengths/weaknesses</li>
              <li style={{ boxShadow: 'none', background: 'none', transform: 'none' }}>Why this role, Company culture fit, Career goals and aspirations</li>
              <li style={{ boxShadow: 'none', background: 'none', transform: 'none' }}>Salary expectations, Previous failures, Handling criticism, Exit scenarios</li>
              <li style={{ boxShadow: 'none', background: 'none', transform: 'none' }}>Teamwork examples, Resolving conflicts, Working with difficult colleagues</li>
              <li style={{ boxShadow: 'none', background: 'none', transform: 'none' }}>Leadership experiences, Problem-solving scenarios, Achievement examples</li>
              <li style={{ boxShadow: 'none', background: 'none', transform: 'none' }}>High-pressure situations, Meeting deadlines, Crisis management, Work-life balance</li>
            </ul>
          </div>
        </div>
      </div>

      {/* ✅ COMMON MISTAKES BOX */}
      <div className="mistake-box">
        <div>
          <h2>⚠ Common Mistakes</h2>
          <ul>
            <li>Speaking too fast or with unclear pronunciation</li>
            <li>Not preparing specific examples beforehand</li>
            <li>Failing to research the company and role</li>
          </ul>
        </div>

        <img
          src={mistakeImg}
          alt="HR Mistakes Illustration"
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

export default HRInterview;
