import React, { useEffect } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";

/* MAIN PAGES */
import Home from "./pages/Home";
import Auth from "./pages/Auth";
import Instructions from "./pages/Instructions";
import Permissions from "./pages/Permissions";
import Interview from "./pages/Interview";
import VoiceInterviewPage from "./pages/VoiceInterviewPage";
import EditProfile from "./pages/EditProfile";
import Topics from "./pages/Topics";
import DashboardPage from "./pages/DashboardPage";
import ResumeInterview from "./pages/ResumeInterview";
import AboutUs from "./pages/AboutUs";
import Reports from "./pages/Reports";

/* NEW CATEGORY PAGES */
import HRInterview from "./pages/HRInterview";
import TechnicalInterview from "./pages/TechnicalInterview";
import MockInterview from "./pages/MockInterview";
import AptitudeTest from "./pages/AptitudeTest";

/* PROTECTED ROUTE */
import ProtectedRoute from "./ProtectedRoute";

function ScrollRevealManager() {
  const location = useLocation();

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
          } else {
            entry.target.classList.remove("visible");
          }
        });
      },
      { threshold: 0.2 }
    );

    document.querySelectorAll(".reveal").forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [location.pathname]);

  return null;
}

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [pathname]);

  return null;
}

function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <ScrollRevealManager />
      <Routes>
        {/* ---------------- PUBLIC ROUTES ---------------- */}
        <Route path="/" element={<Home />} />
        <Route path="/auth" element={<Auth />} />

        {/* ABOUT US PAGE */}
        <Route path="/about" element={<AboutUs />} />
        {/* face login removed */}

        {/* ---------------- INTERVIEW CATEGORY ROUTES ---------------- */}
        <Route
          path="/hr-interview"
          element={
            <ProtectedRoute>
              <HRInterview />
            </ProtectedRoute>
          }
        />

        <Route
          path="/technical-interview"
          element={
            <ProtectedRoute>
              <TechnicalInterview />
            </ProtectedRoute>
          }
        />

        {/* TOPICS ROUTE */}
        <Route
          path="/topics/:category"
          element={
            <ProtectedRoute>
              <Topics />
            </ProtectedRoute>
          }
        />

        {/* face registration route removed */}

        {/* ---------------- INTERVIEW FLOW ROUTES ---------------- */}
        <Route
          path="/instructions"
          element={
            <ProtectedRoute>
              <Instructions />
            </ProtectedRoute>
          }
        />

        <Route
          path="/permissions"
          element={
            <ProtectedRoute>
              <Permissions />
            </ProtectedRoute>
          }
        />


        <Route
          path="/interview"
          element={
            <ProtectedRoute>
              <Interview />
            </ProtectedRoute>
          }
        />

        <Route
          path="/voice-interview"
          element={
            <ProtectedRoute>
              <VoiceInterviewPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/reports/:sessionId"
          element={
            <ProtectedRoute>
              <Reports />
            </ProtectedRoute>
          }
        />

        <Route
          path="/resume-interview"
          element={
            <ProtectedRoute>
              <ResumeInterview />
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />

        {/* ---------------- PROFILE ROUTE ---------------- */}
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <EditProfile />
            </ProtectedRoute>
          }
        />

          {/* ---------------- NEW INTERVIEW TYPES ---------------- */}
          <Route
            path="/mock-interview"
            element={
              <ProtectedRoute>
                <MockInterview />
              </ProtectedRoute>
            }
          />
          <Route
            path="/aptitude-test"
            element={
              <ProtectedRoute>
                <AptitudeTest />
              </ProtectedRoute>
            }
          />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
