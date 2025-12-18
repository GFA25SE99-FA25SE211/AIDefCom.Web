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

export default function GroupDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  // Voice enrollment check - must be enrolled to access this page
  const { isChecking: checkingVoice } = useVoiceEnrollmentCheck();

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
        const [groupRes, studentsRes, sessionsRes, memberNotesRes] =
          await Promise.all([
            groupsApi.getById(id),
            studentsApi.getByGroupId(id),
            defenseSessionsApi.getByGroupId(id),
            memberNotesApi.getByGroupId(id),
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

        // Set member notes directly from API response
        if (memberNotesRes.data) {
          setMemberNotes(memberNotesRes.data);
        }

        // 2. If session exists, fetch lecturers
        if (sessionsRes.data && sessionsRes.data.length > 0) {
          const session = sessionsRes.data[0];
          setDefenseSession(session);

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

                  if (!isSystemChair && sessionRoleValue === "chair") {
                    setIsChair(true);
                  }
                }
              }
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

  // Fetch scores when selected student changes
  useEffect(() => {
    const fetchScores = async () => {
      if (!selectedStudentId) return;
      try {
        const res = await scoresApi.getByStudentId(selectedStudentId);
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

    fetchScores();
  }, [selectedStudentId]);

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
            onClick={() => router.back()}
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
            <div className="card-base p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-5 h-5 text-blue-600"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
                  />
                </svg>
                Group Students
              </h2>
              {students.length > 0 ? (
                <div className="space-y-4">
                  {students.map((student) => (
                    <div
                      key={student.id}
                      className="flex items-center gap-4 p-3 rounded-lg bg-gray-50 border border-gray-100"
                    >
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                        {student.userName
                          ? student.userName.charAt(0).toUpperCase()
                          : "S"}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {student.userName || "Unknown Name"}
                        </p>
                        <p className="text-sm text-gray-500">{student.email}</p>
                      </div>
                      {student.studentCode && (
                        <div className="ml-auto">
                          <span className="badge badge-info text-xs">
                            {student.studentCode}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-sm italic">
                  No members found in this group.
                </p>
              )}
            </div>

            {/* Individual Scores Card */}
            <div className="card-base p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-6">
                Individual Scores from Committee Members
              </h2>

              {/* Student Tabs */}
              {students.length > 0 ? (
                <>
                  <div className="flex flex-wrap gap-2 mb-6 border-b border-gray-100 pb-1">
                    {students.map((student) => (
                      <button
                        key={student.id}
                        onClick={() => setSelectedStudentId(student.id)}
                        className={`px-6 py-2 rounded-t-lg text-sm font-medium transition-colors relative top-[1px] ${
                          selectedStudentId === student.id
                            ? "bg-white text-blue-600 border border-gray-200 border-b-white shadow-sm"
                            : "bg-gray-50 text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                        }`}
                      >
                        {student.userName || student.email}
                      </button>
                    ))}
                  </div>

                  {/* Scores Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-100">
                        <tr>
                          <th className="px-4 py-3 font-medium">Criteria</th>
                          <th className="px-4 py-3 font-medium text-center">
                            Score
                          </th>
                          <th className="px-4 py-3 font-medium text-right">
                            Evaluator
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {studentScores.length > 0 ? (
                          studentScores.map((score) => (
                            <tr key={score.id} className="hover:bg-gray-50">
                              <td className="px-4 py-3 font-medium text-gray-900">
                                {score.rubricName || "Unknown Criteria"}
                              </td>
                              <td className="px-4 py-3 text-center font-semibold text-gray-900">
                                {score.value}
                              </td>
                              <td className="px-4 py-3 text-right text-gray-600">
                                {score.evaluatorName || "Unknown Evaluator"}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td
                              colSpan={3}
                              className="px-4 py-8 text-center text-gray-500 italic"
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
                <p className="text-sm text-gray-500 italic">
                  No students found in this group.
                </p>
              )}
            </div>

            {/* Member Notes Card */}
            <div className="card-base p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-5 h-5 text-orange-500"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
                  />
                </svg>
                Committee Member Note
              </h2>
              {memberNotes.length > 0 ? (
                <div className="space-y-3">
                  {memberNotes.map((note) => (
                    <div
                      key={note.id}
                      className="p-4 bg-gray-50 rounded-lg border border-gray-100"
                    >
                      <p className="text-sm font-semibold text-blue-600 mb-1">
                        {note.userName || "Unknown User"}
                      </p>
                      <p className="text-sm text-gray-600">
                        {note.noteContent}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 italic">
                  No notes found for this group.
                </p>
              )}
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
                          ).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-700 mt-1">
                        <span>
                          ⏰ {defenseSession.startTime} -{" "}
                          {defenseSession.endTime}
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
          </div>

          {/* Status Card */}
          <div className="card-base p-6">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
              Status & Scoring
            </h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Total Score</span>
                <span className="font-bold text-gray-900 text-lg">
                  {group.totalScore !== null && group.totalScore !== undefined
                    ? group.totalScore
                    : "N/A"}
                </span>
              </div>
              <div className="h-px bg-gray-100 my-2"></div>
              <div>
                <span className="text-gray-600 text-sm">Semester</span>
                <p className="font-medium text-gray-900">
                  {group.semesterName}
                </p>
              </div>
              <div>
                <span className="text-gray-600 text-sm">Major</span>
                <p className="font-medium text-gray-900">{group.majorName}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
