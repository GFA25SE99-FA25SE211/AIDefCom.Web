"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  User,
  FileText,
  Clock,
  Calendar,
  ClipboardList,
  Download,
} from "lucide-react";
import { studentsApi } from "@/lib/api/students";
import { defenseSessionsApi } from "@/lib/api/defense-sessions";
import { groupsApi } from "@/lib/api/groups";
import { scoresApi } from "@/lib/api/scores";
import { reportsApi } from "@/lib/api/reports";
import { swalConfig } from "@/lib/utils/sweetAlert";
import { BACKEND_API_URL } from "@/lib/config/api-urls";
import type { StudentDto, DefenseSessionDto } from "@/lib/models";

// ======= Types =======
interface Attempt {
  attempt: string;
  id: string;
  sessionId: number;
  date: string;
  group: string;
  topic: string;
  role: string;
  score: number;
  grade: string;
  status: string;
}

interface StudentDetail {
  id: string;
  name: string;
  email: string;
  failedCount: number;
  attempts: Attempt[];
}

// ======= Component =======
export default function StudentHistoryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const studentId = params.id as string;
  const [student, setStudent] = useState<StudentDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStudentData = async () => {
      try {
        setLoading(true);
        const [studentRes, sessionsRes] = await Promise.all([
          studentsApi.getById(studentId).catch(() => ({ data: null })),
          defenseSessionsApi
            .getByStudentId(studentId)
            .catch(() => ({ data: [] })),
        ]);

        const studentData = studentRes.data;
        if (!studentData) {
          // Student not found
          setStudent(null);
          setLoading(false);
          return;
        }

        // Get sessions for this student using the API
        const studentSessions = sessionsRes.data || [];

        // Fetch group details for each session to get accurate topic titles
        const sessionsWithGroupInfo = await Promise.all(
          studentSessions.map(async (s: DefenseSessionDto) => {
            try {
              const [groupRes, scoresRes] = await Promise.all([
                groupsApi.getById(s.groupId),
                scoresApi.getBySessionId(s.id).catch(() => ({ data: [] })),
              ]);

              const group = groupRes.data;
              const scores = scoresRes.data || [];

              // Calculate average score for this student in this session
              const studentScores = scores.filter(
                (score: any) => score.studentId === studentId
              );
              const avgScore =
                studentScores.length > 0
                  ? studentScores.reduce(
                      (sum: number, score: any) => sum + (score.value || 0),
                      0
                    ) / studentScores.length
                  : s.studentScore || 0;

              return {
                ...s,
                topicFromGroup:
                  group?.topicTitle_EN ||
                  group?.topicTitle_VN ||
                  s.topicTitle ||
                  "No Topic",
                calculatedScore: avgScore,
              };
            } catch (err) {
              console.error(`Error fetching data for session ${s.id}:`, err);
              return {
                ...s,
                topicFromGroup: s.topicTitle || "No Topic",
                calculatedScore: s.studentScore || 0,
              };
            }
          })
        );

        // Calculate failed count from sessions with grade "F"
        const failedCount = sessionsWithGroupInfo.filter(
          (s: any) => s.grade === "F"
        ).length;

        // Transform to StudentDetail format
        const studentDetail: StudentDetail = {
          id: studentData.id,
          name: studentData.fullName || studentData.userName || "Unknown",
          email: studentData.email || "",
          failedCount,
          attempts: sessionsWithGroupInfo.map((s: any, index: number) => ({
            attempt: `Attempt #${sessionsWithGroupInfo.length - index}`,
            id: s.id.toString(), // Just the number
            sessionId: s.id,
            date: s.defenseDate
              ? new Date(s.defenseDate).toLocaleDateString()
              : "",
            group: s.groupId || "N/A",
            topic: s.topicFromGroup,
            role: s.studentRole || "Member",
            score: s.calculatedScore,
            grade: s.grade || "N/A",
            status: s.resultStatus || s.status || "Completed",
          })),
        };

        setStudent(studentDetail);
      } catch (error) {
        console.error("Error fetching student data:", error);
        setStudent(null);
      } finally {
        setLoading(false);
      }
    };

    fetchStudentData();
  }, [studentId]);

  // Handle download report by sessionId
  const handleDownloadReport = async (sessionId: number) => {
    try {
      // Get report by sessionId
      const reportResponse = await reportsApi.getBySessionId(sessionId);
      const reports = reportResponse.data;
      const report = Array.isArray(reports) ? reports[0] : reports;

      if (!report || !report.filePath) {
        swalConfig.error(
          "No Report Found",
          "No report available for this defense session."
        );
        return;
      }

      // Get renewed download URL
      const renewResponse = await fetch(
        `${BACKEND_API_URL}/api/defense-reports/download?blobUrl=${encodeURIComponent(
          report.filePath
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
      const downloadUrl = renewData.data || renewData.url || report.filePath;

      const response = await fetch(downloadUrl);
      if (!response.ok) {
        throw new Error("Failed to download file");
      }

      // Extract original filename and extension from filePath
      const originalFileName =
        report.filePath.split("/").pop()?.split("?")[0] || "report";
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
      };
      const mimeType = mimeTypes[fileExt] || "application/octet-stream";

      // Get the raw data and create blob with correct MIME type
      const arrayBuffer = await response.arrayBuffer();
      const blob = new Blob([arrayBuffer], { type: mimeType });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = decodeURIComponent(originalFileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download failed:", error);
      swalConfig.error(
        "Download Failed",
        "Could not download the report. Please try again."
      );
    }
  };

  if (loading) {
    return (
      <main className="main-content">
        <div className="text-center py-8 text-gray-500">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
          Loading student data...
        </div>
      </main>
    );
  }

  if (!student) {
    return (
      <main className="main-content">
        <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-gray-200">
          <p className="text-gray-500">Student not found.</p>
        </div>
      </main>
    );
  }

  return (
    <>
      <main className="main-content">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between bg-white rounded-xl shadow-sm border border-gray-100 px-6 py-4 mb-6">
          <div>
            <h1 className="text-xl font-semibold text-gray-800">
              Student Defense History
            </h1>
            <p className="text-sm text-gray-500">
              Detailed record of student’s past defense attempts
            </p>
          </div>
        </div>

        {/* Student Info Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <User className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-800">
              Student Information
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Student ID</p>
              <p className="font-medium text-gray-800">{student.id}</p>
            </div>
            <div>
              <p className="text-gray-500">Full Name</p>
              <p className="font-medium text-gray-800">{student.name}</p>
            </div>
            <div>
              <p className="text-gray-500">Email</p>
              <p className="font-medium text-gray-800">{student.email}</p>
            </div>
          </div>
        </div>

        {/* Attempts Table */}
        {student.attempts.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-5 h-5 text-indigo-600" />
              <h2 className="text-lg font-semibold text-gray-800">
                Previous Failed Defense Attempts
              </h2>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm border-t">
                <thead>
                  <tr className="text-gray-600 text-left">
                    <th className="py-3 pr-4">Session ID</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Group</th>
                    <th className="py-3 px-4">Topic</th>
                    <th className="py-3 px-4 text-center">Score</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-center">Report</th>
                  </tr>
                </thead>

                <tbody>
                  {student.attempts.map((attempt) => (
                    <tr
                      key={attempt.id}
                      className="border-t hover:bg-gray-50 transition"
                    >
                      <td className="py-3 pr-4 font-medium text-gray-800">
                        {attempt.id}
                      </td>
                      <td className="py-3 px-4 text-gray-700 flex items-center gap-1">
                        <Calendar className="w-4 h-4" /> {attempt.date}
                      </td>
                      <td className="py-3 px-4 text-gray-700">
                        {attempt.group}
                      </td>
                      <td className="py-3 px-4 text-gray-700">
                        {attempt.topic}
                      </td>
                      <td className="py-3 px-4 text-center font-medium text-gray-800">
                        {attempt.score.toFixed(1)}
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-block bg-yellow-50 text-yellow-700 px-3 py-1 rounded-full text-xs font-medium">
                          {attempt.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() =>
                            handleDownloadReport(attempt.sessionId)
                          }
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition"
                          title="Download Report"
                        >
                          <Download className="w-3.5 h-3.5" />
                          Download
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Footer */}
        <footer className="text-center text-sm text-gray-500 mt-10 mb-4">
          © 2025 AIDefCom - Smart Graduation Defense
        </footer>
      </main>
    </>
  );
}
