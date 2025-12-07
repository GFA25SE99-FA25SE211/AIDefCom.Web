"use client";

import React, { useEffect, useState } from "react";
import Header from "./components/Header";
import SessionCard, { SessionStatus } from "./components/SessionCard";
import { defenseSessionsApi } from "@/lib/api/defense-sessions";
import { groupsApi } from "@/lib/api/groups";
import { studentsApi } from "@/lib/api/students";
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
  const [sessionsData, setSessionsData] = useState<SessionWithGroup[]>([]);
  const [loading, setLoading] = useState(true);

  // Xóa session role khi vào trang danh sách (không phải detail)
  useEffect(() => {
    localStorage.removeItem("sessionRole");
  }, []);

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        setLoading(true);

        // Get current user's lecturerId from localStorage
        let lecturerId: string | null = null;
        try {
          const storedUser = localStorage.getItem("user");
          if (storedUser) {
            const parsedUser = JSON.parse(storedUser);
            lecturerId = parsedUser.id || null;
          }
        } catch (err) {
          console.error("Error parsing user from localStorage:", err);
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

        console.log("Sessions API Response:", {
          code: sessionsRes.code,
          message: sessionsRes.message,
          dataLength: sessions.length,
          sampleSession: sessions[0],
        });

        if (sessions.length === 0) {
          console.warn("No sessions found in API response");
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

              const sessionDate = new Date(session.defenseDate);
              const isCompleted = sessionDate < new Date();
              const isUpcoming = sessionDate >= new Date();

              const displayName = getGroupDisplayName(group);
              const projectTitle = getProjectTitle(group);

              let displayStatus: SessionStatus = "Scheduled";
              if (isCompleted) {
                displayStatus = "Completed";
              } else if (isUpcoming) {
                displayStatus = "Upcoming";
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
  }, []);

  const totalCount = sessionsData.length;

  return (
    <div className="space-y-6">
      <Header totalCount={totalCount} />

      {/* Danh sách sessions */}
      {loading ? (
        <div className="text-center py-8 text-gray-500">
          Loading defense sessions...
        </div>
      ) : sessionsData.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No defense sessions found.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
          {sessionsData.map((session) => (
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
      )}

      {/* Footer */}
      <footer className="text-center text-sm text-gray-500 mt-8">
        © 2025 AIDefCom — Smart Graduation Defense
      </footer>
    </div>
  );
}
