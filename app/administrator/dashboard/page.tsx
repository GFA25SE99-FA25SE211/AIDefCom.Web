"use client";

import React from "react";
import AdminSidebar from "./components/AdminSidebar";
import { Line, Pie } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from "chart.js";

// --- Chart.js registration ---
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

// --- Icons (SVG clean) ---
const UsersIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
    />
  </svg>
);

const CouncilsIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M18 18.72a9.094 9.094 0 00-3.741-.56c-.303.007-.606.021-.908.04L12 18.72m-3.741-.56a9.094 9.094 0 01-3.741.56m0 0A9.095 9.095 0 0112 13.093m0 0c-1.657 0-3.123.401-4.319 1.087M12 13.093c1.657 0 3.123.401 4.319 1.087"
    />
  </svg>
);

const SessionsIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25M3 18.75A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75"
    />
  </svg>
);

const ActivityIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3.75 13.5l4.125 4.125L12 12.75l4.125 4.125L21 9.75"
    />
  </svg>
);

const ChartLineIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3.75 3v16.5h16.5M5.625 6l4.125 4.125L13.875 6l4.125 4.125"
    />
  </svg>
);

const ChartPieIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M10.5 6a7.5 7.5 0 107.5 7.5h-7.5V6zM13.5 10.5H21A7.5 7.5 0 0013.5 3v7.5z"
    />
  </svg>
);

const RecentActivityIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm0 5.25h.007v.008H3.75v-.008zm0 5.25h.007v.008H3.75v-.008z"
    />
  </svg>
);

// --- Dummy Data ---
const summaryStats = {
  totalUsers: { value: 199, change: "+12% from last month" },
  activeCouncils: { value: 8, change: "+2 this week" },
  defenseSessions: { value: 45, change: "15 upcoming" },
  activeNow: { value: 23, change: "Online users" },
};

const recentActivity = [
  {
    actor: "Dr. Nguyen Van A",
    action: "Created new council",
    time: "2h ago",
    type: "council",
  },
  {
    actor: "John Smith",
    action: "Completed defense session",
    time: "5h ago",
    type: "session",
  },
  {
    actor: "Admin User",
    action: "Added 5 new accounts",
    time: "1d ago",
    type: "account",
  },
  {
    actor: "Dr. Tran Thi B",
    action: "Submitted grading",
    time: "1d ago",
    type: "grading",
  },
  {
    actor: "MSc. Pham Thi D",
    action: "Uploaded report",
    time: "2d ago",
    type: "report",
  },
];

const footerStats = {
  completedMonth: { value: 28, label: "Sessions", progress: 70 },
  avgRating: { value: "8.5 / 10.0", progress: 85 },
  uptime: { value: "99.8%", progress: 99.8 },
};

const getActivityDotColor = (type: string) => {
  switch (type) {
    case "council":
      return "dot-green";
    case "session":
      return "dot-blue";
    case "account":
      return "dot-green";
    case "grading":
      return "dot-purple";
    case "report":
      return "dot-orange";
    default:
      return "dot-blue";
  }
};

// --- Chart Data ---
const lineChartData = {
  labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
  datasets: [
    {
      label: "Sessions",
      data: [45, 48, 47, 52, 60, 70],
      borderColor: "rgb(168, 85, 247)",
      backgroundColor: "rgba(168, 85, 247, 0.4)",
      tension: 0.3,
    },
    {
      label: "Users",
      data: [5, 8, 10, 15, 18, 22],
      borderColor: "rgb(79, 70, 229)",
      backgroundColor: "rgba(79, 70, 229, 0.4)",
      tension: 0.3,
    },
  ],
};

const pieChartData = {
  labels: ["Students", "Chair", "Members", "Secretary", "Admin", "Moderator"],
  datasets: [
    {
      data: [78, 4, 12, 3, 2, 1],
      backgroundColor: [
        "rgba(139,92,246,0.8)",
        "rgba(59,130,246,0.8)",
        "rgba(34,197,94,0.8)",
        "rgba(249,115,22,0.8)",
        "rgba(239,68,68,0.8)",
        "rgba(100,116,139,0.8)",
      ],
      borderColor: "#fff",
      borderWidth: 1,
    },
  ],
};

const lineChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { position: "bottom" as const },
    title: { display: false },
  },
};

const pieChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { position: "right" as const, labels: { padding: 15 } } },
};

