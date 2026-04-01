import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import "../App.css";
import {
  normalizeReport,
  safeErrorText,
  safeScore,
  safeText,
  safeTextList,
} from "../utils/interviewReport";

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://127.0.0.1:8000";

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

function Reports() {
  const navigate = useNavigate();
  const location = useLocation();
  const { sessionId } = useParams();
  const reportRef = useRef(null);
  const locationReport = location.state?.report ? normalizeReport(location.state.report, location.state?.context || {}) : null;

  const [report, setReport] = useState(locationReport);
  const [loading, setLoading] = useState(!locationReport);
  const [error, setError] = useState("");

  useEffect(() => {
    if (locationReport || !sessionId) return;

    const loadReport = async () => {
      setLoading(true);
      setError("");
      try {
        const token = localStorage.getItem("token");
        const response = await axios.get(`${API_BASE_URL}/interview-reports/${sessionId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        setReport(normalizeReport(response.data?.report, location.state?.context || {}));
      } catch (requestError) {
        setError(
          safeErrorText(
            requestError.response?.data?.detail ||
            requestError.response?.data ||
            requestError.message ||
            "Failed to load the report."
          )
        );
      } finally {
        setLoading(false);
      }
    };

    loadReport();
  }, [location.state?.context, locationReport, sessionId]);

  const reportEvaluations = useMemo(() => report?.evaluations || [], [report]);
  const answeredCount = reportEvaluations.length;
  const strongAnswerCount = reportEvaluations.filter((item) => item.score >= 75).length;
  const needsWorkCount = reportEvaluations.filter((item) => item.score < 60).length;
  const allMistakes = useMemo(
    () => Array.from(new Set(reportEvaluations.flatMap((item) => safeTextList(item.gaps)))),
    [reportEvaluations]
  );
  const allMatchedPoints = reportEvaluations.flatMap((item) => safeTextList(item.matched_points));
  const allMissedPoints = reportEvaluations.flatMap((item) => safeTextList(item.missed_points));
  const performanceRatio = allMatchedPoints.length + allMissedPoints.length
    ? Math.round((allMatchedPoints.length / (allMatchedPoints.length + allMissedPoints.length)) * 100)
    : 0;
  const reportTitle = safeText(
    report?.context?.job_role || report?.context?.primary_language || report?.context?.category || "Interview"
  );

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

    const reportHtml = reportRef.current.innerHTML;
    printWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>${reportTitle} Report</title>
          <meta charset="utf-8" />
          <style>
            body { font-family: Arial, sans-serif; margin: 24px; color: #0f172a; background: #ffffff; }
            h1, h2, h3, h4 { color: #0f172a; margin-top: 0; }
            p, div, span { line-height: 1.6; }
            button { display: none !important; }
            .print-block { break-inside: avoid; page-break-inside: avoid; }
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
    setTimeout(() => printWindow.print(), 300);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, #f8fbff 0%, #eef4ff 100%)",
        overflowY: "auto",
      }}
    >
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "24px 20px 40px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap", marginBottom: 24 }}>
          <div>
            <div style={{ display: "inline-block", padding: "8px 14px", borderRadius: 999, background: "rgba(79,70,229,0.08)", color: "#4338ca", fontWeight: 800, fontSize: 12, textTransform: "uppercase" }}>
              AI Interview Report
            </div>
            <h1 style={{ margin: "14px 0 6px", color: "#1f2a44" }}>{reportTitle} report</h1>
            <p style={{ margin: 0, color: "#5b6480", lineHeight: 1.6 }}>
              Full feedback, score breakdown, question analysis, and improvement guidance from your interview.
            </p>
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button className="go-back-btn" onClick={() => navigate(-1)}>Back</button>
            <button className="mock-btn" onClick={() => navigate("/dashboard")}>Dashboard</button>
            <button className="mock-btn" onClick={() => navigate("/")}>Home</button>
          </div>
        </div>

        {error ? <div style={{ marginBottom: 18, padding: 14, borderRadius: 16, background: "rgba(239,68,68,0.08)", color: "#b91c1c", fontWeight: 700 }}>{safeText(error)}</div> : null}
        {loading ? <div style={{ padding: 28, borderRadius: 22, background: "white" }}>Loading report...</div> : null}

        {!loading && report ? (
          <div ref={reportRef} style={{ background: "#ecfeff", borderRadius: 24, padding: 24, display: "grid", gap: 22 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
              <div>
                <h3 style={{ margin: 0, color: "#0f172a" }}>Final interview report</h3>
                <div style={{ color: "#475569", marginTop: 6 }}>
                  {report.ended_early ? "Interview ended early by the user." : "Interview completed successfully."}
                </div>
              </div>
              <strong>Overall score {safeScore(report.overall_score)}/100</strong>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}>
              <MetricTile label="Questions answered" value={answeredCount} tone="#0f766e" />
              <MetricTile label="Strong answers" value={strongAnswerCount} tone="#10b981" />
              <MetricTile label="Need work" value={needsWorkCount} tone="#ef4444" />
              <MetricTile label="Coverage ratio" value={`${performanceRatio}%`} tone="#2563eb" />
            </div>

            <div style={{ background: "white", borderRadius: 20, padding: 20, boxShadow: "0 14px 34px rgba(88,107,176,0.10)" }}>
              <h4 style={{ marginTop: 0, color: "#0f172a" }}>User details and selections</h4>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12, color: "#334155" }}>
                <div>Name: {safeText(`${report.user?.first_name || ""} ${report.user?.last_name || ""}`) || "Not available"}</div>
                <div>Email: {safeText(report.user?.email) || "Not available"}</div>
                <div>Category: {safeText(report.context?.category)}</div>
                <div>Mode: {safeText(report.context?.selected_mode)}</div>
                <div>Role: {safeText(report.context?.job_role) || "Not selected"}</div>
                <div>Language: {safeText(report.context?.primary_language) || "Not selected"}</div>
                <div>Experience: {safeText(report.context?.experience)}</div>
                <div>Config mode: {safeText(report.context?.config_mode)}</div>
                <div>Practice type: {safeText(report.context?.practice_type)}</div>
                <div>Interview timer: {safeText(report.context?.interview_mode_time) || "Off"}</div>
                <div>Time mode interval: {safeText(report.context?.time_mode_interval) || "Off"}</div>
                <div>Selected focus: {safeText(report.context?.selected_options) || "General"}</div>
                <div>Generation provider: {safeText(report.providers?.generation_provider) || "Pending"}</div>
                <div>Evaluation provider: {safeText(report.providers?.evaluation_provider) || "Pending"}</div>
                <div>Summary provider: {safeText(report.providers?.summary_provider) || "Pending"}</div>
              </div>
            </div>

            <div style={{ background: "white", borderRadius: 20, padding: 20, boxShadow: "0 14px 34px rgba(88,107,176,0.10)" }}>
              <h4 style={{ marginTop: 0, color: "#0f172a" }}>Overall analysis</h4>
              <p style={{ color: "#334155", lineHeight: 1.7 }}>{safeText(report.summary)}</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 18 }}>
                <div>
                  <div style={{ fontWeight: 800, color: "#0f766e", marginBottom: 8 }}>Top strengths</div>
                  <div style={{ display: "grid", gap: 8, color: "#334155" }}>
                    {(report.top_strengths || []).map((item) => <div key={item}>- {item}</div>)}
                  </div>
                </div>
                <div>
                  <div style={{ fontWeight: 800, color: "#c2410c", marginBottom: 8 }}>Where to improve</div>
                  <div style={{ display: "grid", gap: 8, color: "#334155" }}>
                    {(report.improvement_areas || []).map((item) => <div key={item}>- {item}</div>)}
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
                {allMistakes.length ? allMistakes.map((item) => <div key={item}>- {item}</div>) : <div>No major repeated mistakes were detected.</div>}
              </div>
            </div>

            <div style={{ background: "white", borderRadius: 20, padding: 20, boxShadow: "0 14px 34px rgba(88,107,176,0.10)" }}>
              <h4 style={{ marginTop: 0, color: "#0f172a" }}>Question by question report</h4>
              <div style={{ display: "grid", gap: 18 }}>
                {reportEvaluations.map((item, itemIndex) => (
                  <div key={`${item.question}-${itemIndex}`} style={{ border: "1px solid #dbe4f0", borderRadius: 18, padding: 18, background: "#f8fbff" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                      <strong style={{ color: "#0f172a" }}>Question {itemIndex + 1} ({safeText(item.question_type) || "practical"})</strong>
                      <span style={{ fontWeight: 800, color: item.score >= 75 ? "#047857" : item.score >= 60 ? "#b45309" : "#b91c1c" }}>
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
                    <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14 }}>
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
                    <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14 }}>
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
  );
}

export default Reports;
