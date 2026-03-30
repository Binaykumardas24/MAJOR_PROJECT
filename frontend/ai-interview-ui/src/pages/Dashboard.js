import React, { useEffect, useMemo, useState } from "react";
import "../App.css";
import Navbar from "../components/Navbar";

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
    const x = padding + (index / (data.length - 1)) * (width - padding * 2);
    const y = padding + ((max - value) / (max - min || 1)) * (height - padding * 2);
    return `${x},${y}`;
  });

  const path = `M${points.join(" L")}`;

  return (
    <svg width={width} height={height} style={{ overflow: "visible" }}>
      <path d={path} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" />
      {points.map((p, idx) => {
        const [x, y] = p.split(",").map(Number);
        return <circle key={idx} cx={x} cy={y} r={4} fill={color} />;
      })}
    </svg>
  );
}

function BarChart({ data = [], width = 400, height = 160, color = "#0e76fd" }) {
  const maxValue = Math.max(...data.map((item) => item.value), 0);
  const barWidth = data.length ? (width - 16) / data.length - 8 : 0;

  return (
    <svg width={width} height={height} style={{ overflow: "visible" }}>
      {data.map((item, index) => {
        const barHeight = maxValue ? (item.value / maxValue) * (height - 40) : 0;
        const x = 16 + index * (barWidth + 8);
        const y = height - barHeight - 24;
        return (
          <g key={item.topic}>
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

function Dashboard() {
  const [metrics, setMetrics] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Placeholder: replace with real API calls when available
    const stored = JSON.parse(localStorage.getItem("dashboardMetrics")) || {};

    setMetrics({
      totalInterviews: stored.totalInterviews ?? 32,
      avgScore: stored.avgScore ?? 78,
      bestScore: stored.bestScore ?? 92,
      accuracyTrend: stored.accuracyTrend ?? [62, 65, 70, 74, 78, 82, 85, 87, 90],
      topicPerformance:
        stored.topicPerformance ?? [
          { topic: "Algorithms", value: 82 },
          { topic: "Data Structures", value: 75 },
          { topic: "System Design", value: 68 },
          { topic: "Behavioral", value: 88 }
        ]
    });

    setTimeout(() => setLoading(false), 200);
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
              Quick insights into your interview performance and progress.
            </p>
          </div>
        </div>

        {loading ? (
          <div style={{ marginTop: 48, textAlign: "center" }}>Loading metrics...</div>
        ) : (
          <>
            <div className="dashboard-grid" style={{ marginTop: 28 }}>
              <MetricCard
                title="Mock Interviews"
                value={metrics.totalInterviews}
                subtitle="Sessions completed"
                accent="#007bff"
              />
              <MetricCard
                title="Average Score"
                value={`${metrics.avgScore}%`}
                subtitle="Across all sessions"
                accent="#00b894"
              />
              <MetricCard
                title="Best Score"
                value={`${metrics.bestScore}%`}
                subtitle="Highest achievement"
                accent="#fdcb6e"
              />
              <MetricCard
                title="Improvement Rate"
                value={`${Math.min(100, Math.round((metrics.avgScore || 0) * 1.05))}%`}
                subtitle="Trend projection"
                accent="#6c5ce7"
              />
            </div>

            <div className="dashboard-row" style={{ marginTop: 32, gap: 20, flexWrap: "wrap" }}>
              <div className="dashboard-chart" style={{ flex: 1, minWidth: 320, padding: 20, background: "#fff", borderRadius: 12, boxShadow: "0 3px 16px rgba(0,0,0,0.08)" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <h3 style={{ margin: 0 }}>Accuracy Trend</h3>
                  <span style={{ color: "#666", fontSize: 12 }}>Last 9 sessions</span>
                </div>
                <LineChart data={topTrend} width={560} height={200} />
              </div>

              <div className="dashboard-chart" style={{ flex: 1, minWidth: 320, padding: 20, background: "#fff", borderRadius: 12, boxShadow: "0 3px 16px rgba(0,0,0,0.08)" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <h3 style={{ margin: 0 }}>Topic Performance</h3>
                  <span style={{ color: "#666", fontSize: 12 }}>Higher is better</span>
                </div>
                <BarChart data={topics} width={560} height={220} />
              </div>
            </div>

            <div style={{ marginTop: 36, padding: 20, borderRadius: 12, background: "rgba(0, 123, 255, 0.06)" }}>
              <h3 style={{ margin: 0 }}>Tip</h3>
              <p style={{ margin: "8px 0 0", color: "#333" }}>
                Keep practicing regularly, and focus on the topics where your score is below 80%. The dashboard updates automatically as you complete more mock interviews.
              </p>
            </div>

            <div className="recent-activity-card" style={{ marginTop: 28, padding: 20, borderRadius: 12, background: "#fff", boxShadow: "0 6px 18px rgba(0,0,0,0.07)" }}>
              <h3 style={{ margin: 0, marginBottom: 8 }}>Recent Sessions</h3>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                <thead>
                  <tr style={{ textAlign: 'left', color: '#555' }}>
                    <th style={{ padding: '10px 6px' }}>Date</th>
                    <th style={{ padding: '10px 6px' }}>Mode</th>
                    <th style={{ padding: '10px 6px' }}>Score</th>
                    <th style={{ padding: '10px 6px' }}>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { date: '2026-03-18', mode: 'HR', score: 78, notes: 'Focus on situational responses' },
                    { date: '2026-03-16', mode: 'Technical', score: 82, notes: 'Need optimization practice' },
                    { date: '2026-03-14', mode: 'Mock', score: 74, notes: 'Reduce filler words' },
                  ].map((row) => (
                    <tr key={row.date} style={{ borderTop: '1px solid #e8e8e8' }}>
                      <td style={{ padding: '10px 6px' }}>{row.date}</td>
                      <td style={{ padding: '10px 6px' }}>{row.mode}</td>
                      <td style={{ padding: '10px 6px', fontWeight: 700 }}>{row.score}%</td>
                      <td style={{ padding: '10px 6px' }}>{row.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </>
  );
}

export default Dashboard;
//