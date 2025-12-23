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
      // Get current userId and userRole from accessToken
      const { authUtils } = await import("@/lib/utils/auth");
      const userInfo = authUtils.getCurrentUserInfo();
      const lecturerId = userInfo.userId;
      const userRole = userInfo.role || "";

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
      const downloadUrl = renewData.data || renewData.url || filePath;

      const response = await fetch(downloadUrl);
      if (!response.ok) {
        throw new Error("Failed to download file");
      }

      // Extract original filename and extension from filePath
      const originalFileName =
        filePath.split("/").pop()?.split("?")[0] || "report";
      // Get file extension from original file
      const fileExtMatch = originalFileName.match(/\.[^.]+$/);
      const fileExt = fileExtMatch ? fileExtMatch[0].toLowerCase() : ".docx";

      // Determine correct MIME type based on extension
      const mimeTypes: { [key: string]: string } = {
        ".docx":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ".doc": "application/msword",
        ".pdf": "application/pdf",
        ".xlsx":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        ".xls": "application/vnd.ms-excel",
        ".pptx":
          "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        ".ppt": "application/vnd.ms-powerpoint",
      };
      const mimeType = mimeTypes[fileExt] || "application/octet-stream";

      // Get the raw data and create blob with correct MIME type
      const arrayBuffer = await response.arrayBuffer();
      const blob = new Blob([arrayBuffer], { type: mimeType });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;

      // Use original filename from URL or generate one with proper extension
      const finalName = decodeURIComponent(originalFileName);

      link.download = finalName;
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

  // Handle download recording by reportId
  const handleDownloadRecording = async (reportId: number) => {
    try {
      // Step 1: Get recording info by reportId
      const recordingResponse = await fetch(
        `${BACKEND_API_URL}/api/recordings/report/${reportId}`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        }
      );

      if (!recordingResponse.ok) {
        throw new Error("Failed to get recording info");
      }

      const recordingData = await recordingResponse.json();
      const recordingId = recordingData.data?.id;

      if (!recordingId) {
        swalConfig.error(
          "No Recording Found",
          "No recording available for this report."
        );
        return;
      }

      // Step 2: Get download SAS URL
      const sasResponse = await fetch(
        `${BACKEND_API_URL}/api/recordings/${recordingId}/download-sas?minutes=60`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        }
      );

      if (!sasResponse.ok) {
        throw new Error("Failed to get download link");
      }

      const sasData = await sasResponse.json();
      const downloadUrl = sasData.data;

      if (!downloadUrl) {
        throw new Error("No download URL returned");
      }

      // Step 3: Download the file
      const response = await fetch(downloadUrl);
      if (!response.ok) {
        throw new Error("Failed to download recording");
      }

      const arrayBuffer = await response.arrayBuffer();
      const blob = new Blob([arrayBuffer], { type: "audio/webm" });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `recording-report-${reportId}.webm`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Recording download failed:", error);
      swalConfig.error(
        "Download Failed",
        "Could not download the recording. Please try again."
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

      {/* Reports Grouped by Status */}
      {loading ? (
        <div className="mt-8 card-base text-center py-10 text-gray-500">
          Loading reports...
        </div>
      ) : error ? (
        <div className="mt-8 card-base text-center py-10 text-red-500">
          {error}
        </div>
      ) : reports.length === 0 ? (
        <div className="mt-8 card-base text-center py-10 text-gray-500">
          No reports found.
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Pending Reports Column */}
          <div className="bg-white rounded-xl shadow-sm border border-blue-100 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-3">
              <h3 className="text-white font-semibold flex items-center justify-center gap-2">
                <span className="text-lg">⏳</span> Pending
              </h3>
            </div>
            <div className="p-4 space-y-3 max-h-[500px] overflow-y-auto">
              {reports
                .filter((r) => !r.status || r.status === "Pending")
                .map((r) => (
                  <div
                    key={r.id}
                    className="bg-blue-50 border border-blue-100 rounded-lg p-4"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="text-sm font-semibold text-gray-800">
                          {r.sessionId && sessionGroupMap.get(r.sessionId)
                            ? `Group ${sessionGroupMap.get(r.sessionId)}`
                            : `Session ${r.sessionId}`}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {r.generatedDate
                            ? new Date(r.generatedDate).toLocaleDateString(
                                "en-GB"
                              )
                            : "No date"}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        {r.filePath && (
                          <button
                            onClick={() =>
                              handleDownload(
                                r.filePath!,
                                `meeting-minutes-${r.sessionId}.docx`
                              )
                            }
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-100 rounded transition"
                            title="Download Report"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                              strokeWidth={2}
                              stroke="currentColor"
                              className="w-4 h-4"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V4"
                              />
                            </svg>
                          </button>
                        )}
                        <button
                          onClick={() => handleDownloadRecording(r.id)}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-100 rounded transition"
                          title="Download Recording"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={2}
                            stroke="currentColor"
                            className="w-4 h-4"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                            />
                          </svg>
                        </button>
                      </div>
                    </div>
                    <p
                      className="text-xs text-gray-600 mb-3 line-clamp-2"
                      title={r.summaryText || r.summary}
                    >
                      {r.summaryText || r.summary || "No summary"}
                    </p>
                    {/* Action Buttons - Only for Pending */}
                    {isChair && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleApprove(r.id)}
                          disabled={actionLoading === r.id}
                          className="flex-1 px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white text-xs font-medium rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {actionLoading === r.id ? "..." : "✅ Approve"}
                        </button>
                        <button
                          onClick={() => handleReject(r.id)}
                          disabled={actionLoading === r.id}
                          className="flex-1 px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-medium rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {actionLoading === r.id ? "..." : "❌ Reject"}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              {pendingCount === 0 && (
                <p className="text-center text-gray-400 text-sm py-4">
                  No pending reports
                </p>
              )}
            </div>
          </div>

          {/* Approved Reports Column */}
          <div className="bg-white rounded-xl shadow-sm border border-green-100 overflow-hidden">
            <div className="bg-gradient-to-r from-green-500 to-green-600 px-4 py-3">
              <h3 className="text-white font-semibold flex items-center justify-center gap-2">
                <span className="text-lg">✅</span> Approved
              </h3>
            </div>
            <div className="p-4 space-y-3 max-h-[500px] overflow-y-auto">
              {reports
                .filter((r) => r.status === "Approved")
                .map((r) => (
                  <div
                    key={r.id}
                    className="bg-green-50 border border-green-100 rounded-lg p-4"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="text-sm font-semibold text-gray-800">
                          {r.sessionId && sessionGroupMap.get(r.sessionId)
                            ? `Group ${sessionGroupMap.get(r.sessionId)}`
                            : `Session ${r.sessionId}`}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {r.generatedDate
                            ? new Date(r.generatedDate).toLocaleDateString(
                                "en-GB"
                              )
                            : "No date"}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        {r.filePath && (
                          <button
                            onClick={() =>
                              handleDownload(
                                r.filePath!,
                                `meeting-minutes-${r.sessionId}.docx`
                              )
                            }
                            className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-100 rounded transition"
                            title="Download Report"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                              strokeWidth={2}
                              stroke="currentColor"
                              className="w-4 h-4"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V4"
                              />
                            </svg>
                          </button>
                        )}
                        <button
                          onClick={() => handleDownloadRecording(r.id)}
                          className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-100 rounded transition"
                          title="Download Recording"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={2}
                            stroke="currentColor"
                            className="w-4 h-4"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                            />
                          </svg>
                        </button>
                      </div>
                    </div>
                    <p
                      className="text-xs text-gray-600 mb-2 line-clamp-2"
                      title={r.summaryText || r.summary}
                    >
                      {r.summaryText || r.summary || "No summary"}
                    </p>
                    {/* Status Badge Only - No Actions */}
                    <span className="inline-flex items-center px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                      ✅ Approved
                    </span>
                  </div>
                ))}
              {approvedCount === 0 && (
                <p className="text-center text-gray-400 text-sm py-4">
                  No approved reports
                </p>
              )}
            </div>
          </div>

          {/* Rejected Reports Column */}
          <div className="bg-white rounded-xl shadow-sm border border-orange-100 overflow-hidden">
            <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-4 py-3">
              <h3 className="text-white font-semibold flex items-center justify-center gap-2">
                <span className="text-lg">❌</span> Rejected
              </h3>
            </div>
            <div className="p-4 space-y-3 max-h-[500px] overflow-y-auto">
              {reports
                .filter((r) => r.status === "Rejected")
                .map((r) => (
                  <div
                    key={r.id}
                    className="bg-orange-50 border border-orange-100 rounded-lg p-4"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="text-sm font-semibold text-gray-800">
                          {r.sessionId && sessionGroupMap.get(r.sessionId)
                            ? `Group ${sessionGroupMap.get(r.sessionId)}`
                            : `Session ${r.sessionId}`}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {r.generatedDate
                            ? new Date(r.generatedDate).toLocaleDateString(
                                "en-GB"
                              )
                            : "No date"}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        {r.filePath && (
                          <button
                            onClick={() =>
                              handleDownload(
                                r.filePath!,
                                `meeting-minutes-${r.sessionId}.docx`
                              )
                            }
                            className="p-1.5 text-gray-400 hover:text-orange-600 hover:bg-orange-100 rounded transition"
                            title="Download Report"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                              strokeWidth={2}
                              stroke="currentColor"
                              className="w-4 h-4"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V4"
                              />
                            </svg>
                          </button>
                        )}
                        <button
                          onClick={() => handleDownloadRecording(r.id)}
                          className="p-1.5 text-gray-400 hover:text-orange-600 hover:bg-orange-100 rounded transition"
                          title="Download Recording"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={2}
                            stroke="currentColor"
                            className="w-4 h-4"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                            />
                          </svg>
                        </button>
                      </div>
                    </div>
                    <p
                      className="text-xs text-gray-600 mb-2 line-clamp-2"
                      title={r.summaryText || r.summary}
                    >
                      {r.summaryText || r.summary || "No summary"}
                    </p>
                    {/* Status Badge Only - No Actions */}
                    <span className="inline-flex items-center px-2 py-1 bg-orange-100 text-orange-700 text-xs font-medium rounded-full">
                      ❌ Rejected
                    </span>
                  </div>
                ))}
              {rejectedCount === 0 && (
                <p className="text-center text-gray-400 text-sm py-4">
                  No rejected reports
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <p className="text-xs text-center text-gray-400 mt-10">
        © 2025 AIDefCom · Smart Graduation Defense
      </p>
    </>
  );
}
