import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import "../App.css";

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://127.0.0.1:8000";

const clean = (value) => (value || "").replace(/\s+/g, " ").trim();
const safeText = (value) => {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number") return clean(String(value));
  if (Array.isArray(value)) return clean(value.map((item) => safeText(item)).filter(Boolean).join(", "));
  if (typeof value === "object") {
    return clean(
      String(
        value.text ||
        value.message ||
        value.msg ||
        value.question ||
        JSON.stringify(value)
      )
    );
  }
  return clean(String(value));
};

const safeTextList = (value) => {
  if (!Array.isArray(value)) return [];
  return value.map((item) => safeText(item)).filter(Boolean);
};

const safeErrorText = (value) => {
  if (Array.isArray(value)) {
    const normalized = value
      .map((item) => {
        if (item && typeof item === "object") {
          const location = Array.isArray(item.loc) ? item.loc.join(" > ") : safeText(item.loc);
          const message = safeText(item.msg || item.message || item.detail || item);
          return clean([location, message].filter(Boolean).join(": "));
        }
        return safeText(item);
      })
      .filter(Boolean);
    return normalized.join(" | ");
  }

  if (value && typeof value === "object" && value.detail) {
    return safeErrorText(value.detail);
  }

  return safeText(value);
};

const safeScore = (value) => {
  const numeric = Number(value);
  if (Number.isFinite(numeric)) {
    return Math.max(0, Math.min(100, Math.round(numeric)));
  }
  return 0;
};

const normalizeEvaluation = (item) => ({
  ...item,
  question: safeText(item?.question),
  answer: safeText(item?.answer),
  feedback: safeText(item?.feedback),
  strengths: safeTextList(item?.strengths),
  gaps: safeTextList(item?.gaps),
  matched_points: safeTextList(item?.matched_points),
  missed_points: safeTextList(item?.missed_points),
  suggested_answer: safeText(item?.suggested_answer),
  assistant_reply: safeText(item?.assistant_reply),
  score: safeScore(item?.score),
});

function MetricTile({ label, value, tone = "#4338ca" }) {
  return (
    <div style={{ background: "white", borderRadius: 20, padding: 18, boxShadow: "0 14px 34px rgba(88,107,176,0.10)" }}>
      <div style={{ fontSize: 12, fontWeight: 800, textTransform: "uppercase", color: tone, marginBottom: 8 }}>
        {label}
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, color: "#0f172a" }}>{value}</div>
    </div>
  );
}

