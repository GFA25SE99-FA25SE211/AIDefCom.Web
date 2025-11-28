"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save } from "lucide-react";
import { groupsApi } from "@/lib/api/groups";
import { studentsApi } from "@/lib/api/students";
import { memberNotesApi } from "@/lib/api/member-notes";
import { rubricsApi } from "@/lib/api/rubrics";
import { scoresApi, type ScoreReadDto } from "@/lib/api/scores";
import { defenseSessionsApi } from "@/lib/api/defense-sessions";
import { swalConfig } from "@/lib/utils/sweetAlert";
import { authUtils } from "@/lib/utils/auth";
import Swal from "sweetalert2";
import type { GroupDto, StudentDto, ScoreCreateDto } from "@/lib/models";

interface StudentScore {
  id: string;
  name: string;
  role: string;
  scores: number[];
  criterionComments: string[];
  note: string;
  existingScoreIds: number[]; // Track existing score IDs for updates
}

interface GroupData {
  name: string;
  project: string;
  students: StudentScore[];
}

type AllGroupsData = { [key: string]: GroupData };
type NotesVisibility = { [key: string]: boolean };

const allGroupsData: AllGroupsData = {
  "2": {
    name: "Group 2",
    project: "Intelligent Ride-hailing Application",
    students: [
      {
        id: "SV004",
        name: "Pham Van D",
        role: "Team Leader",
        scores: [0, 0, 0, 0, 0],
        criterionComments: ["", "", "", "", ""],
        note: "",
        existingScoreIds: [0, 0, 0, 0, 0],
      },
      {
        id: "SV005",
        name: "Hoang Thi E",
        role: "Developer",
        scores: [0, 0, 0, 0, 0],
        criterionComments: ["", "", "", "", ""],
        note: "",
        existingScoreIds: [0, 0, 0, 0, 0],
      },
    ],
  },
  "3": {
    name: "Group 3",
    project: "E-commerce Website",
    students: [
      {
        id: "SV006",
        name: "Do Van F",
        role: "Developer",
        scores: [0, 0, 0, 0, 0],
        criterionComments: ["", "", "", "", ""],
        note: "",
        existingScoreIds: [0, 0, 0, 0, 0],
      },
      {
        id: "SV007",
        name: "Vu Thi G",
        role: "Developer",
        scores: [0, 0, 0, 0, 0],
        criterionComments: ["", "", "", "", ""],
        note: "",
        existingScoreIds: [0, 0, 0, 0, 0],
      },
    ],
  },
  "4": {
    name: "Group 4",
    project: "AI Health Consultation Chatbot",
    students: [
      {
        id: "SV008",
        name: "Mai Van I",
        role: "Developer",
        scores: [0, 0, 0, 0, 0],
        criterionComments: ["", "", "", "", ""],
        note: "",
        existingScoreIds: [0, 0, 0, 0, 0],
      },
      {
        id: "SV009",
        name: "Dinh Thi K",
        role: "Developer",
        scores: [0, 0, 0, 0, 0],
        criterionComments: ["", "", "", "", ""],
        note: "",
        existingScoreIds: [0, 0, 0, 0, 0],
      },
    ],
  },
  "6": {
    name: "Group 6",
    project: "Personal Finance Management App",
    students: [
      {
        id: "SV013",
        name: "Truong Van O",
        role: "Developer",
        scores: [0, 0, 0, 0, 0],
        criterionComments: ["", "", "", "", ""],
        note: "",
        existingScoreIds: [0, 0, 0, 0, 0],
      },
      {
        id: "SV014",
        name: "Duong Thi P",
        role: "Developer",
        scores: [0, 0, 0, 0, 0],
        criterionComments: ["", "", "", "", ""],
        note: "",
        existingScoreIds: [0, 0, 0, 0, 0],
      },
    ],
  },
};

const criteria = [
  "Innovation",
  "Feasibility",
  "Presentation",
  "Technical",
  "Q&A",
];

