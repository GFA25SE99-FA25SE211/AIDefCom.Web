"use client";

import { useState, useEffect } from "react";
import { reportsApi } from "@/lib/api/reports";
import { swalConfig } from "@/lib/utils/sweetAlert";
import type { ReportDto } from "@/lib/models";

export default function ChairReportStatus() {
  const [reports, setReports] = useState<ReportDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [isChair, setIsChair] = useState(false);

  const fetchReports = async () => {
    try {
      setLoading(true);
      // Get current user from localStorage
      const storedUser = localStorage.getItem('user');
      if (!storedUser) {
        setError("User not found. Please login.");
        setLoading(false);
        return;
      }

      const user = JSON.parse(storedUser);
      const lecturerId = user.id;

      // Check if user is Chair (System Chair or Role Chair)
      let chairRole = false;
      if (user.roles && user.roles.includes("Chair")) {
        chairRole = true;
      } else if (user.role === "Chair") {
        chairRole = true;
      }
      setIsChair(chairRole);

      let response;
      if (chairRole) {
        // If Chair, fetch ALL reports
        response = await reportsApi.getAll();
      } else {
        // If Lecturer, fetch assigned reports
        if (!lecturerId) {
          setError("Lecturer ID not found.");
          setLoading(false);
          return;
        }
        response = await reportsApi.getByLecturerId(lecturerId);
      }

      if (response.data) {
        setReports(response.data);
      }
    } catch (err) {
      console.error("Failed to fetch reports:", err);
      setError("Failed to load reports. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleStatusChange = async (id: number, newStatus: string) => {
    if (newStatus === "Approved") {
      await handleApprove(id);
    } else if (newStatus === "Rejected") {
      await handleReject(id);
    }
  };

  const handleApprove = async (id: number) => {
    try {
      setActionLoading(id);
      await reportsApi.approve(id);
      // Refresh list
      await fetchReports();
    } catch (err) {
      console.error("Failed to approve report:", err);
      swalConfig.error(
        "Failed to approve report",
        "An error occurred while approving the report. Please try again."
      );
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (id: number) => {
    try {
      setActionLoading(id);
      await reportsApi.reject(id);
      // Refresh list
      await fetchReports();
    } catch (err) {
      console.error("Failed to reject report:", err);
      swalConfig.error(
        "Failed to reject report",
        "An error occurred while rejecting the report. Please try again."
      );
    } finally {
      setActionLoading(null);
    }
  };

  const statusClass = (status: string | undefined) => {
    switch (status) {
      case "Approved":
        return "badge badge-success";
      case "Rejected":
        return "badge badge-error";
      case "Pending":
      default:
        return "badge badge-warning";
    }
  };

  // Calculate stats
  const totalReports = reports.length;
  const approvedCount = reports.filter(r => r.status === "Approved").length;
  const rejectedCount = reports.filter(r => r.status === "Rejected").length;
  const pendingCount = reports.filter(r => !r.status || r.status === "Pending").length;

  return (
    <>
      {/* Header */}
      <div className="section-header">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">
            Report Review Status
          </h1>
          <p className="text-sm text-gray-500">
            View and manage submitted reports from secretary
          </p>
        </div>
      </div>

      {/* Stats Section */}
      <div className="mt-8 dashboard-grid md:grid-cols-4">
        <div className="stat-card stat-card-purple">
          <div className="stat-info">
            <p className="label">Total Reports</p>
            <p className="value">{totalReports}</p>
          </div>
          <div className="stat-icon">📄</div>
        </div>

        <div className="stat-card stat-card-green">
          <div className="stat-info">
            <p className="label">Approved</p>
            <p className="value">{approvedCount}</p>
          </div>
          <div className="stat-icon">✔</div>
        </div>

        <div className="stat-card stat-card-orange">
          <div className="stat-info">
            <p className="label">Rejected</p>
            <p className="value">{rejectedCount}</p>
          </div>
          <div className="stat-icon">✖</div>
        </div>

        <div className="stat-card stat-card-blue">
          <div className="stat-info">
            <p className="label">Pending</p>
            <p className="value">{pendingCount}</p>
          </div>
          <div className="stat-icon">⏱</div>
        </div>
      </div>

      {/* Table Section */}
      <div className="mt-8 card-base">
        {loading ? (
          <div className="text-center py-10 text-gray-500">Loading reports...</div>
        ) : error ? (
          <div className="text-center py-10 text-red-500">{error}</div>
        ) : reports.length === 0 ? (
          <div className="text-center py-10 text-gray-500">No reports found.</div>
        ) : (
          <table className="table-base mt-4">
            <thead>
              <tr>
                <th>ID</th>
                <th>Session ID</th>
                <th>Summary</th>
                <th>File Path</th>
                <th>Generated Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((r) => (
                <tr key={r.id}>
                  <td>{r.id}</td>
                  <td>{r.sessionId}</td>
                  <td className="max-w-xs truncate" title={r.summaryText || r.summary}>
                    {r.summaryText || r.summary || "No summary"}
                  </td>
                  <td className="text-blue-600 underline cursor-pointer hover:text-blue-700 transition max-w-xs truncate">
                    {r.filePath || "No file"}
                  </td>
                  <td>
                    {r.generatedDate ? new Date(r.generatedDate).toLocaleDateString() : "-"}
                  </td>
                  <td>
                    {isChair ? (
                      <select
                        className={`text-xs font-medium px-2 py-1 rounded-full border-none outline-none cursor-pointer ${
                          r.status === "Approved"
                            ? "bg-green-100 text-green-700"
                            : r.status === "Rejected"
                            ? "bg-red-100 text-red-700"
                            : "bg-yellow-100 text-yellow-700"
                        }`}
                        value={r.status || "Pending"}
                        onChange={(e) => handleStatusChange(r.id, e.target.value)}
                        disabled={actionLoading === r.id}
                      >
                        <option value="Pending">Pending</option>
                        <option value="Approved">Approved</option>
                        <option value="Rejected">Rejected</option>
                      </select>
                    ) : (
                      <span className={statusClass(r.status)}>{r.status || "Pending"}</span>
                    )}
                  </td>
                  <td>
                    <div className="flex gap-2">
                      {/* Download Button */}
                      {r.filePath && (
                        <a
                          href={r.filePath}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gray-500 hover:text-gray-700"
                          title="Download"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={2}
                            stroke="currentColor"
                            className="w-5 h-5"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V4"
                            />
                          </svg>
                        </a>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Footer */}
      <p className="text-xs text-center text-gray-400 mt-10">
        © 2025 AIDefCom · Smart Graduation Defense
      </p>
    </>
  );
}
