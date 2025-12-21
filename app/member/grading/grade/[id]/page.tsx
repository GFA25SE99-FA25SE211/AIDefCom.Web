"use client";

import React, { useState, useEffect, Suspense, useRef, useCallback } from "react";
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
import { committeeAssignmentsApi } from "@/lib/api/committee-assignments";
import { swalConfig, closeSwal } from "@/lib/utils/sweetAlert";
import { useAudioRecorder } from "@/lib/hooks/useAudioRecorder";
import { useVoiceEnrollmentCheck } from "@/lib/hooks/useVoiceEnrollmentCheck";
// import { useScoreRealTime } from "@/lib/hooks/useScoreRealTime"; // Tạm thời tắt SignalR
import { authUtils } from "@/lib/utils/auth";
import Swal from "sweetalert2";
import type { GroupDto, StudentDto, ScoreCreateDto, MemberNoteDto } from "@/lib/models";
import { getWebSocketUrl } from "@/lib/config/api-urls";

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
const buildFallbackStudents = (
  students: any[],
  rubricCount: number
): StudentScore[] =>
  students.map((s, index) => {
    const scores = Array.from(
      { length: rubricCount },
      (_, i) => s.scores?.[i] ?? 0
    );
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

  // Voice enrollment check - must be enrolled to access this page
  const { isChecking: checkingVoice } = useVoiceEnrollmentCheck();

  const [groupData, setGroupData] = useState<GroupData | null>(null);
  const [studentScores, setStudentScores] = useState<StudentScore[]>([]);
  const [notesVisibility, setNotesVisibility] = useState<NotesVisibility>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rubrics, setRubrics] = useState<any[]>([]);

  // Helper: xác định có rubrics hợp lệ không
  const hasRubrics =
    Array.isArray(rubrics) &&
    rubrics.length > 0 &&
    rubrics.every((r) => r && (r.id || r.rubricName));
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [memberNotes, setMemberNotes] = useState<MemberNoteDto[]>([]);
  const savingRef = useRef(false); // Ref để prevent redirect khi đang save

  // Get sessionId from URL if available
  const urlSessionId = searchParams?.get("sessionId");

  // Real-time score updates via SignalR - TẠM THỜI TẮT
  // const handleScoreUpdate = useCallback(
  //   (update: any) => {
  //     console.log("📊 Real-time score update received:", update);
      
  //     // Refresh scores when real-time update is received
  //     if (update.sessionId === sessionId || update.studentId) {
  //       // Reload scores for the affected student or session
  //       const refreshScores = async () => {
  //         try {
  //           if (update.studentId && groupData) {
  //             // Reload scores for specific student
  //             const scoresRes = await scoresApi.getByStudentId(update.studentId);
  //             const updatedScores = scoresRes.data || [];
              
  //             // Update student scores in state
  //             setStudentScores((prev) =>
  //               prev.map((student) => {
  //                 if (student.id === update.studentId) {
  //                   // Update scores array based on rubric order
  //                   const newScores = rubrics.map((rubric) => {
  //                     const score = updatedScores.find(
  //                       (s: any) =>
  //                         s.rubricId === rubric.id &&
  //                         s.evaluatorId === currentUserId
  //                     );
  //                     return score ? score.value : 0;
  //                   });
                    
  //                   const newComments = rubrics.map((rubric) => {
  //                     const score = updatedScores.find(
  //                       (s: any) =>
  //                         s.rubricId === rubric.id &&
  //                         s.evaluatorId === currentUserId
  //                     );
  //                     return score?.comment || "";
  //                   });
                    
  //                   const newScoreIds = rubrics.map((rubric) => {
  //                     const score = updatedScores.find(
  //                       (s: any) =>
  //                         s.rubricId === rubric.id &&
  //                         s.evaluatorId === currentUserId
  //                     );
  //                     return score?.id || 0;
  //                   });
                    
  //                   return {
  //                     ...student,
  //                     scores: newScores,
  //                     criterionComments: newComments,
  //                     existingScoreIds: newScoreIds,
  //                   };
  //                 }
  //                 return student;
  //               })
  //             );
  //           } else if (update.sessionId === sessionId) {
  //             // Reload all scores for the session
  //             if (groupData && sessionId) {
  //               const scoresRes = await scoresApi.getBySessionId(sessionId);
  //               const allScores = scoresRes.data || [];
                
  //               // Update all students' scores
  //               setStudentScores((prev) =>
  //                 prev.map((student) => {
  //                   const studentScores = allScores.filter(
  //                     (s: any) =>
  //                       s.studentId === student.id &&
  //                       s.evaluatorId === currentUserId
  //                   );
                    
  //                   const newScores = rubrics.map((rubric) => {
  //                     const score = studentScores.find(
  //                       (s: any) => s.rubricId === rubric.id
  //                     );
  //                     return score ? score.value : 0;
  //                   });
                    
  //                   const newComments = rubrics.map((rubric) => {
  //                     const score = studentScores.find(
  //                       (s: any) => s.rubricId === rubric.id
  //                     );
  //                     return score?.comment || "";
  //                   });
                    
  //                   const newScoreIds = rubrics.map((rubric) => {
  //                     const score = studentScores.find(
  //                       (s: any) => s.rubricId === rubric.id
  //                     );
  //                     return score?.id || 0;
  //                   });
                    
  //                   return {
  //                     ...student,
  //                     scores: newScores,
  //                     criterionComments: newComments,
  //                     existingScoreIds: newScoreIds,
  //                   };
  //                 })
  //               );
  //             }
  //           }
  //         } catch (error) {
  //           console.error("Error refreshing scores after real-time update:", error);
  //         }
  //       };
        
  //       refreshScores();
  //     }
  //   },
  //   [sessionId, currentUserId, groupData, rubrics]
  // );

  // Initialize SignalR connection for real-time score updates - TẠM THỜI TẮT
  // const { isConnected: scoreRealtimeConnected } = useScoreRealTime({
  //   onScoreUpdate: handleScoreUpdate,
  //   sessionIds: sessionId ? [sessionId] : [],
  //   studentIds: groupData?.students.map((s) => s.id) || [],
  //   evaluatorIds: currentUserId ? [currentUserId] : [],
  // });

  // Tạm thời disable SignalR - dùng giá trị mặc định
  const scoreRealtimeConnected = false;

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
      swalConfig.info("Recording question");
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
          "Duplicate Question",
          "This question has already been recorded."
        );
      } else {
        setQuestionResults((prev) => [msg, ...prev]);
        swalConfig.success("Valid Question", "New question has been recorded.");
      }
    } else if (eventType === "error") {
      console.error("STT Error:", msg.message || msg.error);
      swalConfig.error("Speech Error", "Speech processing failed");
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
      const speakerName = msg.speaker_name || msg.speaker || "Member";
      swalConfig.toast.info(`${speakerName} is asking a question...`);
    } else if (eventType === "broadcast_question_processing") {
      // Người khác kết thúc đặt câu hỏi, đang xử lý - dùng toast nhẹ
      if (
        msg.source_session_id &&
        msg.source_session_id === mySessionIdRef.current
      ) {
        return;
      }
      const speakerName = msg.speaker_name || msg.speaker || "Member";
      swalConfig.toast.info(`Processing question from ${speakerName}...`);
    } else if (eventType === "broadcast_question_result") {
      // Kết quả câu hỏi từ người khác
      if (
        msg.source_session_id &&
        msg.source_session_id === mySessionIdRef.current
      ) {
        return;
      }
      const speakerName = msg.speaker_name || msg.speaker || "Member";
      const questionText = msg.question_text || "";

      if (msg.is_duplicate) {
        swalConfig.toast.info(`Question from ${speakerName} is duplicate`);
      } else {
        if (questionText) {
          setQuestionResults((prev) => [
            { ...msg, from_broadcast: true, speaker: speakerName },
            ...prev,
          ]);
        }
        swalConfig.toast.success(
          `Question from ${speakerName} has been recorded`
        );
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
  const WS_URL = sessionId ? getWebSocketUrl(sessionId, "member") : null;

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
        "Processing question...",
        "Please wait while the system analyzes your question"
      );

      const upgradePopupTimeout = setTimeout(() => {
        if (waitingForQuestionResult.current) {
          swalConfig.warning(
            "Processing...",
            "Analyzing question. You can continue with the defense."
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
        // Reset rubrics before loading to avoid stale data from previous group
        setRubrics([]);
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
        const urlSessionIdNumber = urlSessionId ? parseInt(urlSessionId) : null;
        const groupSession = urlSessionIdNumber
          ? sessions.find(
              (s: any) => s.groupId === groupId && s.id === urlSessionIdNumber
            ) || sessions.find((s: any) => s.groupId === groupId)
          : sessions.find((s: any) => s.groupId === groupId);
        if (groupSession) {
          setSessionId(groupSession.id);
          // CHỈ redirect nếu KHÔNG đang trong quá trình save
          // Để tránh redirect khi user vừa save score xong
          if (
            groupSession.status &&
            groupSession.status.toLowerCase() === "completed" &&
            !savingRef.current
          ) {
            setLoading(false);
            router.replace(`/member/grading/view/${groupId}`);
            return;
          }
        }

        // Get current user ID - ưu tiên từ auth token, fallback về localStorage
        const userInfo = authUtils.getCurrentUserInfo();
        let userId = userInfo.userId || "";

        // Fallback: nếu không có từ token, lấy từ localStorage
        if (!userId) {
          const storedUser = localStorage.getItem("user");
          if (storedUser) {
            try {
              const parsedUser = JSON.parse(storedUser);
              userId = parsedUser.id || "";
            } catch (err) {
              console.error("Error parsing user:", err);
            }
          }
        }

        // Set currentUserId state
        if (userId) {
          setCurrentUserId(userId);
        }

        // Kiểm tra committee-assignments/lecturer trước để xem có rubrics không
        let shouldShowRubrics = true;
        if (userId) {
          try {
            const assignmentRes = await committeeAssignmentsApi.getByLecturerId(
              userId
            );
            const assignments = Array.isArray(assignmentRes.data)
              ? assignmentRes.data
              : [];

            console.log("🔍 Checking committee assignments for rubrics:", {
              lecturerId: userId,
              assignmentsCount: assignments.length,
              assignments: assignments,
            });

            // Kiểm tra nếu assignment có rubrics null hoặc không có rubrics
            if (assignments.length > 0) {
              // Kiểm tra từng assignment xem có rubrics null không
              const hasRubrics = assignments.some((assignment: any) => {
                // Kiểm tra nếu có rubrics trong assignment (có thể là field rubrics hoặc rubricIds)
                const hasRubricsField =
                  assignment.rubrics !== null &&
                  assignment.rubrics !== undefined;
                const hasRubricIds =
                  assignment.rubricIds &&
                  Array.isArray(assignment.rubricIds) &&
                  assignment.rubricIds.length > 0;
                return hasRubricsField || hasRubricIds;
              });

              // Nếu tất cả assignments đều có rubrics null hoặc không có rubrics, không hiển thị
              if (!hasRubrics) {
                console.log(
                  "⚠️ No rubrics found in committee assignments (all null or empty), hiding rubrics"
                );
                shouldShowRubrics = false;
                setRubrics([]);
              }
            } else {
              // Nếu không có assignment nào, vẫn hiển thị rubrics (fallback behavior)
              console.log(
                "⚠️ No committee assignments found, will load rubrics as fallback"
              );
            }
          } catch (error: any) {
            console.warn("⚠️ Error checking committee assignments:", error);
            // Nếu lỗi, vẫn tiếp tục load rubrics như bình thường
          }
        }

        // Nếu không nên hiển thị rubrics, dừng lại và không load rubrics
        if (!shouldShowRubrics) {
          console.log(
            "✅ Skipping rubrics loading - no rubrics in committee assignments"
          );
          // Set empty rubrics và return early
          setRubrics([]);
          return;
        }

        // Fetch rubrics: ưu tiên từ project tasks (theo session và user), sau đó theo majorId
        let shouldSkipFallback = false; // Flag để skip fallback nếu API trả về data: []

        // Ưu tiên 1: Lấy rubrics từ API theo lecturer và session
        if (groupSession && userId) {
          try {
            console.log(
              "🔍 Attempting to load rubrics from lecturer/session API:",
              {
                lecturerId: userId,
                sessionId: groupSession.id,
              }
            );

            // Gọi API mới để lấy danh sách tên rubrics
            const rubricsRes =
              await projectTasksApi.getRubricsByLecturerAndSession(
                userId,
                groupSession.id
              );

            console.log("📋 Rubrics API response:", {
              hasData: !!rubricsRes.data,
              dataLength: Array.isArray(rubricsRes.data)
                ? rubricsRes.data.length
                : 0,
              rubricNames: rubricsRes.data,
            });

            if (
              rubricsRes.data &&
              Array.isArray(rubricsRes.data) &&
              rubricsRes.data.length > 0
            ) {
              // Lấy tất cả rubrics để map với tên
              const allRubricsRes = await rubricsApi
                .getAll()
                .catch(() => ({ data: [] }));
              const allRubrics = Array.isArray(allRubricsRes.data)
                ? allRubricsRes.data
                : [];

              // Map tên rubrics với full rubric objects, giữ nguyên thứ tự từ API
              rubricsList = rubricsRes.data
                .map((rubricName: string) => {
                  // Tìm rubric theo tên (case-insensitive)
                  const rubric = allRubrics.find(
                    (r: any) =>
                      r.rubricName?.toLowerCase() === rubricName.toLowerCase()
                  );
                  return rubric;
                })
                .filter((r: any): r is any => r !== null && r !== undefined);

              // Chỉ giữ rubric hợp lệ (có id hoặc rubricName)
              rubricsList = rubricsList.filter(
                (r: any) => r && (r.id || r.rubricName)
              );

              setRubrics(rubricsList);
              console.log(
                "✅ Rubrics loaded from lecturer/session API:",
                rubricsList.length,
                "rubrics:",
                rubricsList
              );
            } else {
              // API trả về data: [] - không có rubrics
              console.warn(
                "⚠️ No rubrics found from lecturer/session API (empty array)"
              );
              setRubrics([]); // Set empty để hiển thị message yêu cầu thêm tiêu chí
              rubricsList = []; // Đảm bảo rubricsList rỗng
              shouldSkipFallback = true; // Đánh dấu không fallback sang major rubrics
            }
          } catch (error: any) {
            // Nếu là 404 hoặc endpoint chưa có, fallback về logic cũ
            const is404 =
              error?.status === 404 ||
              error?.message?.includes("404") ||
              error?.message?.includes("not found");
            if (is404) {
              console.warn(
                "⚠️ Lecturer/session API endpoint not found (404), falling back to old logic"
              );
            } else {
              console.error(
                "❌ Error fetching rubrics from lecturer/session API:",
                error
              );
            }
            // Continue to fallback logic below
          }
        } else {
          console.warn("⚠️ Cannot load rubrics from lecturer/session API:", {
            hasSession: !!groupSession,
            hasUserId: !!userId,
            sessionId: groupSession?.id,
            userId: userId,
          });
        }

        // Fallback: Lấy rubrics theo majorId nếu chưa có từ project tasks
        // CHỈ fallback nếu API lỗi hoặc không có session/userId
        // KHÔNG fallback nếu API trả về data: [] (shouldSkipFallback = true)
        if (rubricsList.length === 0 && group?.majorId && !shouldSkipFallback) {
          try {
            console.log(
              "🔍 Fallback: Loading rubrics from majorId:",
              group.majorId
            );
            const majorRubricsRes = await majorRubricsApi.getByMajorId(
              group.majorId
            );
            console.log("📋 Major rubrics response:", {
              hasData: !!majorRubricsRes.data,
              dataLength: Array.isArray(majorRubricsRes.data)
                ? majorRubricsRes.data.length
                : 0,
              data: majorRubricsRes.data,
            });

            if (
              majorRubricsRes.data &&
              Array.isArray(majorRubricsRes.data) &&
              majorRubricsRes.data.length > 0
            ) {
              // Backend trả về MajorRubricReadDto có RubricId và RubricName, không có full Rubric object
              // Extract unique rubricIds từ major-rubrics
              const rubricIds = [
                ...new Set(
                  majorRubricsRes.data
                    .map((mr: any) => mr.rubricId)
                    .filter(
                      (id: any) => id !== null && id !== undefined && id > 0
                    )
                ),
              ];

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
                  .filter((r: any): r is any => r !== null && r !== undefined);

                setRubrics(rubricsList);
                console.log(
                  "✅ Rubrics loaded from major:",
                  rubricsList.length,
                  "rubrics:",
                  rubricsList
                );
              } else {
                console.warn(
                  "⚠️ No valid rubricIds found in major-rubrics response"
                );
              }
            } else {
              console.warn(
                "⚠️ Major rubrics response is not an array or empty"
              );
            }
          } catch (error) {
            console.error("❌ Error fetching rubrics by major:", error);
          }
        } else if (rubricsList.length === 0) {
          console.warn("⚠️ Cannot load rubrics from major - no majorId:", {
            hasGroup: !!group,
            majorId: group?.majorId,
          });
        }

        // Nếu vẫn không có rubrics, để trống (không dùng default criteria)
        if (rubricsList.length === 0) {
          console.warn(
            "⚠️ No rubrics found for group/session, will leave empty (no default criteria)"
          );
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

              // Create scores array based on rubrics (empty array if no rubrics)
              const rubricCount = rubricsList.length;
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

          // Load member notes for this session
          if (groupSession?.id) {
            try {
              const notesRes = await memberNotesApi.getBySessionId(groupSession.id);
              const notes = notesRes.data || [];
              setMemberNotes(notes);
              
              // Map notes to students by committeeAssignmentId or userName
              // Note: We'll display notes separately, not in student.note field
              console.log("Loaded member notes:", notes);
            } catch (error) {
              console.error("Error loading member notes:", error);
              setMemberNotes([]);
            }
          }
        } else {
          // Tạo empty groupData hoặc từ students đã fetch (không fallback criteria)
          const rubricCountFallback = rubricsList.length;
          const normalizedStudents =
            students.length > 0
              ? await Promise.all(
                  students.map(async (s: StudentDto, index: number) => {
                    const rawRole =
                      (s as any).groupRole || (s as any).GroupRole;
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
                      criterionComments: new Array(rubricCountFallback).fill(
                        ""
                      ),
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
        const normalizedStudents = buildFallbackStudents(
          [],
          rubricCountFallback
        );
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

  const calculateAverage = (scores: number[]) => {
    if (scores.length === 0) return "0.00";
    return (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2);
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

  // Notes are read-only, no need for handleNoteChange

  const toggleNoteVisibility = (studentId: string) =>
    setNotesVisibility((prev) => ({ ...prev, [studentId]: !prev[studentId] }));

  const handleSave = async () => {
    // Triple check - prevent save if no rubrics (check for undefined, null, or empty)
    if (!hasRubrics) {
      await swalConfig.error("Error", "No grading criteria available");
      return;
    }

    if (!sessionId) {
      await swalConfig.error("Error", "Defense session not found");
      return;
    }

    if (!currentUserId) {
      await swalConfig.error("Error", "User ID not found");
      return;
    }

    // Additional safety check - verify rubrics before proceeding
    if (!hasRubrics) {
      await swalConfig.error("Error", "Cannot save scores without grading criteria");
      return;
    }

    try {
      // Final safety check trước khi lưu - không cho lưu nếu không có rubrics
      if (!hasRubrics) {
        await swalConfig.error(
          "Error",
          "Cannot save scores without grading criteria."
        );
        return;
      }

      setSaving(true);
      savingRef.current = true; // Set flag để prevent redirect
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

          if (!rubric) {
            // Nếu không có rubric tương ứng, bỏ qua
            continue;
          }

          if (existingScoreId && existingScoreId > 0) {
            // Update existing score - validate rubric ID from name for consistency
            try {
              const rubricName = (rubric.rubricName || rubric.name)?.trim();
              if (rubricName) {
                try {
                  const rubricIdRes = await rubricsApi.getIdByName(rubricName);
                  const validatedRubricId = rubricIdRes.data;
                  console.log(
                    `✅ Validated rubric ID ${validatedRubricId} for update, name: "${rubricName}"`
                  );
                } catch (nameError: any) {
                  console.warn(
                    `⚠️ Could not validate rubric by name "${rubricName}" for update:`,
                    nameError.message
                  );
                  // Continue with update anyway since rubricId is not required in ScoreUpdateDto
                }
              }

              await scoresApi.update(existingScoreId, {
                value: score,
                comment: criterionComment || undefined,
              });
            } catch (error) {
              console.error("Error updating score:", error);
              // Continue with next score instead of breaking the entire save process
            }
          } else if (score > 0) {
            // Create new score - get rubric ID by name using API, with fallback to rubric.id
            let rubricId: number;
            try {
              // Get rubric ID by name using API
              const rubricName = (rubric.rubricName || rubric.name)?.trim();
              if (!rubricName) {
                console.error("Missing rubric name for rubric:", rubric);
                // Fallback: try to use rubric.id if available
                if (rubric.id && typeof rubric.id === "number") {
                  console.warn("Using rubric.id as fallback:", rubric.id);
                  rubricId = rubric.id;
                } else {
                  continue; // Skip this rubric if no name and no id
                }
              } else {
                try {
                  const rubricIdRes = await rubricsApi.getIdByName(rubricName);
                  rubricId = rubricIdRes.data;
                  console.log(
                    `✅ Found rubric ID ${rubricId} for name: "${rubricName}"`
                  );
                } catch (nameError: any) {
                  console.warn(
                    `⚠️ Could not find rubric by name "${rubricName}":`,
                    nameError.message
                  );
                  // Fallback: try to use rubric.id if available
                  if (rubric.id && typeof rubric.id === "number") {
                    console.warn(
                      `Using rubric.id ${rubric.id} as fallback for name "${rubricName}"`
                    );
                    rubricId = rubric.id;
                  } else {
                    console.error(
                      `❌ Cannot create score: rubric not found by name "${rubricName}" and no rubric.id available`
                    );
                    continue; // Skip this rubric
                  }
                }
              }

              // Validate all required fields before creating score
              if (!currentUserId) {
                console.error("Missing currentUserId for score creation");
                continue;
              }
              if (!student.id) {
                console.error("Missing student.id for score creation");
                continue;
              }
              if (!sessionId || sessionId === 0) {
                console.error(
                  "Missing or invalid sessionId for score creation:",
                  sessionId
                );
                continue;
              }
              if (!rubricId || rubricId === 0) {
                console.error(
                  "Missing or invalid rubricId for score creation:",
                  rubricId
                );
                continue;
              }

              const newScore: ScoreCreateDto = {
                value: score,
                rubricId: rubricId,
                evaluatorId: currentUserId,
                studentId: student.id,
                sessionId: sessionId,
                comment: criterionComment || undefined,
              };

              console.log("Creating score with data:", newScore);
              console.log("Score validation check:");
              console.log("- value:", typeof score, score);
              console.log("- rubricId:", typeof rubricId, rubricId);
              console.log(
                "- evaluatorId:",
                typeof currentUserId,
                currentUserId
              );
              console.log("- studentId:", typeof student.id, student.id);
              console.log("- sessionId:", typeof sessionId, sessionId);
              console.log(
                "- comment:",
                typeof criterionComment,
                criterionComment
              );

              await scoresApi.create(newScore);
            } catch (error) {
              console.error(
                "Error getting rubric ID or creating score:",
                error
              );
              // Continue with next score instead of breaking the entire save process
            }
          }
        }

        // Notes are read-only, no need to save them
      }

      Swal.close();
      
      // Reload lại data trước khi hiển thị success message
      // Để đảm bảo data được refresh ngay lập tức
      try {
        if (groupData && sessionId && currentUserId) {
          const updatedStudents = await Promise.all(
            studentScores.map(async (student) => {
              const scoresRes = await scoresApi
                .getByStudentId(student.id)
                .catch(() => ({ data: [] }));
              const existingScores = scoresRes.data || [];

              // Filter scores for current session
              const sessionScores = existingScores.filter(
                (score: ScoreReadDto) => score.sessionId === sessionId
              );

              // Create scores array based on rubrics
              const scoresArray = new Array(rubrics.length).fill(0);
              const scoreIds = new Array(rubrics.length).fill(0);
              const commentsArray = new Array(rubrics.length).fill("");

              // Map existing scores to rubrics
              sessionScores.forEach((score: ScoreReadDto) => {
                const rubricIndex = rubrics.findIndex(
                  (r: any) => r.id === score.rubricId
                );
                if (rubricIndex >= 0) {
                  scoresArray[rubricIndex] = score.value;
                  scoreIds[rubricIndex] = score.id;
                  commentsArray[rubricIndex] = score.comment || "";
                }
              });

              return {
                ...student,
                scores: scoresArray,
                criterionComments: commentsArray,
                existingScoreIds: scoreIds,
              };
            })
          );

          setStudentScores(updatedStudents);
        }
      } catch (error) {
        console.error("Error refreshing scores after save:", error);
      }
      
      // Hiển thị success message sau khi đã refresh data
      // KHÔNG redirect - chỉ hiển thị thông báo và ở lại trang hiện tại
      // Sử dụng SweetAlert2 modal (alert2)
      await swalConfig.success(
        "Success",
        "Scores and notes saved successfully!"
      );
      
      // Đảm bảo không có redirect nào được thực hiện
      // Return ngay để tránh bất kỳ logic nào khác có thể trigger redirect
      return;
    } catch (error: any) {
      console.error("Error saving scores:", error);
      // Close loading dialog if it exists
      Swal.close();
      swalConfig.error("Error", "Failed to save scores");
    } finally {
      setSaving(false);
      // Reset flag sau một khoảng thời gian ngắn để tránh race condition
      setTimeout(() => {
        savingRef.current = false;
      }, 2000); // 2 giây sau khi save xong mới cho phép redirect
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
                        ? "Waiting for secretary to start session"
                        : "Start recording"
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
                          <span>End Question</span>
                        </>
                      ) : (
                        <>
                          <MessageSquare className="w-4 h-4" />
                          <span>Ask Question</span>
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
                  title={wsConnected ? "Connected" : "Not connected"}
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
                onClick={(e) => {
                  // Strict check for rubrics
                  const hasNoRubrics = !hasRubrics;
                  if (saving || hasNoRubrics) {
                    e.preventDefault();
                    e.stopPropagation();
                    if (hasNoRubrics) {
                      swalConfig.error("Error", "No grading criteria available");
                    }
                    return;
                  }
                  handleSave();
                }}
                disabled={saving || !hasRubrics}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-white text-sm font-medium shadow-sm ${
                  saving || !hasRubrics
                    ? "bg-gray-400 cursor-not-allowed opacity-60 pointer-events-none"
                    : "bg-gradient-to-r from-purple-600 to-blue-500 hover:opacity-90 transition cursor-pointer"
                }`}
                title={
                  !hasRubrics
                    ? "Please add grading criteria before saving scores"
                    : ""
                }
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
          ) : !hasRubrics ? (
            <div className="py-8">
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                <h3 className="text-base font-semibold text-gray-800 mb-2 text-left">
                  No Grading Criteria Available
                </h3>
                <p className="text-sm text-gray-600 mb-4 text-left">
                  No grading criteria have been assigned to you for this
                  session. Please contact the administrator to add grading
                  criteria.
                </p>
                <div className="mt-4">
                  <p className="text-sm font-medium text-gray-700 mb-2 text-left">
                    Students in group:
                  </p>
                  <div className="bg-white rounded border border-gray-200 p-3">
                    <div className="space-y-1">
                      {studentScores.map((student) => (
                        <div
                          key={student.id}
                          className="py-1.5 border-b border-gray-100 last:border-0 text-left"
                        >
                          <p className="text-sm font-medium text-gray-800">
                            {student.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {student.role} • ID: {student.id}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-600">
                      <th className="py-2 pr-4">Student</th>
                      {hasRubrics &&
                        rubrics.map((r: any) => (
                          <th key={r.id || r.rubricName} className="py-2 px-3">
                            <div className="flex flex-col">
                              <span className="font-medium">
                                {r.rubricName || r.name}
                              </span>
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
                                  disabled={rubrics.length === 0}
                                  className={`w-20 rounded-md border px-2 py-1 text-sm text-center focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors ${
                                    rubrics.length === 0
                                      ? "bg-gray-100 cursor-not-allowed opacity-50"
                                      : ""
                                  }`}
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
                                  disabled={rubrics.length === 0}
                                  className={`w-full rounded-md border px-2 py-1 text-xs text-gray-700 focus:ring-1 focus:ring-purple-500 focus:border-purple-500 transition-colors ${
                                    rubrics.length === 0
                                      ? "bg-gray-100 cursor-not-allowed opacity-50"
                                      : ""
                                  }`}
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
                                    disabled={rubrics.length === 0}
                                    onClick={() => {
                                      const newScores = [...studentScores];
                                      newScores[studentIndex].scores =
                                        newScores[studentIndex].scores.map(
                                          () => score
                                        );
                                      setStudentScores(newScores);
                                    }}
                                    className={`px-1.5 py-0.5 text-xs rounded border transition-colors ${
                                      rubrics.length === 0
                                        ? "bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed opacity-50"
                                        : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
                                    }`}
                                    title={
                                      rubrics.length === 0
                                        ? "Please add grading criteria"
                                        : `Set all scores to ${score}`
                                    }
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
                            <td
                              colSpan={
                                (rubrics.length > 0
                                  ? rubrics.length
                                  : criteria.length) + 3
                              }
                              className="py-3"
                            >
                              <div className="bg-gray-50 border rounded-md p-3">
                                <div className="mb-3">
                                  <h4 className="text-sm font-semibold text-gray-700 mb-2">
                                    Member Notes
                                  </h4>
                                  {memberNotes.length > 0 ? (
                                    <div className="space-y-2">
                                      {memberNotes.map((note) => (
                                        <div
                                          key={note.id}
                                          className="bg-white border rounded-md p-3 text-sm"
                                        >
                                          <div className="flex items-start justify-between mb-1">
                                            <span className="font-medium text-gray-700">
                                              {note.userName || "Unknown Member"}
                                            </span>
                                            <span className="text-xs text-gray-500">
                                              {new Date(note.createdAt).toLocaleString()}
                                            </span>
                                          </div>
                                          <p className="text-gray-600 mt-1 whitespace-pre-wrap">
                                            {note.noteContent || "No content"}
                                          </p>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <p className="text-sm text-gray-500 italic">
                                      No notes available for this session.
                                    </p>
                                  )}
                                </div>
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
