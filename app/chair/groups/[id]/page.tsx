"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Mic, MicOff, MessageSquare, StopCircle } from "lucide-react";
import { groupsApi } from "@/lib/api/groups";
import { studentsApi } from "@/lib/api/students";
import { defenseSessionsApi } from "@/lib/api/defense-sessions";
import { rubricsApi } from "@/lib/api/rubrics";
import { memberNotesApi } from "@/lib/api/member-notes";
import { useAudioRecorder } from "@/lib/hooks/useAudioRecorder";
import { useVoiceEnrollmentCheck } from "@/lib/hooks/useVoiceEnrollmentCheck";
import { swalConfig, closeSwal } from "@/lib/utils/sweetAlert";
import type {
  GroupDto,
  StudentDto,
  DefenseSessionDto,
  RubricDto,
  MemberNoteDto,
  ScoreDto,
} from "@/lib/models";
import { scoresApi } from "@/lib/api/scores";
import CreateTaskModal from "../../components/CreateTaskModal";
import { getWebSocketUrl } from "@/lib/config/api-urls";
import { useScoreRealTime } from "@/lib/hooks/useScoreRealTime";

export default function GroupDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  // Voice enrollment check - must be enrolled to access this page
  const { isChecking: checkingVoice } = useVoiceEnrollmentCheck();

  // Session role check states
  const [sessionRoleChecked, setSessionRoleChecked] = useState(false);
  const [actualSessionRole, setActualSessionRole] = useState<string | null>(
    null
  );

  const [group, setGroup] = useState<GroupDto | null>(null);
  const [students, setStudents] = useState<StudentDto[]>([]);
  const [defenseSession, setDefenseSession] =
    useState<DefenseSessionDto | null>(null);
  const [lecturers, setLecturers] = useState<any[]>([]);
  const [rubrics, setRubrics] = useState<RubricDto[]>([]);
  const [memberNotes, setMemberNotes] = useState<MemberNoteDto[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [isChair, setIsChair] = useState(false);
  const [openTaskModal, setOpenTaskModal] = useState(false);

  // Score Table State
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [studentScores, setStudentScores] = useState<ScoreDto[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Total Score State (Chair only)
  const [totalScoreInput, setTotalScoreInput] = useState<string>("");
  const [savingTotalScore, setSavingTotalScore] = useState(false);
  const [displayedTotalScore, setDisplayedTotalScore] = useState<number | null>(
    null
  );

  // Mic and session states (giống member)
  const [sessionStarted, setSessionStarted] = useState(false); // Thư ký đã bắt đầu phiên chưa
  const [questionResults, setQuestionResults] = useState<any[]>([]);
  const [hasQuestionFinalText, setHasQuestionFinalText] = useState(false);
  const [mySessionId, setMySessionId] = useState<string | null>(null);
  const mySessionIdRef = useRef<string | null>(null);
  const questionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const waitingForQuestionResult = useRef<boolean>(false);

  // WebSocket event handler (giống member)
  const handleSTTEvent = (msg: any) => {
    const eventType = msg.type || msg.event;
    console.log("📨 [Chair] Received WS event:", eventType, msg);

    if (
      eventType === "session_started" ||
      eventType === "broadcast_session_started"
    ) {
      // Thư ký đã bắt đầu phiên
      console.log("🎤 Session started by secretary - mic enabled");
      setSessionStarted(true);
    } else if (
      eventType === "session_ended" ||
      eventType === "broadcast_session_ended"
    ) {
      // Thư ký đã kết thúc phiên
      console.log("🛑 Session ended by secretary - mic disabled");
      setSessionStarted(false);
    } else if (eventType === "question_mode_started") {
      // Chính mình bắt đầu đặt câu hỏi
      swalConfig.info("Recording question");
      setHasQuestionFinalText(false);
    } else if (eventType === "question_mode_result") {
      // Kết quả câu hỏi của CHÍNH MÌNH
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
      swalConfig.error(
        "STT Error",
        msg.message || msg.error || "An unknown error occurred"
      );
    } else if (eventType === "broadcast_transcript") {
      // Transcript từ client khác trong cùng session
      if (
        msg.source_session_id &&
        msg.source_session_id === mySessionIdRef.current
      ) {
        console.log("🚫 Ignoring broadcast from self");
        return;
      }
      console.log("📢 Broadcast from other client:", msg.speaker, msg.text);
    } else if (eventType === "broadcast_question_started") {
      // Người khác (member/thư ký) bắt đầu đặt câu hỏi - dùng toast nhẹ
      if (
        msg.source_session_id &&
        msg.source_session_id === mySessionIdRef.current
      ) {
        return;
      }
      swalConfig.toast.info("A member is asking a question...");
    } else if (eventType === "broadcast_question_processing") {
      // Người khác kết thúc đặt câu hỏi, đang xử lý - dùng toast nhẹ
      if (
        msg.source_session_id &&
        msg.source_session_id === mySessionIdRef.current
      ) {
        return;
      }
      swalConfig.toast.info("Processing question...");
    } else if (eventType === "broadcast_question_result") {
      // Kết quả câu hỏi từ người khác
      if (
        msg.source_session_id &&
        msg.source_session_id === mySessionIdRef.current
      ) {
        return;
      }
      const questionText = msg.question_text || "";

      if (msg.is_duplicate) {
        swalConfig.toast.info("This question is duplicate");
      } else {
        if (questionText) {
          setQuestionResults((prev) => [
            { ...msg, from_broadcast: true },
            ...prev,
          ]);
        }
        swalConfig.toast.success("New question has been recorded");
      }
    } else if (eventType === "connected") {
      console.log(
        "✅ WebSocket connected:",
        msg.session_id,
        "room_size:",
        msg.room_size
      );
      if (msg.session_id) {
        setMySessionId(msg.session_id);
        mySessionIdRef.current = msg.session_id;
      }
    }
  };

  // WebSocket URL - kết nối cùng session với thư ký
  const WS_URL = defenseSession?.id
    ? getWebSocketUrl(defenseSession.id, "chair")
    : null;

  const {
    isRecording,
    isAsking,
    wsConnected,
    startRecording,
    stopRecording,
    toggleAsk,
    broadcastQuestionStarted,
    broadcastQuestionProcessing,
  } = useAudioRecorder({
    wsUrl: WS_URL || "",
    onWsEvent: handleSTTEvent,
    autoConnect: !!defenseSession?.id,
  });

  const handleToggleRecording = async () => {
    if (isRecording) {
      stopRecording();
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
            "Processing question...",
            "The system is analyzing your question. You can continue with the defense session, results will be displayed when ready."
          );
        }
      }, 5000);

      if (!questionTimeoutRef.current) {
        questionTimeoutRef.current = upgradePopupTimeout;
      }

      toggleAsk();
    }
  };

  // Handle submit total score (Chair only)
  const handleSubmitTotalScore = async () => {
    if (!defenseSession?.id || !totalScoreInput) return;

    const score = parseFloat(totalScoreInput);
    if (isNaN(score) || score < 0 || score > 10) {
      swalConfig.error(
        "Invalid Score",
        "Please enter a valid score between 0 and 10."
      );
      return;
    }

    try {
      setSavingTotalScore(true);
      await defenseSessionsApi.updateTotalScore(defenseSession.id, score);
      swalConfig.success(
        "Score Updated",
        `Total score has been updated to ${score}.`
      );
      // Update displayed score and clear input
      setDisplayedTotalScore(score);
      setTotalScoreInput("");
    } catch (err: any) {
      console.error("Failed to update total score:", err);

      // Check if error is about session status conflict
      const errorMessage = err.message || "";
      if (
        errorMessage.includes("conflict") ||
        errorMessage.includes("409") ||
        errorMessage.includes("state")
      ) {
        swalConfig.error(
          "Cannot Update Score",
          "Total score can only be updated for sessions with 'Completed' status. Please complete the session first."
        );
      } else {
        swalConfig.error(
          "Update Failed",
          errorMessage || "Failed to update total score. Please try again."
        );
      }
    } finally {
      setSavingTotalScore(false);
    }
  };

  // Xóa session role khi rời khỏi trang
  useEffect(() => {
    return () => {
      sessionStorage.removeItem("sessionRole");
    };
  }, []);

  useEffect(() => {
    if (!id) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        // 1. Fetch group first to get majorId
        const [groupRes, studentsRes, sessionsRes] = await Promise.all([
          groupsApi.getById(id),
          studentsApi.getByGroupId(id),
          defenseSessionsApi.getByGroupId(id),
        ]);

        // Get current userId and userRole from accessToken
        const { authUtils } = await import("@/lib/utils/auth");
        const userInfo = authUtils.getCurrentUserInfo();
        const currentUid = userInfo.userId || "";
        const storedRole = userInfo.role || "";

        let isSystemChair = false;
        if (currentUid) {
          setCurrentUserId(currentUid);

          // Check if user has system Chair role
          if (storedRole === "chair") {
            isSystemChair = true;
          }
        }

        // If system chair, grant access immediately
        if (isSystemChair) {
          setIsChair(true);
        }

        if (groupRes.data) {
          setGroup(groupRes.data);

          // 2. Fetch all rubrics
          try {
            const rubricsRes = await rubricsApi.getAll();
            if (rubricsRes.data) {
              setRubrics(rubricsRes.data);
            }
          } catch (rubricError) {
            console.error("Error fetching rubrics:", rubricError);
            setRubrics([]);
          }
        }
        if (studentsRes.data) {
          setStudents(studentsRes.data);
        }

        // 2. If session exists, fetch lecturers and member notes
        if (sessionsRes.data && sessionsRes.data.length > 0) {
          const session = sessionsRes.data[0];
          setDefenseSession(session);

          // Set displayed total score from session (if exists)
          if (
            (session as any).totalScore !== null &&
            (session as any).totalScore !== undefined
          ) {
            setDisplayedTotalScore((session as any).totalScore);
          }

          // Fetch member notes by sessionId
          try {
            const memberNotesRes = await memberNotesApi.getBySessionId(
              session.id
            );
            if (memberNotesRes.data) {
              setMemberNotes(memberNotesRes.data);
            }
          } catch (notesErr) {
            console.error("Failed to fetch member notes:", notesErr);
            setMemberNotes([]);
          }

          try {
            const lecturersRes = await defenseSessionsApi.getUsersBySessionId(
              session.id
            );
            if (lecturersRes.data) {
              // Filter out students
              const studentIds = new Set(
                studentsRes.data?.map((s) => s.id) || []
              );
              const onlyLecturers = lecturersRes.data.filter(
                (user: any) => !studentIds.has(user.id)
              );
              setLecturers(onlyLecturers);

              // Check if current user is Chair (if not already set by system role)
              if (currentUid) {
                const currentUserInSession = onlyLecturers.find(
                  (l: any) =>
                    String(l.id).toLowerCase() ===
                    String(currentUid).toLowerCase()
                );

                // Lưu session role vào localStorage để sidebar hiển thị
                if (currentUserInSession && currentUserInSession.role) {
                  const sessionRoleValue =
                    currentUserInSession.role.toLowerCase();
                  sessionStorage.setItem("sessionRole", sessionRoleValue);
                  setActualSessionRole(sessionRoleValue);

                  if (!isSystemChair && sessionRoleValue === "chair") {
                    setIsChair(true);
                  }

                  // If user is not Chair in this session, redirect to correct page
                  if (sessionRoleValue !== "chair" && !isSystemChair) {
                    const sId = session.id;
                    const gId = id;
                    if (sessionRoleValue === "secretary") {
                      router.push(`/secretary/transcript/${sId}`);
                    } else if (sessionRoleValue === "member") {
                      router.push(`/member/grading/view/${gId}`);
                    } else {
                      router.push(`/home/view/${gId}`);
                    }
                    return;
                  }
                } else {
                  // User not found in session - redirect to home
                  router.push(`/home/view/${id}`);
                  return;
                }
              }
              setSessionRoleChecked(true);
            }
          } catch (lecErr) {
            console.error("Failed to fetch lecturers:", lecErr);
          }
        }
      } catch (err) {
        console.error("Failed to fetch details:", err);
        setError("Failed to load group details. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  // Set initial selected student when students are loaded
  useEffect(() => {
    if (students.length > 0 && !selectedStudentId) {
      setSelectedStudentId(students[0].id);
    }
  }, [students, selectedStudentId]);

  // Function to fetch scores for selected student (using ref to avoid stale closure)
  const fetchScoresForStudentRef = useRef<
    ((studentId: string) => Promise<void>) | null
  >(null);

  const fetchScoresForStudent = async (studentId: string) => {
    if (!studentId) return;
    try {
      const res = await scoresApi.getByStudentId(studentId);
      if (res.data) {
        setStudentScores(res.data);
      } else {
        setStudentScores([]);
      }
    } catch (err) {
      console.error("Failed to fetch scores:", err);
      setStudentScores([]);
    }
  };

  // Store ref for use in real-time callback
  fetchScoresForStudentRef.current = fetchScoresForStudent;

  // Fetch scores when selected student changes
  useEffect(() => {
    fetchScoresForStudent(selectedStudentId);
  }, [selectedStudentId]);

  // Real-time score updates via SignalR
  const { isConnected } = useScoreRealTime({
    sessionIds: defenseSession?.id ? [defenseSession.id] : [],
    studentIds: selectedStudentId ? [selectedStudentId] : [],
    onScoreUpdate: (update) => {
      console.log("📊 Real-time score update received in chair page:", update);

      // Check if update is relevant to current student or session
      const isRelevant =
        (update.studentId && update.studentId === selectedStudentId) ||
        (update.sessionId && update.sessionId === defenseSession?.id);

      if (isRelevant && selectedStudentId) {
        // Refresh scores for current student
        console.log("🔄 Refreshing scores after real-time update...");
        // Small delay to ensure backend has processed the update
        setTimeout(() => {
          if (fetchScoresForStudentRef.current) {
            fetchScoresForStudentRef.current(selectedStudentId);
          }
        }, 500);
      }
    },
  });

  // Show loading while checking voice enrollment
  if (checkingVoice) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="text-gray-500">Checking voice enrollment...</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="text-gray-500">Loading group details...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[60vh] gap-4">
        <div className="text-red-500">{error}</div>
        <button onClick={() => router.back()} className="btn-secondary">
          Go Back
        </button>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[60vh] gap-4">
        <div className="text-gray-500">Group not found.</div>
        <button onClick={() => router.back()} className="btn-secondary">
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <CreateTaskModal
          open={openTaskModal}
          onClose={() => setOpenTaskModal(false)}
          lecturers={lecturers}
          rubrics={rubrics}
          currentUserId={currentUserId}
          sessionId={defenseSession?.id}
        />

        {/* Header with Back Button */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => router.push("/home")}
            className="p-2 hover:bg-white rounded-lg transition-colors shadow-sm border border-gray-200"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="w-5 h-5 text-gray-600"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
              />
            </svg>
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {group.groupName || group.projectCode || "Group Details"}
            </h1>
            <p className="text-gray-600">
              {group.semesterName} · {group.majorName}
            </p>
          </div>

          {/* Mic Controls - giống member */}
          {defenseSession && (
            <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg border ml-4">
              {!isRecording ? (
                <button
                  onClick={handleToggleRecording}
                  disabled={!defenseSession?.id || !sessionStarted}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-white text-sm font-medium shadow-sm transition ${
                    !defenseSession?.id || !sessionStarted
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
          )}

          <div className="ml-auto">
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                group.status === "Active"
                  ? "bg-green-100 text-green-700"
                  : "bg-yellow-100 text-yellow-700"
              }`}
            >
              {group.status}
            </span>
          </div>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Main Info */}
          <div className="md:col-span-2 space-y-6">
            {/* Project Info Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-4">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                    className="w-5 h-5"
                  >
                    <path d="M11.25 4.533A9.707 9.707 0 006 3a9.735 9.735 0 00-3.25.555.75.75 0 00-.5.707v14.25a.75.75 0 001 .707A8.237 8.237 0 016 18.75c1.995 0 3.823.707 5.25 1.886V4.533zM12.75 20.636A8.214 8.214 0 0118 18.75c.966 0 1.89.166 2.75.47a.75.75 0 001-.708V4.262a.75.75 0 00-.5-.707A9.735 9.735 0 0018 3a9.707 9.707 0 00-5.25 1.533v16.103z" />
                  </svg>
                  Project Information
                </h2>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Project Code
                    </label>
                    <p className="text-gray-900 font-medium">
                      {group.projectCode || "N/A"}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                      English Title
                    </label>
                    <p className="text-gray-900 font-medium">
                      {group.topicTitle_EN || "N/A"}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Vietnamese Title
                    </label>
                    <p className="text-gray-900 font-medium">
                      {group.topicTitle_VN || "N/A"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Members Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600 to-cyan-600 px-6 py-4">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                    className="w-5 h-5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
                    />
                  </svg>
                  Group Students
                  <span className="ml-auto bg-white/20 px-2 py-0.5 rounded-full text-xs">
                    {students.length} members
                  </span>
                </h2>
              </div>
              <div className="p-6">
                {students.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {students.map((student) => (
                      <div
                        key={student.id}
                        className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-100 hover:shadow-md transition-shadow"
                      >
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold shadow-sm">
                          {student.userName
                            ? student.userName.charAt(0).toUpperCase()
                            : "S"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate">
                            {student.userName || "Unknown Name"}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {student.email}
                          </p>
                        </div>
                        {student.studentCode && (
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-lg">
                            {student.studentCode}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm italic text-center py-4">
                    No members found in this group.
                  </p>
                )}
              </div>
            </div>

            {/* Individual Scores Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      stroke="currentColor"
                      className="w-5 h-5"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z"
                      />
                    </svg>
                    Individual Scores
                  </h2>
                  {/* Real-time connection status */}
                  {defenseSession?.id && (
                    <div className="flex items-center gap-2 text-white/90 text-sm">
                      <div
                        className={`w-2 h-2 rounded-full ${
                          isConnected
                            ? "bg-green-300 animate-pulse"
                            : "bg-red-300"
                        }`}
                      />
                      <span className="text-xs">
                        {isConnected ? "Live" : "Offline"}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <div className="p-6">
                {/* Student Tabs */}
                {students.length > 0 ? (
                  <>
                    <div className="flex flex-wrap gap-2 mb-6">
                      {students.map((student) => (
                        <button
                          key={student.id}
                          onClick={() => setSelectedStudentId(student.id)}
                          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                            selectedStudentId === student.id
                              ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-md"
                              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                          }`}
                        >
                          {student.userName || student.email}
                        </button>
                      ))}
                    </div>

                    {/* Scores Table */}
                    <div className="overflow-x-auto rounded-xl border border-gray-200">
                      <table className="w-full text-sm text-left">
                        <thead className="text-xs text-white uppercase bg-gradient-to-r from-gray-700 to-gray-800">
                          <tr>
                            <th className="px-5 py-3 font-semibold">
                              Criteria
                            </th>
                            <th className="px-5 py-3 font-semibold text-center">
                              Score
                            </th>
                            <th className="px-5 py-3 font-semibold text-right">
                              Evaluator
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {studentScores.length > 0 ? (
                            studentScores.map((score, idx) => (
                              <tr
                                key={score.id}
                                className={
                                  idx % 2 === 0 ? "bg-white" : "bg-gray-50"
                                }
                              >
                                <td className="px-5 py-4 font-medium text-gray-900">
                                  {score.rubricName || "Unknown Criteria"}
                                </td>
                                <td className="px-5 py-4 text-center">
                                  <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 font-bold">
                                    {score.value}
                                  </span>
                                </td>
                                <td className="px-5 py-4 text-right text-gray-600">
                                  {score.evaluatorName || "Unknown Evaluator"}
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td
                                colSpan={3}
                                className="px-5 py-8 text-center text-gray-500 italic"
                              >
                                No scores available for this student.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-gray-500 italic text-center py-4">
                    No students found in this group.
                  </p>
                )}
              </div>
            </div>

            {/* Member Notes Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-orange-500 to-amber-500 px-6 py-4">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                    className="w-5 h-5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
                    />
                  </svg>
                  Committee Member Notes
                  {memberNotes.length > 0 && (
                    <span className="ml-auto bg-white/20 px-2 py-0.5 rounded-full text-xs">
                      {memberNotes.length} notes
                    </span>
                  )}
                </h2>
              </div>
              <div className="p-6">
                {memberNotes.length > 0 ? (
                  <div className="space-y-3">
                    {memberNotes.map((note) => (
                      <div
                        key={note.id}
                        className="p-4 bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl border border-orange-100"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-white text-xs font-bold">
                            {(note.userName || "U").charAt(0).toUpperCase()}
                          </div>
                          <p className="text-sm font-semibold text-orange-700">
                            {note.userName || "Unknown User"}
                          </p>
                        </div>
                        <p className="text-sm text-gray-700 pl-9">
                          {note.noteContent}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-orange-100 flex items-center justify-center">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                        className="w-6 h-6 text-orange-400"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                        />
                      </svg>
                    </div>
                    <p className="text-sm text-gray-500">
                      No notes found for this session.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar Info */}
          <div className="space-y-6">
            {/* Defense Council Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex justify-between items-center">
                <h2 className="text-lg font-semibold text-white">
                  Defense Council
                </h2>
                {isChair && (
                  <button
                    onClick={() => setOpenTaskModal(true)}
                    className="px-4 py-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-lg transition-colors text-sm font-medium text-white"
                  >
                    + Create Task
                  </button>
                )}
              </div>
              <div className="p-6">
                {defenseSession ? (
                  <div className="space-y-4">
                    <div className="p-3 bg-purple-50 rounded-lg border border-purple-100">
                      <p className="text-xs text-purple-600 font-medium mb-1">
                        Session Info
                      </p>
                      <div className="flex items-center gap-2 text-sm text-gray-700">
                        <span>
                          📅{" "}
                          {new Date(
                            defenseSession.defenseDate
                          ).toLocaleDateString("vi-VN", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-700 mt-1">
                        <span>
                          ⏰{" "}
                          {defenseSession.startTime
                            ?.split(":")
                            .slice(0, 2)
                            .join(":")}{" "}
                          -{" "}
                          {defenseSession.endTime
                            ?.split(":")
                            .slice(0, 2)
                            .join(":")}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-700 mt-1">
                        <span>📍 {defenseSession.location}</span>
                      </div>
                    </div>

                    <div className="h-px bg-gray-100 my-2"></div>

                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">
                      Council Members
                    </p>
                    {lecturers.length > 0 ? (
                      <div className="space-y-3">
                        {lecturers.map((lecturer) => (
                          <div
                            key={lecturer.id}
                            className="flex items-center gap-3"
                          >
                            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-xs font-bold">
                              {lecturer.fullName
                                ? lecturer.fullName.charAt(0).toUpperCase()
                                : "L"}
                            </div>
                            <div className="overflow-hidden">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {lecturer.fullName ||
                                  lecturer.userName ||
                                  "Unknown Lecturer"}
                                {lecturer.role && (
                                  <span className="text-gray-500 font-normal ml-1">
                                    ({lecturer.role})
                                  </span>
                                )}
                              </p>
                              <p className="text-xs text-gray-500 truncate">
                                {lecturer.email}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 italic">
                        No lecturers assigned yet.
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 italic">
                    No defense session scheduled for this group.
                  </p>
                )}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-4">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                    className="w-5 h-5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
                    />
                  </svg>
                  Scoring
                </h2>
              </div>
              <div className="p-6 space-y-5">
                {/* Total Score Display */}
                <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl p-5 border border-emerald-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-emerald-700 font-medium mb-1">
                        Total Score
                      </p>
                      <p className="text-xs text-gray-500">
                        Final grade for this defense
                      </p>
                    </div>
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg">
                      <span className="text-2xl font-bold text-white">
                        {displayedTotalScore !== null
                          ? displayedTotalScore
                          : group.totalScore !== null &&
                            group.totalScore !== undefined
                          ? group.totalScore
                          : "—"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Chair: Input Total Score */}
                {isChair && defenseSession && (
                  <div className="bg-purple-50 border border-purple-100 rounded-xl p-4">
                    <p className="text-xs font-semibold text-purple-700 mb-3 flex items-center gap-1">
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
                          d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125"
                        />
                      </svg>
                      Update Score (0-10)
                    </p>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        min="0"
                        max="10"
                        step="0.1"
                        value={totalScoreInput}
                        onChange={(e) => setTotalScoreInput(e.target.value)}
                        placeholder="Enter score..."
                        className="flex-1 px-4 py-2.5 border border-purple-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent transition bg-white"
                      />
                      <button
                        onClick={handleSubmitTotalScore}
                        disabled={savingTotalScore || !totalScoreInput}
                        className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-sm font-semibold rounded-xl hover:from-purple-700 hover:to-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm"
                      >
                        {savingTotalScore ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
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
                                d="M4.5 12.75l6 6 9-13.5"
                              />
                            </svg>
                            Submit
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* Info Section */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                      Semester
                    </p>
                    <p className="font-semibold text-gray-900">
                      {group.semesterName}
                    </p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                      Major
                    </p>
                    <p className="font-semibold text-gray-900">
                      {group.majorName}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
