"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { BACKEND_API_URL } from "@/lib/config/api-urls";
import { swalConfig } from "@/lib/utils/sweetAlert";

interface Report {
  id: number;
  sessionId: number;
  filePath: string;
  generatedDate: string;
  summaryText: string;
  status: string;
  details: string | null;
}

export default function SecretaryReportDashboard() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploadingReportId, setUploadingReportId] = useState<number | null>(
    null
  );
  const fileInputRefs = useRef<{ [key: number]: HTMLInputElement | null }>({});

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${BACKEND_API_URL}/api/reports`, {
        headers: {
          Accept: "*/*",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch reports");
      }

      const data = await response.json();
      setReports(data.data || []);
    } catch (err: any) {
      console.error("Error fetching reports:", err);
      setError(err.message || "Failed to load reports");
    } finally {
      setLoading(false);
    }
  };

  // Calculate stats from actual data
  const totalReports = reports.length;
  const approvedCount = reports.filter((r) => r.status === "Approved").length;
  const rejectedCount = reports.filter((r) => r.status === "Rejected").length;
  const pendingCount = reports.filter(
    (r) => r.status !== "Approved" && r.status !== "Rejected"
  ).length;

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

  // Handle upload new file for rejected report
  const handleUploadClick = (reportId: number) => {
    const inputRef = fileInputRefs.current[reportId];
    if (inputRef) {
      inputRef.click();
    }
  };

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
    report: Report
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setUploadingReportId(report.id);

      // Step 1: Upload file to get new filePath
      const formData = new FormData();
      formData.append("file", file);

      const uploadResponse = await fetch(
        `${BACKEND_API_URL}/api/defense-reports/upload-pdf`,
        {
          method: "POST",
          body: formData,
          // Don't set Content-Type header - browser will set it automatically with boundary
        }
      );

      const uploadData = await uploadResponse.json();

      if (!uploadResponse.ok) {
        throw new Error(uploadData.message || "Failed to upload file");
      }

      const newFilePath =
        uploadData.data?.fileUrl ||
        uploadData.data?.downloadUrl ||
        uploadData.data?.filePath ||
        "";

      if (!newFilePath) {
        throw new Error("No file URL returned from upload");
      }

      // Step 2: Update report with new filePath and change status to Pending
      const updateResponse = await fetch(
        `${BACKEND_API_URL}/api/reports/${report.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            accept: "*/*",
          },
          body: JSON.stringify({
            sessionId: report.sessionId,
            filePath: newFilePath,
            summaryText: report.summaryText || "",
            status: "Pending",
          }),
        }
      );

      if (!updateResponse.ok) {
        throw new Error("Failed to update report status");
      }

      swalConfig.success(
        "Upload Successful",
        "File uploaded and report status changed to Pending for Chair review."
      );

      // Refresh reports list
      await fetchReports();
    } catch (error: any) {
      console.error("Upload failed:", error);
      swalConfig.error(
        "Upload Failed",
        error.message || "Could not upload the file. Please try again."
      );
    } finally {
      setUploadingReportId(null);
      // Reset file input
      if (fileInputRefs.current[report.id]) {
        fileInputRefs.current[report.id]!.value = "";
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <svg
            className="animate-spin h-12 w-12 text-blue-600 mx-auto mb-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          <p className="text-gray-600">Loading reports...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            Error Loading Reports
          </h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={fetchReports}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          📊 Manage Reports
        </h1>
        <p className="text-gray-600">
          Download and collect completed reports from groups
        </p>
      </div>

      {/* Stats Section */}
      <div className="dashboard-grid md:grid-cols-4 mb-8">
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
      {reports.length === 0 ? (
        <div className="card-base text-center py-10 text-gray-500">
          No reports found.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
                          Session {r.sessionId}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {r.generatedDate
                            ? new Date(r.generatedDate).toLocaleDateString(
                                "en-GB"
                              )
                            : "No date"}
                        </p>
                      </div>
                      {r.filePath && (
                        <button
                          onClick={() =>
                            handleDownload(
                              r.filePath,
                              `meeting-minutes-${r.sessionId}.docx`
                            )
                          }
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-100 rounded transition"
                          title="Download"
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
                    </div>
                    <p
                      className="text-xs text-gray-600 mb-2 line-clamp-2"
                      title={r.summaryText}
                    >
                      {r.summaryText || "No summary"}
                    </p>
                    {/* Status Badge Only - No Actions */}
                    <span className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                      ⏳ Pending
                    </span>
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
                          Session {r.sessionId}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {r.generatedDate
                            ? new Date(r.generatedDate).toLocaleDateString(
                                "en-GB"
                              )
                            : "No date"}
                        </p>
                      </div>
                      {r.filePath && (
                        <button
                          onClick={() =>
                            handleDownload(
                              r.filePath,
                              `meeting-minutes-${r.sessionId}.docx`
                            )
                          }
                          className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-100 rounded transition"
                          title="Download"
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
                    </div>
                    <p
                      className="text-xs text-gray-600 mb-2 line-clamp-2"
                      title={r.summaryText}
                    >
                      {r.summaryText || "No summary"}
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
                          Session {r.sessionId}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {r.generatedDate
                            ? new Date(r.generatedDate).toLocaleDateString(
                                "en-GB"
                              )
                            : "No date"}
                        </p>
                      </div>
                      {r.filePath && (
                        <button
                          onClick={() =>
                            handleDownload(
                              r.filePath,
                              `meeting-minutes-${r.sessionId}.docx`
                            )
                          }
                          className="p-1.5 text-gray-400 hover:text-orange-600 hover:bg-orange-100 rounded transition"
                          title="Download"
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
                    </div>
                    <p
                      className="text-xs text-gray-600 mb-2 line-clamp-2"
                      title={r.summaryText}
                    >
                      {r.summaryText || "No summary"}
                    </p>
                    {/* Status Badge */}
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center px-2 py-1 bg-orange-100 text-orange-700 text-xs font-medium rounded-full">
                        ❌ Rejected
                      </span>
                      {/* Upload New File Button */}
                      <div>
                        <input
                          type="file"
                          ref={(el) => {
                            fileInputRefs.current[r.id] = el;
                          }}
                          onChange={(e) => handleFileChange(e, r)}
                          accept=".doc,.docx,.pdf"
                          className="hidden"
                        />
                        <button
                          onClick={() => handleUploadClick(r.id)}
                          disabled={uploadingReportId === r.id}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-purple-500 hover:bg-purple-600 text-white text-xs font-medium rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {uploadingReportId === r.id ? (
                            <>
                              <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              Uploading...
                            </>
                          ) : (
                            <>
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                                strokeWidth={2}
                                stroke="currentColor"
                                className="w-3 h-3"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
                                />
                              </svg>
                              Upload New
                            </>
                          )}
                        </button>
                      </div>
                    </div>
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
      <p className="text-center text-sm text-gray-500 mt-8">
        © 2025 AIDefCom · Smart Graduation Defense
      </p>
    </div>
  );
}
