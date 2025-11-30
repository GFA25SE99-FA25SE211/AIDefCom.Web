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
  const searchParams = useSearchParams();
  const sessionIdParam = searchParams?.get("sessionId");
  const [sessions, setSessions] = useState<SessionCard[]>([]);
  const [selectedSession, setSelectedSession] = useState<DefenseSessionDto | null>(null);
  const [groups, setGroups] = useState<GroupWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingGroups, setLoadingGroups] = useState(false);

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

        // If sessionId in URL, load that session's groups
        if (sessionIdParam) {
          const session = sessions.find((s) => s.id === parseInt(sessionIdParam));
          if (session) {
            setSelectedSession(session);
            fetchGroupsBySession(session.id);
          }
        }
      } catch (error) {
        console.error("Error fetching sessions:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSessions();
  }, [sessionIdParam]);

  const fetchGroupsBySession = async (sessionId: number) => {
    try {
      setLoadingGroups(true);
      // Get session details
      const sessionRes = await defenseSessionsApi.getById(sessionId);
      const session = sessionRes.data;
      
      if (!session || !session.groupId) {
        setGroups([]);
        return;
      }

      // Get group by ID
      const groupRes = await groupsApi.getById(session.groupId);
      const group = groupRes.data;

      if (!group) {
        setGroups([]);
        return;
      }

      // Get students for this group
      const studentsRes = await studentsApi.getByGroupId(group.id);
      const students = Array.isArray(studentsRes.data) ? studentsRes.data : [];
      const members = students.length > 0
        ? students
            .map((s: StudentDto) => s.fullName || s.userName || "Unknown")
            .join(", ")
        : "No members assigned";

      // Check grading status
      let gradingStatus: "Graded" | "Not Graded" | "Partial" = "Not Graded";
      let gradedStudentsCount = 0;
      const totalStudentsCount = students.length;

      if (students.length > 0 && session) {
        // Get current user ID
        const userInfo = authUtils.getCurrentUserInfo();
        let currentUserId = userInfo.userId;

        // Fallback for testing
        if (!currentUserId) {
          currentUserId = "0EB5D9FB-4389-45B7-A7AE-23AFBAF461CE";
        }

        // Check scores for each student
        const scoresPromises = students.map((student: StudentDto) =>
          scoresApi.getByStudentId(student.id).catch(() => ({ data: [] }))
        );

        const allStudentScores = await Promise.all(scoresPromises);

        // Count how many students have been graded
        gradedStudentsCount = allStudentScores.filter((scoresRes) => {
          const scores = scoresRes.data || [];
          return scores.some(
            (score: any) =>
              score.sessionId === session.id &&
              score.evaluatorId === currentUserId
          );
        }).length;

        // Determine status
        if (gradedStudentsCount === 0) {
          gradingStatus = "Not Graded";
        } else if (gradedStudentsCount === totalStudentsCount) {
          gradingStatus = "Graded";
        } else {
          gradingStatus = "Partial";
        }
      }

      setGroups([{
        ...group,
        members,
        gradingStatus,
        gradedStudentsCount,
        totalStudentsCount,
      }]);
    } catch (error) {
      console.error("Error fetching groups by session:", error);
      setGroups([]);
    } finally {
      setLoadingGroups(false);
    }
  };

  const handleSessionClick = (sessionId: number) => {
    const session = sessions.find((s) => s.id === sessionId);
    if (session) {
      setSelectedSession(session);
      fetchGroupsBySession(sessionId);
      router.push(`/member/defense-sessions?sessionId=${sessionId}`);
    }
  };

  const handleBackToSessions = () => {
    setSelectedSession(null);
    setGroups([]);
    router.push("/member/defense-sessions");
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

  const getGradingStatusBadge = (group: GroupWithDetails) => {
    switch (group.gradingStatus) {
      case "Graded":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-200">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Graded ({group.gradedStudentsCount}/{group.totalStudentsCount})
          </span>
        );
      case "Partial":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700 border border-yellow-200">
            <AlertCircle className="w-3.5 h-3.5" />
            Partial ({group.gradedStudentsCount}/{group.totalStudentsCount})
          </span>
        );
      case "Not Graded":
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
            <Circle className="w-3.5 h-3.5" />
            Not Graded
          </span>
        );
    }
  };

  // If a session is selected, show groups
  if (selectedSession) {
    return (
      <div className="space-y-6">
        {/* Header with Back Button */}
        <div className="bg-white rounded-xl shadow px-6 py-4">
          <button
            onClick={handleBackToSessions}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Sessions</span>
          </button>
          <h1 className="text-2xl font-bold text-gray-800">
            Groups in Session {selectedSession.id}
          </h1>
          <p className="text-gray-600 mt-1">
            {new Date(selectedSession.defenseDate).toLocaleDateString("en-GB")} • {selectedSession.location || "TBD"}
          </p>
        </div>

        {/* Groups List */}
        {loadingGroups ? (
          <div className="text-center py-8 text-gray-500">
            Loading groups...
          </div>
        ) : groups.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
            {groups.map((group) => (
              <div
                key={group.id}
                onClick={() => router.push(`/member/grading/grade/${group.id}?sessionId=${selectedSession.id}`)}
                className="bg-white rounded-xl shadow-sm border hover:shadow-md transition-shadow cursor-pointer"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-lg font-semibold text-gray-800 flex-1">
                      {getGroupDisplayName(group)}
                    </h3>
                    {getGradingStatusBadge(group)}
                  </div>
                  <p className="text-sm text-gray-600 mb-4">
                    {getProjectTitle(group)}
                  </p>
                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                    <Users className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">{group.members}</span>
                  </div>
                  {group.gradingStatus !== "Not Graded" && (
                    <div className="mb-3 text-xs text-gray-500">
                      {group.gradingStatus === "Graded" 
                        ? "✓ All students have been graded"
                        : `⚠ ${group.totalStudentsCount - group.gradedStudentsCount} student(s) remaining`}
                    </div>
                  )}
                  <div className="mt-4 pt-4 border-t">
                    <button className="w-full bg-gradient-to-r from-purple-600 to-blue-500 text-white py-2 px-4 rounded-lg text-sm font-medium hover:opacity-90 transition">
                      {group.gradingStatus === "Graded" ? "View/Edit Grades" : "Grade Now"}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p>No groups found for this session</p>
          </div>
        )}

        {/* Footer */}
        <footer className="text-center text-sm text-gray-500 mt-8">
          © 2025 AIDefCom — Smart Graduation Defense
        </footer>
      </div>
    );
  }

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
