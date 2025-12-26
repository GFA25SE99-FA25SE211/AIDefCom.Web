"use client";

import React, { useEffect, useState, useMemo } from "react";
import { Search } from "lucide-react";
import SessionCard, { SessionStatus } from "@/app/home/components/SessionCard";
import { defenseSessionsApi } from "@/lib/api/defense-sessions";
import { groupsApi } from "@/lib/api/groups";
import { studentsApi } from "@/lib/api/students";
import { useVoiceEnrollmentCheck } from "@/lib/hooks/useVoiceEnrollmentCheck";
import type { DefenseSessionDto, GroupDto, StudentDto } from "@/lib/models";

interface GroupSessionData extends DefenseSessionDto {
  groupName: string;
  projectTitle: string;
  members: string;
  displayStatus: SessionStatus;
}

const PAGE_SIZE = 6;

const getGroupDisplayName = (group: GroupDto) =>
  group.projectCode ||
  group.groupName ||
  `Group ${group.id?.slice(0, 8) || ""}`;

const getProjectTitle = (group: GroupDto) =>
  group.topicTitle_EN ||
  group.topicTitle_VN ||
  group.projectTitle ||
  "No project title";

export default function StudentHistoryListPage() {
  // Voice enrollment check - must be enrolled to access this page
  const { isChecking: checkingVoice } = useVoiceEnrollmentCheck();

  const [sessions, setSessions] = useState<GroupSessionData[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    if (checkingVoice) return;

    const fetchGroups = async () => {
      try {
        setLoading(true);
        
        // Get current user's lecturer ID
        let lecturerId: string | null = null;
        try {
          const { authUtils } = await import("@/lib/utils/auth");
          lecturerId = authUtils.getCurrentUserId();
        } catch (err) {
          console.error("Error getting userId from token:", err);
        }
        
        if (!lecturerId) {
          setLoading(false);
          return;
        }

        // Fetch defense sessions for this lecturer
        const sessionsRes = await defenseSessionsApi.getByLecturerId(lecturerId).catch(() => ({ data: [] }));
        const rawSessions = sessionsRes.data || [];

        // Group sessions by groupId and keep only the latest session for each group
        const groupMap = new Map<string, DefenseSessionDto>();
        rawSessions.forEach((session: DefenseSessionDto) => {
          const existing = groupMap.get(session.groupId);
          if (!existing || new Date(session.defenseDate) > new Date(existing.defenseDate)) {
            groupMap.set(session.groupId, session);
          }
        });

        // Fetch groups and students for each unique group
        const uniqueSessions = Array.from(groupMap.values());
        const enrichedSessions: (GroupSessionData | null)[] = await Promise.all(uniqueSessions.map(async (session: DefenseSessionDto) => {
          try {
            // Check if current user is a member in this session
            let isUserMember = false;
            try {
              const lecturersRes = await defenseSessionsApi.getUsersBySessionId(
                session.id
              );
              if (lecturersRes.data && lecturerId) {
                const currentUserInSession = lecturersRes.data.find(
                  (user: any) =>
                    String(user.id).toLowerCase() ===
                    String(lecturerId).toLowerCase()
                );

                if (currentUserInSession && currentUserInSession.role) {
                  const roleInSession = currentUserInSession.role.toLowerCase();
                  isUserMember = roleInSession === "member";
                }
              }
            } catch (err) {
              console.error("Failed to check session role:", err);
            }

            const [groupRes, studentsRes] = await Promise.all([
              groupsApi.getById(session.groupId),
              studentsApi.getByGroupId(session.groupId).catch(() => ({ data: [] }))
            ]);

            if (!groupRes.data) return null;

            const group = groupRes.data;
            const students = studentsRes.data || [];
            
            const members = students.length > 0
              ? students.map((s: StudentDto) => s.fullName || s.userName || "Unknown").join(", ")
              : "No members assigned";

            // Map status
            let displayStatus: SessionStatus = "Upcoming";
            const apiStatus = session.status?.toLowerCase();
            if (apiStatus === "completed") displayStatus = "Completed";
            else if (apiStatus === "inprogress") displayStatus = "InProgress";
            else if (apiStatus === "scheduled") displayStatus = "Scheduled";

            // Only include if user is member AND status is completed
            if (!isUserMember || displayStatus !== "Completed") {
              return null;
            }

            return {
              ...session,
              groupName: group.id, // Use actual group ID like FA25SE086
              projectTitle: getProjectTitle(group),
              members,
              displayStatus
            };
          } catch (err) {
            console.error(`Error enriching session ${session.id}:`, err);
            return null;
          }
        }));

        setSessions(enrichedSessions.filter((s): s is GroupSessionData => s !== null));
      } catch (error) {
        console.error("Error fetching groups:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchGroups();
  }, [checkingVoice]);

  const filteredSessions = sessions.filter((session) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      session.groupId?.toLowerCase().includes(searchLower) ||
      session.groupName?.toLowerCase().includes(searchLower) ||
      session.projectTitle?.toLowerCase().includes(searchLower)
    );
  });

  // Pagination calculations
  const totalCount = filteredSessions.length;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const paginatedSessions = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    return filteredSessions.slice(startIndex, startIndex + PAGE_SIZE);
  }, [filteredSessions, currentPage]);

  // Reset to page 1 when search term changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  return (
    <div className="space-y-6">
      {/* Custom Header for Student History */}
      <header className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-800">Student History</h1>
          {totalCount !== undefined && (
            <p className="text-gray-500 text-sm">
              Total{" "}
              <span className="font-medium text-indigo-600">
                {totalCount}
              </span>{" "}
              defense sessions
            </p>
          )}
        </div>
      </header>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-6">
        <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-4 py-2.5 focus-within:ring-2 focus-within:ring-purple-500 transition-all">
          <Search className="w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by group ID, project code, or topic..."
            className="flex-1 outline-none text-sm text-gray-700 placeholder-gray-400"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
          Loading student history sessions...
        </div>
      ) : sessions.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-gray-200">
          <p className="text-gray-500">No defense history sessions found.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {paginatedSessions.map((session) => (
              <SessionCard
                key={session.id}
                sessionId={session.id}
                groupId={session.groupId}
                groupName={session.groupName}
                projectTitle={session.projectTitle}
                members={session.members}
                location={session.location}
                defenseDate={session.defenseDate}
                startTime={session.startTime}
                endTime={session.endTime}
                status={session.displayStatus}
                customHref={`/member/student-history/group/${session.groupId}`}
              />
            ))}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  currentPage === 1
                    ? "bg-gray-50 text-gray-400 cursor-not-allowed"
                    : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-200 shadow-sm"
                }`}
              >
                ← Previous
              </button>

              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`w-10 h-10 rounded-lg text-sm font-medium transition-all ${
                      currentPage === page
                        ? "bg-purple-600 text-white shadow-md"
                        : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-200"
                    }`}
                  >
                    {page}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  currentPage === totalPages
                    ? "bg-gray-50 text-gray-400 cursor-not-allowed"
                    : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-200 shadow-sm"
                }`}
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}

      {/* Footer */}
      <footer className="text-center text-sm text-gray-500 mt-12 pb-6">
        © 2025 AIDefCom — Smart Graduation Defense
      </footer>
    </div>
  );
}
