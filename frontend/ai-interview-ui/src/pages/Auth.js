import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "../App.css";

// axios instance with configurable base url
const api = axios.create({
  baseURL: process.env.REACT_APP_API_BASE || "http://127.0.0.1:8000"
});

function Auth() {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const clearFields = () => {
    setFirstName("");
    setLastName("");
    setEmail("");
    setPassword("");
    setConfirmPassword("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!email || !password || (!isLogin && (!firstName || !lastName || !confirmPassword))) {
      setError("Please fill all fields");
      return;
    }
    if (!isLogin && password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      let res;
      if (isLogin) {
        res = await api.post("/login", { email, password });
        localStorage.setItem("token", res.data.access_token);
        localStorage.setItem("user", JSON.stringify(res.data.user));
        clearFields();
        navigate("/");
      } else {
        res = await api.post("/register", {
          first_name: firstName,
          last_name: lastName,
          email,
          password,
        });
        alert("Registered successfully. Please sign in.");
        clearFields();
        setIsLogin(true);
      }
    } catch (err) {
      const msg = typeof err.response?.data?.detail === "string"
        ? err.response.data.detail
        : err.response?.data?.detail?.[0]?.msg || "Authentication failed";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-bg">
      <div className="auth-panel">
        {/* Left Panel */}
        <div className="auth-left">
          <svg width="220" height="220" viewBox="0 0 220 220" fill="none" xmlns="http://www.w3.org/2000/svg" className="cloud-large">
            <path d="M110 220C170 220 220 170 220 110C220 50 170 0 110 0C50 0 0 50 0 110C0 170 50 220 110 220Z" fill="#fff" fillOpacity="0.18" />
          </svg>
          <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="cloud-small">
            <path d="M60 120C93.1371 120 120 93.1371 120 60C120 26.8629 93.1371 0 60 0C26.8629 0 0 26.8629 0 60C0 93.1371 26.8629 120 60 120Z" fill="#fff" fillOpacity="0.12" />
          </svg>
          <div className="rocket-circle">
            <span className="rocket-icon">🚀</span>
          </div>
          <h2 className="auth-title">Welcome to<br />APIS</h2>
          <p className="auth-desc">
            Learn your skills and career, communicate, and discover new opportunities with our AI-powered interview system.
          </p>
        </div>
        {/* Right Panel */}
        <div className="auth-right">
          <div className="auth-card">
            {isLogin ? (
              <>
                <h3 className="auth-header">Sign In to your account</h3>
                {error && (
                  <div className="auth-error">{error}</div>
                )}
                <form onSubmit={handleSubmit}>
                  <div className="auth-field">
                    <label className="auth-label">E-mail Address</label>
                    <input
                      type="email"
                      placeholder="Enter your mail"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="auth-input"
                    />
                  </div>
                  <div className="auth-field auth-password">
                    <label className="auth-label">Password</label>
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="auth-input"
                    />
                    <span
                      className="auth-eye"
                      onClick={() => setShowPassword((prev) => !prev)}
                    >
                      {showPassword ? '🙈' : '👁️'}
                    </span>
                  </div>
                  <div className="auth-btn-row">
                    <button type="submit" disabled={loading} className="auth-btn">
                      Sign In
                    </button>
                  </div>
                </form>
                <div className="auth-switch">
                  <span className="auth-link"
                    onClick={() => {
                      clearFields();
                      setIsLogin(false);
                    }}>
                    New user? Register
                  </span>
                </div>
              </>
            ) : (
              <>
                <h3 className="auth-header">Create your account</h3>
                {error && (
                  <div className="auth-error">{error}</div>
                )}
                <form onSubmit={handleSubmit}>
                  <div className="auth-field">
                    <label className="auth-label">First Name</label>
                    <input
                      type="text"
                      placeholder="Enter your first name"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="auth-input"
                    />
                  </div>
                  <div className="auth-field">
                    <label className="auth-label">Last Name</label>
                    <input
                      type="text"
                      placeholder="Enter your last name"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="auth-input"
                    />
                  </div>
                  <div className="auth-field">
                    <label className="auth-label">E-mail Address</label>
                    <input
                      type="email"
                      placeholder="Enter your mail"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="auth-input"
                    />
                  </div>
                  <div className="auth-field auth-password">
                    <label className="auth-label">Password</label>
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="auth-input"
                    />
                    <span
                      className="auth-eye"
                      onClick={() => setShowPassword((prev) => !prev)}
                    >
                      {showPassword ? '🙈' : '👁️'}
                    </span>
                  </div>
                  <div className="auth-field auth-password">
                    <label className="auth-label">Confirm Password</label>
                    <input
                      type={showConfirm ? "text" : "password"}
                      placeholder="Confirm your password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="auth-input"
                    />
                    <span
                      className="auth-eye"
                      onClick={() => setShowConfirm((prev) => !prev)}
                    >
                      {showConfirm ? '🙈' : '👁️'}
                    </span>
                  </div>
                  <div className="auth-agree">
                    <input type="checkbox" required className="auth-checkbox" />
                    <span className="auth-agree-text">
                      By Signing Up, I agree with <a href="#" className="auth-link">Terms & Conditions</a>
                    </span>
                  </div>
                  <div className="auth-btn-row">
                    <button type="submit" disabled={loading} className="auth-btn">
                      Sign Up
                    </button>
                  </div>
                </form>
                <div className="auth-switch">
                  <span className="auth-link"
                    onClick={() => {
                      clearFields();
                      setIsLogin(true);
                    }}>
                    Already registered? Sign In
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Auth;
