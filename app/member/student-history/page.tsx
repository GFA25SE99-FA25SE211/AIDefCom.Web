"use client";

import React from "react";
import Link from "next/link";
import { Languages, Search, Users } from "lucide-react";

const studentListData = [
  {
    id: "SV001",
    name: "Nguyen Van A",
    email: "a.nguyen@example.com",
    failedDefenses: 2,
  },
  {
    id: "SV002",
    name: "Tran Thi B",
    email: "b.tran@example.com",
    failedDefenses: 0,
  },
  {
    id: "SV003",
    name: "Le Van C",
    email: "c.le@example.com",
    failedDefenses: 1,
  },
  {
    id: "SV004",
    name: "Pham Van D",
    email: "d.pham@example.com",
    failedDefenses: 0,
  },
];

export default function StudentHistoryListPage() {
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
            />
          </div>
        </div>

        {/* Students table */}
        <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-800">
              Students ({studentListData.length})
            </h2>
          </div>

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
                {studentListData.map((student) => (
                  <tr
                    key={student.id}
                    className="border-b last:border-0 hover:bg-gray-50 transition"
                  >
                    <td className="py-3 px-4 font-medium text-gray-800">
                      {student.id}
                    </td>

                    <td className="py-3 px-4">
                      <Link
                        href={`/member/student-history/${student.id}`}
                        className="text-indigo-600 hover:underline font-medium"
                      >
                        {student.name}
                      </Link>
                    </td>

                    <td className="py-3 px-4 text-gray-700">{student.email}</td>

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
              </tbody>
            </table>
          </div>
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
