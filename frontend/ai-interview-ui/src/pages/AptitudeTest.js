import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import "../App.css";
import logo from "../assets/logo.png";

function AptitudeTest() {
  const navigate = useNavigate();
  const location = useLocation();
  const aptitudeQuestions = [
    {
      q: "What is the next number in the sequence: 2, 4, 8, 16, ?",
      a: "32"
    },
    {
      q: "If a train travels 60 km in 1 hour, how long will it take to travel 180 km?",
      a: "3"
    },
    {
      q: "Which word is the odd one out: Apple, Banana, Carrot, Grape?",
      a: "Carrot"
    },
    {
      q: "What is 15% of 200?",
      a: "30"
    }
  ];
  const [current, setCurrent] = useState(0);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    setSubmitted(true);
    setFeedback(
      answer.trim().toLowerCase() === aptitudeQuestions[current].a.toLowerCase()
        ? "Correct!"
        : `Incorrect. The correct answer is: ${aptitudeQuestions[current].a}`
    );
  };
  const handleNext = () => {
    setCurrent((prev) => prev + 1);
    setAnswer("");
    setFeedback("");
    setSubmitted(false);
  };

  return (
    <div className="mock-page reveal">
      <div className="category-topnav">
        <img 
          src={logo} 
          alt="APIS Logo" 
          style={{
            height: '60px',
            width: '60px',
            borderRadius: '50%',
            border: '3px solid #007bff',
            marginRight: '10px'
          }}
        />
        <div style={{ display: "flex", alignItems: "center", gap: "0px" }}>
          <h3 style={{ margin: 0 }}>APIS</h3>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Link to="/" style={{ padding: '8px 12px', borderRadius: '4px', transition: 'all 0.3s', ...(location.pathname === '/' ? { backgroundColor: 'rgba(255,255,255,0.2)', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', transform: 'scale(1.05)' } : {}) }}>Home</Link>
          <Link to="/hr-interview" style={{ padding: '8px 12px', borderRadius: '4px', transition: 'all 0.3s', ...(location.pathname === '/hr-interview' ? { backgroundColor: 'rgba(255,255,255,0.2)', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', transform: 'scale(1.05)' } : {}) }}>HR/Behavioral</Link>
          <Link to="/technical-interview" style={{ padding: '8px 12px', borderRadius: '4px', transition: 'all 0.3s', ...(location.pathname === '/technical-interview' ? { backgroundColor: 'rgba(255,255,255,0.2)', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', transform: 'scale(1.05)' } : {}) }}>Technical</Link>
          <Link to="/mock-interview" style={{ padding: '8px 12px', borderRadius: '4px', transition: 'all 0.3s', ...(location.pathname === '/mock-interview' ? { backgroundColor: 'rgba(255,255,255,0.2)', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', transform: 'scale(1.05)' } : {}) }}>Mock</Link>
          <Link to="/aptitude-test" style={{ padding: '8px 12px', borderRadius: '4px', transition: 'all 0.3s', ...(location.pathname === '/aptitude-test' ? { backgroundColor: 'rgba(255,255,255,0.2)', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', transform: 'scale(1.05)' } : {}) }}>Aptitude</Link>
          {(() => {
            const user = JSON.parse(localStorage.getItem("user"));
            const profileImage = user?.profile_image || null;
            const userInitial = user?.email ? user.email[0].toUpperCase() : "U";
            let userDisplayName = "User";
            if (user?.first_name && user?.last_name) {
              userDisplayName = `${user.first_name} ${user.last_name}`;
            } else if (user?.first_name) {
              userDisplayName = user.first_name;
            } else if (user?.email) {
              userDisplayName = user.email.split("@")[0];
            }
            return user ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="username">{userDisplayName}</span>
                <span className="profile-icon" style={{ width: 32, height: 32, borderRadius: '50%', background: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600 }}>
                  {profileImage ? <img src={profileImage} alt="profile" style={{ width: 32, height: 32, borderRadius: '50%' }} /> : userInitial}
                </span>
              </span>
            ) : null;
          })()}
        </div>
      </div>

      {/* HERO */}
      <div className="mock-hero" style={{ background: 'linear-gradient(90deg, #009688 0%, #4DD0E1 100%)' }}>
        <div>
          <h1>Aptitude Test</h1>
          <p>
            Test your logical reasoning, quantitative, and verbal skills. Practice with instant feedback and improve your score.
          </p>
          <button className="mock-btn" onClick={() => navigate("/aptitude-test")}>Start Aptitude Test →</button>
        </div>
      </div>

      {/* PRACTICE MODES HEADER ROW */}
      <div className="mock-section">
        <div className="section-header-row">
          <h2 className="section-title">Practice Modes</h2>
          <button className="small-start-btn" onClick={() => navigate("/aptitude-test")}>Start Aptitude →</button>
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
              <li style={{ boxShadow: 'none', background: 'none', transform: 'none' }}>Mathematical reasoning and numerical problem-solving skills</li>
              <li style={{ boxShadow: 'none', background: 'none', transform: 'none' }}>Analytical thinking and pattern recognition abilities</li>
              <li style={{ boxShadow: 'none', background: 'none', transform: 'none' }}>Language proficiency and comprehension skills</li>
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
              <li style={{ boxShadow: 'none', background: 'none', transform: 'none' }}>Arithmetic, Algebra, Geometry, Data interpretation, Percentage/profit-loss calculations</li>
              <li style={{ boxShadow: 'none', background: 'none', transform: 'none' }}>Series completion, Analogies, Blood relations, Seating arrangements, Syllogisms</li>
              <li style={{ boxShadow: 'none', background: 'none', transform: 'none' }}>Reading comprehension, Grammar, Vocabulary, Synonyms/antonyms, Sentence correction</li>
            </ul>
          </div>
        </div>
      </div>

      {/* INTERACTIVE APTITUDE TEST */}
      <div className="mock-section">
        <div className="section-title">Interactive Aptitude Test</div>
        <div style={{ maxWidth: 600, margin: "40px auto", padding: 24, background: "#fff", borderRadius: 12, boxShadow: "0 2px 12px #eee" }}>
          <div style={{ marginBottom: 18, fontWeight: 600 }}>
            Question {current + 1} of {aptitudeQuestions.length}
          </div>
          <div style={{ fontSize: 18, marginBottom: 18 }}>{aptitudeQuestions[current].q}</div>
          <input
            value={answer}
            onChange={e => setAnswer(e.target.value)}
            placeholder="Type your answer..."
            style={{ width: "100%", marginBottom: 12, padding: 8, borderRadius: 6, border: "1px solid #ccc" }}
            disabled={submitted}
          />
          {!submitted ? (
            <button style={{ background: "#1976D2", color: "#fff", padding: "8px 24px", borderRadius: 6 }} onClick={handleSubmit}>
              Submit Answer
            </button>
          ) : (
            <div>
              <div style={{ margin: "12px 0", color: feedback.startsWith("Correct") ? "#2E7D32" : "#D32F2F" }}>{feedback}</div>
              {current < aptitudeQuestions.length - 1 ? (
                <button style={{ background: "#4B2E83", color: "#fff", padding: "8px 24px", borderRadius: 6 }} onClick={handleNext}>
                  Next Question
                </button>
              ) : (
                <div style={{ marginTop: 18, fontWeight: 600, color: "#1976D2" }}>Test Complete! Great job.</div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* COMMON MISTAKES BOX */}
      <div className="mistake-box">
        <div>
          <h2>⚠ Common Mistakes</h2>
          <ul>
            <li>Rushing through questions without reading carefully</li>
            <li>Missing calculation steps</li>
            <li>Guessing answers without logic</li>
          </ul>
        </div>
      </div>

      {/* FOOTER */}
      <div className="bottom-footer">
        Prepared by AI Powered Interview System
      </div>
    </div>
  );
}

export default AptitudeTest;
