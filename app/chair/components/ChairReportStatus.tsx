"use client";

import { useState, useEffect } from "react";
import { reportsApi } from "@/lib/api/reports";
import { defenseSessionsApi } from "@/lib/api/defense-sessions";
import { swalConfig } from "@/lib/utils/sweetAlert";
import type { ReportDto } from "@/lib/models";
import { BACKEND_API_URL } from "@/lib/config/api-urls";

export default function ChairReportStatus() {
  const [reports, setReports] = useState<ReportDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [isChair, setIsChair] = useState(false);
  const [sessionGroupMap, setSessionGroupMap] = useState<Map<number, string>>(
    new Map()
  );

  const fetchReports = async () => {
    try {
      setLoading(true);
      // Get current userId and userRole from localStorage (bảo mật)
      const lecturerId = localStorage.getItem("userId");
      const userRole = localStorage.getItem("userRole") || "";

      if (!lecturerId) {
        setError("User not found. Please login.");
        setLoading(false);
        return;
      }

      // Check if user has Chair role (including Chair Session)
      // Anyone accessing /chair page should be able to manage reports
      let chairRole = userRole.toLowerCase().includes("chair");

      // Fallback: if accessing chair page, grant chair permissions
      if (!chairRole && typeof window !== "undefined") {
        chairRole = window.location.pathname.startsWith("/chair");
      }

      setIsChair(chairRole);

      // Always fetch reports by lecturer ID (Chair sees their assigned sessions)
      if (!lecturerId) {
        setError("Lecturer ID not found.");
        setLoading(false);
        return;
      }
      const response = await reportsApi.getByLecturerId(lecturerId);

      if (response.data) {
        setReports(response.data);

        // Fetch groupId for each unique sessionId
        const uniqueSessionIds = [
          ...new Set(
            response.data.map((r: ReportDto) => r.sessionId).filter(Boolean)
          ),
        ];
        const groupMap = new Map<number, string>();

        await Promise.all(
          uniqueSessionIds.map(async (sessionId) => {
            try {
              const sessionRes = await defenseSessionsApi.getById(
                sessionId as number
              );
              if (sessionRes.data && sessionRes.data.groupId) {
                groupMap.set(sessionId as number, sessionRes.data.groupId);
              }
            } catch (err) {
              console.error(`Failed to fetch session ${sessionId}:`, err);
            }
          })
        );

        setSessionGroupMap(groupMap);
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

  // Handle download file from filePath
  const handleDownload = async (filePath: string, fileName?: string) => {
    try {
      const renewResponse = await fetch(
        `${BACKEND_API_URL}/api/defense-reports/download?blobUrl=${encodeURIComponent(
          filePath
        )}&expiryMinutes=60`,
        {
          method: "GET",
          headers: {
            Accept: "*/*",
          },
        }
      );

      if (!renewResponse.ok) {
        throw new Error("Failed to get download link");
      }

      const renewData = await renewResponse.json();

      // Lấy URL mới từ response (giả sử nằm trong data)
      const downloadUrl = renewData.data || renewData.url || filePath;

      const response = await fetch(downloadUrl);
      if (!response.ok) {
        throw new Error("Failed to download file");
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      // Extract filename from URL or use provided fileName
      const extractedName =
        fileName || filePath.split("/").pop() || "report.docx";
      link.download = extractedName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download failed:", error);
      swalConfig.error(
        "Download Failed",
        "Could not download the file. Please try again."
      );
    }
  };

  // Calculate stats
  const totalReports = reports.length;
  const approvedCount = reports.filter((r) => r.status === "Approved").length;
  const rejectedCount = reports.filter((r) => r.status === "Rejected").length;
  const pendingCount = reports.filter(
    (r) => !r.status || r.status === "Pending"
  ).length;

  return (
    <>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          📝 Report Review Status
        </h1>
        <p className="text-gray-600">
          View and manage submitted reports from secretary
        </p>
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
          <div className="text-center py-10 text-gray-500">
            Loading reports...
          </div>
        ) : error ? (
          <div className="text-center py-10 text-red-500">{error}</div>
        ) : reports.length === 0 ? (
          <div className="text-center py-10 text-gray-500">
            No reports found.
          </div>
        ) : (
          <table className="table-base mt-4">
            <thead>
              <tr>
                <th style={{ textAlign: "center" }}>ID</th>
                <th style={{ textAlign: "center" }}>Session ID</th>
                <th>Summary</th>
                <th>Report</th>
                <th style={{ textAlign: "center" }}>Generated Date</th>
                <th style={{ textAlign: "center" }}>Status</th>
                <th style={{ textAlign: "center" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((r) => (
                <tr key={r.id}>
                  <td style={{ textAlign: "center" }}>{r.id}</td>
                  <td style={{ textAlign: "center" }}>{r.sessionId}</td>
                  <td
                    className="max-w-xs truncate"
                    title={r.summaryText || r.summary}
                  >
                    {r.summaryText || r.summary || "No summary"}
                  </td>
                  <td className="text-purple-600 font-medium">
                    {r.sessionId && sessionGroupMap.get(r.sessionId)
                      ? `Report of Group ${sessionGroupMap.get(r.sessionId)}`
                      : r.filePath
                      ? "Report Available"
                      : "No file"}
                  </td>
                  <td style={{ textAlign: "center" }}>
                    {r.generatedDate
                      ? new Date(r.generatedDate).toLocaleDateString()
                      : "-"}
                  </td>
                  <td style={{ textAlign: "center" }}>
                    {isChair ? (
                      <select
                        className={`text-sm font-semibold px-4 py-2 rounded-lg border-2 shadow-sm cursor-pointer transition-all duration-200 focus:ring-2 focus:ring-offset-1 ${
                          r.status === "Approved"
                            ? "bg-green-50 text-green-700 border-green-300 focus:ring-green-400"
                            : r.status === "Rejected"
                            ? "bg-red-50 text-red-700 border-red-300 focus:ring-red-400"
                            : "bg-amber-50 text-amber-700 border-amber-300 focus:ring-amber-400"
                        }`}
                        value={r.status || "Pending"}
                        onChange={(e) =>
                          handleStatusChange(r.id, e.target.value)
                        }
                        disabled={actionLoading === r.id}
                      >
                        <option value="Pending">⏳ Pending</option>
                        <option value="Approved">✅ Approved</option>
                        <option value="Rejected">❌ Rejected</option>
                      </select>
                    ) : (
                      <span className={statusClass(r.status)}>
                        {r.status || "Pending"}
                      </span>
                    )}
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <div className="flex gap-2 justify-center">
                      {/* Download Button */}
                      {r.filePath && (
                        <button
                          onClick={() =>
                            handleDownload(
                              r.filePath!,
                              `meeting-minutes-${r.sessionId}.docx`
                            )
                          }
                          className="p-2 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-all duration-200"
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
                        </button>
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
