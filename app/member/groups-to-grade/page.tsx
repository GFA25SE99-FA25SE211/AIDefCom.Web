"use client";

import React from "react";
import MemberSidebar from "./components/Sidebar";
import Header from "./components/Header";
import GroupCard, { GroupStatus, SessionStatus } from "./components/GroupCard";

// --- Dữ liệu mẫu ---
const groupsData = [
  {
    groupName: "Group 1",
    projectTitle: "Smart Learning Management System",
    status: "Graded" as GroupStatus,
    members: "Nguyen Van A, Tran Thi B, Le Van C",
    sessionTitle: "Defense Session 1 - Group A",
    sessionStatus: "Upcoming" as SessionStatus,
    sessionDateTime: "Oct 15, 2025 | 09:00 - 09:30",
  },
  {
    groupName: "Group 2",
    projectTitle: "Intelligent Ride-hailing Application",
    status: "Not Graded" as GroupStatus,
    members: "Pham Van D, Hoang Thi E",
    sessionTitle: "Defense Session 1 - Group A",
    sessionStatus: "Upcoming" as SessionStatus,
    sessionDateTime: "Oct 15, 2025 | 09:30 - 10:00",
  },
  {
    groupName: "Group 3",
    projectTitle: "E-commerce Website",
    status: "Not Graded" as GroupStatus,
    members: "Do Van F, Vu Thi G, Bui Van H",
    sessionTitle: "Defense Session 1 - Group A",
    sessionStatus: "Upcoming" as SessionStatus,
    sessionDateTime: "Oct 15, 2025 | 10:00 - 10:30",
  },
  {
    groupName: "Group 4",
    projectTitle: "AI Health Consultation Chatbot",
    status: "Not Graded" as GroupStatus,
    members: "Mai Van I, Dinh Thi K",
    sessionTitle: "Defense Session 1 - Group A",
    sessionStatus: "Upcoming" as SessionStatus,
    sessionDateTime: "Oct 15, 2025 | 10:30 - 11:00",
  },
  {
    groupName: "Group 5",
    projectTitle: "Face Recognition System",
    status: "Graded" as GroupStatus,
    members: "Cao Van L, Ly Thi M, Phan Van N",
    sessionTitle: "Defense Session 1 - Group A",
    sessionStatus: "Upcoming" as SessionStatus,
    sessionDateTime: "Oct 15, 2025 | 11:00 - 11:30",
  },
  {
    groupName: "Group 6",
    projectTitle: "Personal Finance Management App",
    status: "Not Graded" as GroupStatus,
    members: "Truong Van O, Duong Thi P",
    sessionTitle: "Defense Session 2 - Group B",
    sessionStatus: "Upcoming" as SessionStatus,
    sessionDateTime: "Oct 20, 2025 | 14:00 - 14:30",
  },
  {
    groupName: "Group 7",
    projectTitle: "Hotel Booking System",
    status: "Graded" as GroupStatus,
    members: "An Van Z, Binh Thi AA",
    sessionTitle: "Defense Session 1 - Group C",
    sessionStatus: "Completed" as SessionStatus,
    sessionDateTime: "Oct 8, 2025 | 09:00 - 09:30",
  },
];

export default function GroupsToGradePage() {
  const gradedCount = groupsData.filter((g) => g.status === "Graded").length;
  const totalCount = groupsData.length;

  return (
    <div className="flex min-h-screen bg-[#F3F6FB]">
      {/* Nội dung chính */}
      <main className="flex-1 p-8 space-y-6">
        <Header gradedCount={gradedCount} totalCount={totalCount} />

        {/* Danh sách nhóm */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {groupsData.map((group) => (
            <GroupCard key={group.groupName} {...group} />
          ))}
        </div>

        {/* Footer */}
        <footer className="text-center text-sm text-gray-500 mt-8">
          © 2025 AIDefCom — Smart Graduation Defense
        </footer>

        {/* Nút trợ giúp cố định */}
        <button
          className="help-btn fixed bottom-6 right-6 w-10 h-10 rounded-full bg-gradient-to-r from-purple-600 to-blue-500 text-white flex items-center justify-center shadow-lg hover:opacity-90 transition"
          title="Help"
        >
          ?
        </button>
      </main>
    </div>
  );
}
