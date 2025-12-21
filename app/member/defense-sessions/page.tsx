"use client";

import React, { useEffect, useState, Suspense, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Calendar, Clock, Users, CheckCircle } from "lucide-react";
import { defenseSessionsApi } from "@/lib/api/defense-sessions";
import { groupsApi } from "@/lib/api/groups";
import { useVoiceEnrollmentCheck } from "@/lib/hooks/useVoiceEnrollmentCheck";
import type { DefenseSessionDto, GroupDto } from "@/lib/models";

interface SessionCard extends DefenseSessionDto {
  sessionName: string;
  status: "Scheduled" | "Completed" | "InProgress";
  groupName?: string;
  projectCode?: string;
  projectTitle?: string;
}

function DefenseSessionsContent() {
  const router = useRouter();
  const { isChecking: checkingVoice } = useVoiceEnrollmentCheck();
  const [sessions, setSessions] = useState<SessionCard[]>([]);
  const [loading, setLoading] = useState(true);

  // Xóa session role khi vào trang danh sách (không phải detail)
  useEffect(() => {
    sessionStorage.removeItem("sessionRole");
  }, []);

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        setLoading(true);

        // Get current user's lecturerId from accessToken
        let lecturerId: string | null = null;
        try {
          const { authUtils } = await import("@/lib/utils/auth");
          lecturerId = authUtils.getCurrentUserId();
        } catch (err) {
          // Error getting userId from token
        }

        // Fetch sessions by lecturerId if available, otherwise fetch all
        const sessionsRes = lecturerId
          ? await defenseSessionsApi
              .getByLecturerId(lecturerId)
              .catch(() => ({ code: 500, message: "Failed", data: [] }))
          : await defenseSessionsApi
              .getAll()
              .catch(() => ({ code: 500, message: "Failed", data: [] }));

        const sessions = Array.isArray(sessionsRes.data)
          ? sessionsRes.data
          : [];

        // Fetch groups for all sessions
        const groupsRes = await groupsApi
          .getAll(false)
          .catch(() => ({ code: 500, message: "Failed", data: [] }));
        const groups = Array.isArray(groupsRes.data) ? groupsRes.data : [];

        const sessionsWithStatus: SessionCard[] = await Promise.all(
          sessions.map(async (session: DefenseSessionDto) => {
            // Sử dụng status trực tiếp từ API - chỉ 3 trạng thái: Scheduled, InProgress, Completed
            let displayStatus: "Scheduled" | "Completed" | "InProgress" =
              "Scheduled";

            // Map API status to display status (case-insensitive)
            const apiStatus = session.status?.trim().toLowerCase() || "";
            
            if (apiStatus === "completed") {
                displayStatus = "Completed";
            } else if (apiStatus === "inprogress" || apiStatus === "in progress") {
              displayStatus = "InProgress";
            } else {
              // Default: Scheduled (bao gồm "scheduled", "postponed", "cancelled" hoặc bất kỳ status nào khác)
              displayStatus = "Scheduled";
            }

            // Find group for this session
            let groupName: string | undefined;
            let projectCode: string | undefined;
            let projectTitle: string | undefined;

            if (session.groupId) {
              const group = groups.find(
                (g: GroupDto) => g.id === session.groupId
              );
              if (group) {
                groupName = getGroupDisplayName(group);
                projectCode = group.projectCode;
                projectTitle = getProjectTitle(group);
              }
            }

            return {
              ...session,
              sessionName: `Defense Session ${session.id}`,
              status: displayStatus,
              groupName,
              projectCode,
              projectTitle,
            };
          })
        );

        setSessions(sessionsWithStatus);
      } catch (error) {
        // Error fetching sessions
      } finally {
        setLoading(false);
      }
    };

    fetchSessions();
  }, []);

  // Tính toán status counts từ API data (không hardcode)
  const statusCounts = useMemo(() => {
    const counts = {
      scheduled: 0,
      inProgress: 0,
      completed: 0,
    };

    sessions.forEach((session) => {
      // Sử dụng status từ API
      const apiStatus = session.status?.trim().toLowerCase() || "";
      
      if (apiStatus === "scheduled") {
        counts.scheduled++;
      } else if (apiStatus === "inprogress" || apiStatus === "in progress") {
        counts.inProgress++;
      } else if (apiStatus === "completed") {
        counts.completed++;
      }
    });

    return counts;
  }, [sessions]);

  const handleSessionClick = async (sessionId: number) => {
    try {
      // Lấy chi tiết session để đọc groupId
      const sessionRes = await defenseSessionsApi.getById(sessionId);
      const session = sessionRes.data;

      if (!session || !session.groupId) {
        // Nếu không có groupId thì rơi về trang groups-to-grade để xử lý tay
        router.push(`/member/groups-to-grade?sessionId=${sessionId}`);
        return;
      }

      // Get current userId from accessToken
      const { authUtils } = await import("@/lib/utils/auth");
      const currentUserId = authUtils.getCurrentUserId();
      if (!currentUserId) {
        router.push(`/member/groups-to-grade?sessionId=${sessionId}`);
        return;
      }

      // Check role in session (exactly like home page SessionCard)
      try {
        const lecturersRes = await defenseSessionsApi.getUsersBySessionId(
          sessionId
        );
        if (lecturersRes.data) {
          const currentUserInSession = lecturersRes.data.find(
            (user: any) =>
              String(user.id).toLowerCase() ===
              String(currentUserId).toLowerCase()
          );

          if (currentUserInSession && currentUserInSession.role) {
            const roleInSession = currentUserInSession.role.toLowerCase();

            // Redirect based on user's role in this session (same logic as home)
            if (roleInSession === "chair") {
              // Chair in session -> chair detail page
              router.push(`/chair/groups/${session.groupId}`);
              return;
            } else if (roleInSession === "member") {
              // Member in session -> grading view page
              router.push(
                `/member/grading/view/${session.groupId}?sessionId=${sessionId}`
              );
              return;
            } else if (roleInSession === "secretary") {
              // Secretary in session -> transcript page
              router.push(`/secretary/transcript/${sessionId}`);
              return;
            }
          }
        }
      } catch (err) {
        // Failed to check session role
      }

      // Fallback: If not in session or role check failed -> home view
      router.push(`/home/view/${session.groupId}`);
    } catch (error) {
      router.push(`/member/groups-to-grade?sessionId=${sessionId}`);
    }
  };

  const getStatusColor = (status: SessionCard["status"]) => {
    switch (status) {
      case "Completed":
        return "bg-green-50 text-green-700 border-green-200";
      case "InProgress":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "Scheduled":
        return "bg-yellow-50 text-yellow-700 border-yellow-200";
      default:
        return "bg-gray-50 text-gray-700 border-gray-200";
    }
  };

  const getGroupDisplayName = (group: GroupDto) =>
    group.projectCode ||
    group.groupName ||
    `Group ${group.id?.slice(0, 8) || ""}`;

  const getProjectTitle = (group: GroupDto) =>
    group.topicTitle_EN ||
    group.topicTitle_VN ||
    group.projectTitle ||
    "No project title";

  // Default view: Show all sessions
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow px-6 py-4">
        <h1 className="text-2xl font-bold text-gray-800">Defense Sessions</h1>
        <p className="text-gray-600 mt-1">
          Select a defense session - you will be redirected based on your role
          in that session
        </p>
      </div>

      {/* Status Count Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Scheduled Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-yellow-100 flex items-center justify-center flex-shrink-0">
            <Clock className="w-6 h-6 text-yellow-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-2xl font-bold text-gray-800">
              {statusCounts.scheduled}
            </p>
            <p className="text-sm text-gray-500">Scheduled</p>
          </div>
        </div>

        {/* In Progress Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
            <Clock className="w-6 h-6 text-blue-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-2xl font-bold text-gray-800">
              {statusCounts.inProgress}
            </p>
            <p className="text-sm text-gray-500">In Progress</p>
          </div>
        </div>

        {/* Completed Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
            <CheckCircle className="w-6 h-6 text-green-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-2xl font-bold text-gray-800">
              {statusCounts.completed}
            </p>
            <p className="text-sm text-gray-500">Completed</p>
          </div>
        </div>
      </div>

      {/* Sessions List */}
      {loading ? (
        <div className="text-center py-8 text-gray-500">
          Loading defense sessions...
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
          {sessions.map((session) => (
            <div
              key={session.id}
              onClick={() => handleSessionClick(session.id)}
              className="bg-white rounded-xl shadow-sm border hover:shadow-md transition-shadow cursor-pointer flex flex-col"
            >
              <div className="p-6 flex flex-col flex-grow">
                {/* Status Badge */}
                <div className="flex justify-between items-start mb-4">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                      session.status
                    )}`}
                  >
                    {session.status}
                  </span>
                </div>

                {/* Session Title */}
                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                  {session.sessionName || `Defense Session ${session.id}`}
                </h3>

                {/* Project Code / Group Code */}
                {session.projectCode && (
                  <div className="mb-2">
                    <p className="text-sm font-medium text-gray-600">
                      {session.projectCode}
                    </p>
                  </div>
                )}

                {/* Project Title - Fixed height to ensure alignment */}
                <div className="mb-4 min-h-[4.5rem] flex-grow">
                  {session.projectTitle ? (
                    <p className="text-sm text-gray-700 line-clamp-3 leading-relaxed">
                      {session.projectTitle}
                    </p>
                  ) : (
                    <p className="text-sm text-gray-400 italic">
                      No project title
                    </p>
                  )}
                </div>

                {/* Session Details */}
                <div className="space-y-2 text-sm text-gray-600 mb-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span>
                      {new Date(session.defenseDate).toLocaleDateString(
                        "en-GB"
                      )}
                    </span>
                  </div>

                  {session.startTime && (
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      <span>
                        {session.startTime.substring(0, 5)}
                        {session.endTime &&
                          ` - ${session.endTime.substring(0, 5)}`}
                      </span>
                    </div>
                  )}

                  {session.location && (
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      <span>{session.location}</span>
                    </div>
                  )}
                </div>

                {/* Action Button - Always at bottom */}
                <div className="mt-auto pt-4 border-t">
                  <button className="w-full bg-gradient-to-r from-purple-600 to-blue-500 text-white py-2 px-4 rounded-lg text-sm font-medium hover:opacity-90 transition">
                    View Groups
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {sessions.length === 0 && !loading && (
        <div className="text-center py-12 text-gray-500">
          <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <p>No defense sessions found</p>
        </div>
      )}

      {/* Footer */}
      <footer className="text-center text-sm text-gray-500 mt-8">
        © 2025 AIDefCom — Smart Graduation Defense
      </footer>
    </div>
  );
}

export default function DefenseSessionsPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow px-6 py-4">
            <h1 className="text-2xl font-bold text-gray-800">
              Defense Sessions
            </h1>
          </div>
          <div className="text-center py-8 text-gray-500">Loading...</div>
        </div>
      }
    >
      <DefenseSessionsContent />
    </Suspense>
  );
}
