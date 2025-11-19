"use client";

import { useEffect, useState } from "react";
import { Languages, Users, Info } from "lucide-react";
import { groupsApi } from "@/lib/api/groups";
import { defenseSessionsApi } from "@/lib/api/defense-sessions";
import { committeeAssignmentsApi } from "@/lib/api/committee-assignments";
import { authApi } from "@/lib/api/auth";
import type { GroupDto, DefenseSessionDto } from "@/lib/models";

// Dữ liệu (giữ nguyên)
const scoreData = [
  {
    groupName: "Group 1",
    projectTitle: "Smart Learning Management System",
    avgScore: "8.60",
    members: [
      {
        name: "Assoc. Prof. Dr. Nguyen Van X",
        score: "8.8",
        status: "Submitted",
      },
      { name: "Dr. Tran Thi Y", score: "9.0", status: "Submitted" },
      { name: "Dr. Le Van Z", score: "8.0", status: "Submitted" },
    ],
  },
  {
    groupName: "Group 2",
    projectTitle: "Intelligent Ride-hailing Application",
    avgScore: "7.75",
    members: [
      {
        name: "Assoc. Prof. Dr. Nguyen Van X",
        score: "7.5",
        status: "Submitted",
      },
      { name: "Dr. Tran Thi Y", score: "-", status: "Pending" },
      { name: "Dr. Le Van Z", score: "8.0", status: "Submitted" },
    ],
  },
  {
    groupName: "Group 3",
    projectTitle: "E-commerce Website",
    avgScore: "8.65",
    members: [
      {
        name: "Assoc. Prof. Dr. Nguyen Van X",
        score: "8.5",
        status: "Submitted",
      },
      { name: "Dr. Tran Thi Y", score: "8.8", status: "Submitted" },
      { name: "Dr. Le Van Z", score: "-", status: "Pending" },
    ],
  },
  {
    groupName: "Group 4",
    projectTitle: "AI Health Consultation Chatbot",
    avgScore: null,
    members: [
      { name: "Assoc. Prof. Dr. Nguyen Van X", score: "-", status: "Pending" },
      { name: "Dr. Tran Thi Y", score: "-", status: "Pending" },
      { name: "Dr. Le Van Z", score: "-", status: "Pending" },
    ],
  },
  {
    groupName: "Group 5",
    projectTitle: "Face Recognition System",
    avgScore: "8.77",
    members: [
      {
        name: "Assoc. Prof. Dr. Nguyen Van X",
        score: "9.0",
        status: "Submitted",
      },
      { name: "Dr. Tran Thi Y", score: "8.5", status: "Submitted" },
      { name: "Dr. Le Van Z", score: "8.8", status: "Submitted" },
    ],
  },
  {
    groupName: "Group 6",
    projectTitle: "Personal Finance Management App",
    avgScore: null,
    members: [
      { name: "Assoc. Prof. Dr. Nguyen Van X", score: "-", status: "Pending" },
      { name: "Dr. Tran Thi Y", score: "-", status: "Pending" },
      { name: "Dr. Le Van Z", score: "-", status: "Pending" },
    ],
  },
  {
    groupName: "Group 7",
    projectTitle: "Hotel Booking System",
    avgScore: "9.00",
    members: [
      {
        name: "Assoc. Prof. Dr. Nguyen Van X",
        score: "9.0",
        status: "Submitted",
      },
      { name: "Dr. Tran Thi Y", score: "9.2", status: "Submitted" },
      { name: "Dr. Le Van Z", score: "8.8", status: "Submitted" },
    ],
  },
];

interface ScoreData {
  groupName: string;
  projectTitle: string;
  avgScore: string | null;
  members: Array<{
    name: string;
    score: string;
    status: "Submitted" | "Pending";
  }>;
}

