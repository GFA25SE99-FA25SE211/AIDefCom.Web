"use client";

import React, { useEffect, useState } from "react";
import Header from "./components/Header";
import SessionCard, { SessionStatus } from "./components/SessionCard";
import { defenseSessionsApi } from "@/lib/api/defense-sessions";
import { groupsApi } from "@/lib/api/groups";
import { studentsApi } from "@/lib/api/students";
import { useVoiceEnrollmentCheck } from "@/lib/hooks/useVoiceEnrollmentCheck";
import type { DefenseSessionDto, GroupDto, StudentDto } from "@/lib/models";
import { swalConfig } from "@/lib/utils/sweetAlert";

interface SessionWithGroup extends DefenseSessionDto {
  groupName: string;
  projectTitle: string;
  members: string;
  displayStatus: SessionStatus;
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

export default function HomePage() {
  const { isChecking: checkingVoice } = useVoiceEnrollmentCheck();
  const [sessionsData, setSessionsData] = useState<SessionWithGroup[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter state
  const [filterDate, setFilterDate] = useState<string>("");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 6;

  // Xóa session role khi vào trang danh sách (không phải detail)
  useEffect(() => {
    sessionStorage.removeItem("sessionRole");
  }, []);

  useEffect(() => {
    // Only fetch sessions after voice check passes
    if (checkingVoice) return;

    const fetchSessions = async () => {
      try {
        setLoading(true);

        // Get current user's lecturerId from accessToken
        let lecturerId: string | null = null;
        try {
          // Lấy userId từ accessToken thông qua authUtils
          const { authUtils } = await import("@/lib/utils/auth");
          lecturerId = authUtils.getCurrentUserId();
        } catch (err) {
          console.error("Error getting userId from token:", err);
        }

        // Fetch sessions by lecturerId if available, otherwise fetch all
        const sessionsPromise = lecturerId
          ? defenseSessionsApi
              .getByLecturerId(lecturerId)
              .catch(async (error) => {
                console.error("Error fetching sessions by lecturerId:", error);
                // Check if it's a network error
                if (
                  error instanceof TypeError &&
                  error.message === "Failed to fetch"
                ) {
                  console.error(
                    "Network error: Backend server may not be running or CORS is not configured"
                  );
                  await swalConfig.error(
                    "Connection Error",
                    "Unable to connect to server. Please check:\n- Is the backend server running?\n- Is CORS configured correctly?\n- Is your network connection stable?"
                  );
                } else {
                  await swalConfig.error(
                    "Data Loading Error",
                    "Unable to load defense sessions list. Please try again later."
                  );
                }
                return {
                  code: 500,
                  message: "Failed to fetch sessions",
                  data: [],
                };
              })
          : defenseSessionsApi.getAll().catch(async (error) => {
              console.error("Error fetching all sessions:", error);
              // Check if it's a network error
              if (
                error instanceof TypeError &&
                error.message === "Failed to fetch"
              ) {
                console.error(
                  "Network error: Backend server may not be running or CORS is not configured"
                );
                await swalConfig.error(
                  "Connection Error",
                  "Unable to connect to server. Please check:\n- Is the backend server running?\n- Is CORS configured correctly?\n- Is your network connection stable?"
                );
              } else {
                await swalConfig.error(
                  "Data Loading Error",
                  "Unable to load defense sessions list. Please try again later."
                );
              }
              return {
                code: 500,
                message: "Failed to fetch sessions",
                data: [],
              };
            });

        const [sessionsRes, groupsRes] = await Promise.all([
          sessionsPromise,
          groupsApi.getAll(false).catch(async (error) => {
            console.error("Error fetching groups:", error);
            // Check if it's a network error
            if (
              error instanceof TypeError &&
              error.message === "Failed to fetch"
            ) {
              console.error(
                "Network error: Backend server may not be running or CORS is not configured"
              );
              await swalConfig.error(
                "Connection Error",
                "Unable to connect to server. Please check:\n- Is the backend server running?\n- Is CORS configured correctly?\n- Is your network connection stable?"
              );
            } else {
              await swalConfig.error(
                "Data Loading Error",
                "Unable to load groups list. Please try again later."
              );
            }
            return { code: 500, message: "Failed to fetch groups", data: [] };
          }),
        ]);

        // Extract data from API response structure
        const sessions = Array.isArray(sessionsRes.data)
          ? sessionsRes.data
          : [];
        const groups = Array.isArray(groupsRes.data) ? groupsRes.data : [];

        if (sessions.length === 0) {
          setSessionsData([]);
          setLoading(false);
          return;
        }

        const sessionsWithGroups: (SessionWithGroup | null)[] =
          await Promise.all(
            sessions.map(async (session: DefenseSessionDto) => {
              const group = groups.find(
                (g: GroupDto) => g.id === session.groupId
              );

              if (!group) {
                return null;
              }

              // Get students for this group
              const studentsRes = await studentsApi
                .getByGroupId(session.groupId)
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

              const displayName = getGroupDisplayName(group);
              const projectTitle = getProjectTitle(group);

              // Sử dụng status từ API - giữ nguyên status từ backend
              let displayStatus: SessionStatus = "Scheduled";
              const apiStatus = session.status?.toLowerCase();
              if (apiStatus === "completed") {
                displayStatus = "Completed";
              } else if (apiStatus === "inprogress") {
                displayStatus = "InProgress";
              } else if (apiStatus === "scheduled") {
                // Giữ nguyên status "Scheduled" từ backend
                displayStatus = "Scheduled";
              } else {
                // Fallback: nếu không có status hoặc status không hợp lệ, dùng logic cũ
                const sessionDate = new Date(session.defenseDate);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                displayStatus = sessionDate >= today ? "Upcoming" : "Scheduled";
              }

              return {
                ...session,
                groupName: displayName,
                projectTitle,
                members,
                displayStatus,
              };
            })
          );

        // Filter out null values
        const validSessions = sessionsWithGroups.filter(
          (s): s is SessionWithGroup => s !== null
        );

        // Sort by date (upcoming first, then completed)
        validSessions.sort((a, b) => {
          const dateA = new Date(a.defenseDate).getTime();
          const dateB = new Date(b.defenseDate).getTime();
          return dateA - dateB;
        });

        setSessionsData(validSessions);
      } catch (error) {
        console.error("Error fetching sessions:", error);
        // Show error notification if it's a network error
        if (error instanceof TypeError && error.message === "Failed to fetch") {
          await swalConfig.error(
            "Connection Error",
            "Unable to connect to server. Please check:\n- Is the backend server running?\n- Is CORS configured correctly?\n- Is your network connection stable?"
          );
        } else if (error instanceof Error) {
          await swalConfig.error(
            "Error",
            error.message ||
              "An error occurred while loading data. Please try again later."
          );
        }
        setSessionsData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchSessions();
  }, [checkingVoice]);

  // Filter sessions by date
  const filteredSessions = React.useMemo(() => {
    if (!filterDate) return sessionsData;
    
    const filterDateObj = new Date(filterDate);
    filterDateObj.setHours(0, 0, 0, 0);
    
    return sessionsData.filter((session) => {
      const sessionDate = new Date(session.defenseDate);
      sessionDate.setHours(0, 0, 0, 0);
      return sessionDate.getTime() === filterDateObj.getTime();
    });
  }, [sessionsData, filterDate]);

  const totalCount = filteredSessions.length;

  // Pagination calculations
  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedSessions = filteredSessions.slice(startIndex, endIndex);

  // Reset to page 1 when data changes or filter changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [totalCount, filterDate]);

  return (
    <div className="space-y-6">
      <Header totalCount={totalCount} />

      {/* Date Filter */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-4">
          <label htmlFor="date-filter" className="text-sm font-medium text-gray-700 whitespace-nowrap">
            Filter by Date:
          </label>
          <input
            id="date-filter"
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
          />
          {filterDate && (
            <button
              onClick={() => setFilterDate("")}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Clear Filter
            </button>
          )}
        </div>
      </div>

      {/* Danh sách sessions */}
      {checkingVoice ? (
        <div className="text-center py-8 text-gray-500">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
          Checking voice enrollment status...
        </div>
      ) : loading ? (
        <div className="text-center py-8 text-gray-500">
          Loading defense sessions...
        </div>
      ) : sessionsData.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No defense sessions found.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
            {paginatedSessions.map((session) => (
              <SessionCard
                key={session.id}
                sessionId={session.id}
                groupId={session.groupId}
                groupName={session.groupName}
                projectTitle={session.projectTitle}
                location={session.location}
                defenseDate={session.defenseDate}
                startTime={session.startTime}
                endTime={session.endTime}
                status={session.displayStatus}
                members={session.members}
              />
            ))}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              {/* Previous Button */}
              <button
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  currentPage === 1
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-300 shadow-sm"
                }`}
              >
                ← Previous
              </button>

              {/* Page Numbers */}
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                  (page) => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${
                        currentPage === page
                          ? "bg-purple-600 text-white shadow-md"
                          : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-300"
                      }`}
                    >
                      {page}
                    </button>
                  )
                )}
              </div>

              {/* Next Button */}
              <button
                onClick={() =>
                  setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                }
                disabled={currentPage === totalPages}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  currentPage === totalPages
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-300 shadow-sm"
                }`}
              >
                Next →
              </button>
            </div>
          )}

          {/* Page Info */}
          {totalPages > 1 && (
            <div className="text-center text-sm text-gray-500">
              Showing {startIndex + 1}-{Math.min(endIndex, totalCount)} of{" "}
              {totalCount} sessions
            </div>
          )}
        </>
      )}

      {/* Footer */}
      <footer className="text-center text-sm text-gray-500 mt-8">
        © 2025 AIDefCom — Smart Graduation Defense
      </footer>
    </div>
  );
}
