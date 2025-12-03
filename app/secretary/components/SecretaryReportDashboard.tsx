"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function SecretaryReportDashboard() {
  // Xóa session role khi vào trang danh sách (không phải detail)
  useEffect(() => {
    localStorage.removeItem("sessionRole");
  }, []);
  const groups = [
    {
      group: "Group 1",
      topic: "Smart Learning Management System",
      date: "15/10/2025",
      template: "Downloaded",
      report: "Submitted",
      file: "report-group1-final.pdf",
      filed: "2025-10-05",
    },
    {
      group: "Group 2",
      topic: "Intelligent Ride-hailing Application",
      date: "15/10/2025",
      template: "Downloaded",
      report: "Not Submitted",
    },
    {
      group: "Group 3",
      topic: "E-commerce Website",
      date: "23/09/2025",
      template: "Downloaded",
      report: "Submitted",
      file: "report-group3.pdf",
      filed: "2025-10-06",
    },
    {
      group: "Group 4",
      topic: "AI Health Consultation Chatbot",
      date: "10/08/2025",
      template: "Not Downloaded",
      report: "Not Submitted",
    },
    {
      group: "Group 5",
      topic: "Face Recognition System",
      date: "04/05/2025",
      template: "Downloaded",
      report: "Submitted",
      file: "report-group5-v2.pdf",
      filed: "2025-10-07",
    },
  ];

  return (
    <>
      <div className="section-header">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">
            Manage Reports
          </h1>
          <p className="text-sm text-gray-500">
            Download templates and collect completed reports from groups
          </p>
        </div>
      </div>

      {/* Stats Section */}
      <div className="dashboard-grid md:grid-cols-3">
        <div className="stat-card stat-card-purple">
          <div className="stat-info">
            <p className="label">Total Groups</p>
            <p className="value">5</p>
          </div>
          <div className="stat-icon">📄</div>
        </div>

        <div className="stat-card stat-card-green">
          <div className="stat-info">
            <p className="label">Submitted</p>
            <p className="value">3</p>
          </div>
          <div className="stat-icon">✔</div>
        </div>

        <div className="stat-card stat-card-orange">
          <div className="stat-info">
            <p className="label">Pending</p>
            <p className="value">2</p>
          </div>
          <div className="stat-icon">⏱</div>
        </div>
      </div>

      {/* Table Section */}
      <div className="mt-8 card-base">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-800">
          📄 Groups and Reports
        </h2>

        <table className="table-base">
          <thead>
            <tr>
              <th>Group</th>
              <th>Topic</th>
              <th>Defense Date</th>
              <th>Template</th>
              <th>Report</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {groups.map((g, i) => (
              <tr key={i}>
                <td>{g.group}</td>
                <td>{g.topic}</td>
                <td>{g.date}</td>

                <td>
                  <span
                    className={`badge ${
                      g.template === "Downloaded"
                        ? "badge-info"
                        : "badge-warning"
                    }`}
                  >
                    {g.template}
                  </span>
                </td>

                <td>
                  {g.report === "Submitted" ? (
                    <div className="flex flex-col">
                      <span className="badge badge-success w-fit mb-1">
                        Submitted
                      </span>
                      <span className="text-blue-600 text-xs underline cursor-pointer hover:text-blue-800">
                        {g.file}
                      </span>
                      <span className="text-gray-400 text-xs">{g.filed}</span>
                    </div>
                  ) : (
                    <span className="badge badge-warning">Not Submitted</span>
                  )}
                </td>

                {/* --- Redesigned Actions --- */}
                <td className="py-3">
                  <div className="flex gap-2 items-center">
                    {g.report === "Submitted" ? (
                      <button className="px-4 py-1.5 rounded-lg bg-white border border-gray-200 text-gray-700 text-sm font-medium shadow-sm hover:bg-gray-50 transition-all duration-150">
                        Update
                      </button>
                    ) : (
                      <button
                        className="px-4 py-1.5 rounded-lg text-white text-sm font-medium shadow-sm 
                        bg-gradient-to-r from-purple-600 to-pink-500 hover:opacity-90 transition-all duration-150"
                      >
                        Upload
                      </button>
                    )}

                    <Link
                      href={`/secretary/transcript/${i + 1}`}
                      className="px-3.5 py-1.5 rounded-lg bg-gray-100 text-gray-700 text-sm font-medium flex items-center gap-1 hover:bg-gray-200 transition-all duration-150"
                    >
                      👁 View
                    </Link>
                  </div>
                </td>
                {/* --- End Actions --- */}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-center text-gray-400 mt-10">
        © 2025 AIDefCom · Smart Graduation Defense
      </p>
    </>
  );
}
