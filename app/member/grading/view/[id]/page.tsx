"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save } from "lucide-react";
import { groupsApi } from "@/lib/api/groups";
import { studentsApi } from "@/lib/api/students";
import { memberNotesApi } from "@/lib/api/member-notes";
import { rubricsApi } from "@/lib/api/rubrics";
import { majorRubricsApi } from "@/lib/api/major-rubrics";
import { scoresApi, type ScoreReadDto } from "@/lib/api/scores";
import { defenseSessionsApi } from "@/lib/api/defense-sessions";
import { projectTasksApi } from "@/lib/api/project-tasks";
import { swalConfig } from "@/lib/utils/sweetAlert";
import { authUtils } from "@/lib/utils/auth";
import Swal from "sweetalert2";
import type { GroupDto, StudentDto, ScoreCreateDto } from "@/lib/models";

// --- (Code Icons giữ nguyên) ---

// SỬA ĐỔI: Định nghĩa Type (kiểu dữ liệu) để thay thế 'any'
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

type AllGroupsData = {
  [key: string]: GroupData;
};

type NotesVisibility = {
  [key: string]: boolean;
};

// SỬA ĐỔI: Dùng type 'AllGroupsData' thay cho 'any'
const allGroupsData: AllGroupsData = {};
const criteria = [
  "Innovation",
  "Feasibility",
  "Presentation",
  "Technical",
  "Q&A",
];

// Chuẩn hóa dữ liệu fallback để đủ trường
const buildFallbackStudents = (students: any[], rubricCount: number): StudentScore[] =>
  students.map((s, index) => {
    const scores = Array.from({ length: rubricCount }, (_, i) => s.scores?.[i] ?? 0);
    const criterionComments = Array.from(
      { length: rubricCount },
      (_, i) => s.criterionComments?.[i] ?? ""
    );
    const existingScoreIds = Array.from(
      { length: rubricCount },
      (_, i) => s.existingScoreIds?.[i] ?? 0
    );

    return {
      id: s.id ?? `student-${index + 1}`,
      name: s.name ?? s.fullName ?? "Unknown",
      role: s.role ?? "Member",
      scores,
      criterionComments,
      note: s.note ?? "",
      existingScoreIds,
    };
  });