export default function GradeGroupPage() {
  const router = useRouter();
  const params = useParams();
  const groupId = params.id as string;
  const [groupData, setGroupData] = useState<GroupData | null>(null);
  const [studentScores, setStudentScores] = useState<StudentScore[]>([]);
  const [notesVisibility, setNotesVisibility] = useState<NotesVisibility>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rubrics, setRubrics] = useState<any[]>([]);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string>("");

  useEffect(() => {
    const fetchGroupData = async () => {
      try {
        setLoading(true);
        const [groupRes, studentsRes, rubricsRes, sessionsRes] =
          await Promise.all([
            groupsApi.getById(groupId).catch(() => ({ data: null })),
            studentsApi.getByGroupId(groupId).catch(() => ({ data: [] })),
            rubricsApi.getAll().catch(() => ({ data: [] })),
            defenseSessionsApi.getAll().catch(() => ({ data: [] })),
          ]);

        const group = groupRes.data;
        const students = studentsRes.data || [];
        const sessions = sessionsRes.data || [];
        setRubrics(rubricsRes.data || []);

        // Find session for this group
        const groupSession = sessions.find((s: any) => s.groupId === groupId);
        if (groupSession) {
          setSessionId(groupSession.id);
          if (
            groupSession.status &&
            groupSession.status.toLowerCase() === "completed"
          ) {
            setLoading(false);
            router.replace(`/member/grading/view/${groupId}`);
            return;
          }
        }

        // Get current user ID from auth token
        const userInfo = authUtils.getCurrentUserInfo();
        let userId = userInfo.userId;

        // Fallback for testing - use a valid lecturer ID if no auth
        if (!userId) {
          console.warn(
            "No authenticated user found, using fallback lecturer ID for testing"
          );
          userId = "0EB5D9FB-4389-45B7-A7AE-23AFBAF461CE"; // PGS.TS Lê Văn Chiến
        }

        setCurrentUserId(userId);

        if (group) {
          const displayName =
            group.groupName ||
            group.projectCode ||
            group.topicTitle_EN ||
            group.topicTitle_VN ||
            `Group ${group.id?.slice(0, 6) || ""}`;
          const projectTitle =
            group.projectTitle ||
            group.topicTitle_EN ||
            group.topicTitle_VN ||
            "No project title";

          // Load existing scores for each student
          const studentsWithScores = await Promise.all(
            students.map(async (s: StudentDto, index: number) => {
              const scoresRes = await scoresApi
                .getByStudentId(s.id)
                .catch(() => ({ data: [] }));
              const existingScores = scoresRes.data || [];

              // Filter scores for current session if available
              const sessionScores = groupSession
                ? existingScores.filter(
                    (score: ScoreReadDto) => score.sessionId === groupSession.id
                  )
                : [];

              // Create scores array based on rubrics
              const rubricCount = rubricsRes.data?.length || 5;
              const scoresArray = new Array(rubricCount).fill(0);
              const scoreIds = new Array(rubricCount).fill(0);
              const commentsArray = new Array(rubricCount).fill("");

              // Map existing scores to rubrics
              sessionScores.forEach((score: ScoreReadDto) => {
                const rubricIndex = (rubricsRes.data || []).findIndex(
                  (r: any) => r.id === score.rubricId
                );
                if (rubricIndex >= 0) {
                  scoresArray[rubricIndex] = score.value;
                  scoreIds[rubricIndex] = score.id;
                  commentsArray[rubricIndex] = score.comment || "";
                }
              });

              return {
                id: s.id,
                name: s.fullName || s.userName || "Unknown",
                role: index === 0 ? "Team Leader" : "Developer",
                scores: scoresArray,
                criterionComments: commentsArray,
                note: "",
                existingScoreIds: scoreIds,
              };
            })
          );

          const groupData: GroupData = {
            name: displayName,
            project: projectTitle,
            students: studentsWithScores,
          };
          setGroupData(groupData);
          setStudentScores(groupData.students);
        } else {
          // Fallback to default data
          const defaultData = allGroupsData[groupId] || allGroupsData["2"];
          setGroupData(defaultData);
          setStudentScores(defaultData.students);
        }
      } catch (error) {
        console.error("Error fetching group data:", error);
        const defaultData = allGroupsData[groupId] || allGroupsData["2"];
        setGroupData(defaultData);
        setStudentScores(defaultData.students);
      } finally {
        setLoading(false);
      }
    };

    fetchGroupData();
  }, [groupId, router]);

  const calculateAverage = (scores: number[]) =>
    (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2);

  const handleScoreChange = (
    studentIndex: number,
    criterionIndex: number,
    value: string
  ) => {
    const newScores = [...studentScores];

    // Allow empty input for easier editing
    if (value === "") {
      newScores[studentIndex].scores[criterionIndex] = 0;
      setStudentScores(newScores);
      return;
    }

    // Parse and validate the score
    let newScore = parseFloat(value);

    // Allow intermediate values while typing (don't auto-constrain during input)
    if (isNaN(newScore)) {
      newScore = 0;
    }

    // Only apply constraints when the value seems complete
    // This allows users to type "1" before typing "10" for example
    if (value.length > 0 && !value.endsWith(".")) {
      if (newScore > 10) newScore = 10;
      if (newScore < 0) newScore = 0;
    }

    newScores[studentIndex].scores[criterionIndex] = newScore;
    setStudentScores(newScores);
  };

  const handleCriterionCommentChange = (
    studentIndex: number,
    criterionIndex: number,
    value: string
  ) => {
    const newScores = [...studentScores];
    newScores[studentIndex].criterionComments[criterionIndex] = value;
    setStudentScores(newScores);
  };

  const handleNoteChange = (studentIndex: number, value: string) => {
    const newScores = [...studentScores];
    newScores[studentIndex].note = value;
    setStudentScores(newScores);
  };

  const toggleNoteVisibility = (studentId: string) =>
    setNotesVisibility((prev) => ({ ...prev, [studentId]: !prev[studentId] }));

  const handleSave = async () => {
    if (!sessionId) {
      swalConfig.error("Error", "No defense session found for this group");
      return;
    }

    try {
      setSaving(true);
      const loadingSwal = swalConfig.loading(
        "Saving scores...",
        "Please wait while we save your scores and notes."
      );

      // Save scores for each student
      for (const student of studentScores) {
        for (let i = 0; i < student.scores.length; i++) {
          const score = student.scores[i];
          const existingScoreId = student.existingScoreIds[i];
          const rubric = rubrics[i];
          const criterionComment = student.criterionComments[i]?.trim();

          if (!rubric) continue;

          if (existingScoreId && existingScoreId > 0) {
            // Update existing score
            await scoresApi.update(existingScoreId, {
              value: score,
              comment: criterionComment || undefined,
            });
          } else if (score > 0) {
            // Create new score
            const newScore: ScoreCreateDto = {
              value: score,
              rubricId: rubric.id,
              evaluatorId: currentUserId,
              studentId: student.id,
              sessionId: sessionId,
              comment: criterionComment || undefined,
            };
            await scoresApi.create(newScore);
          }
        }

        // Save notes separately if needed
        if (student.note && groupData) {
          try {
            await memberNotesApi.create({
              userId: currentUserId,
              groupId: groupId,
              content: student.note,
            });
          } catch (error) {
            console.error(
              `Error saving note for student ${student.id}:`,
              error
            );
          }
        }
      }

      Swal.close();
      await swalConfig.success(
        "Success",
        "Scores and notes saved successfully!"
      );
      router.push("/member/groups-to-grade");
    } catch (error: any) {
      console.error("Error saving scores:", error);
      // Close loading dialog if it exists
      Swal.close();
      swalConfig.error("Error", error.message || "Failed to save scores");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => router.push("/member/groups-to-grade");

  return (
    <>
      <main className="main-content">
        {/* Header card */}
        <div className="mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between bg-white rounded-xl shadow px-6 py-4 gap-4">
            {/* Left section */}
            <div>
              <h1 className="text-xl font-semibold text-gray-800">
                {groupData?.name || "Loading..."}
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                {groupData?.project || ""}
              </p>
            </div>

            {/* Right section */}
            <div className="flex items-center gap-3 flex-wrap justify-end">
              {/* Back to list */}
              <Link
                href="/member/groups-to-grade"
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium shadow-sm hover:bg-gray-100 transition"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to list</span>
              </Link>

              {/* Language */}
            </div>
          </div>
        </div>

        {/* Grading card */}
        <div className="bg-white rounded-xl shadow p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-800">
                Individual Grading
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Grade each member individually • Use Tab/Enter to navigate
              </p>
            </div>

            <div className="flex items-center gap-3 flex-wrap justify-end">
              <button
                onClick={handleCancel}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium shadow-sm hover:bg-gray-100 transition"
              >
                Cancel
              </button>

              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-blue-500 text-white text-sm font-medium shadow-sm hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? "Saving..." : "Save All Scores"}</span>
              </button>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-8 text-gray-500">
              Loading group data...
            </div>
          ) : (
            <>
              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-600">
                      <th className="py-2 pr-4">Student</th>
                      {(rubrics.length > 0
                        ? rubrics.map((r: any) => r.rubricName)
                        : criteria
                      ).map((name) => (
                        <th key={name} className="py-2 px-3">
                          <div className="flex flex-col">
                            <span className="font-medium">{name}</span>
                            <span className="text-xs text-gray-400">
                              (Max: 10)
                            </span>
                          </div>
                        </th>
                      ))}
                      <th className="py-2 px-3">Average</th>
                      <th className="py-2 px-3">Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {studentScores.map((student, studentIndex) => (
                      <React.Fragment key={student.id}>
                        <tr className="border-t">
                          <td className="py-4 pr-4 align-top w-64">
                            <div className="flex flex-col">
                              <Link
                                href={`/member/student-history/${student.id}`}
                                className="text-sm font-medium text-gray-800 hover:underline"
                              >
                                {student.name}
                              </Link>
                              <span className="text-xs text-gray-500 mt-1">
                                ID: {student.id}
                              </span>
                              <span className="text-xs text-gray-500">
                                {student.role}
                              </span>
                            </div>
                          </td>

                          {student.scores.map((score, criterionIndex) => (
                            <td
                              key={criterionIndex}
                              className="py-3 px-3 align-top"
                            >
                              <div className="flex flex-col gap-2">
                                <input
                                  type="number"
                                  step="0.1"
                                  min="0"
                                  max="10"
                                  placeholder="0"
                                  className="w-20 rounded-md border px-2 py-1 text-sm text-center focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
                                  value={score === 0 ? "" : score.toString()}
                                  onChange={(e) =>
                                    handleScoreChange(
                                      studentIndex,
                                      criterionIndex,
                                      e.target.value
                                    )
                                  }
                                  onBlur={(e) => {
                                    // Apply final validation on blur
                                    const value =
                                      parseFloat(e.target.value) || 0;
                                    if (value > 10 || value < 0) {
                                      const finalValue = Math.max(
                                        0,
                                        Math.min(10, value)
                                      );
                                      handleScoreChange(
                                        studentIndex,
                                        criterionIndex,
                                        finalValue.toString()
                                      );
                                    }
                                  }}
                                  onFocus={(e) => {
                                    // Select all text on focus for easy replacement
                                    e.target.select();
                                  }}
                                  onKeyDown={(e) => {
                                    // Allow quick score entry with number keys
                                    if (e.key >= "0" && e.key <= "9") {
                                      // If current value is 0, replace it
                                      if (score === 0) {
                                        e.preventDefault();
                                        handleScoreChange(
                                          studentIndex,
                                          criterionIndex,
                                          e.key
                                        );
                                      }
                                    }
                                    // Allow Enter to move to next input
                                    if (e.key === "Enter") {
                                      const inputs = document.querySelectorAll(
                                        'input[type="number"]'
                                      );
                                      const currentIndex = Array.from(
                                        inputs
                                      ).indexOf(e.target as HTMLInputElement);
                                      const nextInput = inputs[
                                        currentIndex + 1
                                      ] as HTMLInputElement;
                                      if (nextInput) {
                                        nextInput.focus();
                                        nextInput.select();
                                      }
                                    }
                                  }}
                                />
                                <textarea
                                  className="w-full rounded-md border px-2 py-1 text-xs text-gray-700 focus:ring-1 focus:ring-purple-500 focus:border-purple-500 transition-colors"
                                  rows={2}
                                  placeholder="Nhận xét mục này..."
                                  value={
                                    student.criterionComments[criterionIndex] ||
                                    ""
                                  }
                                  onChange={(e) =>
                                    handleCriterionCommentChange(
                                      studentIndex,
                                      criterionIndex,
                                      e.target.value
                                    )
                                  }
                                />
                              </div>
                            </td>
                          ))}

                          <td className="py-3 px-3 align-top">
                            <span className="inline-block bg-blue-50 text-blue-700 text-sm px-2 py-1 rounded-md">
                              {calculateAverage(student.scores)}
                            </span>
                          </td>

                          <td className="py-3 px-3 align-top">
                            <div className="flex flex-col gap-2">
                              <button
                                className="text-sm text-violet-600 border px-3 py-1 rounded-md hover:bg-violet-50"
                                onClick={() => toggleNoteVisibility(student.id)}
                              >
                                Notes
                              </button>

                              {/* Quick Set All Scores */}
                              <div className="flex flex-col gap-1">
                                <span className="text-xs text-gray-500">
                                  Set All:
                                </span>
                                <div className="flex gap-1">
                                  {[7, 8, 9].map((score) => (
                                    <button
                                      key={score}
                                      type="button"
                                      onClick={() => {
                                        const newScores = [...studentScores];
                                        newScores[studentIndex].scores =
                                          newScores[studentIndex].scores.map(
                                            () => score
                                          );
                                        setStudentScores(newScores);
                                      }}
                                      className="px-1.5 py-0.5 text-xs rounded border bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100 transition-colors"
                                      title={`Set all scores to ${score}`}
                                    >
                                      {score}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>

                        {notesVisibility[student.id] && (
                          <tr>
                            <td colSpan={8} className="py-3">
                              <div className="bg-gray-50 border rounded-md p-3">
                                <textarea
                                  className="w-full p-3 rounded-md bg-white border text-sm"
                                  placeholder={`Add notes for ${student.name}...`}
                                  value={student.note}
                                  onChange={(e) =>
                                    handleNoteChange(
                                      studentIndex,
                                      e.target.value
                                    )
                                  }
                                />
                                <div className="text-right mt-2">
                                  <button
                                    className="text-sm text-gray-600 hover:underline"
                                    onClick={() =>
                                      toggleNoteVisibility(student.id)
                                    }
                                  >
                                    Hide
                                  </button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        <footer className="page-footer text-center text-sm text-gray-500 mt-6">
          © 2025 AIDefCom - Smart Graduation Defense
        </footer>
      </main>
    </>
  );
}
