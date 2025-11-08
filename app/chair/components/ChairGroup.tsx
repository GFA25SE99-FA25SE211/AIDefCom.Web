"use client";

import { useState } from "react";
import CreateTaskModal from "./CreateTaskModal";

export default function ChairGroups() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <CreateTaskModal open={open} onClose={() => setOpen(false)} />

      {/* --- Header Section --- */}
      <div className="section-header mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">My Groups</h1>
          <p className="text-gray-500 text-sm">
            List of groups and their defense sessions
          </p>
        </div>

        {/* Gradient button hệ thống */}
        <button onClick={() => setOpen(true)} className="btn-gradient text-sm">
          + Create Task
        </button>
      </div>

      {/* --- Group Cards --- */}
      <div className="mt-6 space-y-6">
        {[1, 2].map((g) => (
          <div
            key={g}
            className="card-base hover:shadow-lg transition-all duration-200"
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-800">
                  Group {g}
                </h3>
                <p className="text-gray-500 text-sm">
                  Smart Learning Management System
                </p>
                <p className="text-gray-500 text-sm mt-1">
                  👥 Nguyen Van A, Tran Thi B, Le Van C
                </p>
              </div>

              {/* --- Nút View Details chuẩn hệ thống --- */}
              <button
                className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium
                bg-gradient-to-r from-purple-600 to-blue-500 text-white shadow-sm hover:opacity-90
                transition-all duration-150"
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
                    d="M15 12H3m0 0l4-4m-4 4l4 4m4 4h8a2 2 0 002-2V6a2 2 0 00-2-2h-8"
                  />
                </svg>
                View Details
              </button>
            </div>

            {/* Defense Session Section */}
            <div className="p-4 rounded-xl border border-gray-200 bg-gradient-to-r from-white via-purple-50 to-blue-50">
              <p className="text-sm font-medium text-gray-800 mb-2">
                Defense Session 1 - Group A
              </p>
              <div className="flex flex-wrap gap-4 items-center text-gray-500 text-sm">
                <span className="flex items-center gap-1">
                  📅 <span>Oct 15, 2025</span>
                </span>
                <span className="flex items-center gap-1">
                  ⏰ <span>09:00 - 09:30</span>
                </span>
                <span className="ml-auto">
                  <span className="badge badge-info">Upcoming</span>
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* --- Footer --- */}
      <p className="text-xs text-center text-gray-400 mt-10">
        © 2025 AIDefCom · Smart Graduation Defense
      </p>
    </>
  );
}
