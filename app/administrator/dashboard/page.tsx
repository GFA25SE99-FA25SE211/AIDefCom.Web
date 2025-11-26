"use client";

import React, { useEffect, useState } from "react";
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
import { authApi } from "@/lib/api/auth";
import { councilsApi } from "@/lib/api/councils";
import { defenseSessionsApi } from "@/lib/api/defense-sessions";
import type { UserDto, CouncilDto, DefenseSessionDto } from "@/lib/models";

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

// --- Component ---
export default function AdminDashboardPage() {
  const [summaryStats, setSummaryStats] = useState({
    totalUsers: { value: 0, change: "Loading..." },
    activeCouncils: { value: 0, change: "Loading..." },
    defenseSessions: { value: 0, change: "Loading..." },
    activeNow: { value: 0, change: "Online users" },
  });
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserDto[]>([]);
  const [sessions, setSessions] = useState<DefenseSessionDto[]>([]);
  const [lineChartData, setLineChartData] = useState({
    labels: [] as string[],
    datasets: [] as any[],
  });
  const [pieChartData, setPieChartData] = useState({
    labels: [] as string[],
    datasets: [] as any[],
  });
  const [footerStats, setFooterStats] = useState({
    completedMonth: { value: 0, label: "Sessions", progress: 0 },
    avgRating: { value: "0.0 / 10.0", progress: 0 },
    uptime: { value: "99.8%", progress: 99.8 },
  });
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const [usersRes, councilsRes, sessionsRes] = await Promise.all([
          authApi.getAllUsers().catch(() => ({ data: [] })),
          councilsApi.getAll(false).catch(() => ({ data: [] })),
          defenseSessionsApi.getAll().catch(() => ({ data: [] })),
        ]);

        const usersData = usersRes.data || [];
        const councils = councilsRes.data || [];
        const sessionsData = sessionsRes.data || [];

        setUsers(usersData);
        setSessions(sessionsData);

        const upcomingSessions = sessionsData.filter((s: DefenseSessionDto) => {
          const sessionDate = new Date(s.defenseDate);
          return sessionDate >= new Date();
        });

        const completedSessions = sessionsData.filter(
          (s: DefenseSessionDto) => {
            const sessionDate = new Date(s.defenseDate);
            const now = new Date();
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            return (
              sessionDate >= startOfMonth &&
              sessionDate < now &&
              s.status === "Completed"
            );
          }
        );

        // Calculate user distribution by roles
        const roleCounts: { [key: string]: number } = {};
        usersData.forEach((user: UserDto) => {
          user.roles?.forEach((role: string) => {
            roleCounts[role] = (roleCounts[role] || 0) + 1;
          });
        });

        const roleLabels = Object.keys(roleCounts);
        const roleData = Object.values(roleCounts);

        // Calculate sessions by month (last 6 months)
        const now = new Date();
        const monthLabels: string[] = [];
        const sessionCounts: number[] = [];
        const userCounts: number[] = [];

        for (let i = 5; i >= 0; i--) {
          const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const monthName = date.toLocaleDateString("en-US", {
            month: "short",
          });
          monthLabels.push(monthName);

          const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
          const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);

          const sessionsInMonth = sessionsData.filter(
            (s: DefenseSessionDto) => {
              const sessionDate = new Date(s.defenseDate);
              return sessionDate >= monthStart && sessionDate <= monthEnd;
            }
          ).length;

          sessionCounts.push(sessionsInMonth);

          // Count sessions up to this month for user activity representation
          const sessionsUpToMonth = sessionsData.filter(
            (s: DefenseSessionDto) => {
              const sessionDate = new Date(s.defenseDate);
              return sessionDate <= monthEnd;
            }
          ).length;
          userCounts.push(sessionsUpToMonth);
        }

        // Recent activity from sessions
        const recentSessions = sessionsData
          .sort((a: DefenseSessionDto, b: DefenseSessionDto) => {
            return (
              new Date(b.defenseDate).getTime() -
              new Date(a.defenseDate).getTime()
            );
          })
          .slice(0, 5)
          .map((s: DefenseSessionDto) => {
            const sessionDate = new Date(s.defenseDate);
            const now = new Date();
            const diffMs = now.getTime() - sessionDate.getTime();
            const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
            const diffDays = Math.floor(diffHours / 24);

            let timeAgo = "";
            if (diffHours < 1) {
              timeAgo = "Just now";
            } else if (diffHours < 24) {
              timeAgo = `${diffHours}h ago`;
            } else {
              timeAgo = `${diffDays}d ago`;
            }

            return {
              actor: s.groupId || "Unknown",
              action: `Defense session ${s.status}`,
              time: timeAgo,
              type: "session",
            };
          });

        setSummaryStats({
          totalUsers: { value: usersData.length, change: "Total accounts" },
          activeCouncils: {
            value: councils.filter((c: CouncilDto) => c.isActive).length,
            change: `${councils.length} total`,
          },
          defenseSessions: {
            value: sessionsData.length,
            change: `${upcomingSessions.length} upcoming`,
          },
          activeNow: { value: 0, change: "Online users" },
        });

        setLineChartData({
          labels: monthLabels,
          datasets: [
            {
              label: "Sessions",
              data: sessionCounts,
              borderColor: "rgb(168, 85, 247)",
              backgroundColor: "rgba(168, 85, 247, 0.4)",
              tension: 0.3,
            },
            {
              label: "Cumulative Sessions",
              data: userCounts,
              borderColor: "rgb(79, 70, 229)",
              backgroundColor: "rgba(79, 70, 229, 0.4)",
              tension: 0.3,
            },
          ],
        });

        setPieChartData({
          labels: roleLabels.length > 0 ? roleLabels : ["No data"],
          datasets: [
            {
              data: roleData.length > 0 ? roleData : [1],
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
        });

        const totalSessionsThisMonth = sessionsData.filter(
          (s: DefenseSessionDto) => {
            const sessionDate = new Date(s.defenseDate);
            const now = new Date();
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            return sessionDate >= startOfMonth;
          }
        ).length;

        setFooterStats({
          completedMonth: {
            value: completedSessions.length,
            label: "Sessions",
            progress:
              totalSessionsThisMonth > 0
                ? Math.round(
                    (completedSessions.length / totalSessionsThisMonth) * 100
                  )
                : 0,
          },
          avgRating: { value: "N/A", progress: 0 },
          uptime: { value: "99.8%", progress: 99.8 },
        });

        setRecentActivity(recentSessions);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

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
    plugins: {
      legend: { position: "right" as const, labels: { padding: 15 } },
    },
  };

  if (loading) {
    return (
      <main className="page-container">
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-500">Loading dashboard data...</p>
        </div>
      </main>
    );
  }

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
            {recentActivity.length > 0 ? (
              recentActivity.map((a, i) => (
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
              ))
            ) : (
              <li className="activity-item">
                <div className="activity-info">
                  <span className="action text-gray-400">
                    No recent activity
                  </span>
                </div>
              </li>
            )}
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
    </main>
  );
}
