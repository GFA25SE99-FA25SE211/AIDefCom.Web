"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { Search, Users } from "lucide-react";
import { studentsApi } from "@/lib/api/students";
import { defenseSessionsApi } from "@/lib/api/defense-sessions";
import { useVoiceEnrollmentCheck } from "@/lib/hooks/useVoiceEnrollmentCheck";
import type { StudentDto } from "@/lib/models";

interface StudentWithHistory extends StudentDto {
  failedDefenses: number;
}

const PAGE_SIZE = 10;

export default function StudentHistoryListPage() {
  // Voice enrollment check - must be enrolled to access this page
  const { isChecking: checkingVoice } = useVoiceEnrollmentCheck();

  const [students, setStudents] = useState<StudentWithHistory[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

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
        const studentsWithHistory: StudentWithHistory[] = studentsData.map(
          (student: StudentDto) => {
            // This is a simplified calculation - you may need to adjust based on actual score data
            const failedDefenses = 0; // TODO: Calculate from scores when score API is available
            return {
              ...student,
              failedDefenses,
            };
          }
        );

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

  // Reset to page 1 when search term changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // Pagination calculations
  const paginatedStudents = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    return filteredStudents.slice(startIndex, startIndex + PAGE_SIZE);
  }, [filteredStudents, currentPage]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredStudents.length / PAGE_SIZE)
  );

  // Pagination component helper
  const renderPagination = () => {
    if (totalPages <= 1) {
      return (
        <div className="flex items-center justify-center mt-4 flex-wrap gap-2">
          <button
            className="px-3 py-1 rounded-md text-sm bg-blue-600 text-white"
            disabled
          >
            1
          </button>
        </div>
      );
    }
    return (
      <div className="flex items-center justify-center mt-4 flex-wrap gap-2">
        {Array.from({ length: totalPages }, (_, index) => {
          const pageNum = index + 1;
          const isActive = pageNum === currentPage;
          return (
            <button
              key={pageNum}
              className={`px-3 py-1 rounded-md text-sm ${
                isActive
                  ? "bg-blue-600 text-white"
                  : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
              }`}
              onClick={() => setCurrentPage(pageNum)}
            >
              {pageNum}
            </button>
          );
        })}
      </div>
    );
  };
  return (
    <>
      <main className="main-content">
        {/* Header */}
        <header className="flex flex-col bg-white p-5 rounded-2xl shadow-sm border border-gray-100 mb-6">
          <div>
            <h1 className="text-xl font-semibold text-gray-800">
              Student Defense History
            </h1>
            <p className="text-gray-500 text-sm">
              View past defense sessions and performance history
            </p>
          </div>
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
            <div className="text-center py-8 text-gray-500">
              Loading students...
            </div>
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
                  {paginatedStudents.map((student) => (
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

                      <td className="py-3 px-4 text-gray-700">
                        {student.email || "N/A"}
                      </td>

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
                          className="inline-flex items-center justify-center px-3 py-1.5 rounded-md text-sm font-semibold text-white bg-gradient-to-r from-purple-600 to-blue-500 shadow-md hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-purple-500 transition whitespace-nowrap"
                        >
                          View History
                        </Link>
                      </td>
                    </tr>
                  ))}
                  {paginatedStudents.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="text-center py-8 text-gray-400"
                      >
                        No students found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              {renderPagination()}
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="text-center text-sm text-gray-500 mt-8">
          © 2025 AIDefCom - Smart Graduation Defense
        </footer>
      </main>
    </>
  );
}
