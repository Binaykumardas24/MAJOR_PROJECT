import React from "react";
import { Link, useLocation } from "react-router-dom";
import logo from "../assets/logo.png";

export default function MiniNavbar() {
  const location = useLocation();
  const user = React.useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user"));
    } catch {
      return null;
    }
  }, []);

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


  return (
    <div className="category-topnav">
      <div className="navbar-left">
        <Link to="/" className="navbar-home-link">
          <img
            src={logo}
            alt="APIS Logo"
            className="navbar-logo"
          />
          <div className="navbar-brand">
            <div className="navbar-brand-title">
              <h2>APIS</h2>
              <span>| AI Powered Interview System</span>
            </div>
          </div>
        </Link>
      </div>

      <div className="navbar-center">
        <div className="nav-links">
          <Link to="/" className={`nav-link ${location.pathname === "/" ? "active" : ""}`}>
            Home
          </Link>
          <Link to="/hr-interview" className={`nav-link ${location.pathname === "/hr-interview" ? "active" : ""}`}>
            HR/Behavioral
          </Link>
          <Link to="/technical-interview" className={`nav-link ${location.pathname === "/technical-interview" ? "active" : ""}`}>
            Technical
          </Link>
          <Link to="/resume-interview" className={`nav-link ${location.pathname === "/resume-interview" ? "active" : ""}`}>
            Resume Based Interview
          </Link>
          <Link to="/mock-interview" className={`nav-link ${location.pathname === "/mock-interview" ? "active" : ""}`}>
            Mock
          </Link>
          <Link to="/aptitude-test" className={`nav-link ${location.pathname === "/aptitude-test" ? "active" : ""}`}>
            Aptitude
          </Link>
        </div>
      </div>

      {user ? (
        <div className="navbar-right">
          <div className="profile-card mini-profile-card">
            <div className="profile-icon mini-profile-icon">
            {profileImage ? (
              <img src={profileImage} alt="profile" />
            ) : (
              userInitial
            )}
            </div>
            <div className="profile-user-details">
              <span className="profile-user-name">{userDisplayName}</span>
              <span className="profile-user-email">{user?.email}</span>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