export default function PeerScoresPage() {
  const [scoreData, setScoreData] = useState<ScoreData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPeerScores = async () => {
      try {
        setLoading(true);
        const [groupsRes, sessionsRes, assignmentsRes, usersRes] = await Promise.all([
          groupsApi.getAll().catch(() => ({ data: [] })),
          defenseSessionsApi.getAll().catch(() => ({ data: [] })),
          committeeAssignmentsApi.getAll().catch(() => ({ data: [] })),
          authApi.getAllUsers().catch(() => ({ data: [] })),
        ]);

        const groups = groupsRes.data || [];
        const sessions = sessionsRes.data || [];
        const assignments = assignmentsRes.data || [];
        const users = usersRes.data || [];

        // Transform data to score format
        const scores: ScoreData[] = groups.map((group: GroupDto) => {
          const groupSessions = sessions.filter((s: DefenseSessionDto) => s.groupId === group.id);
          const groupAssignments = assignments.filter((a: any) => 
            groupSessions.some((s: DefenseSessionDto) => s.id === a.defenseSessionId)
          );

          const members = groupAssignments.map((a: any) => {
            const user = users.find((u: any) => u.id === a.lecturerId);
            return {
              name: user?.fullName || "Unknown",
              score: "-", // TODO: Get from scores API
              status: "Pending" as const,
            };
          });

          return {
            groupName: group.groupName,
            projectTitle: group.projectTitle || "No project title",
            avgScore: null, // TODO: Calculate from scores
            members,
          };
        });

        setScoreData(scores.length > 0 ? scores : scoreData); // Fallback to default if empty
      } catch (error) {
        console.error("Error fetching peer scores:", error);
        setScoreData(scoreData); // Use default data on error
      } finally {
        setLoading(false);
      }
    };

    fetchPeerScores();
  }, []);

  if (loading) {
    return (
      <main className="main-content">
        <div className="text-center py-8 text-gray-500">Loading peer scores...</div>
      </main>
    );
  }

  return (
    <>
      <main className="main-content">
        <header className="main-header flex flex-col md:flex-row md:items-center md:justify-between bg-white p-5 rounded-2xl shadow-sm border border-gray-100 mb-6">
          {/* Left side */}
          <div>
            <h1 className="text-xl font-semibold text-gray-800">
              Peer Member Scores
            </h1>
            <p className="text-gray-500 text-sm">
              View consolidated scores from all committee members (read-only)
            </p>
          </div>

          {/* Right side */}
          <div className="flex justify-end mt-4 md:mt-0">
            <button className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-blue-500 text-white text-sm font-medium shadow-sm hover:opacity-90 transition">
              <Languages className="w-4 h-4" />
              <span>Tiếng Việt</span>
            </button>
          </div>
        </header>

        <div className="note-box bg-white rounded-xl border border-gray-100 shadow-sm p-5 my-6 flex gap-4 items-center">
          {/* Icon */}
          <div className="note-icon flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-r from-purple-600 to-blue-500 text-white shadow-md">
            <Info className="w-5 h-5" />
          </div>

          {/* Text */}
          <div className="note-content text-sm text-gray-700">
            <strong className="block text-gray-800 mb-0.5">Note:</strong>
            <p className="text-gray-500 leading-snug">
              This table is for reference only. You cannot edit other members'
              scores. The average score will be calculated automatically when
              all members complete their grading.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {(scoreData.length > 0 ? scoreData : scoreData).map((group) => (
            <div
              key={group.groupName}
              className="score-card bg-white rounded-xl shadow p-5"
            >
              <div className="score-card-header flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-gray-800">
                    {group.groupName}
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    {group.projectTitle}
                  </p>
                </div>

                {group.avgScore ? (
                  <div className="avg-badge bg-blue-50 text-blue-700 px-3 py-2 rounded-md text-sm font-medium h-min">
                    Avg: {group.avgScore}
                  </div>
                ) : (
                  <div className="avg-badge bg-gray-50 text-gray-500 px-3 py-2 rounded-md text-sm h-min">
                    No score
                  </div>
                )}
              </div>

              <div className="score-table mt-4 border-t pt-4">
                <div className="score-table-header grid grid-cols-12 text-sm text-gray-500 font-medium pb-2">
                  <span className="col-span-7">Committee Member</span>
                  <span className="col-span-3 text-center">Score</span>
                  <span className="col-span-2 text-right">Status</span>
                </div>

                {group.members.map((member) => (
                  <div
                    key={member.name}
                    className="score-table-row grid grid-cols-12 items-center py-3 border-b last:border-b-0"
                  >
                    <div className="col-span-7 flex items-center gap-3 text-sm text-gray-800">
                      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600">
                        <Users className="w-5 h-5" />
                      </div>
                      <span>{member.name}</span>
                    </div>

                    <div className="col-span-3 text-center">
                      <span
                        className={`score-value ${
                          member.status === "Pending"
                            ? "text-gray-400"
                            : "text-gray-800"
                        } font-medium`}
                      >
                        {member.score}
                      </span>
                    </div>

                    <div className="col-span-2 text-right">
                      <span
                        className={`status-badge inline-block px-3 py-1 rounded-full text-xs ${
                          member.status === "Pending"
                            ? "bg-yellow-50 text-yellow-700"
                            : "bg-green-50 text-green-700"
                        }`}
                      >
                        {member.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <footer className="page-footer text-center text-sm text-gray-500 mt-8">
          © 2025 AIDefCom - Smart Graduation Defense
        </footer>

        <button
          className="help-btn fixed bottom-6 right-6 w-10 h-10 rounded-full bg-gradient-to-r from-purple-600 to-blue-500 text-white flex items-center justify-center shadow-lg"
          aria-label="Help"
        >
          ?
        </button>
      </main>
    </>
  );
}
