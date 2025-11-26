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

const getGroupDisplayName = (group: GroupDto) =>
  group.projectCode ||
  group.groupName ||
  `Group ${group.id?.slice(0, 8) || ""}`;

const getProjectTitle = (group: GroupDto) =>
  group.topicTitle_EN ||
  group.topicTitle_VN ||
  group.projectTitle ||
  "No project title";

// --- Dữ liệu mẫu ---
const defaultGroupsData: GroupWithSession[] = [
  {
    id: "5708D13B-034E-4039-BC06-20E4F283936B",
    groupName: "Group 1",
    projectCode: "CAPSTONE2024-001",
    topicTitle_EN: "AI-based Defense Committee Management System",
    topicTitle_VN: "Hệ thống quản lý hội đồng bảo vệ dựa trên AI",
    semesterId: 1,
    semesterName: "Fall 2024",
    majorId: 1,
    majorName: "Công nghệ thông tin",
    projectTitle: "AI-based Defense Committee Management System",
    status: "Not Graded" as GroupStatus,
    members: "Nguyen Van A, Tran Thi B, Le Van C",
    sessionTitle: "Defense Session 1 - Group A",
    sessionStatus: "Upcoming" as SessionStatus,
    sessionDateTime: "Oct 15, 2025 | 09:00 - 09:30",
  },
  {
    id: "8676FFBD-6ED5-4871-887C-FE16A33E1E6A",
    groupName: "Group 2",
    projectCode: "CAPSTONE2024-002",
    topicTitle_EN: "Smart Campus IoT System",
    topicTitle_VN: "Hệ thống IoT thông minh cho trường học",
    semesterId: 1,
    semesterName: "Fall 2024",
    majorId: 1,
    majorName: "Công nghệ thông tin",
    projectTitle: "Smart Campus IoT System",
    status: "Not Graded" as GroupStatus,
    members: "Pham Van D, Hoang Thi E",
    sessionTitle: "Defense Session 1 - Group A",
    sessionStatus: "Upcoming" as SessionStatus,
    sessionDateTime: "Oct 15, 2025 | 09:30 - 10:00",
  },
  {
    id: "7D142936-BE8F-4F47-853A-5B14A33975A6",
    groupName: "Group 3",
    projectCode: "CAPSTONE2024-003",
    topicTitle_EN: "E-Commerce Platform with AI Recommendation",
    topicTitle_VN: "Nền tảng thương mại điện tử với gợi ý sản phẩm bằng AI",
    semesterId: 1,
    semesterName: "Fall 2024",
    majorId: 1,
    majorName: "Công nghệ thông tin",
    projectTitle: "E-Commerce Platform with AI Recommendation",
    status: "Not Graded" as GroupStatus,
    members: "Do Van F, Vu Thi G, Bui Van H",
    sessionTitle: "Defense Session 1 - Group A",
    sessionStatus: "Upcoming" as SessionStatus,
    sessionDateTime: "Oct 15, 2025 | 10:00 - 10:30",
  },
  {
    id: "B348CD22-B7AA-4973-81F4-A2694BE217E3",
    groupName: "Group 4",
    projectCode: "CAPSTONE2024-004",
    topicTitle_EN: "Blockchain-based Document Verification System",
    topicTitle_VN: "Hệ thống xác thực văn bằng dựa trên Blockchain",
    semesterId: 1,
    semesterName: "Fall 2024",
    majorId: 1,
    majorName: "Công nghệ thông tin",
    projectTitle: "Blockchain-based Document Verification System",
    status: "Not Graded" as GroupStatus,
    members: "Mai Van I, Dinh Thi K",
    sessionTitle: "Defense Session 1 - Group A",
    sessionStatus: "Upcoming" as SessionStatus,
    sessionDateTime: "Oct 15, 2025 | 10:30 - 11:00",
  },
  {
    id: "457144B6-D625-4F5B-8BAE-AB1E882DA8DE",
    groupName: "Group 5",
    projectCode: "CAPSTONE2024-005",
    topicTitle_EN: "Mobile App for Mental Health Support",
    topicTitle_VN: "Ứng dụng di động hỗ trợ sức khỏe tinh thần",
    semesterId: 1,
    semesterName: "Fall 2024",
    majorId: 1,
    majorName: "Công nghệ thông tin",
    projectTitle: "Mobile App for Mental Health Support",
    status: "Not Graded" as GroupStatus,
    members: "Cao Van L, Ly Thi M, Phan Van N",
    sessionTitle: "Defense Session 1 - Group A",
    sessionStatus: "Upcoming" as SessionStatus,
    sessionDateTime: "Oct 15, 2025 | 11:00 - 11:30",
  },
  {
    id: "GFA25SE01",
    groupName: "Group 6",
    projectCode: "FA25SE135",
    topicTitle_EN:
      "Fusion - Multi-Enterprise IT Project Maintenance & Development Platform",
    topicTitle_VN:
      "Nền tảng quản trị bảo trì và phát triển dự án công nghệ thông tin đa doanh nghiệp",
    semesterId: 1,
    semesterName: "Fall 2024",
    majorId: 1,
    majorName: "Công nghệ thông tin",
    projectTitle:
      "Fusion - Multi-Enterprise IT Project Maintenance & Development Platform",
    status: "Not Graded" as GroupStatus,
    members: "Truong Van O, Duong Thi P",
    sessionTitle: "Defense Session 2 - Group B",
    sessionStatus: "Upcoming" as SessionStatus,
    sessionDateTime: "Oct 20, 2025 | 14:00 - 14:30",
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
          groupsApi
            .getAll(false)
            .catch(() => ({ code: 500, message: "Failed", data: [] })),
          defenseSessionsApi
            .getAll()
            .catch(() => ({ code: 500, message: "Failed", data: [] })),
        ]);

        // Extract data from API response structure
        const groups = Array.isArray(groupsRes.data) ? groupsRes.data : [];
        const sessions = Array.isArray(sessionsRes.data)
          ? sessionsRes.data
          : [];

        console.log("Groups API Response:", {
          code: groupsRes.code,
          message: groupsRes.message,
          dataLength: groups.length,
          sampleGroup: groups[0],
        });

        if (groups.length === 0) {
          console.warn("No groups found in API response");
          setGroupsData(defaultGroupsData);
          return;
        }

        const groupsWithSessions: GroupWithSession[] = await Promise.all(
          groups.map(async (group: GroupDto) => {
            const groupSessions = sessions.filter(
              (s: DefenseSessionDto) => s.groupId === group.id
            );
            const latestSession = groupSessions[0];

            // Get students for this group
            const studentsRes = await studentsApi
              .getByGroupId(group.id)
              .catch(() => ({ code: 500, message: "Failed", data: [] }));
            const students = Array.isArray(studentsRes.data)
              ? studentsRes.data
              : [];
            const members =
              students.length > 0
                ? students
                    .map(
                      (s: StudentDto) => s.fullName || s.userName || "Unknown"
                    )
                    .join(", ")
                : "No members assigned";

            const sessionDate = latestSession
              ? new Date(latestSession.defenseDate)
              : new Date();
            const isUpcoming = sessionDate >= new Date();
            const isCompleted = latestSession && sessionDate < new Date();

            const displayName = getGroupDisplayName(group);
            const projectTitle = getProjectTitle(group);

            return {
              ...group,
              groupName: displayName,
              projectTitle,
              // Allow grading for all groups - members should be able to grade/edit
              status: "Not Graded" as GroupStatus,
              members,
              sessionTitle: latestSession
                ? `Defense Session - ${displayName}`
                : "No session",
              sessionStatus: isCompleted
                ? ("Completed" as SessionStatus)
                : isUpcoming
                ? ("Upcoming" as SessionStatus)
                : ("Upcoming" as SessionStatus),
              sessionDateTime: latestSession
                ? `${sessionDate.toLocaleDateString("en-GB")} | ${
                    latestSession.startTime && latestSession.endTime
                      ? `${latestSession.startTime} - ${latestSession.endTime}`
                      : latestSession.startTime || "TBD"
                  }`
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
      <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6">
        <Header gradedCount={gradedCount} totalCount={totalCount} />

        {/* Danh sách nhóm */}
        {loading ? (
          <div className="text-center py-8 text-gray-500">
            Loading groups...
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
            {groupsData.map((group) => (
              <GroupCard
                key={group.id}
                groupId={group.id}
                groupName={group.groupName || "Unknown Group"}
                projectTitle={group.projectTitle || "No project title"}
                status={group.status}
                members={group.members}
                sessionTitle={group.sessionTitle}
                sessionStatus={group.sessionStatus}
                sessionDateTime={group.sessionDateTime}
              />
            ))}
          </div>
        )}

        {/* Footer */}
        <footer className="text-center text-sm text-gray-500 mt-8">
          © 2025 AIDefCom — Smart Graduation Defense
        </footer>
      </main>
    </div>
  );
}
