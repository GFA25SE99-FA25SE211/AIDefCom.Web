"use client";

import React, { useState, useEffect, Suspense, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Save,
  Mic,
  MicOff,
  MessageSquare,
  StopCircle,
} from "lucide-react";
import { groupsApi } from "@/lib/api/groups";
import { studentsApi } from "@/lib/api/students";
import { memberNotesApi } from "@/lib/api/member-notes";
import { rubricsApi } from "@/lib/api/rubrics";
import { majorRubricsApi } from "@/lib/api/major-rubrics";
import { scoresApi, type ScoreReadDto } from "@/lib/api/scores";
import { defenseSessionsApi } from "@/lib/api/defense-sessions";
import { projectTasksApi } from "@/lib/api/project-tasks";
import { swalConfig, closeSwal } from "@/lib/utils/sweetAlert";
import { useAudioRecorder } from "@/lib/hooks/useAudioRecorder";
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

const allGroupsData: AllGroupsData = {};

// Chuẩn hóa dữ liệu sinh viên fallback (tránh thiếu field)
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
    // Chuẩn hóa role: Leader/Member thay vì Team Leader/Developer
    const rawRole = s.groupRole || s.GroupRole || s.role;
    const normalizedRole = rawRole
      ? rawRole.toLowerCase().includes("leader")
        ? "Leader"
        : "Member"
      : index === 0
      ? "Leader"
      : "Member";
    return {
      id: s.id || `student-${index}`,
      name: s.name || "Unknown",
      role: normalizedRole,
      scores,
      criterionComments,
      note: s.note || "",
      existingScoreIds,
    };
  });

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

  // Mic and session states
  const [sessionStarted, setSessionStarted] = useState(false); // Thư ký đã bắt đầu phiên chưa
  const [questionResults, setQuestionResults] = useState<any[]>([]);
  const [hasQuestionFinalText, setHasQuestionFinalText] = useState(false);
  const [mySessionId, setMySessionId] = useState<string | null>(null); // Lưu session_id của chính mình
  const mySessionIdRef = useRef<string | null>(null); // Ref để tránh stale closure
  const questionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const waitingForQuestionResult = useRef<boolean>(false);

  // WebSocket event handler
  const handleSTTEvent = (msg: any) => {
    const eventType = msg.type || msg.event;

    if (eventType === "session_started") {
      // Thư ký đã bắt đầu phiên
      setSessionStarted(true);
    } else if (eventType === "session_ended") {
      // Thư ký đã kết thúc phiên
      setSessionStarted(false);
    } else if (eventType === "question_mode_started") {
      swalConfig.info("Bắt đầu ghi nhận câu hỏi");
      setHasQuestionFinalText(false);
    } else if (eventType === "question_mode_result") {
      if (questionTimeoutRef.current) {
        clearTimeout(questionTimeoutRef.current);
        questionTimeoutRef.current = null;
      }
      waitingForQuestionResult.current = false;
      closeSwal();
      setHasQuestionFinalText(false);

      if (msg.is_duplicate) {
        swalConfig.warning(
          "Câu hỏi bị trùng",
          "Hệ thống đã ghi nhận câu hỏi này trước đó."
        );
      } else {
        setQuestionResults((prev) => [msg, ...prev]);
        swalConfig.success("Câu hỏi hợp lệ", "Đã ghi nhận câu hỏi mới.");
      }
    } else if (eventType === "error") {
      console.error("STT Error:", msg.message || msg.error);
      swalConfig.error(
        "Lỗi STT",
        msg.message || msg.error || "Đã xảy ra lỗi không xác định"
      );
    } else if (eventType === "broadcast_transcript") {
      // Transcript từ client khác trong cùng session (thư ký hoặc member khác nói)
      // Bỏ qua nếu broadcast từ chính mình
      if (
        msg.source_session_id &&
        msg.source_session_id === mySessionIdRef.current
      ) {
        console.log("🚫 Ignoring broadcast from self");
        return;
      }
      console.log("📢 Broadcast from other client:", msg.speaker, msg.text);
      // Member có thể hiển thị hoặc bỏ qua tùy nhu cầu
    } else if (eventType === "broadcast_question_started") {
      // Người khác (chair/thư ký/member khác) bắt đầu đặt câu hỏi - dùng toast nhẹ
      if (
        msg.source_session_id &&
        msg.source_session_id === mySessionIdRef.current
      ) {
        return;
      }
      const speakerName = msg.speaker_name || msg.speaker || "Thành viên";
      swalConfig.toast.info(`${speakerName} đang đặt câu hỏi...`);
    } else if (eventType === "broadcast_question_processing") {
      // Người khác kết thúc đặt câu hỏi, đang xử lý - dùng toast nhẹ
      if (
        msg.source_session_id &&
        msg.source_session_id === mySessionIdRef.current
      ) {
        return;
      }
      const speakerName = msg.speaker_name || msg.speaker || "Thành viên";
      swalConfig.toast.info(`Đang xử lý câu hỏi từ ${speakerName}...`);
    } else if (eventType === "broadcast_question_result") {
      // Kết quả câu hỏi từ người khác
      if (
        msg.source_session_id &&
        msg.source_session_id === mySessionIdRef.current
      ) {
        return;
      }
      const speakerName = msg.speaker_name || msg.speaker || "Thành viên";
      const questionText = msg.question_text || "";

      if (msg.is_duplicate) {
        swalConfig.toast.info(`Câu hỏi từ ${speakerName} bị trùng`);
      } else {
        if (questionText) {
          setQuestionResults((prev) => [
            { ...msg, from_broadcast: true, speaker: speakerName },
            ...prev,
          ]);
        }
        swalConfig.toast.success(`Câu hỏi từ ${speakerName} đã được ghi nhận`);
      }
    } else if (eventType === "connected") {
      console.log(
        "✅ WebSocket connected:",
        msg.session_id,
        "room_size:",
        msg.room_size
      );
      // Lưu session_id của mình
      if (msg.session_id) {
        setMySessionId(msg.session_id);
        mySessionIdRef.current = msg.session_id; // Cập nhật ref ngay lập tức
      }
      // KHÔNG tự động enable mic chỉ dựa vào room_size
      // Chỉ enable khi nhận được session_started từ thư ký
    } else if (eventType === "session_started") {
      // Thư ký đã bắt đầu ghi âm - cho phép member sử dụng mic
      console.log("🎤 Session started by secretary - mic enabled");
      setSessionStarted(true);
    } else if (eventType === "session_ended") {
      // Thư ký đã kết thúc phiên
      console.log("🛑 Session ended by secretary - mic disabled");
      setSessionStarted(false);
    }
  };

  // WebSocket URL - kết nối cùng session với thư ký
  const WS_URL = sessionId
    ? `wss://fastapi-service.happyforest-7c6ec975.southeastasia.azurecontainerapps.io/ws/stt?defense_session_id=${sessionId}&role=member`
    : null;

  const {
    isRecording,
    isAsking,
    wsConnected,
    startRecording,
    stopRecording,
    toggleAsk,
    stopSession,
    broadcastQuestionStarted,
    broadcastQuestionProcessing,
  } = useAudioRecorder({
    wsUrl: WS_URL || "",
    onWsEvent: handleSTTEvent,
    autoConnect: !!sessionId, // Tự động kết nối WS để nhận session_started từ thư ký
  });

  const handleToggleRecording = async () => {
    if (isRecording) {
      stopRecording(); // Chỉ tạm dừng mic, WebSocket vẫn mở
    } else {
      await startRecording();
    }
  };

  const handleToggleQuestion = async () => {
    if (!isAsking) {
      // Bắt đầu đặt câu hỏi - broadcast cho thư ký biết
      broadcastQuestionStarted();
      toggleAsk();
    } else {
      if (isRecording) {
        stopRecording();
      }

      // Kết thúc đặt câu hỏi - broadcast cho thư ký biết đang xử lý
      broadcastQuestionProcessing();

      waitingForQuestionResult.current = true;
      swalConfig.loading(
        "Đang xử lý câu hỏi...",
        "Vui lòng chờ hệ thống phân tích câu hỏi"
      );

      const upgradePopupTimeout = setTimeout(() => {
        if (waitingForQuestionResult.current) {
          swalConfig.warning(
            "Đang xử lý câu hỏi...",
            "Hệ thống đang phân tích câu hỏi. Bạn có thể tiếp tục buổi bảo vệ, kết quả sẽ hiển thị khi hoàn tất."
          );
        }
      }, 5000);

      if (!questionTimeoutRef.current) {
        questionTimeoutRef.current = upgradePopupTimeout;
      }

      toggleAsk();
    }
  };

  // sessionStarted được điều khiển bởi event session_started/session_ended từ thư ký
  // Không tự động enable - phải chờ thư ký bấm Start Mic

  useEffect(() => {
    const fetchGroupData = async () => {
      // rubricsList cần dùng trong cả try/catch
      let rubricsList: any[] = [];

      try {
        setLoading(true);
        const [groupRes, studentsRes, sessionsRes] = await Promise.all([
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

        // Fetch rubrics: ưu tiên từ project tasks (theo session và user), sau đó theo majorId

        // Ưu tiên 1: Lấy rubrics từ project tasks được assign cho user trong session này
        if (groupSession && userId) {
          try {
            console.log("🔍 Attempting to load rubrics from project tasks:", {
              userId: userId,
              sessionId: groupSession.id
            });
            
            // Lấy project tasks để có rubricId
            const tasksRes = await projectTasksApi.getByAssigneeAndSession(
              userId,
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
            hasUserId: !!userId,
            sessionId: groupSession?.id,
            userId: userId
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

              // Lấy role từ dữ liệu (groupRole), fallback Leader cho student đầu tiên
              const rawRole = (s as any).groupRole || (s as any).GroupRole;
              const normalizedRole = rawRole
                ? rawRole.toLowerCase().includes("leader")
                  ? "Leader"
                  : "Member"
                : index === 0
                ? "Leader"
                : "Member";

              return {
                id: s.id,
                name: s.fullName || s.userName || "Unknown",
                role: normalizedRole,
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
          // Fallback: tạo empty groupData hoặc từ students đã fetch
          const rubricCountFallback =
            rubricsList.length > 0 ? rubricsList.length : criteria.length;
          const normalizedStudents = students.length > 0
            ? await Promise.all(
                students.map(async (s: StudentDto, index: number) => {
                  const rawRole = (s as any).groupRole || (s as any).GroupRole;
                  const normalizedRole = rawRole
                    ? rawRole.toLowerCase().includes("leader")
                      ? "Leader"
                      : "Member"
                    : index === 0
                    ? "Leader"
                    : "Member";
                  return {
                    id: s.id,
                    name: s.fullName || s.userName || "Unknown",
                    role: normalizedRole,
                    scores: new Array(rubricCountFallback).fill(0),
                    criterionComments: new Array(rubricCountFallback).fill(""),
                    note: "",
                    existingScoreIds: new Array(rubricCountFallback).fill(0),
                  };
                })
              )
            : buildFallbackStudents([], rubricCountFallback);
          setGroupData({
            name: `Group ${groupId}`,
            project: "No project title",
            students: normalizedStudents,
          });
          setStudentScores(normalizedStudents);
        }
      } catch (error) {
        console.error("Error fetching group data:", error);
        const rubricCountFallback =
          rubricsList.length > 0 ? rubricsList.length : criteria.length;
        const normalizedStudents = buildFallbackStudents([], rubricCountFallback);
        setGroupData({
          name: `Group ${groupId}`,
          project: "No project title",
          students: normalizedStudents,
        });
        setStudentScores(normalizedStudents);
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
              {/* Mic Controls */}
              <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg border">
                {!isRecording ? (
                  <button
                    onClick={handleToggleRecording}
                    disabled={!sessionId || !sessionStarted}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-white text-sm font-medium shadow-sm transition ${
                      !sessionId || !sessionStarted
                        ? "bg-gray-400 cursor-not-allowed opacity-50"
                        : "bg-purple-600 hover:bg-purple-700"
                    }`}
                    title={
                      !sessionStarted
                        ? "Chờ thư ký bắt đầu phiên"
                        : "Bắt đầu ghi âm"
                    }
                  >
                    <Mic className="w-4 h-4" />
                    <span>Start Mic</span>
                  </button>
                ) : (
                  <>
                    {!isAsking && (
                      <button
                        onClick={handleToggleRecording}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 text-sm font-medium shadow-sm transition"
                      >
                        <MicOff className="w-4 h-4" />
                        <span>Stop Mic</span>
                      </button>
                    )}

                    <button
                      onClick={handleToggleQuestion}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium shadow-sm transition ${
                        isAsking
                          ? "bg-orange-500 text-white hover:bg-orange-600"
                          : "bg-indigo-500 text-white hover:bg-indigo-600"
                      }`}
                    >
                      {isAsking ? (
                        <>
                          <StopCircle className="w-4 h-4" />
                          <span>Kết thúc câu hỏi</span>
                        </>
                      ) : (
                        <>
                          <MessageSquare className="w-4 h-4" />
                          <span>Đặt câu hỏi</span>
                        </>
                      )}
                    </button>
                  </>
                )}

                {/* Connection status */}
                <div
                  className={`w-2 h-2 rounded-full ${
                    wsConnected ? "bg-green-500" : "bg-gray-400"
                  }`}
                  title={wsConnected ? "Đã kết nối" : "Chưa kết nối"}
                />
              </div>

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
