"use client";

import React, { useState } from "react";
import CreateCouncilForm, {
  CouncilFormData,
} from "../create-sessions/components/CreateCouncilForm";

// Icons (đã chuẩn kích thước, đồng bộ Tailwind)
const CreateIcon = () => (
  <svg
    className="w-5 h-5"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 4.5v15m7.5-7.5h-15"
    />
  </svg>
);
const CouncilIcon = () => (
  <svg
    className="w-6 h-6"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M18 18.72a9.094 9.094 0 00-3.741-.56c-.303.007-.606.021-.908.04L12 18.72m-3.741-.56a9.094 9.094 0 01-3.741.56M12 13.093c-1.657 0-3.123.401-4.319 1.087M12 13.093c1.657 0 3.123.401 4.319 1.087"
    />
  </svg>
);

// Dữ liệu giả lập
const existingCouncilsData = [
  {
    id: 1,
    name: "Council for AI Projects - Fall 2025",
    createdDate: "1/1/2025",
    memberCount: 4,
    members: [
      {
        name: "Dr. Nguyen Van A",
        department: "Computer Science",
        email: "nguyenvana@university.edu",
        role: "Chair",
      },
      {
        name: "Dr. Tran Thi B",
        department: "Software Engineering",
        email: "tranthib@university.edu",
        role: "Member",
      },
      {
        name: "Dr. Le Van C",
        department: "AI Research",
        email: "levanc@university.edu",
        role: "Member",
      },
      {
        name: "MSc. Pham Thi D",
        department: "Computer Science",
        email: "phamthid@university.edu",
        role: "Secretary",
      },
    ],
  },
];

export default function ManageCouncilPage() {
  const [isFormVisible, setIsFormVisible] = useState(false);

  const handleCreateCouncil = (formData: CouncilFormData) => {
    console.log("New council data:", formData);
    alert("Council created! (Check console for data)");
    setIsFormVisible(false);
  };

  return (
    <div className="max-w-[1100px] mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Manage Defense Councils</h1>
          <p className="text-sm text-gray-600 mt-1">
            Create and manage defense councils with faculty members
          </p>
        </div>

        <button
          onClick={() => setIsFormVisible(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-blue-500 text-white text-sm shadow hover:opacity-90 transition"
        >
          <CreateIcon />
          Create New Council
        </button>
      </div>

      {/* Form tạo mới */}
      {isFormVisible && (
        <div className="bg-white rounded-xl shadow p-6 mb-6">
          <CreateCouncilForm
            onCancel={() => setIsFormVisible(false)}
            onSubmit={handleCreateCouncil}
          />
        </div>
      )}

      {/* Danh sách hội đồng */}
      {!isFormVisible && (
        <>
          {/* Tổng quan */}
          <div className="bg-white p-4 rounded-lg shadow flex items-center justify-between mb-6">
            <div>
              <div className="text-xl font-semibold">
                {existingCouncilsData.length}
              </div>
              <div className="text-sm text-gray-500">Total Councils</div>
            </div>
            <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-indigo-500 text-white">
              <CouncilIcon />
            </div>
          </div>

          {/* Danh sách */}
          <h2 className="text-lg font-semibold mb-3">Existing Councils</h2>
          <div className="space-y-4">
            {existingCouncilsData.map((council) => (
              <div
                key={council.id}
                className="bg-white rounded-lg shadow p-4 border border-gray-100"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-md bg-purple-50 flex items-center justify-center text-purple-700">
                      <CouncilIcon />
                    </div>
                    <div>
                      <h3 className="font-medium">{council.name}</h3>
                      <p className="text-xs text-gray-500">
                        Created on {council.createdDate}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded-full">
                    {council.memberCount} Members
                  </span>
                </div>

                <div className="divide-y divide-gray-100">
                  {council.members.map((member) => (
                    <div
                      key={member.email}
                      className="flex items-center justify-between py-2 text-sm"
                    >
                      <div>
                        <h4 className="font-medium">{member.name}</h4>
                        <p className="text-gray-500">{member.department}</p>
                        <p className="text-gray-400 text-xs">{member.email}</p>
                      </div>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          member.role === "Chair"
                            ? "bg-purple-100 text-purple-700"
                            : member.role === "Secretary"
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {member.role}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Footer */}
      <footer className="text-xs text-gray-400 mt-10 text-center">
        © 2025 AIDefCom · Smart Graduation Defense
      </footer>
    </div>
  );
}
