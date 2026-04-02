import React from "react";
import {
  BarChart3,
  Brain,
  Layers3,
  Mic,
  Rocket,
  Sparkles,
} from "lucide-react";
import Navbar from "../components/Navbar";
import "../App.css";

const serviceCards = [
  {
    icon: Brain,
    title: "Adaptive interview intelligence",
    description: "Role-aware questioning and AI-driven guidance that make practice feel more relevant and realistic.",
  },
  {
    icon: BarChart3,
    title: "Clear performance visibility",
    description: "Reports and dashboards that show strengths, recurring gaps, and what to improve next.",
  },
  {
    icon: Mic,
    title: "Voice-led preparation",
    description: "A speaking-first experience built to simulate actual interview flow instead of static quiz behavior.",
  },
];

const teamColumns = [
  { role: "Product & Experience", blurb: "Placeholder profile ready for your real team details later." },
  { role: "AI & Evaluation Systems", blurb: "Placeholder profile ready for your real team details later." },
  { role: "Frontend & Platform", blurb: "Placeholder profile ready for your real team details later." },
];

function AboutUs() {
  return (
    <>
      <Navbar />
      <div className="about-v2-shell">
        <div className="about-v2-glow about-v2-glow-left" />
        <div className="about-v2-glow about-v2-glow-right" />

        <div className="about-v2-container">
          <section className="about-v2-hero">
            <div className="about-v2-hero-top">
              <div className="about-v2-mark">
                <div className="about-v2-mark-ring" />
              </div>
              <div className="about-v2-mini-copy">
                <span className="about-v2-mini-label">About APIS</span>
                <h1>One preparation system for better interview performance.</h1>
                <p>
                  APIS is designed to combine AI interviews, voice-led practice, analytics, and guided improvement into one modern interview preparation experience.
                </p>
              </div>
            </div>

            <div className="about-v2-orbit">
              <div className="about-v2-orbit-ring" />
              <div className="about-v2-orbit-ring about-v2-orbit-ring-secondary" />
              <div className="about-v2-orbit-core">
                <span>Interview clarity</span>
                <strong>We help candidates practice with structure, confidence, and measurable feedback.</strong>
              </div>
            </div>

            <div className="about-v2-service-grid">
              {serviceCards.map((card) => {
                const Icon = card.icon;
                return (
                  <article key={card.title} className="about-v2-service-card">
                    <div className="about-v2-service-icon">
                      <Icon size={20} />
                    </div>
                    <h3>{card.title}</h3>
                    <p>{card.description}</p>
                  </article>
                );
              })}
            </div>
          </section>

          <section className="about-v2-stage">
            <div className="about-v2-stage-intro">
              <span className="about-v2-chip">Who we are</span>
              <h2>Built like a product, not just a preparation page.</h2>
              <p>
                The platform exists to turn isolated practice into a guided feedback loop where candidates can speak, review, improve, and return stronger for the next round.
              </p>
            </div>

            <div className="about-v2-team-grid">
              {teamColumns.map((member, index) => (
                <article key={`${member.role}-${index}`} className="about-v2-team-card">
                  <div className="about-v2-team-card-top">
                    <div className="about-v2-team-avatar">{index + 1}</div>
                    <div className="about-v2-team-meta">
                      <h3>{member.role}</h3>
                      <span>Team placeholder</span>
                    </div>
                  </div>
                  <p>{member.blurb}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="about-v2-bottom">
            <div className="about-v2-bottom-copy">
              <span className="about-v2-chip">Our vision</span>
              <h2>Interview preparation should feel modern, intelligent, and genuinely useful.</h2>
              <p>
                We are building APIS to make interview practice more realistic, more actionable, and more confidence-building for candidates preparing for meaningful opportunities.
              </p>
            </div>

            <div className="about-v2-bottom-panel">
              <div className="about-v2-bottom-line">
                <Sparkles size={18} />
                AI-guided interview flow
              </div>
              <div className="about-v2-bottom-line">
                <Layers3 size={18} />
                Structured report surfaces
              </div>
              <div className="about-v2-bottom-line">
                <Rocket size={18} />
                Faster iteration and growth
              </div>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}

export default AboutUs;
