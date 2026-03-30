import React from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import "../App.css";
import MiniNavbar from "../components/MiniNavbar";

function Topics() {
  const { category } = useParams();
  const navigate = useNavigate();

  const [selectedMode, setSelectedMode] = React.useState(null); // 'role' or 'language'
  const [searchTerm, setSearchTerm] = React.useState("");
  const [selectedOptions, setSelectedOptions] = React.useState([]);
  const [experience, setExperience] = React.useState("");
  const [confirmedSelection, setConfirmedSelection] = React.useState(null);
  const [isLocked, setIsLocked] = React.useState(false);
  const [configMode, setConfigMode] = React.useState(null); // user must click Question/Time mode
  const [questionCount, setQuestionCount] = React.useState(5);
  const [customQuestionCount, setCustomQuestionCount] = React.useState("");
  const [practiceType, setPracticeType] = React.useState("practice"); // practice or interview
  const [interviewTime, setInterviewTime] = React.useState(5); // default for interview dropdown
  const [interviewTimeOptions] = React.useState([5, 10, 15, 20, 30]);
  const [timeModeValue, setTimeModeValue] = React.useState("");
  const selectionRef = React.useRef(null);

  const rolesList = [
    "Frontend Developer",
    "Backend Developer",
    "Full Stack Developer",
    "Data Engineer",
    "Machine Learning Engineer",
    "AI Engineer",
    "QA Engineer",
    "Automation Engineer",
    "DevOps Engineer",
    "Site Reliability Engineer",
    "Product Manager",
    "Project Manager",
    "Business Analyst",
    "UI/UX Designer",
    "Graphic Designer",
    "Mobile Developer",
    "iOS Developer",
    "Android Developer",
    "Security Engineer",
    "Cloud Architect",
    "System Architect",
    "Technical Writer",
    "Scrum Master",
    "Database Administrator",
    "Network Engineer"
  ];

  const languagesList = [
    "JavaScript",
    "Python",
    "Java",
    "C#",
    "C++",
    "TypeScript",
    "Go",
    "Ruby",
    "PHP",
    "Swift",
    "Kotlin",
    "Rust",
    "Scala",
    "Perl",
    "R",
    "Dart",
    "Haskell",
    "Elixir",
    "C",
    "MATLAB",
    "SQL",
    "HTML",
    "CSS",
    "Shell"
  ];

  const topicsMap = {
    hr: [
      "Self Introduction",
      "Strengths & Weaknesses",
      "Career Goals",
      "Why Should We Hire You?"
    ],
    technical: [
      "Role-based Interview",
      "Language-based Interview"
    ]
  };

  const titleMap = {
    hr: "HR Interview Topics",
    technical: "Technical Interview Topics"
  };

  const descriptionMap = {
    hr: "Build confidence with communication and personality-based questions",
    technical: "Master coding, algorithms, and system design fundamentals"
  };

  const colorMap = {
    hr: "beh-hero",
    technical: "tech-hero"
  };

  const topics = topicsMap[category] || [];
  const title = titleMap[category] || "Interview Topics";
  const description = descriptionMap[category] || "";
  const heroClass = colorMap[category] || "beh-hero";

  const modeOptions =
    selectedMode === "role"
      ? rolesList
      : selectedMode === "language"
      ? languagesList
      : [];

  const suggestedOptions = searchTerm.trim()
    ? modeOptions.filter((opt) =>
        opt.toLowerCase().startsWith(searchTerm.trim().toLowerCase())
      )
    : [];

  const displayedOptions = modeOptions; // keep all options visible, not filtered out

  const toggleOption = (item) => {
    if (selectedMode === "role") {
      setSelectedOptions([item]);
      return;
    }
    setSelectedOptions((prev) =>
      prev.includes(item)
        ? prev.filter((x) => x !== item)
        : [...prev, item]
    );
  };

  const clearSelection = () => {
    setSelectedOptions([]);
    setSearchTerm("");
    setExperience("");
    setConfirmedSelection(null);
    setIsLocked(false);
  };

  return (
    <div className="mock-page reveal">
      <MiniNavbar />

      {/* HERO SECTION */}
      <div className={`mock-hero ${heroClass}`}>
        <div>
          <h1>{title}</h1>
          <p>{description}</p>
          <button
            className="mock-btn"
            onClick={() => {
              selectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
          >
            Start Your Technical Interview →
          </button>
        </div>
      </div>

      {/* TOPICS GRID or Selection */}
      <div className="mock-section" ref={selectionRef}>
        <div className="section-title">
          {selectedMode
            ? selectedMode === "role"
              ? "Choose Job Roles"
              : "Choose Languages"
            : "Available Topics"}
        </div>

        {!selectedMode ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px" }}>
            {topics.map((topic, index) => (
              <div key={index} className="mock-card pro-card">
                <div className="card-top">
                  <div>
                    <h4>{topic}</h4>
                    <p style={{ marginTop: 6 }}>Practice with curated questions on this topic</p>
                  </div>
                  <div className="icon-circle">📝</div>
                </div>

                <button
                  className="topic-action-btn"
                  style={{ width: "100%", marginTop: "12px" }}
                  onClick={() => {
                    if (topic === "Role-based Interview") {
                      setSelectedMode("role");
                      clearSelection();
                    } else if (topic === "Language-based Interview") {
                      setSelectedMode("language");
                      clearSelection();
                    } else {
                      navigate("/instructions");
                    }
                  }}
                >
                  {topic === "Role-based Interview" ? "Select Roles →" : topic === "Language-based Interview" ? "Select Language →" : "Practice Topic →"}
                </button>

                <div className="card-footer">AI Feedback Enabled</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="selection-window">
            <div className="selection-window-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                className="selection-window-back"
                onClick={() => {
                  setSelectedMode(null);
                  setSearchTerm("");
                  setSelectedOptions([]);
                  setExperience("");
                  setConfirmedSelection(null);
                  setIsLocked(false);
                }}
              >
                ← Back
              </button>
              <h3 style={{ margin: 0 }}>{selectedMode === "role" ? "Choose Job Roles" : "Choose Languages"}</h3>
              <button
                className="selection-window-refresh"
                onClick={() => {
                  clearSelection();
                }}
                title="Reset selections"
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#0f172a',
                  fontSize: '1.3rem',
                  padding: 0
                }}
              >
                ⟳
              </button>
            </div>

            <div style={{ marginBottom: 12, position: 'relative' }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={
                    selectedMode === "role"
                      ? "Search job roles..."
                      : "Search languages..."
                  }
                  disabled={isLocked}
                  style={{
                    flex: 1,
                    padding: '10px 12px',
                    borderRadius: 8,
                    border: '1px solid #cbd5e1',
                    background: isLocked ? '#f1f5f9' : '#fff'
                  }}
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm("")}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      border: '1px solid #cbd5e1',
                      background: '#fff',
                      cursor: 'pointer'
                    }}
                    title="Clear"
                  >
                    ×
                  </button>
                )}
              </div>

              {searchTerm.trim() && (
                <div style={{
                  position: 'absolute',
                  top: '46px',
                  left: 0,
                  right: 0,
                  background: '#fff',
                  border: '1px solid #cbd5e1',
                  borderRadius: 8,
                  zIndex: 10,
                  maxHeight: 200,
                  overflowY: 'auto',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.12)'
                }}>
                  {suggestedOptions.length > 0 ? (
                    suggestedOptions.map((opt) => (
                      <div
                        key={opt}
                        onClick={() => {
                          if (!selectedOptions.includes(opt)) {
                            setSelectedOptions((prev) => [...prev, opt]);
                          }
                          setSearchTerm("");
                        }}
                        style={{
                          padding: '8px 10px',
                          borderBottom: '1px solid #e2e8f0',
                          cursor: 'pointer'
                        }}
                      >
                        {opt}
                      </div>
                    ))
                  ) : (
                    <div style={{ padding: '8px 10px', color: '#718096' }}>
                      No options starting with "{searchTerm}"
                    </div>
                  )}
                </div>
              )}

            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
              {displayedOptions.map((opt) => (
                <label
                  key={opt}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '12px',
                    borderRadius: '10px',
                    border: selectedOptions.includes(opt) ? '2px solid #2563eb' : '1px solid #d1d5db',
                    background: selectedOptions.includes(opt) ? 'rgba(37,99,235,0.08)' : '#fff',
                    cursor: 'pointer'
                  }}
                >
                  <input
                    type={selectedMode === 'role' ? 'radio' : 'checkbox'}
                    name="select-option"
                    checked={selectedOptions.includes(opt)}
                    onChange={() => !isLocked && toggleOption(opt)}
                    disabled={isLocked}
                  />
                  <span>{opt}</span>
                </label>
              ))}
            </div>

            <div style={{ marginTop: 14, fontSize: 14, color: '#334155' }}>
              Selected ({selectedOptions.length}): {selectedOptions.join(', ') || 'None'}
            </div>

            <div style={{ marginTop: 12, marginBottom: 14, border: '1px solid #e2e8f0', borderRadius: 10, padding: 12, background: '#fafbff' }}>
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 14, color: '#334155', marginBottom: 6, display: 'block' }}>
                  Select experience:
                </label>
                <select
                  value={experience}
                  onChange={(e) => !isLocked && setExperience(e.target.value)}
                  disabled={isLocked}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 8,
                    border: '1px solid #cbd5e1',
                    width: '100%',
                    maxWidth: 320,
                    background: isLocked ? '#f1f5f9' : '#fff'
                  }}
                >
                  <option value="" disabled>
                    Select Experience Level
                  </option>
                  <option value="Fresher">Fresher</option>
                  <option value="Mid-level">Mid-level</option>
                  <option value="Experienced">Experienced</option>
                </select>
              </div>

              {selectedMode && experience && (
                <>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#334155', marginBottom: 8 }}>Select Mode</div>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                    <button
                      onClick={() => setConfigMode('question')}
                      style={{
                        padding: '8px 14px',
                        borderRadius: 6,
                        border: configMode === 'question' ? '2px solid #2563eb' : '1px solid #cbd5e1',
                        background: configMode === 'question' ? '#e0e7ff' : '#fff',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                      disabled={isLocked}
                    >
                      Question Mode
                    </button>
                    <button
                      onClick={() => setConfigMode('time')}
                      style={{
                        padding: '8px 14px',
                        borderRadius: 6,
                        border: configMode === 'time' ? '2px solid #2563eb' : '1px solid #cbd5e1',
                        background: configMode === 'time' ? '#e0e7ff' : '#fff',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                      disabled={isLocked}
                    >
                      Time Mode
                    </button>
                  </div>
                </>
              )}
            </div>

            {configMode === 'question' && (
                <div>
                  <label style={{ fontSize: 14, color: '#334155', marginBottom: 6, display: 'block' }}>
                    Number of questions:
                  </label>
                  <select
                    value={questionCount || 'custom'}
                    onChange={(e) => {
                      if (e.target.value === 'custom') {
                        setQuestionCount('custom');
                        setCustomQuestionCount('');
                      } else {
                        setQuestionCount(Number(e.target.value));
                        setCustomQuestionCount('');
                      }
                    }}
                    disabled={isLocked}
                    style={{
                      padding: '10px 12px',
                      borderRadius: 8,
                      border: '1px solid #cbd5e1',
                      width: '100%',
                      maxWidth: 320,
                      background: isLocked ? '#f1f5f9' : '#fff'
                    }}
                  >
                    <option value={5}>5</option>
                    <option value={3}>3</option>
                    <option value={10}>10</option>
                    <option value={15}>15</option>
                    <option value={20}>20</option>
                    <option value="custom">Custom</option>
                  </select>

                  {questionCount === 'custom' && (
                    <input
                      type="number"
                      min={1}
                      value={customQuestionCount}
                      onChange={(e) => setCustomQuestionCount(e.target.value)}
                      disabled={isLocked}
                      placeholder="Enter custom count"
                      style={{
                        marginTop: 8,
                        width: '100%',
                        maxWidth: 320,
                        padding: '10px 12px',
                        borderRadius: 8,
                        border: '1px solid #cbd5e1'
                      }}
                    />
                  )}
                </div>
              )}

              {configMode === 'time' && (
                <div style={{ marginBottom: 8 }}>
                  <label style={{ fontSize: 14, color: '#334155', marginBottom: 6, display: 'block' }}>
                    Choose sample time (minutes):
                  </label>
                  <select
                    value={timeModeValue || interviewTime}
                    onChange={(e) => setTimeModeValue(Number(e.target.value))}
                    disabled={isLocked}
                    style={{
                      width: '100%',
                      maxWidth: 320,
                      padding: '10px 12px',
                      borderRadius: 8,
                      border: '1px solid #cbd5e1',
                      background: isLocked ? '#f1f5f9' : '#fff'
                    }}
                  >
                    <option value="">Select interval</option>
                    {interviewTimeOptions.map((t) => (
                      <option key={t} value={t}>
                        {t} minutes
                      </option>
                    ))}
                  </select>
                  <small style={{ color: '#475569' }}>
                    AI will ask questions for this time interval.
                  </small>
                </div>
              )}

              {configMode === 'question' && (
                <>
                  <div style={{ marginTop: 12, marginBottom: 12 }}>
                    <div style={{ fontSize: 14, color: '#334155', marginBottom: 6 }}>Mode Type</div>
                  <button
                  onClick={() => setPracticeType('practice')}
                  style={{
                    marginRight: 8,
                    padding: '8px 14px',
                    borderRadius: 6,
                    border: practiceType === 'practice' ? '2px solid #2563eb' : '1px solid #cbd5e1',
                    background: practiceType === 'practice' ? '#e0e7ff' : '#fff',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                  disabled={isLocked}
                >
                  🔘 Practice Mode (no timer)
                </button>
                <button
                  onClick={() => setPracticeType('interview')}
                  style={{
                    padding: '8px 14px',
                    borderRadius: 6,
                    border: practiceType === 'interview' ? '2px solid #2563eb' : '1px solid #cbd5e1',
                    background: practiceType === 'interview' ? '#e0e7ff' : '#fff',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                  disabled={isLocked}
                >
                  🔘 Interview Mode (timer ON)
                </button>
              </div>

              {practiceType === 'interview' && (
                <div>
                  <label style={{ fontSize: 14, color: '#334155', marginBottom: 6, display: 'block' }}>
                    Interview duration (minutes):
                  </label>
                  <select
                    value={interviewTime}
                    onChange={(e) => setInterviewTime(Number(e.target.value))}
                    disabled={isLocked}
                    style={{
                      width: '100%',
                      maxWidth: 320,
                      padding: '10px 12px',
                      borderRadius: 8,
                      border: '1px solid #cbd5e1',
                      background: isLocked ? '#f1f5f9' : '#fff'
                    }}
                  >
                    <option value="">Select interview duration</option>
                    {interviewTimeOptions.map((t) => (
                      <option key={t} value={t}>
                        {t} minutes
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </>
          )}

            <button
              className="topic-action-btn"
              style={{
                marginTop: 6,
                opacity: selectedOptions.length > 0 && experience ? 1 : 0.5,
                cursor: selectedOptions.length > 0 && experience ? 'pointer' : 'not-allowed'
              }}
              disabled={!(selectedOptions.length > 0 && experience)}
              onClick={() => {
                if (!(selectedOptions.length > 0 && experience)) return;
                const resolvedQuestionCount = questionCount === 'custom' ? Number(customQuestionCount || 0) : Number(questionCount);
                setConfirmedSelection({
                  mode: selectedMode,
                  options: selectedOptions,
                  experience,
                  configMode,
                  questionCount: configMode === 'question' ? (resolvedQuestionCount || 5) : null,
                  customQuestionCount: configMode === 'question' && questionCount === 'custom' ? customQuestionCount : null,
                  practiceType,
                  interviewModeTime: practiceType === 'interview' ? interviewTime : null,
                  timeModeInterval: configMode === 'time' ? timeModeValue : null
                });
                setIsLocked(true);
              }}
            >
              Confirm Selection
            </button>

            {confirmedSelection && (
              <div style={{ marginTop: 14, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                <div style={{ width: '100%', maxWidth: 520, background: '#eff6ff', borderRadius: 10, padding: '10px 12px', border: '1px solid #bfdbfe', color: '#1e3a8a' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontWeight: 700, marginBottom: 4 }}>
                        {confirmedSelection.mode === 'role'
                          ? 'Selected role:'
                          : 'Selected language(s):'}
                      </div>
                      <div style={{ marginLeft: 6, color: '#0f172a' }}>
                        {confirmedSelection.options.join(', ')}
                      </div>
                      <div style={{ fontWeight: 700, marginTop: 8 }}>
                        Experience:
                      </div>
                      <div style={{ marginLeft: 6, color: '#0f172a' }}>{confirmedSelection.experience}</div>
                      <div style={{ fontWeight: 700, marginTop: 8 }}>
                        Config Mode:
                      </div>
                      <div style={{ marginLeft: 6, color: '#0f172a' }}>{confirmedSelection.configMode === 'question' ? 'Question Mode' : 'Time Mode'}</div>
                      {confirmedSelection.configMode === 'question' && (
                        <>
                          <div style={{ fontWeight: 700, marginTop: 8 }}>Questions:</div>
                          <div style={{ marginLeft: 6, color: '#0f172a' }}>
                            {confirmedSelection.questionCount}{
                              confirmedSelection.customQuestionCount ? ` (custom: ${confirmedSelection.customQuestionCount})` : ''
                            }
                          </div>
                        </>
                      )}
                      {confirmedSelection.configMode === 'time' && (
                        <>
                          <div style={{ fontWeight: 700, marginTop: 8 }}>Time Mode Interval:</div>
                          <div style={{ marginLeft: 6, color: '#0f172a' }}>{confirmedSelection.timeModeInterval || 'n/a'} minutes</div>
                        </>
                      )}
                      <div style={{ fontWeight: 700, marginTop: 8 }}>Practice Type:</div>
                      <div style={{ marginLeft: 6, color: '#0f172a' }}>{confirmedSelection.practiceType === 'practice' ? 'Practice Mode (no timer)' : 'Interview Mode (timer ON)'}</div>
                      {confirmedSelection.practiceType === 'interview' && (
                        <>
                          <div style={{ fontWeight: 700, marginTop: 8 }}>Interview Timer:</div>
                          <div style={{ marginLeft: 6, color: '#0f172a' }}>{confirmedSelection.interviewModeTime || 'n/a'} minutes</div>
                        </>
                      )}
                    </div>
                    <button
                      className="topic-action-btn secondary"
                      style={{
                        borderRadius: '999px',
                        padding: '8px 14px',
                        fontWeight: 700,
                        background: '#ec4899',
                        color: '#fff',
                        boxShadow: '0 8px 15px rgba(236,72,153,0.25)',
                        alignSelf: 'center',
                        marginLeft: '16px'
                      }}
                      onClick={clearSelection}
                    >
                      Reset Selections
                    </button>
                  </div>
                </div>

                <button
                  className="start-interview-confirm"
                  onClick={() => navigate("/instructions")}
                >
                  Proceed to Instructions
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* BACK BUTTONS */}
      <div style={{ textAlign: "center", marginTop: "40px", paddingBottom: "40px", display: 'flex', justifyContent: 'center', gap: 12 }}>
        <button className="go-back-btn" onClick={() => navigate(-1)}>
          ← Go Back
        </button>

        <button className="topic-action-btn" onClick={() => navigate('/')}>🏠 Home</button>
      </div>

      {/* FOOTER */}
      <div className="bottom-footer">
        Selected {topics.length} topics for your interview preparation
      </div>
    </div>
  );
}

export default Topics;
