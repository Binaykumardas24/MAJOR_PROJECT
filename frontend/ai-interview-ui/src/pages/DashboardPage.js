import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "../App.css";
import Navbar from "../components/Navbar";
import { normalizeReport, safeErrorText, safeScore, safeText } from "../utils/interviewReport";

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://127.0.0.1:8000";

function MetricCard({ title, value, subtitle, accent }) {
  return (
    <div className="metric-card" style={{ borderTop: `4px solid ${accent || "#007bff"}` }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: "#444" }}>{title}</div>
      <div style={{ fontSize: 32, fontWeight: 800, margin: "10px 0" }}>{value}</div>
      {subtitle && <div style={{ fontSize: 12, color: "#666" }}>{subtitle}</div>}
    </div>
  );
}

function LineChart({ data = [], width = 400, height = 160, color = "#0e76fd" }) {
  if (!data.length) return null;

  const max = Math.max(...data);
  const min = Math.min(...data);
  const padding = 16;

  const points = data.map((value, index) => {
    const x = padding + (index / Math.max(data.length - 1, 1)) * (width - padding * 2);
    const y = padding + ((max - value) / (max - min || 1)) * (height - padding * 2);
    return `${x},${y}`;
  });

  return (
    <svg width={width} height={height} style={{ overflow: "visible", maxWidth: "100%" }}>
      <path d={`M${points.join(" L")}`} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" />
      {points.map((point, idx) => {
        const [x, y] = point.split(",").map(Number);
        return <circle key={idx} cx={x} cy={y} r={4} fill={color} />;
      })}
    </svg>
  );
}