// --- Component ---
export default function AdminDashboardPage() {
  return (
    <main className="page-container">
      <header className="section-header">
        <div>
          <h1 className="text-xl font-semibold text-gray-800">
            Administrator Dashboard
          </h1>
          <p className="text-gray-500 text-sm">System overview and analytics</p>
        </div>
      </header>

      {/* Dashboard Grid */}
      <div className="dashboard-grid">
        {/* Summary cards */}
        <div className="stat-card stat-card-blue">
          <div className="stat-info">
            <div className="value">{summaryStats.totalUsers.value}</div>
            <div className="label">Total Users</div>
            <div className="change">{summaryStats.totalUsers.change}</div>
          </div>
          <div className="stat-icon">
            <UsersIcon />
          </div>
        </div>

        <div className="stat-card stat-card-green">
          <div className="stat-info">
            <div className="value">{summaryStats.activeCouncils.value}</div>
            <div className="label">Active Councils</div>
            <div className="change">{summaryStats.activeCouncils.change}</div>
          </div>
          <div className="stat-icon">
            <CouncilsIcon />
          </div>
        </div>

        <div className="stat-card stat-card-purple">
          <div className="stat-info">
            <div className="value">{summaryStats.defenseSessions.value}</div>
            <div className="label">Defense Sessions</div>
            <div className="change">{summaryStats.defenseSessions.change}</div>
          </div>
          <div className="stat-icon">
            <SessionsIcon />
          </div>
        </div>

        <div className="stat-card stat-card-orange">
          <div className="stat-info">
            <div className="value">{summaryStats.activeNow.value}</div>
            <div className="label">Active Now</div>
            <div className="change">{summaryStats.activeNow.change}</div>
          </div>
          <div className="stat-icon">
            <ActivityIcon />
          </div>
        </div>

        {/* Charts */}
        <div className="chart-card">
          <div className="chart-header">
            <div className="chart-icon chart-icon-purple">
              <ChartLineIcon />
            </div>
            <h3>System Activity</h3>
          </div>
          <div className="h-[250px]">
            <Line options={lineChartOptions} data={lineChartData} />
          </div>
        </div>

        <div className="chart-card">
          <div className="chart-header">
            <div className="chart-icon chart-icon-green">
              <ChartPieIcon />
            </div>
            <h3>User Distribution</h3>
          </div>
          <div className="h-[250px]">
            <Pie options={pieChartOptions} data={pieChartData} />
          </div>
        </div>

        {/* Activity */}
        <div className="activity-card">
          <div className="activity-header">
            <div className="activity-icon">
              <RecentActivityIcon />
            </div>
            <h3>Recent Activity</h3>
          </div>
          <ul className="activity-list">
            {recentActivity.map((a, i) => (
              <li key={i} className="activity-item">
                <span
                  className={`activity-dot ${getActivityDotColor(a.type)}`}
                />
                <div className="activity-info">
                  <span className="actor">{a.actor}</span>
                  <span className="action">{a.action}</span>
                </div>
                <span className="activity-time">{a.time}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Footer Cards */}
        <div className="footer-stat-card">
          <div className="footer-stat-label">Completed This Month</div>
          <div className="footer-stat-value">
            {footerStats.completedMonth.value}{" "}
            {footerStats.completedMonth.label}
          </div>
          <div className="progress-bar-bg">
            <div
              className="progress-bar-fill fill-purple"
              style={{ width: `${footerStats.completedMonth.progress}%` }}
            />
          </div>
        </div>

        <div className="footer-stat-card">
          <div className="footer-stat-label">Average Rating</div>
          <div className="footer-stat-value">{footerStats.avgRating.value}</div>
          <div className="progress-bar-bg">
            <div
              className="progress-bar-fill fill-green"
              style={{ width: `${footerStats.avgRating.progress}%` }}
            />
          </div>
        </div>

        <div className="footer-stat-card">
          <div className="footer-stat-label">System Uptime</div>
          <div className="footer-stat-value">{footerStats.uptime.value}</div>
          <div className="progress-bar-bg">
            <div
              className="progress-bar-fill fill-orange"
              style={{ width: `${footerStats.uptime.progress}%` }}
            />
          </div>
        </div>
      </div>

      <footer className="page-footer">
        © 2025 AIDefCom - Smart Graduation Defense
      </footer>
      <button className="help-btn">?</button>
    </main>
  );
}
