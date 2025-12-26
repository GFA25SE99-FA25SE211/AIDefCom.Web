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
} from "lucide-react";
import { studentsApi } from "@/lib/api/students";
import { defenseSessionsApi } from "@/lib/api/defense-sessions";
import { groupsApi } from "@/lib/api/groups";
import { scoresApi } from "@/lib/api/scores";
import type { StudentDto, DefenseSessionDto } from "@/lib/models";

// ======= Types =======
interface Attempt {
  attempt: string;
  id: string;
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

type StudentDetailData = {
  [key: string]: StudentDetail;
};

// ======= Mock Data =======
const studentDetailData: StudentDetailData = {
  SV001: {
    id: "SV001",
    name: "Nguyen Van A",
    email: "a.nguyen@example.com",
    failedCount: 2,
    attempts: [
      {
        attempt: "Attempt #2",
        id: "DEF-2024-002",
        date: "2024-02-10",
        group: "Group 2",
        topic: "Smart Learning Management System",
        role: "Leader",
        score: 4.2,
        grade: "F",
        status: "Not Passed",
      },
      {
        attempt: "Attempt #1",
        id: "DEF-2023-008",
        date: "2023-12-10",
        group: "Group 3",
        topic: "Smart Learning Management System",
        role: "Leader",
        score: 4.8,
        grade: "F",
        status: "Not Passed",
      },
    ],
  },
  SV002: {
    id: "SV002",
    name: "Tran Thi B",
    email: "b.tran@example.com",
    failedCount: 0,
    attempts: [],
  },
  SV003: {
    id: "SV003",
    name: "Le Van C",
    email: "c.le@example.com",
    failedCount: 1,
    attempts: [
      {
        attempt: "Attempt #1",
        id: "DEF-2023-008",
        date: "2023-12-10",
        group: "Group 3",
        topic: "Smart Learning Management System",
        role: "Member",
        score: 4.5,
        grade: "F",
        status: "Not Passed",
      },
    ],
  },
  SV004: {
    id: "SV004",
    name: "Pham Van D",
    email: "d.pham@example.com",
    failedCount: 0,
    attempts: [],
  },
};

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
          // Fallback to mock data if not found
          setStudent(
            studentDetailData[studentId] || studentDetailData["SV001"]
          );
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
                scoresApi.getBySessionId(s.id).catch(() => ({ data: [] }))
              ]);
              
              const group = groupRes.data;
              const scores = scoresRes.data || [];
              
              // Calculate average score for this student in this session
              const studentScores = scores.filter((score: any) => score.studentId === studentId);
              const avgScore = studentScores.length > 0
                ? studentScores.reduce((sum: number, score: any) => sum + (score.value || 0), 0) / studentScores.length
                : s.studentScore || 0;
              
              return {
                ...s,
                topicFromGroup: group?.topicTitle_EN || group?.topicTitle_VN || s.topicTitle || "No Topic",
                calculatedScore: avgScore
              };
            } catch (err) {
              console.error(`Error fetching data for session ${s.id}:`, err);
              return {
                ...s,
                topicFromGroup: s.topicTitle || "No Topic",
                calculatedScore: s.studentScore || 0
              };
            }
          })
        );

        // Calculate failed count from sessions with grade "F"
        const failedCount = sessionsWithGroupInfo.filter((s: any) => s.grade === "F").length;

        // Transform to StudentDetail format
        const studentDetail: StudentDetail = {
          id: studentData.id,
          name: studentData.fullName || studentData.userName || "Unknown",
          email: studentData.email || "",
          failedCount,
          attempts: sessionsWithGroupInfo.map(
            (s: any, index: number) => ({
              attempt: `Attempt #${sessionsWithGroupInfo.length - index}`,
              id: s.id.toString(), // Just the number
              date: s.defenseDate ? new Date(s.defenseDate).toLocaleDateString() : "",
              group: s.groupId || "N/A",
              topic: s.topicFromGroup,
              role: s.studentRole || "Member",
              score: s.calculatedScore,
              grade: s.grade || "N/A",
              status: s.resultStatus || s.status || "Completed",
            })
          ),
        };

        setStudent(studentDetail);
      } catch (error) {
        setStudent(studentDetailData[studentId] || studentDetailData["SV001"]);
      } finally {
        setLoading(false);
      }
    };

    fetchStudentData();
  }, [studentId]);

  const handleBackToList = () => {
    router.push("/member/student-history");
  };

  if (loading || !student) {
    return (
      <main className="main-content">
        <div className="text-center py-8 text-gray-500">
          Loading student data...
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

          <button
            onClick={handleBackToList}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium shadow-sm hover:bg-gray-100 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Student List</span>
          </button>
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
                  </tr>
                </thead>

                <tbody>
                  {student.attempts.map((attempt) => (
                    <tr
                      key={attempt.id}
                      className="border-t hover:bg-gray-50 transition"
                    >
                      <td className="py-3 pr-4 font-medium text-gray-800">{attempt.id}</td>
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