function BarChart({ data = [], width = 400, height = 160, color = "#0e76fd" }) {
  if (!data.length) return null;
  const maxValue = Math.max(...data.map((item) => item.value), 0);
  const barWidth = (width - 16) / Math.max(data.length, 1) - 8;

  return (
    <svg width={width} height={height} style={{ overflow: "visible", maxWidth: "100%" }}>
      {data.map((item, index) => {
        const barHeight = maxValue ? (item.value / maxValue) * (height - 40) : 0;
        const x = 16 + index * (barWidth + 8);
        const y = height - barHeight - 24;
        return (
          <g key={`${item.topic}-${index}`}>
            <rect x={x} y={y} width={barWidth} height={barHeight} fill={color} rx={6} />
            <text x={x + barWidth / 2} y={height - 8} fontSize={10} fill="#333" textAnchor="middle">
              {item.topic}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function DashboardPage() {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState({});
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadDashboard = async () => {
      setLoading(true);
      setError("");
      try {
        const token = localStorage.getItem("token");
        const response = await axios.get(`${API_BASE_URL}/interview-reports`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });

        const normalizedReports = Array.isArray(response.data?.reports)
          ? response.data.reports.map((item) => normalizeReport(item))
          : [];

        const scores = normalizedReports.map((item) => safeScore(item.overall_score));
        const topicMap = new Map();

        normalizedReports.forEach((item) => {
          const topic = safeText(item.context?.job_role || item.context?.primary_language || item.context?.category || "General");
          const current = topicMap.get(topic) || [];
          current.push(safeScore(item.overall_score));
          topicMap.set(topic, current);
        });

        const topicPerformance = Array.from(topicMap.entries())
          .slice(0, 6)
          .map(([topic, values]) => ({
            topic,
            value: Math.round(values.reduce((sum, score) => sum + score, 0) / Math.max(values.length, 1)),
          }));

        setReports(normalizedReports);
        setMetrics({
          totalInterviews: normalizedReports.length,
          avgScore: scores.length ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length) : 0,
          bestScore: scores.length ? Math.max(...scores) : 0,
          accuracyTrend: scores.length ? scores.slice(0, 9).reverse() : [],
          topicPerformance,
        });
      } catch (requestError) {
        setError(
          safeErrorText(
            requestError.response?.data?.detail ||
            requestError.response?.data ||
            requestError.message ||
            "Failed to load dashboard metrics."
          )
        );
        setMetrics({
          totalInterviews: 0,
          avgScore: 0,
          bestScore: 0,
          accuracyTrend: [],
          topicPerformance: [],
        });
        setReports([]);
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, []);

  const topTrend = useMemo(() => metrics.accuracyTrend || [], [metrics]);
  const topics = useMemo(() => metrics.topicPerformance || [], [metrics]);

  return (
    <>
      <Navbar />

      <div className="page-content reveal" style={{ maxWidth: 1024, margin: "0 auto", padding: "32px 16px" }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
          <div>
            <h1 style={{ margin: 0 }}>Dashboard</h1>
            <p style={{ margin: "8px 0 0", color: "#555" }}>
              Quick insights into your interview performance, saved reports, and progress over time.
            </p>
          </div>
        </div>

        {error ? (
          <div style={{ marginTop: 18, padding: 14, borderRadius: 12, background: "rgba(239,68,68,0.08)", color: "#b91c1c", fontWeight: 700 }}>
            {error}
          </div>
        ) : null}

        {loading ? (
          <div style={{ marginTop: 48, textAlign: "center" }}>Loading metrics...</div>
        ) : (
          <>
            <div className="dashboard-grid" style={{ marginTop: 28 }}>
              <MetricCard title="Mock Interviews" value={metrics.totalInterviews || 0} subtitle="Sessions completed" accent="#007bff" />
              <MetricCard title="Average Score" value={`${metrics.avgScore || 0}%`} subtitle="Across all sessions" accent="#00b894" />
              <MetricCard title="Best Score" value={`${metrics.bestScore || 0}%`} subtitle="Highest achievement" accent="#fdcb6e" />
              <MetricCard title="Improvement Rate" value={`${Math.min(100, Math.round((metrics.avgScore || 0) * 1.05))}%`} subtitle="Trend projection" accent="#6c5ce7" />
            </div>

            <div className="dashboard-row" style={{ marginTop: 32, gap: 20, flexWrap: "wrap" }}>
              <div className="dashboard-chart" style={{ flex: 1, minWidth: 320, padding: 20, background: "#fff", borderRadius: 12, boxShadow: "0 3px 16px rgba(0,0,0,0.08)" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <h3 style={{ margin: 0 }}>Accuracy Trend</h3>
                  <span style={{ color: "#666", fontSize: 12 }}>Latest sessions</span>
                </div>
                {topTrend.length ? <LineChart data={topTrend} width={560} height={200} /> : <div style={{ color: "#666" }}>No completed interviews yet.</div>}
              </div>

              <div className="dashboard-chart" style={{ flex: 1, minWidth: 320, padding: 20, background: "#fff", borderRadius: 12, boxShadow: "0 3px 16px rgba(0,0,0,0.08)" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <h3 style={{ margin: 0 }}>Topic Performance</h3>
                  <span style={{ color: "#666", fontSize: 12 }}>Higher is better</span>
                </div>
                {topics.length ? <BarChart data={topics} width={560} height={220} /> : <div style={{ color: "#666" }}>Your interview topics will appear here after reports are generated.</div>}
              </div>
            </div>

            <div style={{ marginTop: 36, padding: 20, borderRadius: 12, background: "rgba(0, 123, 255, 0.06)" }}>
              <h3 style={{ margin: 0 }}>Tip</h3>
              <p style={{ margin: "8px 0 0", color: "#333" }}>
                Review your past reports regularly and focus on repeated gaps in fundamentals, concepts, and scenario-based answers.
              </p>
            </div>

            <div className="recent-activity-card" style={{ marginTop: 28, padding: 20, borderRadius: 12, background: "#fff", boxShadow: "0 6px 18px rgba(0,0,0,0.07)" }}>
              <h3 style={{ margin: 0, marginBottom: 8 }}>Recent Sessions</h3>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                <thead>
                  <tr style={{ textAlign: "left", color: "#555" }}>
                    <th style={{ padding: "10px 6px" }}>Session</th>
                    <th style={{ padding: "10px 6px" }}>Mode</th>
                    <th style={{ padding: "10px 6px" }}>Score</th>
                    <th style={{ padding: "10px 6px" }}>Notes</th>
                    <th style={{ padding: "10px 6px" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.length ? reports.slice(0, 8).map((row) => (
                    <tr key={row.session_id} style={{ borderTop: "1px solid #e8e8e8" }}>
                      <td style={{ padding: "10px 6px" }}>{safeText(row.session_id).slice(0, 8)}</td>
                      <td style={{ padding: "10px 6px" }}>{safeText(row.context?.selected_mode || row.context?.category || "Interview")}</td>
                      <td style={{ padding: "10px 6px", fontWeight: 700 }}>{safeScore(row.overall_score)}%</td>
                      <td style={{ padding: "10px 6px" }}>{safeText(row.summary) || "Report generated"}</td>
                      <td style={{ padding: "10px 6px" }}>
                        <button
                          className="mock-btn"
                          style={{ marginTop: 0, padding: "8px 14px" }}
                          onClick={() => navigate(`/reports/${row.session_id}`, { state: { report: row } })}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  )) : (
                    <tr style={{ borderTop: "1px solid #e8e8e8" }}>
                      <td colSpan="5" style={{ padding: "16px 6px", color: "#666" }}>
                        No past reports yet. Complete an interview to see your history here.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </>
  );
}

export default DashboardPage;
