import React, { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import "../App.css";

// default fallback questions
const DEFAULT_QUESTIONS = [
  "Tell me about yourself.",
  "What are your strengths?",
  "Explain a challenging project you worked on."
];

function Interview() {
  const navigate = useNavigate();
  const location = useLocation();
  const customContext = location.state || {}; // { jobRole, resumeText }

  // decide if the selected job role is 'technical'
  const isTechnicalRole = customContext.jobRole
    ? /engineer|developer|data|technical|scientist/i.test(customContext.jobRole)
    : false;

  const [questions, setQuestions] = useState(DEFAULT_QUESTIONS);

  // generate questions if resume/job role provided
  useEffect(() => {
    if (customContext.jobRole) {
      let list = [];

      // if resume text exists, add an introductory prompt referencing it
      if (customContext.resumeText) {
        const snippet = customContext.resumeText.slice(0, 120).replace(/\s+/g, " ");
        list.push(`I reviewed your resume which mentions: "${snippet}..." Tell me more about that.`);
      }

      if (isTechnicalRole) {
        list = list.concat([
          `Based on your resume as ${customContext.jobRole}, describe the technical project you are most proud of.`,
          `What programming languages are you comfortable with for a ${customContext.jobRole}?`,
          `How would you handle a situation where a deadline is missed in a technical project?`,
          `Tell me about a challenge you faced in a team and how you resolved it.`,
          `Why are you interested in this ${customContext.jobRole} role?`
        ]);
      } else {
        list = list.concat([
          `Based on your resume as ${customContext.jobRole}, highlight a key achievement relevant to this role.`,
          `How do you handle customer or client interactions in a ${customContext.jobRole}?`,
          `Describe a situation when you had to adapt to change at work.`,
          `What motivates you to pursue a ${customContext.jobRole} position?`,
          `Tell me about teamwork experience relevant to this role.`
        ]);
      }
      setQuestions(list);
    }
  }, [customContext.jobRole, customContext.resumeText, isTechnicalRole]);
  const videoRef = useRef(null);
  const cameraStreamRef = useRef(null);
  const screenStreamRef = useRef(null);
  const recognitionRef = useRef(null);
  const silenceTimerRef = useRef(null);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [status, setStatus] = useState("Initializing interview...");
  const [started, setStarted] = useState(false);
  const [error, setError] = useState("");
  const [transcript, setTranscript] = useState("");

  /* TEXT TO SPEECH */
  const speak = (text) =>
    new Promise((resolve) => {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "en-US";
      utterance.onend = resolve;
      window.speechSynthesis.speak(utterance);
    });

  /* CAMERA + MIC */
  const startCameraAndMic = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true
    });

    cameraStreamRef.current = stream;
    videoRef.current.srcObject = stream;
    videoRef.current.muted = true;
    videoRef.current.playsInline = true;
    await videoRef.current.play();
  };

  /* SCREEN SHARE */
  const requestScreenShare = async () => {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true
      });
      screenStream.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = screenStream;
    } catch (err) {
      console.log("Screen share skipped");
    }
  };

  /* SAVE INTERVIEW RESULT */
  const saveInterviewResult = async () => {
    try {
      const token = localStorage.getItem("token");
      const user = JSON.parse(localStorage.getItem("user"));

      await axios.post(
        "http://127.0.0.1:8000/interview-result",
        {
          user_id: user.id,
          category: customContext.jobRole || "general",
          score: Math.floor(Math.random() * 100),
          transcript: transcript,
          questions_answered: questions.length
        },
        {
          headers: { Authorization: "Bearer " + token }
        }
      );
    } catch (err) {
      console.error("Failed to save interview result:", err);
    }
  };

  /* STOP & NEXT */
  const stopListening = useCallback(async () => {
    recognitionRef.current?.stop();
    clearTimeout(silenceTimerRef.current);

    setStatus("Processing answer...");
    await speak("Thank you.");

    if (currentIndex < questions.length - 1) {
      setCurrentIndex((i) => i + 1);
      setTranscript("");
    } else {
      setStatus("Interview completed.");
      await speak("Your interview is completed. Thank you.");

      // Save result
      saveInterviewResult();

      // Navigate to results after 2 seconds
      setTimeout(() => navigate("/"), 2000);
    }
  }, [currentIndex, navigate, transcript, saveInterviewResult]);

  /* SPEECH RECOGNITION */
  const startListening = useCallback(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setError("Speech Recognition not supported. Use Chrome.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.continuous = true;
    recognition.interimResults = true;

    recognitionRef.current = recognition;
    setStatus("🎤 Listening...");

    recognition.onresult = (event) => {
      let interimTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript_part = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          setTranscript((prev) => prev + " " + transcript_part);
        } else {
          interimTranscript += transcript_part;
        }
      }

      if (interimTranscript || event.results[event.results.length - 1].isFinal) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = setTimeout(stopListening, 2000);
      }
    };

    recognition.onerror = stopListening;
    recognition.start();
  }, [stopListening]);

  /* MAIN FLOW */
  useEffect(() => {
    if (!started) return;

    const run = async () => {
      setStatus("Asking question...");
      await speak(questions[currentIndex]);
      startListening();
    };

    run();
  }, [started, currentIndex, startListening, questions]);

  /* START INTERVIEW */
  const beginInterview = async () => {
    try {
      await startCameraAndMic();
      await requestScreenShare();
      setStarted(true);
    } catch (err) {
      setError("Permissions denied or unavailable.");
      console.error(err);
    }
  };

  /* CLEANUP */
  useEffect(() => {
    return () => {
      cameraStreamRef.current?.getTracks().forEach((t) => t.stop());
      recognitionRef.current?.stop();
      clearTimeout(silenceTimerRef.current);
    };
  }, []);

  return (
    <div className="mock-page reveal">
      {/* TOP NAV */}
      <div style={{
        padding: "16px 40px",
        background: "rgba(30, 30, 47, 0.9)",
        color: "white",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center"
      }}>
        <h3 style={{ margin: 0 }}>Live Interview</h3>
        <div style={{
          fontSize: 14,
          padding: "6px 14px",
          background: "rgba(255,255,255,0.15)",
          borderRadius: "6px"
        }}>
          Question {currentIndex + 1} of {questions.length}
        </div>
      </div>

      {error && <div style={{ color: "red", padding: "20px", textAlign: "center", fontWeight: "bold" }}>{error}</div>}

      {!started ? (
        <div className="mock-section" style={{ maxHeight: "80vh", display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <div style={{ maxWidth: 600, margin: "0 auto", textAlign: "center" }}>
            <h1>Ready to Start Your Interview?</h1>
            <p style={{ fontSize: 16, color: "#555", marginTop: 12 }}>
              You'll be asked {questions.length} questions. Speak clearly and take a moment to think before answering.
            </p>

            <button
              className="mock-btn"
              style={{ background: "#5b21b6", marginTop: 24, padding: "16px 32px", fontSize: 16 }}
              onClick={beginInterview}
            >
              🎙️ Start Interview
            </button>

            <button
              className="go-back-btn"
              onClick={() => {
                // if interview was started via resume flow, return there with state
                if (customContext && (customContext.resumeText || customContext.jobRole)) {
                  navigate("/resume-interview", { state: customContext });
                } else {
                  navigate(-1);
                }
              }}
            >
              ← Go Back
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, padding: "40px", maxWidth: 1200, margin: "0 auto" }}>
          {/* LEFT: VIDEO */}
          <div>
            <div style={{ background: "black", borderRadius: "12px", overflow: "hidden", marginBottom: 12 }}>
              <video
                ref={videoRef}
                width="100%"
                height="auto"
                autoPlay
                playsInline
                style={{ display: "block", minHeight: "300px" }}
              />
            </div>
            <p style={{ textAlign: "center", fontSize: 13, color: "#666" }}>Your camera feed</p>
          </div>

          {/* RIGHT: QUESTION & TRANSCRIPT */}
          <div>
            {/* QUESTION CARD */}
            <div style={{
              background: "linear-gradient(135deg, #ede9fe, #f5f3ff)",
              padding: "24px",
              borderRadius: "12px",
              marginBottom: "20px"
            }}>
              <h3 style={{ margin: "0 0 12px 0" }}>📝 Question {currentIndex + 1}</h3>
              <p style={{ fontSize: 16, fontWeight: "500", margin: 0 }}>{questions[currentIndex]}</p>
            </div>

            {/* STATUS */}
            <div style={{
              padding: "16px",
              background: "#f3f4f6",
              borderRadius: "8px",
              marginBottom: "20px",
              fontSize: 14
            }}>
              <strong>Status:</strong> <span style={{ color: status.includes("Listening") ? "#059669" : "#666" }}>{status}</span>
            </div>

            {/* TRANSCRIPT */}
            <div style={{
              padding: "16px",
              background: "white",
              border: "1px solid #e5e7eb",
              borderRadius: "8px",
              minHeight: "150px",
              maxHeight: "200px",
              overflow: "auto",
              fontSize: 14,
              lineHeight: "1.6"
            }}>
              <strong>Your Answer:</strong>
              <p style={{ margin: "12px 0 0 0", color: transcript ? "#333" : "#999" }}>
                {transcript || "Your response will appear here..."}
              </p>
            </div>

            {/* ACTION BUTTON */}
            <button
              onClick={stopListening}
              disabled={status === "Processing answer..."}
              style={{
                width: "100%",
                marginTop: "20px",
                padding: "12px",
                background: "#059669",
                color: "white",
                border: "none",
                borderRadius: "8px",
                fontWeight: "600",
                cursor: "pointer",
                opacity: status === "Processing answer..." ? 0.6 : 1
              }}
            >
              ✓ Done with this question
            </button>
          </div>
        </div>
      )}

      {/* FOOTER */}
      <div className="bottom-footer">
        Interview in progress - Stay focused and speak clearly
      </div>
    </div>
  );
}

export default Interview;
