"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Users, Info } from "lucide-react";
import { groupsApi } from "@/lib/api/groups";
import { defenseSessionsApi } from "@/lib/api/defense-sessions";
import { committeeAssignmentsApi } from "@/lib/api/committee-assignments";
import { scoresApi } from "@/lib/api/scores";
import { authApi } from "@/lib/api/auth";
import { rubricsApi } from "@/lib/api/rubrics";
import { studentsApi } from "@/lib/api/students";
import { useScoreRealTime } from "@/lib/hooks/useScoreRealTime";
import { ScoreNotifications } from "@/lib/components/ScoreNotifications";
import type { GroupDto, DefenseSessionDto, ScoreReadDto } from "@/lib/models";

interface ScoreCriteriaDetail {
  rubricName: string;
  score: string;
  comment?: string;
}

interface ScoreData {
  groupName: string;
  projectTitle: string;
  avgScore: string | null;
  sessionId?: number;
  members: Array<{
    name: string;
    score: string;
    status: "Submitted" | "Pending";
    comment?: string;
    criteria?: ScoreCriteriaDetail[];
  }>;
}

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
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const [sessionIds, setSessionIds] = useState<number[]>([]);
  const fetchPeerScoresRef = useRef<(() => Promise<void>) | null>(null);

  const toggleDetails = (rowKey: string) => {
    setExpandedRows((prev) => ({
      ...prev,
      [rowKey]: !prev[rowKey],
    }));
  };

  const fetchPeerScores = useCallback(async () => {
    try {
      setLoading(true);

      // Helper function to handle API errors gracefully
      const safeApiCall = async <T,>(
        apiCall: () => Promise<{ data: T }>,
        fallback: T = [] as T
      ) => {
        try {
          const result = await apiCall();
          return result.data || fallback;
        } catch (error: any) {
          console.error("API call failed:", error);
          // Check if it's a network error
          if (
            error?.isNetworkError ||
            error?.message?.includes("Network error") ||
            error?.message?.includes("Failed to fetch")
          ) {
            console.warn("Network error detected, using fallback data");
          }
          return fallback;
        }
      };

      const [groups, sessions, assignments, users, allScores] =
        await Promise.all([
          safeApiCall(() => groupsApi.getAll(), []),
          safeApiCall(() => defenseSessionsApi.getAll(), []),
          safeApiCall(() => committeeAssignmentsApi.getAll(), []),
          safeApiCall(() => authApi.getAllUsers(), []),
          safeApiCall(() => scoresApi.getAll(), []),
        ]);

      // Debug logging
      console.log("🔍 Debug Peer Scores Data:");
      console.log("Groups:", groups.length, groups);
      console.log("Sessions:", sessions.length, sessions);
      console.log("Assignments:", assignments.length, assignments);
      console.log("Users:", users.length, users);
      console.log("All Scores:", allScores.length, allScores);

      // Transform data to score format
      const scores: ScoreData[] = [];

      // If we have actual scores, organize them by session
      if (allScores.length > 0) {
        const scoresBySession = new Map<number, any[]>();
        allScores.forEach((score) => {
          if (!scoresBySession.has(score.sessionId)) {
            scoresBySession.set(score.sessionId, []);
          }
          scoresBySession.get(score.sessionId)!.push(score);
        });

        // Create score cards based on sessions that have scores
        scoresBySession.forEach((sessionScores, sessionId) => {
          const session = sessions.find((s) => s.id === sessionId);
          const group = groups.find((g) => g.id === session?.groupId);

          if (group) {
            // Group scores by evaluator
            const scoresByEvaluator = new Map<string, any[]>();
            sessionScores.forEach((score) => {
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
              comment?: string;
              criteria?: ScoreCriteriaDetail[];
            }> = [];

            // Add evaluators who have submitted scores
            scoresByEvaluator.forEach((evaluatorScores, evaluatorId) => {
              const firstScore = evaluatorScores[0];
              const evaluatorName = firstScore.evaluatorName || "Unknown";

              // Calculate average score for this evaluator
              const total = evaluatorScores.reduce(
                (sum, score) => sum + score.value,
                0
              );
              const average = total / evaluatorScores.length;

              // Collect detailed criteria
              const criteriaDetails: ScoreCriteriaDetail[] =
                evaluatorScores.map((score) => ({
                  rubricName:
                    score.rubricName || `Criteria ${score.rubricId ?? "N/A"}`,
                  score: score.value.toFixed(1),
                  comment: score.comment?.trim() || undefined,
                }));

              const comments = criteriaDetails
                .map((c) => c.comment)
                .filter((comment) => comment && comment !== "")
                .join(" | ");

              members.push({
                name: evaluatorName,
                score: average.toFixed(1),
                status: "Submitted",
                comment: comments || undefined,
                criteria: criteriaDetails,
              });
            });

            // Calculate group average
            let avgScore: string | null = null;
            if (members.length > 0) {
              const total = members.reduce(
                (sum, member) => sum + parseFloat(member.score),
                0
              );
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
              sessionId: session?.id, // Add sessionId for real-time filtering
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
              comment?: string;
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
            // Use first session ID if available
            const firstSessionId =
              groupSessions.length > 0 ? groupSessions[0].id : undefined;

            scores.push({
              groupName: displayName,
              projectTitle,
              avgScore: null,
              members,
              sessionId: firstSessionId, // Add sessionId for real-time filtering
            });
          }
        });
      }

      // Final fallback: if we have scores but no organized data, create simple display
      if (scores.length === 0 && allScores.length > 0) {
        console.log("🔄 Using direct scores fallback");

        // Group scores by student and session
        const sessionGroups = new Map<number, any[]>();
        allScores.forEach((score) => {
          if (!sessionGroups.has(score.sessionId)) {
            sessionGroups.set(score.sessionId, []);
          }
          sessionGroups.get(score.sessionId)!.push(score);
        });

        sessionGroups.forEach((sessionScores, sessionId) => {
          const firstScore = sessionScores[0];

          // Group by evaluator for this session
          const evaluatorMap = new Map<string, any[]>();
          sessionScores.forEach((score) => {
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
            comment?: string;
            criteria?: ScoreCriteriaDetail[];
          }> = [];

          evaluatorMap.forEach((evalScores, evaluatorId) => {
            const total = evalScores.reduce((sum, s) => sum + s.value, 0);
            const average = total / evalScores.length;

            const criteriaDetails: ScoreCriteriaDetail[] = evalScores.map(
              (score) => ({
                rubricName:
                  score.rubricName || `Criteria ${score.rubricId ?? "N/A"}`,
                score: score.value.toFixed(1),
                comment: score.comment?.trim() || undefined,
              })
            );

            const comments = criteriaDetails
              .map((c) => c.comment)
              .filter((comment) => comment && comment !== "")
              .join(" | ");

            members.push({
              name: evalScores[0].evaluatorName || "Unknown",
              score: average.toFixed(1),
              status: "Submitted",
              comment: comments || undefined,
              criteria: criteriaDetails,
            });
          });

          // Calculate group average
          const total = members.reduce(
            (sum, member) => sum + parseFloat(member.score),
            0
          );
          const avgScore = (total / members.length).toFixed(2);

          scores.push({
            groupName: `Session ${sessionId} Group`,
            projectTitle: firstScore.studentName
              ? `${firstScore.studentName}'s Project`
              : "Unknown Project",
            avgScore,
            members,
            sessionId: sessionId, // Add sessionId for real-time filtering
          });
        });
      }

      console.log("📊 Transformed scores:", scores);

      // Extract session IDs for SignalR subscription
      const uniqueSessionIds = Array.from(
        new Set(
          scores
            .map((s) => s.sessionId)
            .filter((id): id is number => id !== undefined)
        )
      );
      setSessionIds(uniqueSessionIds);

      setScoreData(scores); // Don't use fallback mock data
    } catch (error: any) {
      console.error("Error fetching peer scores:", error);

      // Show user-friendly error message for network errors
      if (
        error?.isNetworkError ||
        error?.message?.includes("Network error") ||
        error?.message?.includes("Failed to fetch")
      ) {
        console.error("Network connection error. Please check:");
        console.error("1. Is the backend server running?");
        console.error("2. Is the API URL correct?");
        console.error("3. Are CORS settings configured?");

        // You can optionally show a toast/notification here
        // For now, we'll use default data as fallback
      }

      setScoreData([]); // Don't use mock data on error
    } finally {
      setLoading(false);
    }
  }, []);

  // Store ref for useScoreRealTime callback
  fetchPeerScoresRef.current = fetchPeerScores;

  // Real-time score updates - subscribe to all sessions
  const { isConnected } = useScoreRealTime({
    onScoreUpdate: (update) => {
      console.log("Real-time score update received:", update);

      // Dispatch custom event for notifications
      const event = new CustomEvent("scoreUpdate", {
        detail: {
          message: update.sessionId
            ? `Score updated for session ${update.sessionId}`
            : "Score updated",
          type: "success",
        },
      });
      window.dispatchEvent(event);

      // Refresh data when score is updated
      if (fetchPeerScoresRef.current) {
        fetchPeerScoresRef.current();
      }
    },
    onError: (error) => {
      console.error("Real-time connection error:", error);

      // Dispatch error event for notifications
      const event = new CustomEvent("scoreUpdate", {
        detail: {
          message: "Real-time connection error. Please refresh the page.",
          type: "error",
        },
      });
      window.dispatchEvent(event);
    },
    sessionIds: sessionIds,
    subscribeToAll: sessionIds.length === 0, // Subscribe to all if no specific sessions
  });

  useEffect(() => {
    fetchPeerScores();
  }, [fetchPeerScores]);

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
      {/* Real-time Score Notifications */}
      <ScoreNotifications position="top-right" />

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
          {scoreData.length > 0 ? (
            scoreData.map((group, groupIndex) => (
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

                  {group.members.map((member, memberIndex) => {
                    const rowKey = `${groupIndex}-${memberIndex}`;
                    const hasCriteria = (member.criteria?.length ?? 0) > 0;
                    const isExpanded = expandedRows[rowKey];

                    return (
                      <div
                        key={`${group.groupName}-${member.name}-${memberIndex}`}
                        className="score-table-row border-b last:border-b-0"
                      >
                        <div className="grid grid-cols-12 items-center py-3">
                          <div className="col-span-5">
                            <div className="flex items-center gap-3 text-sm text-gray-800">
                              <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600">
                                <Users className="w-5 h-5" />
                              </div>
                              <span className="font-medium">{member.name}</span>
                            </div>
                            {member.comment && (
                              <p className="mt-1 pl-11 text-xs text-gray-600 italic">
                                Nhận xét: {member.comment}
                              </p>
                            )}
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

                          <div className="col-span-2 text-right">
                            {hasCriteria && (
                              <button
                                type="button"
                                onClick={() => toggleDetails(rowKey)}
                                className="text-xs font-medium text-blue-600 hover:text-blue-800 underline underline-offset-2"
                              >
                                {isExpanded ? "Hide details" : "View details"}
                              </button>
                            )}
                          </div>
                        </div>

                        {hasCriteria && isExpanded && (
                          <div className="pb-3 pl-11 space-y-2">
                            <div className="text-xs font-semibold uppercase text-gray-500 tracking-wide">
                              Detailed scores
                            </div>
                            <div className="space-y-2">
                              {member.criteria!.map(
                                (criteria, criteriaIndex) => (
                                  <div
                                    key={`${member.name}-criteria-${criteriaIndex}`}
                                    className="bg-gray-50 rounded-lg p-3 border-l-4 border-blue-500"
                                  >
                                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                                      <div>
                                        <p className="text-sm font-medium text-gray-800">
                                          {criteria.rubricName}
                                        </p>
                                        {criteria.comment && (
                                          <p className="text-sm text-gray-700 whitespace-pre-wrap">
                                            {criteria.comment}
                                          </p>
                                        )}
                                      </div>
                                      <span className="text-sm font-semibold text-blue-700">
                                        {criteria.score}
                                      </span>
                                    </div>
                                  </div>
                                )
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          ) : (
            // Empty state when no scores available
            <div className="col-span-2 text-center py-12">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-800 mb-2">
                  Chưa có điểm số
                </h3>
                <p className="text-gray-500 text-sm">
                  Hiện tại chưa có điểm số nào từ các thành viên hội đồng.
                  <br />
                  Vui lòng quay lại sau khi quá trình chấm điểm hoàn tất.
                </p>
              </div>
            </div>
          )}
        </div>

        <footer className="page-footer text-center text-sm text-gray-500 mt-8">
          © 2025 AIDefCom - Smart Graduation Defense
        </footer>
      </main>
    </>
  );
}
