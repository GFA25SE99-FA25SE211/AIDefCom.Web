"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { Search, Users, FolderOpen } from "lucide-react";
import { defenseSessionsApi } from "@/lib/api/defense-sessions";
import { groupsApi } from "@/lib/api/groups";
import { useVoiceEnrollmentCheck } from "@/lib/hooks/useVoiceEnrollmentCheck";
import type { DefenseSessionDto, GroupDto } from "@/lib/models";

interface GroupWithSession extends GroupDto {
  sessionDate?: string;
  sessionStatus?: string;
}

const PAGE_SIZE = 10;

export default function StudentHistoryListPage() {
  // Voice enrollment check - must be enrolled to access this page
  const { isChecking: checkingVoice } = useVoiceEnrollmentCheck();

  const [groups, setGroups] = useState<GroupWithSession[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const fetchGroups = async () => {
      try {
        setLoading(true);
        
        // Get current user's lecturer ID from accessToken (same as home page)
        let lecturerId: string | null = null;
        try {
          const { authUtils } = await import("@/lib/utils/auth");
          lecturerId = authUtils.getCurrentUserId();
        } catch (err) {
          console.error("Error getting userId from token:", err);
        }
        
        if (!lecturerId) {
          console.error("Lecturer ID not found for current user");
          setLoading(false);
          return;
        }

        // Fetch defense sessions for this lecturer only
        const sessionsRes = await defenseSessionsApi.getByLecturerId(lecturerId).catch(() => ({ data: [] }));
        const sessions = sessionsRes.data || [];

        // Extract unique group IDs from sessions
        const groupIds = [...new Set(sessions.map((s: DefenseSessionDto) => s.groupId))];

        // Fetch group details for each group
        const groupPromises = groupIds.map(id => groupsApi.getById(id).catch(() => null));
        const groupResults = await Promise.all(groupPromises);

        // Combine group data with session info
        const groupsWithSessions: GroupWithSession[] = groupResults
          .filter(res => res?.data)
          .map(res => {
            const group = res!.data;
            const session = sessions.find((s: DefenseSessionDto) => s.groupId === group.id);
            return {
              ...group,
              sessionDate: session?.defenseDate,
              sessionStatus: session?.status,
            };
          });

        setGroups(groupsWithSessions);
      } catch (error) {
        console.error("Error fetching groups:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchGroups();
  }, []);

  const filteredGroups = groups.filter((group) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      group.id?.toLowerCase().includes(searchLower) ||
      group.projectCode?.toLowerCase().includes(searchLower) ||
      group.topicTitle_EN?.toLowerCase().includes(searchLower) ||
      group.topicTitle_VN?.toLowerCase().includes(searchLower)
    );
  });

  // Reset to page 1 when search term changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // Pagination calculations
  const paginatedGroups = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    return filteredGroups.slice(startIndex, startIndex + PAGE_SIZE);
  }, [filteredGroups, currentPage]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredGroups.length / PAGE_SIZE)
  );

  // Pagination component helper
  const renderPagination = () => {
    if (totalPages <= 1) {
      return (
        <div className="flex items-center justify-center mt-4 flex-wrap gap-2">
          <button
            className="px-3 py-1 rounded-md text-sm bg-blue-600 text-white"
            disabled
          >
            1
          </button>
        </div>
      );
    }
    return (
      <div className="flex items-center justify-center mt-4 flex-wrap gap-2">
        {Array.from({ length: totalPages }, (_, index) => {
          const pageNum = index + 1;
          const isActive = pageNum === currentPage;
          return (
            <button
              key={pageNum}
              className={`px-3 py-1 rounded-md text-sm ${
                isActive
                  ? "bg-blue-600 text-white"
                  : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
              }`}
              onClick={() => setCurrentPage(pageNum)}
            >
              {pageNum}
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <>
      <main className="main-content">
        {/* Header */}
        <header className="flex flex-col bg-white p-5 rounded-2xl shadow-sm border border-gray-100 mb-6">
          <div>
            <h1 className="text-xl font-semibold text-gray-800">
              Student Defense History
            </h1>
            <p className="text-gray-500 text-sm">
              View groups from your assigned defense sessions
            </p>
          </div>
        </header>

        {/* Search bar */}
        <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-4 mb-6">
          <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-indigo-500">
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

        {/* Groups table */}
        <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <FolderOpen className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-800">
              Groups ({filteredGroups.length})
            </h2>
          </div>

          {loading ? (
            <div className="text-center py-8 text-gray-500">
              Loading groups...
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-gray-600 border-b">
                    <th className="text-left py-3 px-4">Group ID</th>
                    <th className="text-left py-3 px-4">Project Code</th>
                    <th className="text-left py-3 px-4">Topic</th>
                    <th className="text-center py-3 px-4">Session Status</th>
                    <th className="text-right py-3 px-4">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {paginatedGroups.map((group) => (
                    <tr
                      key={group.id}
                      className="border-b last:border-0 hover:bg-gray-50 transition"
                    >
                      <td className="py-3 px-4 font-medium text-gray-800">
                        {group.id}
                      </td>

                      <td className="py-3 px-4 text-gray-700">
                        {group.projectCode || "N/A"}
                      </td>

                      <td className="py-3 px-4">
                        <div className="max-w-md">
                          <p className="font-medium text-gray-800 truncate">
                            {group.topicTitle_EN || "No title"}
                          </p>
                          {group.topicTitle_VN && (
                            <p className="text-xs text-gray-500 truncate">
                              {group.topicTitle_VN}
                            </p>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                            group.sessionStatus === "Completed"
                              ? "bg-blue-100 text-blue-700"
                              : group.sessionStatus === "InProgress"
                              ? "bg-orange-100 text-orange-700"
                              : "bg-green-100 text-green-700"
                          }`}
                        >
                          {group.sessionStatus === "InProgress" 
                            ? "In Progress" 
                            : (group.sessionStatus || "Scheduled")}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <Link
                          href={`/member/student-history/group/${group.id}`}
                          className="inline-flex items-center justify-center px-3 py-1.5 rounded-md text-sm font-semibold text-white bg-gradient-to-r from-purple-600 to-blue-500 shadow-md hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-purple-500 transition whitespace-nowrap"
                        >
                          View Students
                        </Link>
                      </td>
                    </tr>
                  ))}
                  {paginatedGroups.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="text-center py-8 text-gray-400"
                      >
                        No groups found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              {renderPagination()}
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="text-center text-sm text-gray-500 mt-8">
          © 2025 AIDefCom - Smart Graduation Defense
        </footer>
      </main>
    </>
  );
}
