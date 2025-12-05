"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Calendar, Clock, Users, ArrowLeft, CheckCircle2, Circle, AlertCircle } from "lucide-react";
import { defenseSessionsApi } from "@/lib/api/defense-sessions";
import { groupsApi } from "@/lib/api/groups";
import { studentsApi } from "@/lib/api/students";
import { scoresApi } from "@/lib/api/scores";
import { authUtils } from "@/lib/utils/auth";
import type { DefenseSessionDto, GroupDto, StudentDto } from "@/lib/models";

interface SessionCard extends DefenseSessionDto {
  sessionName: string;
  status: "Upcoming" | "Completed" | "In Progress";
}

interface GroupWithDetails extends GroupDto {
  members: string;
  gradingStatus: "Graded" | "Not Graded" | "Partial";
  gradedStudentsCount: number;
  totalStudentsCount: number;
}

function DefenseSessionsContent() {
  const router = useRouter();
  const [sessions, setSessions] = useState<SessionCard[]>([]);
  const [loading, setLoading] = useState(true);

  // Xóa session role khi vào trang danh sách (không phải detail)
  useEffect(() => {
    localStorage.removeItem("sessionRole");
  }, []);

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        setLoading(true);
        const sessionsRes = await defenseSessionsApi
          .getAll()
          .catch(() => ({ code: 500, message: "Failed", data: [] }));

        const sessions = Array.isArray(sessionsRes.data)
          ? sessionsRes.data
          : [];

        const sessionsWithStatus: SessionCard[] = sessions.map(
          (session: DefenseSessionDto) => {
            const sessionDate = new Date(session.defenseDate);
            const now = new Date();

            let status: "Upcoming" | "Completed" | "In Progress" = "Upcoming";

            if (sessionDate < now) {
              status = "Completed";
            } else if (sessionDate.toDateString() === now.toDateString()) {
              status = "In Progress";
            }

            return {
              ...session,
              sessionName: `Defense Session ${session.id}`,
              status,
            };
          }
        );

        setSessions(sessionsWithStatus);
      } catch (error) {
        console.error("Error fetching sessions:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSessions();
  }, []);

  const handleSessionClick = async (sessionId: number) => {
    try {
      // Lấy chi tiết session để đọc groupId
      const sessionRes = await defenseSessionsApi.getById(sessionId);
      const session = sessionRes.data;

      if (session && session.groupId) {
        // Điều hướng thẳng tới trang chấm điểm của group đó
        router.push(
          `/member/grading/grade/${session.groupId}?sessionId=${sessionId}`
        );
      } else {
        // Nếu không có groupId thì rơi về trang groups-to-grade để xử lý tay
        router.push(`/member/groups-to-grade?sessionId=${sessionId}`);
      }
    } catch (error) {
      console.error("Error getting session details:", error);
      router.push(`/member/groups-to-grade?sessionId=${sessionId}`);
    }
  };

  const getStatusColor = (status: SessionCard["status"]) => {
    switch (status) {
      case "Completed":
        return "bg-green-50 text-green-700 border-green-200";
      case "In Progress":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "Upcoming":
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
          Select a defense session to view groups
        </p>
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
              className="bg-white rounded-xl shadow-sm border hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className="p-6">
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

                {/* Session Details */}
                <div className="space-y-2 text-sm text-gray-600">
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
                        {session.startTime}
                        {session.endTime && ` - ${session.endTime}`}
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

                {/* Action Button */}
                <div className="mt-4 pt-4 border-t">
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
    <Suspense fallback={
      <div className="space-y-6">
        <div className="bg-white rounded-xl shadow px-6 py-4">
          <h1 className="text-2xl font-bold text-gray-800">Defense Sessions</h1>
        </div>
        <div className="text-center py-8 text-gray-500">
          Loading...
        </div>
      </div>
    }>
      <DefenseSessionsContent />
    </Suspense>
  );
}
