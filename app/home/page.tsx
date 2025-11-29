"use client";

import React, { useEffect, useState } from "react";
import Header from "./components/Header";
import SessionCard, { SessionStatus } from "./components/SessionCard";
import { defenseSessionsApi } from "@/lib/api/defense-sessions";
import { groupsApi } from "@/lib/api/groups";
import { studentsApi } from "@/lib/api/students";
import type { DefenseSessionDto, GroupDto, StudentDto } from "@/lib/models";

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

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        setLoading(true);
        const [sessionsRes, groupsRes] = await Promise.all([
          defenseSessionsApi
            .getAll()
            .catch(() => ({ code: 500, message: "Failed", data: [] })),
          groupsApi
            .getAll(false)
            .catch(() => ({ code: 500, message: "Failed", data: [] })),
        ]);

        // Extract data from API response structure
        const sessions = Array.isArray(sessionsRes.data) ? sessionsRes.data : [];
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

        const sessionsWithGroups: (SessionWithGroup | null)[] = await Promise.all(
          sessions.map(async (session: DefenseSessionDto) => {
            const group = groups.find((g: GroupDto) => g.id === session.groupId);
            
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
