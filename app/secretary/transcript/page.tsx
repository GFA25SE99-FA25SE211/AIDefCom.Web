"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { defenseSessionsApi } from "@/lib/api/defense-sessions";
import { groupsApi } from "@/lib/api/groups";
import { DefenseSessionDto, GroupDto } from "@/lib/models";

interface SessionWithGroup {
  session: DefenseSessionDto;
  group: GroupDto | null;
}

export default function TranscriptListPage() {
  const [sessionsWithGroups, setSessionsWithGroups] = useState<
    SessionWithGroup[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Xóa session role khi vào trang danh sách (không phải detail)
  useEffect(() => {
    localStorage.removeItem("sessionRole");
  }, []);

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        setLoading(true);

        // Get current user from localStorage
        const storedUser = localStorage.getItem("user");
        let currentUserId = "";

        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);
          currentUserId = parsedUser.id;
        }

        if (!currentUserId) {
          setError("User not identified. Please login again.");
          setLoading(false);
          return;
        }

        // Fetch sessions by lecturer ID
        const response = await defenseSessionsApi.getByLecturerId(
          currentUserId
        );

        if (response.data) {
          // Fetch group info for each session
          const sessionsWithGroupData = await Promise.all(
            response.data.map(async (session) => {
              try {
                const groupResponse = await groupsApi.getById(session.groupId);
                return {
                  session,
                  group: groupResponse.data || null,
                };
              } catch (err) {
                console.error(`Failed to fetch group ${session.groupId}:`, err);
                return {
                  session,
                  group: null,
                };
              }
            })
          );
          setSessionsWithGroups(sessionsWithGroupData);
        }
      } catch (error) {
        console.error("Failed to fetch sessions:", error);
        setError("Failed to load defense sessions. Please try again later.");
      } finally {
        setLoading(false);
      }
    };
    fetchSessions();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <svg
            className="animate-spin h-12 w-12 text-blue-600 mx-auto mb-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          <p className="text-gray-600 font-medium">Loading sessions...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center max-w-md">
          <div className="bg-red-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="w-8 h-8 text-red-600"
            >
              <path
                fillRule="evenodd"
                d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            Error Loading Sessions
          </h2>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Session Transcripts
          </h1>
          <p className="text-gray-600">
            Select a group to view or edit the transcript.
          </p>
        </div>

        {/* Sessions Grid */}
        {sessionsWithGroups.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-16 text-center">
            <div className="inline-block p-6 bg-gray-100 rounded-full mb-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-16 h-16 text-gray-400"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
                />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              No Defense Sessions
            </h3>
            <p className="text-gray-500">
              There are no scheduled defense sessions at the moment.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sessionsWithGroups.map(({ session, group }) => (
              <Link
                key={session.id}
                href={`/secretary/transcript/${session.id}`}
                className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-lg transition-all duration-300 overflow-hidden group"
              >
                {/* Card Header */}
                <div className="bg-gradient-to-r from-purple-600 to-blue-600 px-6 py-4">
                  <h2 className="text-lg font-semibold text-white truncate">
                    {group?.projectCode || `Group ${session.groupId}`}
                  </h2>
                  <p className="text-purple-100 text-sm truncate">
                    {group?.groupName || `Group ${session.groupId}`}
                  </p>
                </div>

                {/* Card Body */}
                <div className="p-6">
                  {/* Topic Title */}
                  {group?.topicTitle_VN && (
                    <div className="mb-4">
                      <p className="text-sm text-gray-500 mb-1">Topic</p>
                      <p className="text-sm font-medium text-gray-900 line-clamp-2">
                        {group.topicTitle_VN}
                      </p>
                    </div>
                  )}

                  {/* Semester & Major */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    {group?.semesterName && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Semester</p>
                        <p className="text-sm font-medium text-gray-900">
                          {group.semesterName}
                        </p>
                      </div>
                    )}
                    {group?.majorName && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Major</p>
                        <p
                          className="text-sm font-medium text-gray-900 truncate"
                          title={group.majorName}
                        >
                          {group.majorName}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Defense Info */}
                  <div className="space-y-2 mb-4 p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        className="w-4 h-4 text-gray-400"
                      >
                        <path d="M5.25 12a.75.75 0 01.75-.75h.01a.75.75 0 01.75.75v.01a.75.75 0 01-.75.75H6a.75.75 0 01-.75-.75V12zM6 13.25a.75.75 0 00-.75.75v.01c0 .414.336.75.75.75h.01a.75.75 0 00.75-.75V14a.75.75 0 00-.75-.75H6zM7.25 12a.75.75 0 01.75-.75h.01a.75.75 0 01.75.75v.01a.75.75 0 01-.75.75H8a.75.75 0 01-.75-.75V12zM8 13.25a.75.75 0 00-.75.75v.01c0 .414.336.75.75.75h.01a.75.75 0 00.75-.75V14a.75.75 0 00-.75-.75H8zM9.25 10a.75.75 0 01.75-.75h.01a.75.75 0 01.75.75v.01a.75.75 0 01-.75.75H10a.75.75 0 01-.75-.75V10zM10 11.25a.75.75 0 00-.75.75v.01c0 .414.336.75.75.75h.01a.75.75 0 00.75-.75V12a.75.75 0 00-.75-.75H10zM9.25 14a.75.75 0 01.75-.75h.01a.75.75 0 01.75.75v.01a.75.75 0 01-.75.75H10a.75.75 0 01-.75-.75V14zM12 9.25a.75.75 0 00-.75.75v.01c0 .414.336.75.75.75h.01a.75.75 0 00.75-.75V10a.75.75 0 00-.75-.75H12zM11.25 12a.75.75 0 01.75-.75h.01a.75.75 0 01.75.75v.01a.75.75 0 01-.75.75H12a.75.75 0 01-.75-.75V12zM12 13.25a.75.75 0 00-.75.75v.01c0 .414.336.75.75.75h.01a.75.75 0 00.75-.75V14a.75.75 0 00-.75-.75H12zM13.25 10a.75.75 0 01.75-.75h.01a.75.75 0 01.75.75v.01a.75.75 0 01-.75.75H14a.75.75 0 01-.75-.75V10zM14 11.25a.75.75 0 00-.75.75v.01c0 .414.336.75.75.75h.01a.75.75 0 00.75-.75V12a.75.75 0 00-.75-.75H14z" />
                        <path
                          fillRule="evenodd"
                          d="M5.75 2a.75.75 0 01.75.75V4h7V2.75a.75.75 0 011.5 0V4h.25A2.75 2.75 0 0118 6.75v8.5A2.75 2.75 0 0115.25 18H4.75A2.75 2.75 0 012 15.25v-8.5A2.75 2.75 0 014.75 4H5V2.75A.75.75 0 015.75 2zm-1 5.5c-.69 0-1.25.56-1.25 1.25v6.5c0 .69.56 1.25 1.25 1.25h10.5c.69 0 1.25-.56 1.25-1.25v-6.5c0-.69-.56-1.25-1.25-1.25H4.75z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span>
                        {new Date(session.defenseDate).toLocaleDateString(
                          "vi-VN"
                        )}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        className="w-4 h-4 text-gray-400"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-13a.75.75 0 00-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 000-1.5h-3.25V5z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span>
                        {session.startTime} - {session.endTime}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        className="w-4 h-4 text-gray-400"
                      >
                        <path
                          fillRule="evenodd"
                          d="M9.69 18.933l.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 00.281-.14c.186-.096.446-.24.757-.433.62-.384 1.445-.966 2.274-1.765C15.302 14.988 17 12.493 17 9A7 7 0 103 9c0 3.492 1.698 5.988 3.355 7.584a13.731 13.731 0 002.273 1.765 11.842 11.842 0 00.976.544l.062.029.018.008.006.003zM10 11.25a2.25 2.25 0 100-4.5 2.25 2.25 0 000 4.5z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span className="truncate">{session.location}</span>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className="flex justify-between items-center">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        session.status === "Completed"
                          ? "bg-green-100 text-green-700"
                          : session.status === "Scheduled"
                          ? "bg-orange-100 text-orange-700"
                          : "bg-blue-100 text-blue-700"
                      }`}
                    >
                      {session.status}
                    </span>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors"
                    >
                      <path
                        fillRule="evenodd"
                        d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Footer */}
        <p className="text-center text-sm text-gray-500 mt-8">
          © 2025 AIDefCom · Smart Graduation Defense
        </p>
      </div>
    </div>
  );
}