function ScoreBars({ items = [] }) {
  if (!items.length) return null;
  return (
    <div style={{ display: "grid", gap: 12 }}>
      {items.map((item, index) => (
        <div key={`${item.question}-${index}`}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 6, color: "#334155", fontSize: 14 }}>
            <span style={{ flex: 1 }}>{item.question}</span>
            <strong>{item.score}/100</strong>
          </div>
          <div style={{ height: 10, borderRadius: 999, background: "#e2e8f0", overflow: "hidden" }}>
            <div
              style={{
                width: `${Math.max(6, Math.min(100, item.score || 0))}%`,
                height: "100%",
                borderRadius: 999,
                background: item.score >= 75 ? "#10b981" : item.score >= 60 ? "#f59e0b" : "#ef4444",
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function buildPayload(context) {
  const selectedOptions = Array.isArray(context.selectedOptions) ? context.selectedOptions.filter(Boolean) : [];
  const selectedMode = context.selectedMode || context.stage || "";

  return {
    category: context.category || (context.resumeText ? "resume" : "general"),
    selected_mode: selectedMode || "general",
    job_role: context.jobRole || (selectedMode !== "language" ? selectedOptions[0] : "") || "",
    primary_language:
      context.primaryLanguage ||
      context.primary_language ||
      (selectedMode === "language" ? selectedOptions[0] : "") ||
      "",
    selected_options: selectedOptions,
    experience: context.experience || "Not specified",
    config_mode: context.configMode || "standard",
    question_count: context.customQuestionCount || context.questionCount || 5,
    practice_type: context.practiceType || "voice interview",
    interview_mode_time: context.interviewModeTime || null,
    time_mode_interval: context.timeModeInterval || null,
    resume_text: context.resumeText || "",
  };
}

function VoiceInterview() {
  const navigate = useNavigate();
  const location = useLocation();
  const context = location.state || {};
  const payload = buildPayload(context);
  const SpeechRecognition =
    typeof window !== "undefined" ? window.SpeechRecognition || window.webkitSpeechRecognition : null;

  const rootRef = useRef(null);
  const videoRef = useRef(null);
  const reportRef = useRef(null);
  const cameraRef = useRef(null);
  const recognitionRef = useRef(null);
  const timerRef = useRef(null);
  const sessionIdRef = useRef("");
  const indexRef = useRef(0);
  const draftRef = useRef("");
  const interimRef = useRef("");
  const busyRef = useRef(false);
  const summaryRef = useRef(null);
  const fullscreenBlockedRef = useRef(false);
  const startedRef = useRef(false);

  const [sessionId, setSessionId] = useState("");
  const [providers, setProviders] = useState({});
  const [question, setQuestion] = useState("");
  const [index, setIndex] = useState(0);
  const [total, setTotal] = useState(0);
  const [draft, setDraft] = useState("");
  const [interim, setInterim] = useState("");
  const [status, setStatus] = useState("Ready to begin.");
  const [error, setError] = useState("");
  const [started, setStarted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [fullscreenBlocked, setFullscreenBlocked] = useState(false);
  const [latestEval, setLatestEval] = useState(null);
  const [history, setHistory] = useState([]);
  const [summary, setSummary] = useState(null);
  const [timeLeftSeconds, setTimeLeftSeconds] = useState(null);
  const [sessionMeta, setSessionMeta] = useState({});
  const [viewportWidth, setViewportWidth] = useState(
    typeof window !== "undefined" ? window.innerWidth : 1440
  );

  useEffect(() => {
    sessionIdRef.current = sessionId;
  }, [sessionId]);

  useEffect(() => {
    indexRef.current = index;
  }, [index]);

  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  useEffect(() => {
    interimRef.current = interim;
  }, [interim]);

  useEffect(() => {
    busyRef.current = busy;
  }, [busy]);

  useEffect(() => {
    summaryRef.current = summary;
  }, [summary]);

  useEffect(() => {
    fullscreenBlockedRef.current = fullscreenBlocked;
  }, [fullscreenBlocked]);

  useEffect(() => {
    startedRef.current = started;
  }, [started]);

  useEffect(() => {
    const handleResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const resolveTimerMinutes = () => {
    if (payload.config_mode === "time" && payload.time_mode_interval) {
      return Number(payload.time_mode_interval) || null;
    }
    if (payload.practice_type === "interview" && payload.interview_mode_time) {
      return Number(payload.interview_mode_time) || null;
    }
    return null;
  };

  const stopSpeech = () => {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
  };

  const speak = (text) =>
    new Promise((resolve) => {
      const value = clean(text);
      if (!value || !window.speechSynthesis) return resolve();
      stopSpeech();
      const utterance = new SpeechSynthesisUtterance(value);
      utterance.lang = "en-US";
      utterance.onend = resolve;
      utterance.onerror = resolve;
      window.speechSynthesis.speak(utterance);
    });

  const stopListening = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    if (recognitionRef.current) {
      recognitionRef.current.onresult = null;
      recognitionRef.current.onerror = null;
      recognitionRef.current.onend = null;
      try {
        recognitionRef.current.stop();
      } catch {}
    }
    recognitionRef.current = null;
    setListening(false);
  };

  const ensureFullscreen = async () => {
    if (document.fullscreenElement) return true;
    const target = rootRef.current || document.documentElement;
    if (!target.requestFullscreen) throw new Error("Fullscreen is not supported in this browser.");
    await target.requestFullscreen();
    if (!document.fullscreenElement) throw new Error("Fullscreen did not start.");
    return true;
  };

  const exitFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
    } catch {}
  };

  const startCamera = async () => {
    if (cameraRef.current) return;
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    cameraRef.current = stream;
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.muted = true;
      await videoRef.current.play();
    }
  };

  const stopCamera = () => {
    if (cameraRef.current) cameraRef.current.getTracks().forEach((track) => track.stop());
    cameraRef.current = null;
  };

  const attachCameraPreview = async () => {
    if (!cameraRef.current || !videoRef.current) {
      return;
    }

    videoRef.current.srcObject = cameraRef.current;
    videoRef.current.muted = true;
    videoRef.current.playsInline = true;

    try {
      await videoRef.current.play();
    } catch {}
  };

  const authHeaders = () => {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const startListening = () => {
    if (!SpeechRecognition || fullscreenBlockedRef.current || busyRef.current || summaryRef.current) return;
    stopListening();
    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onstart = () => {
      setListening(true);
      setStatus("Listening...");
    };

    recognition.onresult = (event) => {
      let finalText = "";
      let interimText = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const piece = event.results[i][0]?.transcript || "";
        if (event.results[i].isFinal) finalText += ` ${piece}`;
        else interimText += ` ${piece}`;
      }

      if (clean(finalText)) setDraft((prev) => clean(`${prev} ${finalText}`));
      setInterim(clean(interimText));

      if (clean(`${finalText} ${interimText}`)) {
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => submitAnswer(), 2200);
      }
    };

    recognition.onerror = (event) => {
      setListening(false);
      if (event.error === "not-allowed") {
        setError("Microphone access was blocked. Please allow microphone access.");
      }
    };

    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    recognition.start();
  };

  const finishInterview = async (activeSessionId) => {
    const response = await axios.post(
      `${API_BASE_URL}/ai-interview/complete`,
      { session_id: activeSessionId },
      { headers: authHeaders() }
    );
    const normalizedSummary = {
      ...response.data,
      overall_score: safeScore(response.data?.overall_score),
      summary: safeText(response.data?.summary),
      top_strengths: safeTextList(response.data?.top_strengths),
      improvement_areas: safeTextList(response.data?.improvement_areas),
      strongest_questions: safeTextList(response.data?.strongest_questions),
      needs_work_questions: safeTextList(response.data?.needs_work_questions),
      evaluations: Array.isArray(response.data?.evaluations)
        ? response.data.evaluations.map((item) => normalizeEvaluation(item))
        : [],
    };
    setSummary(normalizedSummary);
    setProviders((prev) => ({ ...prev, ...(response.data.providers || {}) }));
    setStatus("Interview completed.");
    stopListening();
    stopSpeech();
    stopCamera();
    await exitFullscreen();
    setTimeLeftSeconds(null);
  };

  const submitAnswer = async () => {
    const answer = clean(`${draftRef.current} ${interimRef.current}`);
    if (!answer || !sessionIdRef.current || busyRef.current || summaryRef.current) return;

    stopListening();
    setBusy(true);
    setStatus("Evaluating your answer...");
    setError("");

    try {
      const response = await axios.post(`${API_BASE_URL}/ai-interview/evaluate`, {
        session_id: sessionIdRef.current,
        question_index: indexRef.current,
        answer,
      });

      const result = {
        ...normalizeEvaluation(response.data),
        next_question: safeText(response.data?.next_question),
      };
      setLatestEval(result);
      setHistory((prev) => [...prev, result]);
      setProviders((prev) => ({ ...prev, evaluation_provider: result.provider || prev.evaluation_provider }));

      if (result.is_complete) {
        await speak(result.assistant_reply || "Thank you. This interview is over.");
        await finishInterview(sessionIdRef.current);
      } else {
        const nextIndex = indexRef.current + 1;
        setIndex(nextIndex);
        setQuestion(result.next_question || "");
        setDraft("");
        setInterim("");
        await speak(result.assistant_reply || "Thank you. Let us continue.");
        await speak(`Question ${nextIndex + 1}. ${result.next_question || "Please continue."}`);
        startListening();
      }
    } catch (requestError) {
      setError(
        safeErrorText(
          requestError.response?.data?.detail ||
          requestError.response?.data ||
          requestError.message ||
          "Failed to evaluate the answer."
        )
      );
      setStatus("Evaluation failed.");
    } finally {
      setBusy(false);
    }
  };

  const beginVoiceInterview = async () => {
    setBusy(true);
    setError("");
    setLatestEval(null);
    setHistory([]);
    setSummary(null);
    setDraft("");
    setInterim("");

    try {
      await ensureFullscreen();
      await startCamera();
      const response = await axios.post(`${API_BASE_URL}/ai-interview/start`, payload, {
        headers: authHeaders(),
      });
      const data = response.data;
      setSessionId(data.session_id);
      setProviders(data.providers || {});
      setSessionMeta(data.meta || {});
      setQuestion(safeText(data.current_question));
      setTotal(data.total_questions || 0);
      setIndex(0);
      setStarted(true);
      setFullscreenBlocked(false);
      const timerMinutes = resolveTimerMinutes();
      setTimeLeftSeconds(timerMinutes ? timerMinutes * 60 : null);
      setStatus("Interview started.");
      await attachCameraPreview();
      await speak(safeText(data.assistant_intro) || "Hello. Let us begin.");
      await speak(`Question 1. ${safeText(data.current_question)}`);
      startListening();
    } catch (requestError) {
      const mediaErrorName = requestError?.name || requestError?.cause?.name;
      const isMediaError =
        mediaErrorName === "NotAllowedError" ||
        mediaErrorName === "NotFoundError" ||
        mediaErrorName === "NotReadableError";
      setError(
        isMediaError
          ? "Camera or microphone access failed on the interview page. Please allow access and try again."
          : safeErrorText(
              requestError.response?.data?.detail ||
              requestError.response?.data ||
              requestError.message ||
              "Failed to start the interview."
            )
      );
      setStatus("Interview could not start.");
    } finally {
      setBusy(false);
    }
  };

  const restoreFullscreen = async () => {
    try {
      await ensureFullscreen();
      setFullscreenBlocked(false);
      setError("");
      setStatus("Fullscreen restored. Continue your answer.");
      await speak("Fullscreen restored. Please continue your answer.");
      startListening();
    } catch (requestError) {
      setError(safeErrorText(requestError.message || "Fullscreen is required to continue."));
    }
  };

  const downloadReportPdf = () => {
    if (!reportRef.current) {
      setError("The report is not ready to export yet.");
      return;
    }

    const printWindow = window.open("", "_blank", "width=1200,height=900");
    if (!printWindow) {
      setError("Popup blocked. Please allow popups to export the report as PDF.");
      return;
    }

    const reportTitle = safeText(title) || "Interview Report";
    const reportHtml = reportRef.current.innerHTML;

    printWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>${reportTitle} Report</title>
          <meta charset="utf-8" />
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 24px;
              color: #0f172a;
              background: #ffffff;
            }
            h1, h2, h3, h4 {
              color: #0f172a;
              margin-top: 0;
            }
            p, div, span {
              line-height: 1.6;
            }
            button {
              display: none !important;
            }
            svg {
              max-width: 100%;
            }
            .print-block {
              break-inside: avoid;
              page-break-inside: avoid;
            }
            @media print {
              body {
                margin: 12px;
              }
            }
          </style>
        </head>
        <body>
          <h1>${reportTitle} Report</h1>
          ${reportHtml}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 300);
  };

  useEffect(() => {
    const onFullscreenChange = () => {
      if (!startedRef.current || summaryRef.current) return;
      if (!document.fullscreenElement) {
        stopListening();
        stopSpeech();
        setFullscreenBlocked(true);
        setStatus("Interview paused until fullscreen is restored.");
        setError("Fullscreen was exited. Re-enter fullscreen to continue.");
      }
    };

    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, [started, summary]);

  useEffect(() => {
    return () => {
      stopListening();
      stopSpeech();
      stopCamera();
      exitFullscreen();
    };
  }, []);

  useEffect(() => {
    if (started && cameraRef.current && videoRef.current) {
      attachCameraPreview();
    }
  }, [started]);

  useEffect(() => {
    if (!started || busy || fullscreenBlocked || summary || timeLeftSeconds == null || timeLeftSeconds <= 0) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      setTimeLeftSeconds((previous) => {
        if (previous == null) return previous;
        if (previous <= 1) {
          window.clearInterval(intervalId);
          setStatus("Interview time completed.");
          stopListening();
          if (sessionIdRef.current && !summaryRef.current) {
            finishInterview(sessionIdRef.current).catch(() => {
              setError("The interview timer ended, but the session summary could not be completed.");
            });
          }
          return 0;
        }
        return previous - 1;
      });
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [started, busy, fullscreenBlocked, summary, timeLeftSeconds]);

  const transcript = clean(`${draft} ${interim}`);
  const title = payload.job_role || payload.primary_language || payload.category || "Interview";
  const isCompactLayout = viewportWidth < 1180;
  const reportEvaluations = summary?.evaluations || [];
  const answeredCount = reportEvaluations.length;
  const strongAnswerCount = reportEvaluations.filter((item) => (item.score || 0) >= 75).length;
  const needsWorkCount = reportEvaluations.filter((item) => (item.score || 0) < 60).length;
  const allMistakes = Array.from(
    new Set(reportEvaluations.flatMap((item) => safeTextList(item.gaps)))
  );
  const allMatchedPoints = reportEvaluations.flatMap((item) => safeTextList(item.matched_points));
  const allMissedPoints = reportEvaluations.flatMap((item) => safeTextList(item.missed_points));
  const performanceRatio = allMatchedPoints.length + allMissedPoints.length
    ? Math.round((allMatchedPoints.length / (allMatchedPoints.length + allMissedPoints.length)) * 100)
    : 0;
  const reportUser =
    summary?.user ||
    (() => {
      try {
        return JSON.parse(localStorage.getItem("user") || "null");
      } catch {
        return null;
      }
    })();
  const timerLabel =
    timeLeftSeconds == null
      ? "No active timer"
      : `${Math.floor(timeLeftSeconds / 60)
          .toString()
          .padStart(2, "0")}:${(timeLeftSeconds % 60).toString().padStart(2, "0")}`;

  return (
    <div
      className="mock-page reveal"
      ref={rootRef}
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, #f8fbff 0%, #eef4ff 100%)",
        overflowY: "auto",
      }}
    >
      <div style={{ maxWidth: 1380, margin: "0 auto", padding: "24px 20px 36px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap", marginBottom: 24 }}>
          <div>
            <div style={{ display: "inline-block", padding: "8px 14px", borderRadius: 999, background: "rgba(79,70,229,0.08)", color: "#4338ca", fontWeight: 800, fontSize: 12, textTransform: "uppercase" }}>
              Voice Assistant
            </div>
            <h1 style={{ margin: "14px 0 6px", color: "#1f2a44" }}>{safeText(title) || "Interview"}</h1>
            <p style={{ margin: 0, color: "#5b6480", lineHeight: 1.6 }}>
              Gemini handles evaluation, Groq keeps the question flow fast, and local Ollama llama3 is the backup.
            </p>
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button className="go-back-btn" onClick={() => navigate(-1)}>
              Back
            </button>
            <button className="mock-btn" onClick={() => navigate("/")}>
              Home
            </button>
          </div>
        </div>

        {error ? <div style={{ marginBottom: 18, padding: 14, borderRadius: 16, background: "rgba(239,68,68,0.08)", color: "#b91c1c", fontWeight: 700 }}>{safeText(error)}</div> : null}
        {fullscreenBlocked ? <div style={{ marginBottom: 18, padding: 18, borderRadius: 18, background: "#fff7ed", color: "#9a3412", display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center", flexWrap: "wrap" }}><span>Fullscreen is required while the interview is running.</span><button className="mock-btn" onClick={restoreFullscreen}>Re-enter Fullscreen</button></div> : null}

        {!started ? (
          <div style={{ display: "grid", gridTemplateColumns: isCompactLayout ? "1fr" : "minmax(0,1.1fr) minmax(320px,0.9fr)", gap: 24, alignItems: "start" }}>
            <div style={{ background: "white", borderRadius: 28, padding: 28, boxShadow: "0 24px 60px rgba(88,107,176,0.14)" }}>
              <h2 style={{ marginTop: 0, color: "#1f2a44" }}>Ready for your AI interview</h2>
              <p style={{ color: "#4f5873", lineHeight: 1.8 }}>
                The assistant will speak each question, capture your answer by voice, evaluate approximate meaning, and move you through the session one question at a time.
              </p>
                <div style={{ display: "grid", gap: 12, marginTop: 18, color: "#4f5873" }}>
                <div>Category: {safeText(payload.category)}</div>
                <div>Mode: {safeText(payload.selected_mode)}</div>
                <div>Role: {safeText(payload.job_role) || "General"}</div>
                <div>Language: {safeText(payload.primary_language) || "Not selected"}</div>
                <div>Experience: {safeText(payload.experience)}</div>
                <div>Questions: {safeScore(payload.question_count)}</div>
                <div>Config mode: {safeText(payload.config_mode)}</div>
                <div>Timer: {resolveTimerMinutes() ? `${resolveTimerMinutes()} minutes` : "Off"}</div>
                <div>Speech recognition: {SpeechRecognition ? "Available" : "Unavailable, typed fallback will be available"}</div>
              </div>
              <button className="mock-btn" onClick={beginVoiceInterview} disabled={busy} style={{ marginTop: 24, background: "linear-gradient(135deg, #4338ca, #7c3aed)" }}>
                {busy ? "Starting..." : "Enter Fullscreen and Begin"}
              </button>
            </div>

            <div style={{ background: "#111c42", color: "#eef2ff", borderRadius: 28, padding: 26 }}>
              <h3 style={{ marginTop: 0 }}>How this works</h3>
              <div style={{ display: "grid", gap: 14, lineHeight: 1.7 }}>
                <div>1. Start the session and enter fullscreen.</div>
                <div>2. Listen to the spoken question.</div>
                <div>3. Answer by voice. Your transcript appears live.</div>
                <div>4. The backend evaluates the answer and prepares the next question.</div>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: isCompactLayout ? "1fr" : "minmax(300px,0.88fr) minmax(0,1.12fr)", gap: 20, alignItems: "start" }}>
            <div style={{ display: "grid", gap: 18, minWidth: 0 }}>
              <div style={{ background: "#0f172a", padding: 18, borderRadius: 28 }}>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  style={{
                    width: "100%",
                    minHeight: isCompactLayout ? 220 : 300,
                    maxHeight: isCompactLayout ? 320 : 380,
                    objectFit: "cover",
                    background: "#020617",
                    borderRadius: 20,
                  }}
                />
                <div style={{ marginTop: 14, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12, color: "#e2e8f0" }}>
                  <span>Question {Math.min(index + 1, total || 1)} of {total || 1}</span>
                  <strong>{safeText(listening ? "Listening" : busy ? status : status)}</strong>
                </div>
                <div style={{ marginTop: 12, color: "#cbd5e1", display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <span>Difficulty: {safeText(sessionMeta.difficulty || payload.experience) || "Adaptive"}</span>
                  <span>Timer: {timerLabel}</span>
                </div>
              </div>

              <div style={{ background: "white", borderRadius: 24, padding: 22, boxShadow: "0 20px 50px rgba(88,107,176,0.12)" }}>
                <h3 style={{ marginTop: 0, color: "#1f2a44" }}>Providers</h3>
                <div style={{ display: "grid", gap: 10, color: "#4f5873" }}>
                  <div>Generation: {safeText(providers.generation_provider) || "Pending"}</div>
                  <div>Evaluation: {safeText(providers.evaluation_provider) || "Pending"}</div>
                  <div>Summary: {safeText(providers.summary_provider) || "Pending"}</div>
                  <div>Answers reviewed: {history.length}</div>
                </div>
              </div>
            </div>

            <div style={{ display: "grid", gap: 18, minWidth: 0 }}>
              <div style={{ background: "linear-gradient(135deg, #4338ca, #2563eb)", color: "white", borderRadius: 28, padding: 26 }}>
                <div style={{ fontSize: 12, fontWeight: 800, textTransform: "uppercase", opacity: 0.9 }}>Current question</div>
                <h2 style={{ margin: "12px 0 0", lineHeight: 1.45, fontSize: isCompactLayout ? 24 : 30 }}>{safeText(question) || "Loading question..."}</h2>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 20 }}>
                  <button className="mock-btn" onClick={() => speak(`Question ${index + 1}. ${safeText(question)}`)} style={{ background: "rgba(255,255,255,0.16)" }}>Repeat</button>
                  <button className="mock-btn" onClick={startListening} disabled={busy || fullscreenBlocked || summary} style={{ background: "rgba(255,255,255,0.16)" }}>Listen Again</button>
                </div>
              </div>

              <div style={{ background: "white", borderRadius: 24, padding: 24, boxShadow: "0 20px 50px rgba(88,107,176,0.12)" }}>
                <h3 style={{ marginTop: 0, color: "#1f2a44" }}>Your answer</h3>
                <textarea value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Your spoken answer will appear here. You can also refine it before submitting." style={{ width: "100%", minHeight: isCompactLayout ? 140 : 170, borderRadius: 18, border: "1px solid rgba(148,163,184,0.28)", padding: 16, resize: "vertical" }} />
                <div style={{ marginTop: 12, padding: 14, borderRadius: 16, background: "rgba(14,165,233,0.08)", color: "#0f5f82" }}>
                  Live transcript: {safeText(interim || transcript) || "Waiting for your answer..."}
                </div>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 18 }}>
                  <button className="mock-btn" onClick={submitAnswer} disabled={!clean(transcript) || busy || fullscreenBlocked || Boolean(summary)} style={{ background: "linear-gradient(135deg, #059669, #10b981)" }}>
                    {busy ? "Processing..." : "Submit Answer"}
                  </button>
                  <button className="go-back-btn" onClick={() => { stopListening(); setDraft(""); setInterim(""); }} disabled={busy}>Clear</button>
                </div>
              </div>

              {latestEval ? (
                <div style={{ background: "white", borderRadius: 24, padding: 24, boxShadow: "0 20px 50px rgba(88,107,176,0.12)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                    <h3 style={{ margin: 0, color: "#1f2a44" }}>Latest evaluation</h3>
                    <strong>Score {safeScore(latestEval.score)}/100</strong>
                  </div>
                  <p style={{ color: "#4f5873", lineHeight: 1.7 }}>{safeText(latestEval.feedback)}</p>
                  <div style={{ color: "#4f5873", display: "grid", gap: 8 }}>
                    {safeTextList(latestEval.strengths).map((item) => <div key={item}>- {item}</div>)}
                    {safeTextList(latestEval.gaps).map((item) => <div key={item}>- {item}</div>)}
                  </div>
                </div>
              ) : null}

              {summary ? (
                <div ref={reportRef} style={{ background: "#ecfeff", borderRadius: 24, padding: 24, display: "grid", gap: 22 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                    <h3 style={{ margin: 0, color: "#0f172a" }}>Final interview report</h3>
                    <strong>Overall score {safeScore(summary.overall_score)}/100</strong>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: isCompactLayout ? "1fr 1fr" : "repeat(4, minmax(0, 1fr))", gap: 14 }}>
                    <MetricTile label="Questions answered" value={answeredCount} tone="#0f766e" />
                    <MetricTile label="Strong answers" value={strongAnswerCount} tone="#10b981" />
                    <MetricTile label="Need work" value={needsWorkCount} tone="#ef4444" />
                    <MetricTile label="Coverage ratio" value={`${performanceRatio}%`} tone="#2563eb" />
                  </div>

                  <div style={{ background: "white", borderRadius: 20, padding: 20, boxShadow: "0 14px 34px rgba(88,107,176,0.10)" }}>
                    <h4 style={{ marginTop: 0, color: "#0f172a" }}>User details and selections</h4>
                    <div style={{ display: "grid", gridTemplateColumns: isCompactLayout ? "1fr" : "repeat(2, minmax(0, 1fr))", gap: 12, color: "#334155" }}>
                      <div>Name: {safeText(`${reportUser?.first_name || ""} ${reportUser?.last_name || ""}`) || "Not available"}</div>
                      <div>Email: {safeText(reportUser?.email) || "Not available"}</div>
                      <div>Category: {safeText(summary.context?.category || payload.category)}</div>
                      <div>Mode: {safeText(summary.context?.selected_mode || payload.selected_mode)}</div>
                      <div>Role: {safeText(summary.context?.job_role || payload.job_role) || "Not selected"}</div>
                      <div>Language: {safeText(summary.context?.primary_language || payload.primary_language) || "Not selected"}</div>
                      <div>Experience: {safeText(summary.context?.experience || payload.experience)}</div>
                      <div>Config mode: {safeText(summary.context?.config_mode || payload.config_mode)}</div>
                      <div>Practice type: {safeText(summary.context?.practice_type || payload.practice_type)}</div>
                      <div>Interview timer: {safeText(summary.context?.interview_mode_time) || "Off"}</div>
                      <div>Time mode interval: {safeText(summary.context?.time_mode_interval) || "Off"}</div>
                      <div>AI providers: {safeText(summary.providers?.generation_provider)}, {safeText(summary.providers?.evaluation_provider)}, {safeText(summary.providers?.summary_provider)}</div>
                    </div>
                  </div>

                  <div style={{ background: "white", borderRadius: 20, padding: 20, boxShadow: "0 14px 34px rgba(88,107,176,0.10)" }}>
                    <h4 style={{ marginTop: 0, color: "#0f172a" }}>Overall analysis</h4>
                    <p style={{ color: "#334155", lineHeight: 1.7 }}>{safeText(summary.summary)}</p>
                    <div style={{ display: "grid", gridTemplateColumns: isCompactLayout ? "1fr" : "repeat(2, minmax(0, 1fr))", gap: 18 }}>
                      <div>
                        <div style={{ fontWeight: 800, color: "#0f766e", marginBottom: 8 }}>Top strengths</div>
                        <div style={{ display: "grid", gap: 8, color: "#334155" }}>
                          {(summary.top_strengths || []).map((item) => <div key={item}>- {item}</div>)}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontWeight: 800, color: "#c2410c", marginBottom: 8 }}>Where to improve</div>
                        <div style={{ display: "grid", gap: 8, color: "#334155" }}>
                          {(summary.improvement_areas || []).map((item) => <div key={item}>- {item}</div>)}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div style={{ background: "white", borderRadius: 20, padding: 20, boxShadow: "0 14px 34px rgba(88,107,176,0.10)" }}>
                    <h4 style={{ marginTop: 0, color: "#0f172a" }}>Performance graph</h4>
                    <ScoreBars items={reportEvaluations.map((item) => ({ question: safeText(item.question), score: safeScore(item.score) }))} />
                  </div>

                  <div style={{ background: "white", borderRadius: 20, padding: 20, boxShadow: "0 14px 34px rgba(88,107,176,0.10)" }}>
                    <h4 style={{ marginTop: 0, color: "#0f172a" }}>Common mistakes and missed areas</h4>
                    <div style={{ display: "grid", gap: 8, color: "#334155" }}>
                      {allMistakes.length
                        ? allMistakes.map((item) => <div key={item}>- {item}</div>)
                        : <div>No major repeated mistakes were detected.</div>}
                    </div>
                  </div>

                  <div style={{ background: "white", borderRadius: 20, padding: 20, boxShadow: "0 14px 34px rgba(88,107,176,0.10)" }}>
                    <h4 style={{ marginTop: 0, color: "#0f172a" }}>Question by question report</h4>
                    <div style={{ display: "grid", gap: 18 }}>
                      {reportEvaluations.map((item, itemIndex) => (
                        <div key={`${item.question}-${itemIndex}`} style={{ border: "1px solid #dbe4f0", borderRadius: 18, padding: 18, background: "#f8fbff" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                            <strong style={{ color: "#0f172a" }}>Question {itemIndex + 1}</strong>
                            <span style={{ fontWeight: 800, color: safeScore(item.score) >= 75 ? "#047857" : safeScore(item.score) >= 60 ? "#b45309" : "#b91c1c" }}>
                              Score {safeScore(item.score)}/100
                            </span>
                          </div>
                          <div style={{ marginTop: 10, color: "#0f172a", fontWeight: 700 }}>{safeText(item.question)}</div>
                          <div style={{ marginTop: 10, color: "#334155", lineHeight: 1.7 }}>
                            <strong>Your answer:</strong> {safeText(item.answer) || "Not captured"}
                          </div>
                          <div style={{ marginTop: 10, color: "#334155", lineHeight: 1.7 }}>
                            <strong>Analysis:</strong> {safeText(item.feedback)}
                          </div>
                          <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: isCompactLayout ? "1fr" : "repeat(2, minmax(0, 1fr))", gap: 14 }}>
                            <div>
                              <div style={{ fontWeight: 800, color: "#0f766e", marginBottom: 6 }}>What went well</div>
                              <div style={{ display: "grid", gap: 6, color: "#334155" }}>
                                {(item.strengths || []).map((entry) => <div key={entry}>- {entry}</div>)}
                              </div>
                            </div>
                            <div>
                              <div style={{ fontWeight: 800, color: "#c2410c", marginBottom: 6 }}>Mistakes / gaps</div>
                              <div style={{ display: "grid", gap: 6, color: "#334155" }}>
                                {(item.gaps || []).map((entry) => <div key={entry}>- {entry}</div>)}
                              </div>
                            </div>
                          </div>
                          <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: isCompactLayout ? "1fr" : "repeat(2, minmax(0, 1fr))", gap: 14 }}>
                            <div>
                              <div style={{ fontWeight: 800, color: "#2563eb", marginBottom: 6 }}>Covered points</div>
                              <div style={{ display: "grid", gap: 6, color: "#334155" }}>
                                {(item.matched_points || []).map((entry) => <div key={entry}>- {entry}</div>)}
                              </div>
                            </div>
                            <div>
                              <div style={{ fontWeight: 800, color: "#7c2d12", marginBottom: 6 }}>Missed points</div>
                              <div style={{ display: "grid", gap: 6, color: "#334155" }}>
                                {(item.missed_points || []).map((entry) => <div key={entry}>- {entry}</div>)}
                              </div>
                            </div>
                          </div>
                          <div style={{ marginTop: 10, color: "#334155", lineHeight: 1.7 }}>
                            <strong>How you could answer better:</strong> {safeText(item.suggested_answer)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 6 }}>
                    <button className="mock-btn" onClick={downloadReportPdf}>Download PDF</button>
                    <button className="mock-btn" onClick={() => navigate("/dashboard")}>View Dashboard</button>
                    <button className="go-back-btn" onClick={() => navigate("/")}>Return Home</button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default VoiceInterview;
