"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Languages, Search, Users } from "lucide-react";
import { studentsApi } from "@/lib/api/students";
import { defenseSessionsApi } from "@/lib/api/defense-sessions";
import type { StudentDto } from "@/lib/models";

interface StudentWithHistory extends StudentDto {
  failedDefenses: number;
}

export default function StudentHistoryListPage() {
  const [students, setStudents] = useState<StudentWithHistory[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        setLoading(true);
        const [studentsRes, sessionsRes] = await Promise.all([
          studentsApi.getAll().catch(() => ({ data: [] })),
          defenseSessionsApi.getAll().catch(() => ({ data: [] })),
        ]);

        const studentsData = studentsRes.data || [];
        const sessions = sessionsRes.data || [];

        // Calculate failed defenses for each student
        const studentsWithHistory: StudentWithHistory[] = studentsData.map((student: StudentDto) => {
          // This is a simplified calculation - you may need to adjust based on actual score data
          const failedDefenses = 0; // TODO: Calculate from scores when score API is available
          return {
            ...student,
            failedDefenses,
          };
        });

        setStudents(studentsWithHistory);
      } catch (error) {
        console.error("Error fetching students:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStudents();
  }, []);

  const filteredStudents = students.filter((student) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      student.studentCode?.toLowerCase().includes(searchLower) ||
      student.fullName?.toLowerCase().includes(searchLower) ||
      student.userName?.toLowerCase().includes(searchLower) ||
      student.email?.toLowerCase().includes(searchLower)
    );
  });
  return (
    <>
      <main className="main-content">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center md:justify-between bg-white p-5 rounded-2xl shadow-sm border border-gray-100 mb-6">
          <div>
            <h1 className="text-xl font-semibold text-gray-800">
              Student Defense History
            </h1>
            <p className="text-gray-500 text-sm">
              View past defense sessions and performance history
            </p>
          </div>

          <button className="flex items-center gap-2 mt-4 md:mt-0 px-3 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-blue-500 text-white text-sm font-medium shadow-sm hover:opacity-90 transition">
            <Languages className="w-4 h-4" />
            <span>Tiếng Việt</span>
          </button>
        </header>

        {/* Search bar */}
        <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-4 mb-6">
          <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-indigo-500">
            <Search className="w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, student ID, or email..."
              className="flex-1 outline-none text-sm text-gray-700 placeholder-gray-400"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Students table */}
        <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-800">
              Students ({filteredStudents.length})
            </h2>
          </div>

          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading students...</div>
          ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-gray-600 border-b">
                  <th className="text-left py-3 px-4">Student ID</th>
                  <th className="text-left py-3 px-4">Name</th>
                  <th className="text-left py-3 px-4">Email</th>
                  <th className="text-center py-3 px-4">Failed Defenses</th>
                  <th className="text-right py-3 px-4">Actions</th>
                </tr>
              </thead>

              <tbody>
                  {filteredStudents.map((student) => (
                  <tr
                    key={student.id}
                    className="border-b last:border-0 hover:bg-gray-50 transition"
                  >
                    <td className="py-3 px-4 font-medium text-gray-800">
                        {student.studentCode || student.id}
                    </td>

                    <td className="py-3 px-4">
                      <Link
                        href={`/member/student-history/${student.id}`}
                        className="text-indigo-600 hover:underline font-medium"
                      >
                          {student.fullName || student.userName || "Unknown"}
                      </Link>
                    </td>

                      <td className="py-3 px-4 text-gray-700">{student.email || "N/A"}</td>

                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                          student.failedDefenses > 0
                            ? "bg-red-50 text-red-700"
                            : "bg-green-50 text-green-700"
                        }`}
                      >
                        {student.failedDefenses}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <Link
                        href={`/member/student-history/${student.id}`}
                        className="inline-block px-3 py-1.5 rounded-md text-xs font-medium text-white bg-gradient-to-r from-purple-600 to-blue-500 shadow-sm hover:opacity-90 transition"
                      >
                        View History
                      </Link>
                    </td>
                  </tr>
                ))}
                  {filteredStudents.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-gray-400">
                        No students found.
                      </td>
                    </tr>
                  )}
              </tbody>
            </table>
          </div>
          )}
        </div>

        {/* Footer */}
        <footer className="text-center text-sm text-gray-500 mt-8">
          © 2025 AIDefCom - Smart Graduation Defense
        </footer>

        {/* Help button */}
        <button
          className="fixed bottom-6 right-6 w-10 h-10 rounded-full bg-gradient-to-r from-purple-600 to-blue-500 text-white flex items-center justify-center shadow-lg"
          aria-label="Help"
        >
          ?
        </button>
      </main>
    </>
  );
}
