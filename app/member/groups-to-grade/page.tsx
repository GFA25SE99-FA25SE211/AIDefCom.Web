"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import MemberSidebar from "./components/Sidebar";
import Header from "./components/Header";
import GroupCard, { GroupStatus, SessionStatus } from "./components/GroupCard";
import { groupsApi } from "@/lib/api/groups";
import { defenseSessionsApi } from "@/lib/api/defense-sessions";
import { studentsApi } from "@/lib/api/students";
import { scoresApi } from "@/lib/api/scores";
import { projectTasksApi } from "@/lib/api/project-tasks";
import { authUtils } from "@/lib/utils/auth";
import { useVoiceEnrollmentCheck } from "@/lib/hooks/useVoiceEnrollmentCheck";
import type {
  GroupDto,
  DefenseSessionDto,
  StudentDto,
  ProjectTaskDto,
} from "@/lib/models";

interface GroupWithSession
  extends Omit<GroupDto, "groupName" | "projectTitle" | "totalScore"> {
  groupName: string;
  projectTitle: string;
  status: GroupStatus;
  members: string;
  sessionTitle: string;
  sessionStatus: SessionStatus;
  sessionDateTime: string;
  averageScore: number | null;
  totalScore?: number | null;
  canGrade: boolean;
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
    averageScore: null,
    canGrade: false,
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
    averageScore: null,
    canGrade: false,
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
    averageScore: null,
    canGrade: false,
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
    averageScore: null,
    canGrade: false,
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
    averageScore: null,
    canGrade: false,
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
    averageScore: null,
    canGrade: false,
  },
];

function GroupsToGradePageContent() {
  const searchParams = useSearchParams();
  const sessionIdParam = searchParams?.get("sessionId");
  const selectedSessionId = sessionIdParam ? parseInt(sessionIdParam) : null;

  // Voice enrollment check - must be enrolled to access this page
  const { isChecking: checkingVoice } = useVoiceEnrollmentCheck();

  // Xóa session role khi vào trang danh sách (không phải detail)
  useEffect(() => {
    localStorage.removeItem("sessionRole");
  }, []);

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

        // Determine current lecturer (evaluator) from token
        const userInfo = authUtils.getCurrentUserInfo();
        let currentUserId = userInfo.userId;
        if (!currentUserId) {
          // Fallback: consistent with grading page & sample API data
          currentUserId = "0EB5D9FB-4389-45B7-A7AE-23AFBAF461CE";
        }

        // Check if lecturer has any grading task in this session
        let hasPermissionInSession = true;
        let tasksBySession: ProjectTaskDto[] = [];

        if (selectedSessionId && currentUserId) {
          try {
            const tasksRes = await projectTasksApi.getByAssigneeAndSession(
              currentUserId,
              selectedSessionId
            );
            tasksBySession = Array.isArray(tasksRes.data) ? tasksRes.data : [];
            hasPermissionInSession = tasksBySession.length > 0;
          } catch (error) {
            console.error(
              "Error fetching project tasks for permissions:",
              error
            );
            hasPermissionInSession = false;
          }
        }

        const groupsWithSessionsRaw = await Promise.all(
          groups.map(async (group: GroupDto) => {
            const groupSessions = sessions.filter(
              (s: DefenseSessionDto) => s.groupId === group.id
            );

            // Nếu có sessionId được chọn nhưng group này không thuộc session đó -> bỏ qua
            if (
              selectedSessionId &&
              !groupSessions.some((s) => s.id === selectedSessionId)
            ) {
              return null;
            }

            const latestSession =
              (selectedSessionId
                ? groupSessions.find((s) => s.id === selectedSessionId)
                : groupSessions[0]) || groupSessions[0];

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

            // Check if group has been graded & compute average score
            let isGraded = false;
            let averageScore: number | null = null;
            if (latestSession && students.length > 0) {
              // Check if all students have scores from this evaluator in this session
              const scoresPromises = students.map((student: StudentDto) =>
                scoresApi.getByStudentId(student.id).catch(() => ({ data: [] }))
              );

              const allStudentScores = await Promise.all(scoresPromises);

              // Check if this evaluator has graded all students in this session
              const hasGradedAllStudents = allStudentScores.every(
                (scoresRes) => {
                  const scores = scoresRes.data || [];
                  return scores.some(
                    (score: any) =>
                      score.sessionId === latestSession.id &&
                      score.evaluatorId === currentUserId
                  );
                }
              );

              isGraded = hasGradedAllStudents;

              // Compute group average score (average of each student's average)
              let totalAvg = 0;
              let studentCountWithScores = 0;

              allStudentScores.forEach((scoresRes) => {
                const scores = scoresRes.data || [];
                const evaluatorScores = scores.filter(
                  (score: any) =>
                    score.sessionId === latestSession.id &&
                    score.evaluatorId === currentUserId
                );

                if (evaluatorScores.length > 0) {
                  const sum = evaluatorScores.reduce(
                    (acc: number, s: any) => acc + (s.value || 0),
                    0
                  );
                  const avg = sum / evaluatorScores.length;
                  totalAvg += avg;
                  studentCountWithScores += 1;
                }
              });

              if (studentCountWithScores > 0) {
                averageScore = parseFloat(
                  (totalAvg / studentCountWithScores).toFixed(2)
                );
              }
            }

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
              status: isGraded
                ? ("Graded" as GroupStatus)
                : ("Not Graded" as GroupStatus),
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
              averageScore: averageScore ?? null,
              // Frontend permission flag: only allow grading when lecturer has tasks in this session
              canGrade: hasPermissionInSession ?? false,
            };
          })
        );

        const groupsWithSessions = groupsWithSessionsRaw.filter(
          (g): g is GroupWithSession => g !== null
        );

        if (groupsWithSessions.length === 0) {
          console.warn(
            "No groups matched selected session, falling back to default data"
          );
          setGroupsData(defaultGroupsData);
        } else {
          setGroupsData(groupsWithSessions);
        }
      } catch (error) {
        console.error("Error fetching groups:", error);
        setGroupsData(defaultGroupsData);
      } finally {
        setLoading(false);
      }
    };

    fetchGroups();
  }, [selectedSessionId]);

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
                averageScore={group.averageScore}
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

export default function GroupsToGradePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen bg-[#F3F6FB]">
          <main className="flex-1 p-4 sm:p-6 lg:p-8">
            <div className="text-center py-8 text-gray-500">Loading...</div>
          </main>
        </div>
      }
    >
      <GroupsToGradePageContent />
    </Suspense>
  );
}
