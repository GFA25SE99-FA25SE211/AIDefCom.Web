"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { defenseSessionsApi } from "@/lib/api/defense-sessions";
import { DefenseSessionDto } from "@/lib/models";

export default function TranscriptListPage() {
  const [sessions, setSessions] = useState<DefenseSessionDto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const response = await defenseSessionsApi.getAll(false);
        if (response.data) {
          setSessions(response.data);
        }
      } catch (error) {
        console.error("Failed to fetch sessions:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchSessions();
  }, []);

  if (loading) {
    return (
      <div className="p-8 text-center text-gray-500">Loading sessions...</div>
    );
  }

  return (
    <div className="page-container">
      <div className="main-header">
        <h1 className="text-2xl font-semibold text-gray-800">
          Session Transcripts
        </h1>
        <p className="text-gray-500 text-sm">
          Select a group to view or edit the transcript.
        </p>
      </div>

      <div className="dashboard-grid md:grid-cols-2 lg:grid-cols-3">
        {sessions.map((session) => (
          <Link
            key={session.id}
            href={`/secretary/transcript/${session.id}`}
            className="card-base hover:shadow-md transition cursor-pointer border flex flex-col justify-between"
          >
            <div>
              <h2 className="text-lg font-semibold text-gray-800">
                {/* Fallback if group name is not directly available, though DTO usually has it or nested group object */}
                {/* Assuming DTO has groupName or similar based on typical patterns, will verify with DTO file view */}
                Group {session.groupId}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                {new Date(session.defenseDate).toLocaleDateString()} -{" "}
                {session.location}
              </p>
            </div>

            <span
              className={`mt-4 badge ${
                session.status === "Completed"
                  ? "badge-success"
                  : "badge-warning"
              }`}
            >
              {session.status}
            </span>
          </Link>
        ))}
      </div>

      <p className="page-footer">© 2025 AIDefCom · Smart Graduation Defense</p>
    </div>
  );
}
