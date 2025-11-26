"use client";

import { useEffect, useState } from "react";
import { Users, Info } from "lucide-react";
import { groupsApi } from "@/lib/api/groups";
import { defenseSessionsApi } from "@/lib/api/defense-sessions";
import { committeeAssignmentsApi } from "@/lib/api/committee-assignments";
import { scoresApi } from "@/lib/api/scores";
import { authApi } from "@/lib/api/auth";
import type { GroupDto, DefenseSessionDto } from "@/lib/models";

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

// Dữ liệu mẫu (fallback)
const defaultScoreData: ScoreData[] = [
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

const getGroupDisplayName = (group: GroupDto) =>
  group.groupName ||
  group.projectCode ||
  group.topicTitle_EN ||
  group.topicTitle_VN ||
  `Group ${group.id?.slice(0, 6) || ""}`;

const getProjectTitle = (group: GroupDto) =>
  group.projectTitle ||
  group.topicTitle_EN ||
  group.topicTitle_VN ||
  "No project title";

export default function PeerScoresPage() {
  const [scoreData, setScoreData] = useState<ScoreData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPeerScores = async () => {
      try {
        setLoading(true);
        const [groupsRes, sessionsRes, assignmentsRes, usersRes, scoresRes] =
          await Promise.all([
            groupsApi.getAll().catch(() => ({ data: [] })),
            defenseSessionsApi.getAll().catch(() => ({ data: [] })),
            committeeAssignmentsApi.getAll().catch(() => ({ data: [] })),
            authApi.getAllUsers().catch(() => ({ data: [] })),
            scoresApi.getAll().catch(() => ({ data: [] })),
          ]);

        const groups = groupsRes.data || [];
        const sessions = sessionsRes.data || [];
        const assignments = assignmentsRes.data || [];
        const users = usersRes.data || [];
        const allScores = scoresRes.data || [];

        // Debug logging
        console.log('🔍 Debug Peer Scores Data:');
        console.log('Groups:', groups.length, groups);
        console.log('Sessions:', sessions.length, sessions);
        console.log('Assignments:', assignments.length, assignments);
        console.log('Users:', users.length, users);
        console.log('All Scores:', allScores.length, allScores);

        // Transform data to score format
        const scores: ScoreData[] = [];
        
        // If we have actual scores, organize them by session
        if (allScores.length > 0) {
          const scoresBySession = new Map<number, any[]>();
          allScores.forEach(score => {
            if (!scoresBySession.has(score.sessionId)) {
              scoresBySession.set(score.sessionId, []);
            }
            scoresBySession.get(score.sessionId)!.push(score);
          });
          
          // Create score cards based on sessions that have scores
          scoresBySession.forEach((sessionScores, sessionId) => {
            const session = sessions.find(s => s.id === sessionId);
            const group = groups.find(g => g.id === session?.groupId);
            
            if (group) {
              // Group scores by evaluator
              const scoresByEvaluator = new Map<string, any[]>();
              sessionScores.forEach(score => {
                if (!scoresByEvaluator.has(score.evaluatorId)) {
                  scoresByEvaluator.set(score.evaluatorId, []);
                }
                scoresByEvaluator.get(score.evaluatorId)!.push(score);
              });
              
              // Create members array with actual scores
              const members: Array<{
                name: string;
                score: string;
                status: "Pending" | "Submitted";
              }> = [];
              
              // Add evaluators who have submitted scores
              scoresByEvaluator.forEach((evaluatorScores, evaluatorId) => {
                const firstScore = evaluatorScores[0];
                const evaluatorName = firstScore.evaluatorName || 'Unknown';
                
                // Calculate average score for this evaluator
                const total = evaluatorScores.reduce((sum, score) => sum + score.value, 0);
                const average = total / evaluatorScores.length;
                
                members.push({
                  name: evaluatorName,
                  score: average.toFixed(1),
                  status: "Submitted"
                });
              });
              
              // Calculate group average
              let avgScore: string | null = null;
              if (members.length > 0) {
                const total = members.reduce((sum, member) => sum + parseFloat(member.score), 0);
                const average = total / members.length;
                avgScore = average.toFixed(2);
              }
              
              const displayName = getGroupDisplayName(group);
              const projectTitle = getProjectTitle(group);
              
              scores.push({
                groupName: displayName,
                projectTitle,
                avgScore,
                members,
              });
            }
          });
        }
        
        // If no actual data, fall back to groups with committee assignments
        if (scores.length === 0 && groups.length > 0) {
          groups.forEach((group: GroupDto) => {
            const groupSessions = sessions.filter(
              (s: DefenseSessionDto) => s.groupId === group.id
            );
            const groupAssignments = assignments.filter((a: any) =>
              groupSessions.some(
                (s: DefenseSessionDto) => s.id === a.defenseSessionId
              )
            );

            if (groupAssignments.length > 0) {
              const members: Array<{
                name: string;
                score: string;
                status: "Pending" | "Submitted";
              }> = groupAssignments.map((a: any) => {
                const user = users.find((u: any) => u.id === a.lecturerId);
                return {
                  name: user?.fullName || "Unknown",
                  score: "-",
                  status: "Pending" as const,
                };
              });

              const displayName = getGroupDisplayName(group);
              const projectTitle = getProjectTitle(group);

              scores.push({
                groupName: displayName,
                projectTitle,
                avgScore: null,
                members,
              });
            }
          });
        }
        
        // Final fallback: if we have scores but no organized data, create simple display
        if (scores.length === 0 && allScores.length > 0) {
          console.log('🔄 Using direct scores fallback');
          
          // Group scores by student and session
          const sessionGroups = new Map<number, any[]>();
          allScores.forEach(score => {
            if (!sessionGroups.has(score.sessionId)) {
              sessionGroups.set(score.sessionId, []);
            }
            sessionGroups.get(score.sessionId)!.push(score);
          });
          
          sessionGroups.forEach((sessionScores, sessionId) => {
            const firstScore = sessionScores[0];
            
            // Group by evaluator for this session
            const evaluatorMap = new Map<string, any[]>();
            sessionScores.forEach(score => {
              if (!evaluatorMap.has(score.evaluatorId)) {
                evaluatorMap.set(score.evaluatorId, []);
              }
              evaluatorMap.get(score.evaluatorId)!.push(score);
            });
            
            // Create members from evaluators
            const members: Array<{
              name: string;
              score: string;
              status: "Pending" | "Submitted";
            }> = [];
            
            evaluatorMap.forEach((evalScores, evaluatorId) => {
              const total = evalScores.reduce((sum, s) => sum + s.value, 0);
              const average = total / evalScores.length;
              
              members.push({
                name: evalScores[0].evaluatorName || 'Unknown',
                score: average.toFixed(1),
                status: "Submitted"
              });
            });
            
            // Calculate group average
            const total = members.reduce((sum, member) => sum + parseFloat(member.score), 0);
            const avgScore = (total / members.length).toFixed(2);
            
            scores.push({
              groupName: `Session ${sessionId} Group`,
              projectTitle: firstScore.studentName ? `${firstScore.studentName}'s Project` : 'Unknown Project',
              avgScore,
              members,
            });
          });
        }

        console.log('📊 Transformed scores:', scores);
        
        setScoreData(scores.length > 0 ? scores : defaultScoreData); // Fallback to default if empty
      } catch (error) {
        console.error("Error fetching peer scores:", error);
        setScoreData(defaultScoreData); // Use default data on error
      } finally {
        setLoading(false);
      }
    };

    fetchPeerScores();
  }, []);

  if (loading) {
    return (
      <main className="main-content">
        <div className="text-center py-8 text-gray-500">
          Loading peer scores...
        </div>
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
          {(scoreData.length > 0 ? scoreData : defaultScoreData).map(
            (group, groupIndex) => (
              <div
                key={`${group.groupName}-${groupIndex}`}
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

                  {group.members.map((member, memberIndex) => (
                    <div
                      key={`${group.groupName}-${member.name}-${memberIndex}`}
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
            )
          )}
        </div>

        <footer className="page-footer text-center text-sm text-gray-500 mt-8">
          © 2025 AIDefCom - Smart Graduation Defense
        </footer>
      </main>
    </>
  );
}
