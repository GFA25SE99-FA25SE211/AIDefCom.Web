"use client";

import React from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, User, FileText, Clock } from "lucide-react";

// --- Icons gốc giữ lại nếu cần ---
const SummaryIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    className="w-5 h-5"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-1.5h5.25m-7.5 0h.008M9 4.5h.008M12 4.5h.008M15 4.5h.008M5.25 9a.75.75 0 01.75-.75h12a.75.75 0 01.75.75v.008a.75.75 0 01-.75.75H6a.75.75 0 01-.75-.75V9zm0 3a.75.75 0 01.75-.75h12a.75.75 0 01.75.75v.008a.75.75 0 01-.75.75H6a.75.75 0 01-.75-.75v-.008zm0 3a.75.75 0 01.75-.75h12a.75.75 0 01.75.75v.008a.75.75 0 01-.75.75H6a.75.75 0 01-.75-.75v-.008z"
    />
  </svg>
);

const CalendarIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    className="w-4 h-4"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
    />
  </svg>
);

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
        role: "Team Leader",
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
        role: "Team Leader",
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
        role: "Developer",
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
  const student: StudentDetail =
    studentDetailData[studentId] || studentDetailData["SV001"];

  const handleBackToList = () => {
    router.push("/member/student-history");
  };

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

        {/* Summary Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-5 h-5 text-violet-600" />
            <h2 className="text-lg font-semibold text-gray-800">
              Defense History Summary
            </h2>
          </div>

          {student.failedCount > 0 ? (
            <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-sm">
              <p className="font-medium text-red-700">
                Total Failed Defenses: {student.failedCount}
              </p>
              <p className="text-gray-600 mt-1">
                This student has failed {student.failedCount} time(s) and is now
                retaking the defense.
              </p>
            </div>
          ) : (
            <p className="text-center text-gray-500 py-6 text-sm">
              This student has not failed any previous defense attempts.
            </p>
          )}
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
                    <th className="py-3 pr-4">Attempt</th>
                    <th className="py-3 px-4">Session ID</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Group</th>
                    <th className="py-3 px-4">Topic</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4 text-center">Score</th>
                    <th className="py-3 px-4 text-center">Grade</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>

                <tbody>
                  {student.attempts.map((attempt) => (
                    <tr
                      key={attempt.id}
                      className="border-t hover:bg-gray-50 transition"
                    >
                      <td className="py-3 pr-4 font-medium text-gray-800">
                        {attempt.attempt}
                      </td>
                      <td className="py-3 px-4 text-gray-700">{attempt.id}</td>
                      <td className="py-3 px-4 text-gray-700 flex items-center gap-1">
                        <CalendarIcon /> {attempt.date}
                      </td>
                      <td className="py-3 px-4 text-gray-700">
                        {attempt.group}
                      </td>
                      <td className="py-3 px-4 text-gray-700">
                        {attempt.topic}
                      </td>
                      <td className="py-3 px-4 text-gray-700">
                        {attempt.role}
                      </td>
                      <td className="py-3 px-4 text-center font-medium text-gray-800">
                        {attempt.score.toFixed(1)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="inline-block bg-red-50 text-red-700 px-3 py-1 rounded-md font-medium text-xs">
                          {attempt.grade}
                        </span>
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

        <button
          className="help-btn fixed bottom-6 right-6 w-10 h-10 rounded-full bg-gradient-to-r from-purple-600 to-blue-500 text-white flex items-center justify-center shadow-lg"
          aria-label="Help"
        >
          ?
        </button>
      </main>
    </>
  );
}
