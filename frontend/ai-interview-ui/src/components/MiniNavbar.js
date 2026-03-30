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

  const navLinkStyle = {
    padding: "8px 12px",
    borderRadius: "4px",
    transition: "all 0.3s"
  };

  const activeStyle = {
    backgroundColor: "rgba(255,255,255,0.2)",
    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
    transform: "scale(1.05)"
  };

  return (
    <div className="category-topnav">
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <img
          src={logo}
          alt="APIS Logo"
          style={{
            height: "60px",
            width: "60px",
            borderRadius: "50%",
            border: "3px solid #007bff"
          }}
        />
        <h3 style={{ margin: 0, color: "white" }}>APIS</h3>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <Link to="/" style={{ ...navLinkStyle, ...(location.pathname === "/" ? activeStyle : {}) }}>
          Home
        </Link>
        <Link to="/hr-interview" style={{ ...navLinkStyle, ...(location.pathname === "/hr-interview" ? activeStyle : {}) }}>
          HR/Behavioral
        </Link>
        <Link to="/technical-interview" style={{ ...navLinkStyle, ...(location.pathname === "/technical-interview" ? activeStyle : {}) }}>
          Technical
        </Link>
        <Link to="/mock-interview" style={{ ...navLinkStyle, ...(location.pathname === "/mock-interview" ? activeStyle : {}) }}>
          Mock
        </Link>
        <Link to="/aptitude-test" style={{ ...navLinkStyle, ...(location.pathname === "/aptitude-test" ? activeStyle : {}) }}>
          Aptitude
        </Link>
      </div>

      {user ? (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span className="username" style={{ color: "white", fontWeight: 600 }}>
            {userDisplayName}
          </span>
          <span
            className="profile-icon"
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              background: "#eee",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 600,
              overflow: "hidden"
            }}
          >
            {profileImage ? (
              <img src={profileImage} alt="profile" style={{ width: 32, height: 32, borderRadius: "50%" }} />
            ) : (
              userInitial
            )}
          </span>
        </div>
      ) : null}
    </div>
  );
}
