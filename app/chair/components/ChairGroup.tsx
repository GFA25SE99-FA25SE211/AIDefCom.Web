"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { defenseSessionsApi } from "@/lib/api/defense-sessions";
import type { DefenseSessionDto } from "@/lib/models";

export default function ChairGroups() {
  const [defenseSessions, setDefenseSessions] = useState<DefenseSessionDto[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

        const response = await defenseSessionsApi.getByLecturerId(
          currentUserId
        );
        if (response.data) {
          setDefenseSessions(response.data);
        }
      } catch (err) {
        console.error("Failed to fetch defense sessions:", err);
        setError("Failed to load defense sessions. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchSessions();
  }, []);

  return (
    <>
      {/* --- Header Section --- */}
      <div className="section-header mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">
            Defense Sessions
          </h1>
          <p className="text-gray-500 text-sm">
            List of scheduled defense sessions
          </p>
        </div>
      </div>

      {/* --- Session Cards --- */}
      <div className="mt-6 space-y-6">
        {loading ? (
          <div className="text-center py-10 text-gray-500">
            Loading sessions...
          </div>
        ) : error ? (
          <div className="text-center py-10 text-red-500">{error}</div>
        ) : defenseSessions.length === 0 ? (
          <div className="text-center py-10 text-gray-500">
            No defense sessions found.
          </div>
        ) : (
          defenseSessions.map((session) => (
            <div
              key={session.id}
              className="card-base hover:shadow-lg transition-all duration-200"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">
                    Group: {session.groupId}
                  </h3>
                  <div className="flex gap-2 mt-2">
                    <span
                      className={`badge text-xs ${
                        session.status === "Scheduled"
                          ? "badge-info"
                          : "badge-success"
                      }`}
                    >
                      {session.status}
                    </span>
                  </div>
                </div>

                {/* --- Nút View Details chuẩn hệ thống --- */}
                <Link
                  href={`/chair/groups/${session.groupId}`}
                  className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium
                  bg-gradient-to-r from-purple-600 to-blue-500 text-white shadow-sm hover:opacity-90
                  transition-all duration-150"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                    className="w-4 h-4"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15 12H3m0 0l4-4m-4 4l4 4m4 4h8a2 2 0 002-2V6a2 2 0 00-2-2h-8"
                    />
                  </svg>
                  View Group Details
                </Link>
              </div>

              {/* Defense Session Info */}
              <div className="p-4 rounded-xl border border-gray-200 bg-gradient-to-r from-white via-purple-50 to-blue-50">
                <div className="flex flex-wrap gap-4 items-center text-gray-500 text-sm">
                  <span className="flex items-center gap-1">
                    📅{" "}
                    <span>
                      {new Date(session.defenseDate).toLocaleDateString()}
                    </span>
                  </span>
                  <span className="flex items-center gap-1">
                    ⏰{" "}
                    <span>
                      {session.startTime} - {session.endTime}
                    </span>
                  </span>
                  <span className="flex items-center gap-1">
                    📍 <span>{session.location}</span>
                  </span>
                  {session.councilId && (
                    <span className="flex items-center gap-1">
                      👥 <span>Council ID: {session.councilId}</span>
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* --- Footer --- */}
      <p className="text-xs text-center text-gray-400 mt-10">
        © 2025 AIDefCom · Smart Graduation Defense
      </p>
    </>
  );
}
