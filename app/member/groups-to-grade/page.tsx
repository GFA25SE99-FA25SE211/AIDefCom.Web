"use client";

import React, { useEffect, useState } from "react";
import MemberSidebar from "./components/Sidebar";
import Header from "./components/Header";
import GroupCard, { GroupStatus, SessionStatus } from "./components/GroupCard";
import { groupsApi } from "@/lib/api/groups";
import { defenseSessionsApi } from "@/lib/api/defense-sessions";
import { studentsApi } from "@/lib/api/students";
import type { GroupDto, DefenseSessionDto, StudentDto } from "@/lib/models";

interface GroupWithSession extends GroupDto {
  status: GroupStatus;
  members: string;
  sessionTitle: string;
  sessionStatus: SessionStatus;
  sessionDateTime: string;
}

// --- Dữ liệu mẫu ---
const defaultGroupsData: GroupWithSession[] = [
  {
    id: "1",
    groupName: "Group 1",
    projectTitle: "Smart Learning Management System",
    semesterId: 1,
    status: "Graded" as GroupStatus,
    members: "Nguyen Van A, Tran Thi B, Le Van C",
    sessionTitle: "Defense Session 1 - Group A",
    sessionStatus: "Upcoming" as SessionStatus,
    sessionDateTime: "Oct 15, 2025 | 09:00 - 09:30",
  },
  {
    id: "2",
    groupName: "Group 2",
    projectTitle: "Intelligent Ride-hailing Application",
    semesterId: 1,
    status: "Not Graded" as GroupStatus,
    members: "Pham Van D, Hoang Thi E",
    sessionTitle: "Defense Session 1 - Group A",
    sessionStatus: "Upcoming" as SessionStatus,
    sessionDateTime: "Oct 15, 2025 | 09:30 - 10:00",
  },
  {
    id: "3",
    groupName: "Group 3",
    projectTitle: "E-commerce Website",
    semesterId: 1,
    status: "Not Graded" as GroupStatus,
    members: "Do Van F, Vu Thi G, Bui Van H",
    sessionTitle: "Defense Session 1 - Group A",
    sessionStatus: "Upcoming" as SessionStatus,
    sessionDateTime: "Oct 15, 2025 | 10:00 - 10:30",
  },
  {
    id: "4",
    groupName: "Group 4",
    projectTitle: "AI Health Consultation Chatbot",
    semesterId: 1,
    status: "Not Graded" as GroupStatus,
    members: "Mai Van I, Dinh Thi K",
    sessionTitle: "Defense Session 1 - Group A",
    sessionStatus: "Upcoming" as SessionStatus,
    sessionDateTime: "Oct 15, 2025 | 10:30 - 11:00",
  },
  {
    id: "5",
    groupName: "Group 5",
    projectTitle: "Face Recognition System",
    semesterId: 1,
    status: "Graded" as GroupStatus,
    members: "Cao Van L, Ly Thi M, Phan Van N",
    sessionTitle: "Defense Session 1 - Group A",
    sessionStatus: "Upcoming" as SessionStatus,
    sessionDateTime: "Oct 15, 2025 | 11:00 - 11:30",
  },
  {
    id: "6",
    groupName: "Group 6",
    projectTitle: "Personal Finance Management App",
    semesterId: 1,
    status: "Not Graded" as GroupStatus,
    members: "Truong Van O, Duong Thi P",
    sessionTitle: "Defense Session 2 - Group B",
    sessionStatus: "Upcoming" as SessionStatus,
    sessionDateTime: "Oct 20, 2025 | 14:00 - 14:30",
  },
  {
    id: "7",
    groupName: "Group 7",
    projectTitle: "Hotel Booking System",
    semesterId: 1,
    status: "Graded" as GroupStatus,
    members: "An Van Z, Binh Thi AA",
    sessionTitle: "Defense Session 1 - Group C",
    sessionStatus: "Completed" as SessionStatus,
    sessionDateTime: "Oct 8, 2025 | 09:00 - 09:30",
  },
];

export default function GroupsToGradePage() {
  const [groupsData, setGroupsData] = useState<GroupWithSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGroups = async () => {
      try {
        setLoading(true);
        const [groupsRes, sessionsRes] = await Promise.all([
          groupsApi.getAll().catch(() => ({ data: [] })),
          defenseSessionsApi.getAll().catch(() => ({ data: [] })),
        ]);

        const groups = groupsRes.data || [];
        const sessions = sessionsRes.data || [];

        const groupsWithSessions: GroupWithSession[] = await Promise.all(
          groups.map(async (group: GroupDto) => {
            const groupSessions = sessions.filter((s: DefenseSessionDto) => s.groupId === group.id);
            const latestSession = groupSessions[0];
            
            // Get students for this group
            const studentsRes = await studentsApi.getByGroupId(group.id).catch(() => ({ data: [] }));
            const students = studentsRes.data || [];
            const members = students.map((s: StudentDto) => s.fullName).join(", ") || "No members";

            const sessionDate = latestSession ? new Date(latestSession.sessionDate) : new Date();
            const isUpcoming = sessionDate >= new Date();
            const isCompleted = latestSession && sessionDate < new Date();

            return {
              ...group,
              status: "Not Graded" as GroupStatus,
              members,
              sessionTitle: latestSession ? `Defense Session - ${group.groupName}` : "No session",
              sessionStatus: isCompleted ? "Completed" as SessionStatus : isUpcoming ? "Upcoming" as SessionStatus : "Upcoming" as SessionStatus,
              sessionDateTime: latestSession 
                ? `${sessionDate.toLocaleDateString("en-GB")} | ${latestSession.sessionTime || "TBD"}`
                : "TBD",
            };
          })
        );

        setGroupsData(groupsWithSessions);
      } catch (error) {
        console.error("Error fetching groups:", error);
        setGroupsData(defaultGroupsData);
      } finally {
        setLoading(false);
      }
    };

    fetchGroups();
  }, []);

  const gradedCount = groupsData.filter((g) => g.status === "Graded").length;
  const totalCount = groupsData.length;

  return (
    <div className="flex min-h-screen bg-[#F3F6FB]">
      {/* Nội dung chính */}
      <main className="flex-1 p-8 space-y-6">
        <Header gradedCount={gradedCount} totalCount={totalCount} />

        {/* Danh sách nhóm */}
        {loading ? (
          <div className="text-center py-8 text-gray-500">Loading groups...</div>
        ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {groupsData.map((group) => (
              <GroupCard 
                key={group.id} 
                {...group}
                projectTitle={group.projectTitle || "No project title"}
              />
          ))}
        </div>
        )}

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