export default function ViewScorePage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const groupId = params.id as string;
  const [groupData, setGroupData] = useState<GroupData | null>(null);
  const [studentScores, setStudentScores] = useState<StudentScore[]>([]);
  const [notesVisibility, setNotesVisibility] = useState<NotesVisibility>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rubrics, setRubrics] = useState<any[]>([]);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  
  // Get sessionId from URL if available
  const urlSessionId = searchParams?.get("sessionId");

  // Xóa session role khi rời khỏi trang
  useEffect(() => {
    return () => {
      // Không xóa session role ở đây vì user có thể quay lại session
      // Chỉ xóa khi logout hoặc rời khỏi hoàn toàn
    };
  }, []);

  useEffect(() => {
    const fetchGroupData = async () => {
      // Rubrics cần dùng cho fallback
      let rubricsList: any[] = [];

      try {
        setLoading(true);
        const [groupRes, studentsRes, sessionsRes] =
          await Promise.all([
            groupsApi.getById(groupId).catch(() => ({ data: null })),
            studentsApi.getByGroupId(groupId).catch(() => ({ data: [] })),
            defenseSessionsApi.getAll().catch(() => ({ data: [] })),
          ]);

        const group = groupRes.data;
        const students = studentsRes.data || [];
        const sessions = sessionsRes.data || [];
        
        // Find session for this group (ưu tiên sessionId trên URL nếu có)
        const urlSessionIdNumber = urlSessionId
          ? parseInt(urlSessionId)
          : null;
        const groupSession = urlSessionIdNumber
          ? sessions.find(
              (s: any) => s.groupId === groupId && s.id === urlSessionIdNumber
            ) || sessions.find((s: any) => s.groupId === groupId)
          : sessions.find((s: any) => s.groupId === groupId);
        if (groupSession) {
          setSessionId(groupSession.id);
          
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
          
          // Lấy session role của user hiện tại
          try {
            const storedUser = localStorage.getItem("user");
            if (storedUser) {
              const parsedUser = JSON.parse(storedUser);
              const currentUserId = parsedUser.id;
              
              const lecturersRes = await defenseSessionsApi.getUsersBySessionId(groupSession.id);
              if (lecturersRes.data) {
                const currentUserInSession = lecturersRes.data.find(
                  (user: any) => 
                    String(user.id).toLowerCase() === String(currentUserId).toLowerCase()
                );
                
                if (currentUserInSession && currentUserInSession.role) {
                  const sessionRoleValue = currentUserInSession.role.toLowerCase();
                  localStorage.setItem("sessionRole", sessionRoleValue);
                }
              }
            }
          } catch (err) {
            console.error("Failed to get session role:", err);
          }
        }

        // Fetch rubrics: ưu tiên từ project tasks (theo session và user), sau đó theo majorId
        let rubricsList: any[] = [];
        const storedUser = localStorage.getItem("user");
        let currentUserId = "";
        
        if (storedUser) {
          try {
            const parsedUser = JSON.parse(storedUser);
            currentUserId = parsedUser.id;
          } catch (err) {
            console.error("Error parsing user:", err);
          }
        }

        // Ưu tiên 1: Lấy rubrics từ project tasks được assign cho user trong session này
        if (groupSession && currentUserId) {
          try {
            console.log("🔍 Attempting to load rubrics from project tasks:", {
              userId: currentUserId,
              sessionId: groupSession.id
            });
            
            // Lấy project tasks để có rubricId
            const tasksRes = await projectTasksApi.getByAssigneeAndSession(
              currentUserId,
              groupSession.id
            );
            
            console.log("📋 Project tasks response:", {
              hasData: !!tasksRes.data,
              dataLength: Array.isArray(tasksRes.data) ? tasksRes.data.length : 0,
              tasks: tasksRes.data
            });
            
            if (tasksRes.data && Array.isArray(tasksRes.data) && tasksRes.data.length > 0) {
              // Extract unique rubricIds từ tasks
              const rubricIds = [...new Set(
                tasksRes.data
                  .map((task: any) => task.rubricId)
                  .filter((id: any) => id !== null && id !== undefined)
              )];
              
              console.log("📝 Extracted rubricIds from tasks:", rubricIds);
              
              if (rubricIds.length > 0) {
                // Lấy full rubric info từ các rubricIds
                const rubricPromises = rubricIds.map((rubricId: number) =>
                  rubricsApi.getById(rubricId).catch((err) => {
                    console.error(`Error fetching rubric ${rubricId}:`, err);
                    return { data: null };
                  })
                );
                const rubricResults = await Promise.all(rubricPromises);
                
                // Filter và map rubrics
                rubricsList = rubricResults
                  .map((res: any) => res.data)
                  .filter((r: any) => r !== null && r !== undefined);
                
                // Sort rubrics theo thứ tự trong tasks để giữ đúng thứ tự
                const rubricOrderMap = new Map(rubricIds.map((id, idx) => [id, idx]));
                rubricsList.sort((a, b) => {
                  const orderA = rubricOrderMap.get(a.id) ?? 999;
                  const orderB = rubricOrderMap.get(b.id) ?? 999;
                  return orderA - orderB;
                });
                
                setRubrics(rubricsList);
                console.log("✅ Rubrics loaded from project tasks:", rubricsList.length, "rubrics:", rubricsList);
              } else {
                console.warn("⚠️ No rubricIds found in project tasks");
              }
            } else {
              console.warn("⚠️ No project tasks found for user in session");
            }
          } catch (error) {
            console.error("❌ Error fetching rubrics from project tasks:", error);
          }
        } else {
          console.warn("⚠️ Cannot load rubrics from project tasks:", {
            hasSession: !!groupSession,
            hasUserId: !!currentUserId,
            sessionId: groupSession?.id,
            userId: currentUserId
          });
        }

        // Fallback: Lấy rubrics theo majorId nếu chưa có từ project tasks
        if (rubricsList.length === 0 && group?.majorId) {
          try {
            console.log("🔍 Fallback: Loading rubrics from majorId:", group.majorId);
            const majorRubricsRes = await majorRubricsApi.getByMajorId(group.majorId);
            console.log("📋 Major rubrics response:", {
              hasData: !!majorRubricsRes.data,
              dataLength: Array.isArray(majorRubricsRes.data) ? majorRubricsRes.data.length : 0,
              data: majorRubricsRes.data
            });
            
            if (majorRubricsRes.data && Array.isArray(majorRubricsRes.data) && majorRubricsRes.data.length > 0) {
              // Backend trả về MajorRubricReadDto có RubricId và RubricName, không có full Rubric object
              // Extract unique rubricIds từ major-rubrics
              const rubricIds = [...new Set(
                majorRubricsRes.data
                  .map((mr: any) => mr.rubricId)
                  .filter((id: any) => id !== null && id !== undefined && id > 0)
              )];
              
              if (rubricIds.length > 0) {
                // Lấy full rubric info từ các rubricIds
                const rubricPromises = rubricIds.map((rubricId: number) =>
                  rubricsApi.getById(rubricId).catch((err) => {
                    console.error(`Error fetching rubric ${rubricId}:`, err);
                    return { data: null };
                  })
                );
                const rubricResults = await Promise.all(rubricPromises);
                
                // Filter và map rubrics
                rubricsList = rubricResults
                  .map((res: any) => res.data)
                  .filter((r: any) => r !== null && r !== undefined);
                
                setRubrics(rubricsList);
                console.log("✅ Rubrics loaded from major:", rubricsList.length, "rubrics:", rubricsList);
              } else {
                console.warn("⚠️ No valid rubricIds found in major-rubrics response");
              }
            } else {
              console.warn("⚠️ Major rubrics response is not an array or empty");
            }
          } catch (error) {
            console.error("❌ Error fetching rubrics by major:", error);
          }
        } else if (rubricsList.length === 0) {
          console.warn("⚠️ Cannot load rubrics from major - no majorId:", {
            hasGroup: !!group,
            majorId: group?.majorId
          });
        }

        // Nếu vẫn không có rubrics, để trống (sẽ dùng default criteria)
        if (rubricsList.length === 0) {
          console.warn("⚠️ No rubrics found for group/session, will use default criteria");
          setRubrics([]);
        } else {
          console.log("✅ Final rubrics list:", rubricsList.length, "items");
        }

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

              // Create scores array based on rubrics (fallback to 5 if no rubrics)
              const rubricCount = rubricsList.length > 0 ? rubricsList.length : 5;
              const scoresArray = new Array(rubricCount).fill(0);
              const scoreIds = new Array(rubricCount).fill(0);
              const commentsArray = new Array(rubricCount).fill("");

              // Map existing scores to rubrics
              sessionScores.forEach((score: ScoreReadDto) => {
                const rubricIndex = rubricsList.findIndex(
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
          const defaultData = allGroupsData[groupId] || allGroupsData["1"];
          const rubricCountFallback =
            rubricsList.length > 0 ? rubricsList.length : criteria.length;
          const normalizedStudents = buildFallbackStudents(
            defaultData?.students || [],
            rubricCountFallback
          );
          setGroupData(
            defaultData
              ? { ...defaultData, students: normalizedStudents }
              : { name: "", project: "", students: normalizedStudents }
          );
          setStudentScores(normalizedStudents);
        }
      } catch (error) {
        console.error("Error fetching group data:", error);
        const defaultData = allGroupsData[groupId] || allGroupsData["1"];
        const rubricCountFallback =
          rubricsList.length > 0 ? rubricsList.length : criteria.length;
        const normalizedStudents = buildFallbackStudents(
          defaultData?.students || [],
          rubricCountFallback
        );
        setGroupData(
          defaultData
            ? { ...defaultData, students: normalizedStudents }
            : { name: "", project: "", students: normalizedStudents }
        );
        setStudentScores(normalizedStudents);
      } finally {
        setLoading(false);
      }
    };

    fetchGroupData();
  }, [groupId]);

  const calculateAverage = (scores: number[]) => {
    const total = scores.reduce((acc, score) => acc + score, 0);
    const avg = total / scores.length;
    return avg.toFixed(2);
  };

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

  const toggleNoteVisibility = (studentId: string) => {
    // SỬA ĐỔI: Dùng type 'NotesVisibility'
    setNotesVisibility((prev: NotesVisibility) => ({
      ...prev,
      [studentId]: !prev[studentId],
    }));
  };

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
      const finalSessionId = urlSessionId ? parseInt(urlSessionId) : sessionId;
      if (finalSessionId) {
        router.push(`/member/defense-sessions?sessionId=${finalSessionId}`);
      } else {
        router.push("/member/defense-sessions");
      }
    } catch (error: any) {
      console.error("Error saving scores:", error);
      // Close loading dialog if it exists
      Swal.close();
      swalConfig.error("Error", error.message || "Failed to save scores");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    const finalSessionId = urlSessionId ? parseInt(urlSessionId) : sessionId;
    if (finalSessionId) {
      router.push(`/member/defense-sessions?sessionId=${finalSessionId}`);
    } else {
      router.push("/member/defense-sessions");
    }
  };

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
              {/* Back to defense sessions list */}
              <Link
                href={
                  urlSessionId
                    ? `/member/defense-sessions?sessionId=${urlSessionId}`
                    : sessionId
                    ? `/member/defense-sessions?sessionId=${sessionId}`
                    : "/member/defense-sessions"
                }
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium shadow-sm hover:bg-gray-100 transition"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Grading card */}
        <div className="bg-white rounded-xl shadow p-6 mb-6">
          {/* Header của card */}
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
              {/* Responsive table container */}
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
                    {studentScores.map(
                      (student: StudentScore, studentIndex) => (
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

                            {student.scores.map(
                              (score: number, criterionIndex) => (
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
                              )
                            )}

                            <td className="py-3 px-3 align-top">
                              <span className="inline-block bg-blue-50 text-blue-700 text-sm px-2 py-1 rounded-md">
                                {calculateAverage(student.scores)}
                              </span>
                            </td>

                            <td className="py-3 px-3 align-top">
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
                                <button
                                  className="text-sm text-violet-600 border px-3 py-1 rounded-md hover:bg-violet-50 mt-2"
                                  onClick={() => toggleNoteVisibility(student.id)}
                                >
                                  Notes
                                </button>
                              </div>
                            </td>
                          </tr>

                          {notesVisibility[student.id] && (
                            <tr>
                              <td colSpan={(rubrics.length > 0 ? rubrics.length : criteria.length) + 3} className="py-3">
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
                      )
                    )}
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
