"use client";

import { useState, useEffect, useRef, use } from "react";
import Link from "next/link";
import { useAudioRecorder } from "@/lib/hooks/useAudioRecorder";
import { useVoiceEnrollmentCheck } from "@/lib/hooks/useVoiceEnrollmentCheck";
import { useSessionRoleCheck } from "@/lib/hooks/useSessionRoleCheck";
import { swalConfig, closeSwal } from "@/lib/utils/sweetAlert";
// import { useSTTWebSocket, STTEvent } from "@/lib/hooks/useSTTWebSocket";
import { defenseSessionsApi } from "@/lib/api/defense-sessions";
import { transcriptsApi } from "@/lib/api/transcripts";
import { DefenseSessionDto, TranscriptDto } from "@/lib/models";
import MeetingMinutesForm from "../../components/MeetingMinutesForm";
import { Pencil, Check, X, Trash2, Plus } from "lucide-react";
import { getWebSocketUrl, BACKEND_API_URL } from "@/lib/config/api-urls";

// Define STTEvent locally if needed or import from a shared types file
interface STTEvent {
  event: string;
  text?: string;
  speaker?: string;
  speaker_name?: string;
  session_id?: string;
  message?: string;
  id?: string; // unique id for editing
  isNew?: boolean; // flag to mark new entries from STT
  user_id?: string;
  timestamp?: string;
  start_time_vtt?: string;
  end_time_vtt?: string;
  edited_speaker?: string | null;
  edited_text?: string | null;
}

export default function TranscriptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  // Voice enrollment check - must be enrolled to access this page
  const { isChecking: checkingVoice } = useVoiceEnrollmentCheck();

  // Session role check - user must be "secretary" in this session
  const {
    isChecking: checkingSessionRole,
    isAuthorized: isSecretaryInSession,
  } = useSessionRoleCheck(id, "secretary", true);

  const [transcript, setTranscript] = useState<STTEvent[]>([]);
  const [notes, setNotes] = useState("");
  const [isClient, setIsClient] = useState(false);
  const [session, setSession] = useState<DefenseSessionDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [interimText, setInterimText] = useState(""); // Partial của chính mình
  const [broadcastInterimText, setBroadcastInterimText] = useState(""); // Partial từ member khác
  const [packetsSent, setPacketsSent] = useState(0);
  const [questionResults, setQuestionResults] = useState<any[]>([]);
  const [mySessionId, setMySessionId] = useState<string | null>(null); // Lưu session_id của chính mình để filter broadcast
  const mySessionIdRef = useRef<string | null>(null); // Ref để tránh stale closure
  const [hasStartedSession, setHasStartedSession] = useState(false); // Đã broadcast session:start chưa

  // Edit transcript states
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const [editSpeaker, setEditSpeaker] = useState("");
  const [existingTranscriptId, setExistingTranscriptId] = useState<
    number | null
  >(null);
  const [saving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Use a ref to keep track of the latest transcript for efficient updates
  const transcriptRef = useRef<STTEvent[]>([]);
  const transcriptContainerRef = useRef<HTMLDivElement | null>(null);
  const questionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const waitingForQuestionResult = useRef<boolean>(false);
  const [hasQuestionFinalText, setHasQuestionFinalText] = useState(false);

  // Deduplicate: track recent transcripts to prevent duplicates
  const recentTranscriptsRef = useRef<Set<string>>(new Set());
  // Track processed question IDs to prevent duplicates
  const processedQuestionIdsRef = useRef<Set<string>>(new Set());
  // Auto-save timer
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  // Flag to track if Redis cache was loaded (to prevent further overwrites during session)
  const transcriptLoadedRef = useRef<boolean>(false);
  // Track recording start time for VTT timestamp calculation
  const sessionStartTimeRef = useRef<number | null>(null);

  // Helper function to format milliseconds to VTT time format (HH:MM:SS.mmm)
  const formatVttTime = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const milliseconds = ms % 1000;
    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}.${milliseconds
      .toString()
      .padStart(3, "0")}`;
  };

  // ==========================================
  // SESSION RECORDING STATES (Audio Recording)
  // ==========================================
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);
  const recordingStartTimeRef = useRef<number>(0);
  const recordingStreamRef = useRef<MediaStream | null>(null);
  const [isSessionRecording, setIsSessionRecording] = useState(false);
  const [recordingId, setRecordingId] = useState<string | null>(null);
  const [isUploadingRecording, setIsUploadingRecording] = useState(false);

  // Preferred mime types for recording
  const preferredMimeTypes = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4;codecs=mp4a.40.2",
    "audio/mp4",
    "audio/mpeg",
    "audio/ogg;codecs=opus",
    "audio/ogg",
    "audio/wav",
  ];

  const pickSupportedMimeType = (): string => {
    for (const t of preferredMimeTypes) {
      if (
        window.MediaRecorder &&
        MediaRecorder.isTypeSupported &&
        MediaRecorder.isTypeSupported(t)
      ) {
        return t;
      }
    }
    return "";
  };

  // API base URL for recording
  const RECORDING_API_BASE = BACKEND_API_URL;

  // Xóa session role khi rời khỏi trang (nếu cần)
  useEffect(() => {
    return () => {
      // Không xóa session role ở đây vì user có thể quay lại session
      // Chỉ xóa khi logout hoặc rời khỏi hoàn toàn
    };
  }, []);

  // Initialize client-side only to avoid hydration mismatch
  useEffect(() => {
    setIsClient(true);

    const fetchSessionAndTranscript = async () => {
      try {
        // Fetch session info and transcript IN PARALLEL for faster loading
        const [sessionResponse, transcriptRes] = await Promise.all([
          defenseSessionsApi.getById(Number(id)),
          transcriptsApi.getBySessionId(Number(id)),
        ]);

        // Process session data
        if (sessionResponse.data) {
          setSession(sessionResponse.data);

          // Fetch user role in background (non-blocking)
          const { authUtils } = await import("@/lib/utils/auth");
          const currentUserId = authUtils.getCurrentUserId();
          if (currentUserId) {
            // Fire and forget - don't await
            defenseSessionsApi
              .getUsersBySessionId(Number(id))
              .then((lecturersRes) => {
                if (lecturersRes.data) {
                  const currentUserInSession = lecturersRes.data.find(
                    (user: any) =>
                      String(user.id).toLowerCase() ===
                      String(currentUserId).toLowerCase()
                  );
                  if (currentUserInSession?.role) {
                    sessionStorage.setItem(
                      "sessionRole",
                      currentUserInSession.role.toLowerCase()
                    );
                  }
                }
              })
              .catch(() => {
                /* Ignore role fetch errors */
              });
          }
        }

        // Process transcript data
        if (transcriptRes.data && transcriptRes.data.length > 0) {
          const existingTranscript = transcriptRes.data[0];
          setExistingTranscriptId(existingTranscript.id);

          // Parse stored transcript text (JSON format)
          if (existingTranscript.transcriptText) {
            try {
              const parsed = JSON.parse(existingTranscript.transcriptText);
              if (Array.isArray(parsed)) {
                // Convert to STTEvent format with all VTT fields
                // IMPORTANT: Keep original speaker/text separate from edited values
                const loadedTranscript: STTEvent[] = parsed.map(
                  (item: any, index: number) => ({
                    event: "recognized",
                    // Keep ORIGINAL text - not edited
                    text: item.text || item.content || "",
                    // Keep ORIGINAL speaker - not edited
                    speaker: item.speaker || item.speaker_name || "Unknown",
                    id: item.id || `loaded_${index}_${Date.now()}`,
                    isNew: false,
                    user_id: item.user_id || null,
                    timestamp: item.timestamp || null,
                    start_time_vtt: item.start_time_vtt || null,
                    end_time_vtt: item.end_time_vtt || null,
                    // Load edited values separately
                    edited_speaker: item.edited_speaker || null,
                    edited_text: item.edited_text || null,
                  })
                );
                // Load from DB - this is saved/finalized data
                setTranscript(loadedTranscript);
                transcriptLoadedRef.current = true; // Mark as loaded to prevent Redis overwrite
              }
            } catch (parseError) {
              // If not JSON, treat as plain text with "Speaker: Text" format
              const lines = existingTranscript.transcriptText
                .split("\n")
                .filter((l: string) => l.trim());
              const loadedTranscript: STTEvent[] = lines.map(
                (line: string, index: number) => {
                  // Parse "Speaker: Text" format
                  const colonIndex = line.indexOf(":");
                  let speaker = "Unknown";
                  let text = line;

                  if (colonIndex > 0 && colonIndex < 50) {
                    // Likely "Speaker: Text" format
                    speaker = line.substring(0, colonIndex).trim();
                    text = line.substring(colonIndex + 1).trim();
                  }

                  return {
                    event: "recognized",
                    text: text,
                    speaker: speaker,
                    id: `loaded_${index}_${Date.now()}`,
                    isNew: false,
                  };
                }
              );
              // Load from DB - this is saved/finalized data
              setTranscript(loadedTranscript);
              transcriptLoadedRef.current = true; // Mark as loaded to prevent Redis overwrite
            }
          }
        }
      } catch (error) {
        // Failed to fetch session/transcript
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchSessionAndTranscript();
    }
  }, [id]);

  const handleSTTEvent = (msg: any) => {
    const eventType = msg.type || msg.event;

    // DEBUG: Log all events from WebSocket
    console.log("📨 [STT Event]", eventType, msg);

    // Handle WebSocket connected event
    if (eventType === "connected") {
      if (msg.session_id) {
        setMySessionId(msg.session_id);
        mySessionIdRef.current = msg.session_id;
      }
      return;
    }

    // Handle cached transcript from Redis (sent on reconnect)
    if (eventType === "cached_transcript") {
      const cachedLines = msg.lines || [];

      // Only use Redis cache if we don't already have data loaded from DB
      // DB data = saved/finalized transcript, Redis = working draft
      if (cachedLines.length > 0 && !transcriptLoadedRef.current) {
        // Convert cached lines to STTEvent format with all VTT fields
        const loadedTranscript: STTEvent[] = cachedLines.map(
          (line: any, index: number) => ({
            event: "recognized",
            text: line.text || "",
            speaker: line.speaker || "Unknown",
            speaker_name: line.speaker_name || line.speaker,
            user_id: line.user_id || null,
            id: line.id || `cached_${index}_${Date.now()}`,
            isNew: false,
            timestamp: line.timestamp || null,
            start_time_vtt: line.start_time_vtt || null,
            end_time_vtt: line.end_time_vtt || null,
            edited_speaker: line.edited_speaker || null,
            edited_text: line.edited_text || null,
          })
        );

        setTranscript(loadedTranscript);
        transcriptLoadedRef.current = true;
        swalConfig.toast.success(
          `Restored ${loadedTranscript.length} transcript lines from cache`
        );
      }
      return;
    }

    // Handle ping (keepalive)
    if (eventType === "ping") {
      return;
    }

    // Helper: Check if transcript is duplicate (same text within 2 seconds)
    const isDuplicateTranscript = (text: string): boolean => {
      if (!text) return false;
      const key = text.trim().toLowerCase();
      if (recentTranscriptsRef.current.has(key)) {
        return true;
      }
      // Add to recent and auto-remove after 2 seconds
      recentTranscriptsRef.current.add(key);
      setTimeout(() => {
        recentTranscriptsRef.current.delete(key);
      }, 2000);
      return false;
    };

    if (eventType === "partial" || eventType === "recognizing") {
      // Partial của chính mình
      setInterimText(msg.text || "");
    } else if (eventType === "result" || eventType === "recognized") {
      setInterimText(""); // Clear partial của mình khi có kết quả

      // Deduplicate: skip if same text was added recently
      if (msg.text && isDuplicateTranscript(msg.text)) {
        return;
      }

      // Calculate VTT timestamps based on REAL elapsed time since session start
      let startVtt = msg.start_time_vtt;
      let endVtt = msg.end_time_vtt;

      if (!startVtt || !endVtt) {
        const now = Date.now();
        if (sessionStartTimeRef.current) {
          // endMs = actual elapsed time when we receive the final result
          const endMs = now - sessionStartTimeRef.current;

          // Estimate when speech started based on text length
          // ~80ms per character for speaking speed
          const textLength = (msg.text || "").length;
          const estimatedDurationMs = Math.min(
            Math.max(textLength * 80, 1000),
            15000
          );

          // startMs = endMs - estimated duration
          const startMs = Math.max(0, endMs - estimatedDurationMs);

          startVtt = formatVttTime(startMs);
          endVtt = formatVttTime(endMs);
        }
      }

      // Normalize event structure for state with unique ID and VTT fields
      const newEntry: STTEvent = {
        ...msg,
        event: "recognized",
        id:
          msg.id ||
          `stt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        isNew: true,
        user_id: msg.user_id || null,
        timestamp: msg.timestamp || new Date().toISOString(),
        start_time_vtt: startVtt || null,
        end_time_vtt: endVtt || null,
        edited_speaker: null,
        edited_text: null,
      };
      setTranscript((prev) => [...prev, newEntry]);
      setHasUnsavedChanges(true);

      // If in question mode, mark that we have final text
      if (isAsking && msg.text) {
        setHasQuestionFinalText(true);
      }
    } else if (eventType === "question_mode_started") {
      swalConfig.info("Recording question");
      // Reset flag when starting new question
      setHasQuestionFinalText(false);
    } else if (eventType === "question_mode_result") {
      // Kết quả câu hỏi của CHÍNH MÌNH (thư ký tự đặt)

      // Clear timeout and reset waiting flag
      if (questionTimeoutRef.current) {
        clearTimeout(questionTimeoutRef.current);
        questionTimeoutRef.current = null;
      }
      waitingForQuestionResult.current = false;

      // Close loading popup if open
      closeSwal();

      // Reset flag after getting result
      setHasQuestionFinalText(false);

      const questionText = msg.question_text || msg.text || "";

      if (msg.is_duplicate) {
        swalConfig.warning(
          "Duplicate Question",
          "This question has already been recorded."
        );
      } else {
        // Thêm vào danh sách (không cần dedup vì đây là event trực tiếp)
        if (questionText) {
          setQuestionResults((prev) => [{ ...msg, from_self: true }, ...prev]);
        }
        swalConfig.success("Valid Question", "New question has been recorded.");
      }
    } else if (eventType === "session_started") {
      // Session started
    } else if (eventType === "error") {
      swalConfig.error(
        "STT Error",
        msg.message || msg.error || "An unknown error occurred"
      );
    } else if (eventType === "speaker_identified") {
      // Optional: update UI with speaker info if needed
    } else if (eventType === "broadcast_transcript") {
      // Transcript từ client khác trong cùng session (member nói)
      // Bỏ qua nếu broadcast từ chính mình (tránh hiện 2 lần)
      if (
        msg.source_session_id &&
        msg.source_session_id === mySessionIdRef.current
      ) {
        return;
      }

      // Deduplicate: skip if same text was added recently
      if (msg.text && isDuplicateTranscript(msg.text)) {
        return;
      }

      // Clear broadcast interim text when final result arrives from that speaker
      setBroadcastInterimText("");

      if (msg.text) {
        // Calculate VTT timestamps if not provided
        let startVtt = msg.start_time_vtt;
        let endVtt = msg.end_time_vtt;

        if (!startVtt || !endVtt) {
          const now = Date.now();
          if (sessionStartTimeRef.current) {
            // endMs = actual elapsed time when we receive the final result
            const endMs = now - sessionStartTimeRef.current;

            // Estimate when speech started based on text length
            const textLength = (msg.text || "").length;
            const estimatedDurationMs = Math.min(
              Math.max(textLength * 80, 1000),
              15000
            );

            // startMs = endMs - estimated duration
            const startMs = Math.max(0, endMs - estimatedDurationMs);

            startVtt = formatVttTime(startMs);
            endVtt = formatVttTime(endMs);
          }
        }

        const newEntry: STTEvent = {
          event: "recognized",
          text: msg.text,
          speaker: msg.speaker_name || msg.speaker || "Identifying",
          id:
            msg.id ||
            `broadcast_${Date.now()}_${Math.random()
              .toString(36)
              .substr(2, 9)}`,
          isNew: true,
          user_id: msg.user_id || null,
          timestamp: msg.timestamp || new Date().toISOString(),
          start_time_vtt: startVtt || null,
          end_time_vtt: endVtt || null,
          edited_speaker: null,
          edited_text: null,
        };
        setTranscript((prev) => [...prev, newEntry]);
        setHasUnsavedChanges(true);
      }
    } else if (eventType === "broadcast_partial") {
      // Partial transcript từ client khác (chữ chạy khi member đang nói)
      if (
        msg.source_session_id &&
        msg.source_session_id === mySessionIdRef.current
      ) {
        return; // Bỏ qua partial từ chính mình
      }
      // Hiển thị chữ chạy với tên speaker - dùng state riêng để không bị ghi đè
      const speakerName = msg.speaker_name || msg.speaker || "Identifying";
      setBroadcastInterimText(`${speakerName}: ${msg.text || ""}`);
    } else if (eventType === "broadcast_question_started") {
      // Member bắt đầu đặt câu hỏi - dùng toast nhẹ nhàng
      if (
        msg.source_session_id &&
        msg.source_session_id === mySessionIdRef.current
      ) {
        return;
      }
      const speakerName = msg.speaker_name || msg.speaker || "Member";
      // Toast notification
      swalConfig.toast.info(`${speakerName} is asking a question...`);
    } else if (eventType === "broadcast_question_processing") {
      // Member kết thúc đặt câu hỏi, đang xử lý
      // Dùng toast để thư ký biết nhưng KHÔNG bị chặn làm việc
      if (
        msg.source_session_id &&
        msg.source_session_id === mySessionIdRef.current
      ) {
        return;
      }
      const speakerName = msg.speaker_name || msg.speaker || "Member";
      // Toast notification
      swalConfig.toast.info(`Processing question from ${speakerName}...`);
    } else if (eventType === "broadcast_question_result") {
      // Kết quả câu hỏi từ MEMBER (không phải từ chính mình)
      if (
        msg.source_session_id &&
        msg.source_session_id === mySessionIdRef.current
      ) {
        return; // Bỏ qua broadcast từ chính mình
      }

      // Tạo unique ID cho question để tránh duplicate
      const questionId = `${msg.source_session_id}_${
        msg.question_text || ""
      }`.trim();
      if (processedQuestionIdsRef.current.has(questionId)) {
        return;
      }
      processedQuestionIdsRef.current.add(questionId);
      // Auto-clear sau 10 giây
      setTimeout(
        () => processedQuestionIdsRef.current.delete(questionId),
        10000
      );

      // Đóng loading popup
      closeSwal();

      const speakerName = msg.speaker_name || msg.speaker || "Member";
      const questionText = msg.question_text || "";

      if (msg.is_duplicate) {
        swalConfig.warning(
          "Duplicate Question",
          `Question from ${speakerName} was already recorded.`
        );
      } else {
        // Thêm vào danh sách và hiện popup thành công
        if (questionText) {
          setQuestionResults((prev) => [
            { ...msg, from_member: true, speaker: speakerName },
            ...prev,
          ]);
        }
        swalConfig.success(
          "Valid Question",
          `Question from ${speakerName} has been recorded.`
        );
      }
    } else if (eventType === "connected") {
      // Lưu session_id của mình để filter broadcast
      if (msg.session_id) {
        setMySessionId(msg.session_id);
        mySessionIdRef.current = msg.session_id; // Cập nhật ref ngay lập tức
      }
    }
  };

  useEffect(() => {
    const el = transcriptContainerRef.current;
    if (!el) return;
    // Always scroll to bottom when transcript or interimText changes
    // Use requestAnimationFrame to ensure DOM updated
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
  }, [transcript, interimText, broadcastInterimText]);

  //const WS_URL = `ws://localhost:8000/ws/stt?defense_session_id=${id}`;
  const WS_URL = getWebSocketUrl(id as string, "secretary");

  const {
    isRecording,
    isAsking,
    wsConnected,
    startRecording,
    stopRecording,
    toggleAsk,
    stopSession,
    broadcastSessionStart,
    broadcastSessionEnd,
  } = useAudioRecorder({
    wsUrl: WS_URL,
    onWsEvent: handleSTTEvent,
  });

  const handleToggleRecording = async () => {
    if (isRecording) {
      stopRecording(); // Chỉ tạm dừng mic, WebSocket vẫn mở
      // Pause session recording khi dừng mic
      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state === "recording"
      ) {
        mediaRecorderRef.current.pause();
      }
    } else {
      setPacketsSent(0);
      await startRecording();

      // Initialize session start time for VTT timestamp calculation (only on first start)
      if (!sessionStartTimeRef.current) {
        sessionStartTimeRef.current = Date.now();
      }

      // Broadcast session:start cho member biết thư ký đã bắt đầu
      if (!hasStartedSession) {
        // Gọi API start để chuyển status sang InProgress (chỉ khi chưa InProgress/Completed)
        if (
          session &&
          session.status !== "InProgress" &&
          session.status !== "Completed"
        ) {
          // Fire and forget - don't block UI
          defenseSessionsApi
            .start(Number(id))
            .then((startResult) => {
              if (startResult.data) {
                setSession(startResult.data);
                swalConfig.toast.success("Defense session started");
              }
            })
            .catch((error: any) => {
              if (
                !error.message?.includes("409") &&
                !error.message?.includes("Conflict")
              ) {
                swalConfig.toast.error("Failed to update session status");
              }
            });
        }
        // Broadcast immediately
        broadcastSessionStart();
        setHasStartedSession(true);
      }
      // Bắt đầu hoặc resume session recording
      if (!isSessionRecording) {
        // Lần đầu bật mic → bắt đầu recording mới
        startSessionRecording();
      } else if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state === "paused"
      ) {
        // Đã có recording đang pause → resume
        mediaRecorderRef.current.resume();
      }
    }
  };

  // ==========================================
  // SESSION RECORDING FUNCTIONS
  // ==========================================

  // Start recording session audio (called once when first starting mic)
  const startSessionRecording = async () => {
    try {
      // Reset state
      recordingChunksRef.current = [];
      setRecordingId(null);

      // Get microphone stream
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recordingStreamRef.current = stream;

      // Pick supported mime type
      const mimeType = pickSupportedMimeType();
      const options = mimeType ? { mimeType } : undefined;

      // Create MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;

      // Handle data available
      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          recordingChunksRef.current.push(e.data);
        }
      };

      // Handle recording stopped
      mediaRecorder.onstop = () => {
        // Recording stopped
      };

      // Start recording (gather every 1 second)
      recordingStartTimeRef.current = performance.now();
      mediaRecorder.start(1000);
      setIsSessionRecording(true);
    } catch (error: any) {
      swalConfig.toast.error("Unable to start session recording");
    }
  };

  // Stop recording and upload to Azure
  const stopAndUploadRecording = async (): Promise<void> => {
    return new Promise(async (resolve) => {
      if (!mediaRecorderRef.current || !isSessionRecording) {
        resolve();
        return;
      }

      try {
        setIsUploadingRecording(true);

        // Stop MediaRecorder
        if (mediaRecorderRef.current.state === "recording") {
          mediaRecorderRef.current.stop();
        }

        // Wait for final chunks to be collected
        await new Promise((r) => setTimeout(r, 500));

        // Stop stream tracks
        recordingStreamRef.current?.getTracks().forEach((t) => t.stop());

        // Calculate duration
        const durationSec = Math.round(
          (performance.now() - recordingStartTimeRef.current) / 1000
        );

        // Create blob from chunks
        const mimeType = mediaRecorderRef.current.mimeType || "audio/webm";
        const recordedBlob = new Blob(recordingChunksRef.current, {
          type: mimeType,
        });
        const sizeBytes = recordedBlob.size;

        if (sizeBytes === 0) {
          setIsSessionRecording(false);
          setIsUploadingRecording(false);
          resolve();
          return;
        }

        // Get user ID from accessToken
        let userId = "unknown";
        try {
          const { authUtils } = await import("@/lib/utils/auth");
          userId = authUtils.getCurrentUserId() || "unknown";
        } catch {}

        // Step 1: Begin upload to get SAS URL
        const beginRes = await fetch(
          `${RECORDING_API_BASE}/api/recordings/begin-upload`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId, mimeType }),
          }
        );

        if (!beginRes.ok) {
          throw new Error(`begin-upload failed: ${beginRes.status}`);
        }

        const beginData = await beginRes.json();
        const uploadRecordingId = beginData.data?.recordingId;
        const uploadUrl = beginData.data?.uploadUrl;
        setRecordingId(uploadRecordingId);

        // Step 2: PUT blob to Azure SAS URL
        const putRes = await fetch(uploadUrl, {
          method: "PUT",
          headers: {
            "x-ms-blob-type": "BlockBlob",
            "x-ms-version": "2021-08-06",
            "Content-Type": mimeType,
          },
          body: recordedBlob,
        });

        if (!putRes.ok) {
          throw new Error(`Blob PUT failed: ${putRes.status}`);
        }

        // Step 3: Finalize recording
        const finRes = await fetch(
          `${RECORDING_API_BASE}/api/recordings/${uploadRecordingId}/finalize`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              durationSec,
              sizeBytes,
              notes: `Recording for defense session ${id}`,
              transcriptId: existingTranscriptId || 0,
            }),
          }
        );

        if (!finRes.ok && finRes.status !== 204) {
          throw new Error(`finalize failed: ${finRes.status}`);
        }
        swalConfig.toast.success("Session recording saved");

        // Cleanup
        setIsSessionRecording(false);
        mediaRecorderRef.current = null;
        recordingChunksRef.current = [];
        resolve();
      } catch (error: any) {
        swalConfig.toast.error("Unable to upload recording: " + error.message);
        setIsSessionRecording(false);
        resolve();
      } finally {
        setIsUploadingRecording(false);
      }
    });
  };

  const handleToggleQuestion = async () => {
    if (!isAsking) {
      // Bắt đầu đặt câu hỏi
      toggleAsk();
    } else {
      // Kết thúc đặt câu hỏi
      // 1. Stop mic trước
      if (isRecording) {
        stopRecording();
      }

      // 2. Set flag và hiện loading popup
      waitingForQuestionResult.current = true;
      swalConfig.loading(
        "Processing question...",
        "Please wait while the system analyzes your question"
      );

      // 3. Sau 5s, nếu vẫn chưa có kết quả thì show nút "Tiếp tục"
      // Popup upgrade timeout (separate from enable timer). Use a separate timeout so we don't conflict with earlier stored one
      const upgradePopupTimeout = setTimeout(() => {
        if (waitingForQuestionResult.current) {
          swalConfig.warning(
            "Processing question...",
            "The system is analyzing your question. You can continue with the defense session, results will be displayed when ready."
          );
        }
      }, 5000);
      // Keep reference only if previous wasn't repurposed
      if (!questionTimeoutRef.current) {
        questionTimeoutRef.current = upgradePopupTimeout;
      }

      // 4. Gửi lệnh kết thúc (toggleAsk sẽ gửi q:end)
      toggleAsk();
    }
  };

  // Edit transcript functions
  const handleStartEdit = (index: number) => {
    setEditingIndex(index);
    // Load current display value (edited if exists, otherwise original)
    const item = transcript[index];
    setEditText(item.edited_text || item.text || "");
    setEditSpeaker(item.edited_speaker || item.speaker || "");
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setEditText("");
    setEditSpeaker("");
  };

  const handleSaveEdit = () => {
    if (editingIndex === null) return;

    setTranscript((prev) => {
      const newTranscript = [...prev];
      const original = newTranscript[editingIndex];

      // Get the ORIGINAL values (not edited values)
      const originalText = original.text;
      const originalSpeaker = original.speaker;

      // Check if user changed from original
      const textChanged = editText !== originalText;
      const speakerChanged = editSpeaker !== originalSpeaker;

      newTranscript[editingIndex] = {
        ...original,
        // KEEP original speaker and text unchanged
        // Only store edits in edited_* fields
        edited_text: textChanged ? editText : original.edited_text || null,
        edited_speaker: speakerChanged
          ? editSpeaker
          : original.edited_speaker || null,
        // DO NOT overwrite original speaker/text
      };
      return newTranscript;
    });
    setHasUnsavedChanges(true);
    setEditingIndex(null);
    setEditText("");
    setEditSpeaker("");
  };

  const handleDeleteEntry = (index: number) => {
    setTranscript((prev) => prev.filter((_, i) => i !== index));
    setHasUnsavedChanges(true);
  };

  const handleAddEntry = () => {
    const newEntry: STTEvent = {
      event: "recognized",
      text: "",
      speaker: "Secretary",
      id: `manual_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      isNew: true,
    };
    setTranscript((prev) => [...prev, newEntry]);
    setHasUnsavedChanges(true);
    // Auto-edit the new entry
    setTimeout(() => {
      handleStartEdit(transcript.length);
    }, 100);
  };

  const handleSaveTranscript = async () => {
    if (!session) {
      swalConfig.error("Error", "Defense session not found");
      return;
    }

    if (transcript.length === 0) {
      swalConfig.error("Error", "No transcript content to save");
      return;
    }

    try {
      setSaving(true);

      // Filter out entries with unknown speakers ("Khách", "Unknown", "Identifying")
      const unknownSpeakers = ["khách", "unknown", "identifying", "guest"];

      // Check if there are any entries with unknown speakers - block saving if so
      const entriesWithUnknownSpeaker = transcript.filter((item) => {
        const speaker = (item.edited_speaker || item.speaker || "")
          .toLowerCase()
          .trim();
        return !speaker || unknownSpeakers.includes(speaker);
      });

      if (entriesWithUnknownSpeaker.length > 0) {
        swalConfig.error(
          "Cannot Complete Session",
          `There are ${entriesWithUnknownSpeaker.length} transcript entries with unknown speakers ("Khách", "Unknown"). Please identify all speakers before completing the session.`
        );
        setSaving(false);
        return;
      }

      // All entries have valid speakers
      const validTranscript = transcript;

      if (validTranscript.length === 0) {
        swalConfig.error("Error", "No transcript content to save.");
        setSaving(false);
        return;
      }

      // Prepare transcript data as JSON with full format
      // IMPORTANT: Keep original speaker/text separate from edited values
      const transcriptData = validTranscript.map((item) => ({
        id: item.id,
        // Keep ORIGINAL text
        text: item.text,
        // Keep ORIGINAL speaker
        speaker: item.speaker,
        user_id: item.user_id || null,
        timestamp: item.timestamp || new Date().toISOString(),
        start_time_vtt: item.start_time_vtt || null,
        end_time_vtt: item.end_time_vtt || null,
        // Store edited values separately
        edited_speaker: item.edited_speaker || null,
        edited_text: item.edited_text || null,
      }));

      const transcriptText = JSON.stringify(transcriptData);

      if (existingTranscriptId) {
        // Update existing transcript
        await transcriptsApi.update(existingTranscriptId, {
          transcriptText: transcriptText,
          status: "Completed",
        });
      } else {
        // Create new transcript
        const result = await transcriptsApi.create({
          sessionId: session.id,
          transcriptText: transcriptText,
          status: "Completed",
        });
        if (result.data) {
          setExistingTranscriptId(result.data.id);
        }
      }

      // Gọi API complete để chuyển status sang Completed (chỉ khi chưa Completed)
      if (session.status !== "Completed") {
        try {
          const completeResult = await defenseSessionsApi.complete(Number(id));
          if (completeResult.data) {
            setSession(completeResult.data);
          }
        } catch (completeError: any) {
          // Không throw error ở đây vì transcript đã được lưu
        }
      }

      setHasUnsavedChanges(false);

      // Upload recording to Azure (if recording was active)
      if (isSessionRecording) {
        swalConfig.loading("Uploading recording...", "Please wait");
        await stopAndUploadRecording();
        closeSwal();
      }

      // Broadcast session:end để member biết phiên đã kết thúc
      if (hasStartedSession) {
        broadcastSessionEnd();
        setHasStartedSession(false);
      }

      // Kết thúc phiên và đóng WebSocket
      stopSession();

      // Show success popup AFTER all operations complete
      swalConfig.success("Success", "Session completed and transcript saved!");
    } catch (error: any) {
      swalConfig.error(
        "Save Error",
        error.message ||
          error.response?.data?.message ||
          "Unable to save to Database. Check Console for details."
      );
    } finally {
      setSaving(false);
    }
  };

  // Auto-save without notification (silent save)
  const handleAutoSave = async (showToast: boolean = false) => {
    if (!session || transcript.length === 0) return;

    try {
      setSaving(true);

      // For auto-save, keep all entries (including unknown speakers) as draft
      // IMPORTANT: Keep original speaker/text separate from edited values
      const transcriptData = transcript.map((item) => ({
        id: item.id,
        // Keep ORIGINAL text
        text: item.text,
        // Keep ORIGINAL speaker
        speaker: item.speaker,
        speaker_name: item.speaker_name,
        user_id: item.user_id || null,
        timestamp: item.timestamp || new Date().toISOString(),
        start_time_vtt: item.start_time_vtt || null,
        end_time_vtt: item.end_time_vtt || null,
        // Store edited values separately
        edited_speaker: item.edited_speaker || null,
        edited_text: item.edited_text || null,
      }));

      const transcriptText = JSON.stringify(transcriptData);

      if (existingTranscriptId) {
        await transcriptsApi.update(existingTranscriptId, {
          transcriptText: transcriptText,
          status: "Draft",
        });
      } else {
        const result = await transcriptsApi.create({
          sessionId: session.id,
          transcriptText: transcriptText,
          status: "Draft",
        });
        if (result.data) {
          setExistingTranscriptId(result.data.id);
        }
      }

      setHasUnsavedChanges(false);
      setLastSavedAt(new Date());
      if (showToast) {
        swalConfig.toast.success("Saved");
      }
    } catch (error: any) {
      if (showToast) {
        swalConfig.toast.error("Unable to save");
      }
    } finally {
      setSaving(false);
    }
  };

  // Auto-save effect: trigger save after 3 seconds of inactivity when there are unsaved changes
  useEffect(() => {
    if (hasUnsavedChanges && transcript.length > 0 && session) {
      // Clear existing timer
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }

      // Set new timer for auto-save after 5 seconds (increased from 3s to reduce frequency)
      autoSaveTimerRef.current = setTimeout(() => {
        handleAutoSave(false);
      }, 5000);
    }

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasUnsavedChanges, session]); // Remove transcript from deps to avoid re-triggering on every transcript change

  if (!isClient) return null;

  // Show loading while checking session role
  if (checkingSessionRole) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-2"></div>
          <p className="text-sm text-gray-500">Checking session access...</p>
        </div>
      </div>
    );
  }

  // If not authorized, the hook will redirect, but show message just in case
  if (!isSecretaryInSession) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <p className="text-gray-500">Redirecting to your assigned page...</p>
        </div>
      </div>
    );
  }

  if (loading)
    return (
      <div className="p-8 text-center text-gray-500">
        Loading session details...
      </div>
    );
  if (!session)
    return (
      <div className="p-8 text-center text-red-500">Session not found</div>
    );

  return (
    <div className="page-container">
      <div className="mb-4">
        <Link
          href="/secretary/transcript"
          className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
        >
          ← Back
        </Link>
        <div className="flex items-center justify-between mt-2">
          <div>
            <h1 className="text-xl font-semibold text-gray-800">
              Defense Session - Group {session.groupId}
            </h1>
            <p className="text-gray-500 text-sm flex items-center gap-2">
              <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-0.5 rounded">
                {session.location}
              </span>
              <span
                className={`w-2 h-2 rounded-full ${
                  wsConnected ? "bg-green-500" : "bg-gray-400"
                }`}
              ></span>
              <span className="text-xs text-gray-400">
                {wsConnected ? "Connected" : "Not connected"}
              </span>
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* Transcript Section */}
        <div className="bg-white rounded-lg shadow-sm border p-4 flex flex-col h-[500px]">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-gray-800">
                Transcript
              </h2>
              {transcript.length > 0 && (
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                  {transcript.length} lines
                </span>
              )}
              {/* Auto-save status */}
              {saving ? (
                <span className="text-xs text-gray-400 italic">Saving...</span>
              ) : hasUnsavedChanges ? (
                <span className="text-xs text-yellow-600">●</span>
              ) : lastSavedAt ? (
                <span className="text-xs text-green-600">✓</span>
              ) : null}
              {/* Recording status indicator */}
              {isSessionRecording && (
                <span className="flex items-center gap-1 text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded animate-pulse">
                  <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                  REC
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {/* Add entry button */}
              <button
                onClick={handleAddEntry}
                disabled={session?.status === "Completed"}
                className={`p-1.5 rounded transition-colors ${
                  session?.status === "Completed"
                    ? "text-gray-300 cursor-not-allowed"
                    : "text-gray-500 hover:text-purple-600 hover:bg-purple-50"
                }`}
                title={
                  session?.status === "Completed"
                    ? "Session completed"
                    : "Add line"
                }
              >
                <Plus className="w-4 h-4" />
              </button>
              {/* Mic button - compact */}
              {!isAsking && (
                <button
                  onClick={handleToggleRecording}
                  disabled={session?.status === "Completed"}
                  className={`p-2 rounded-lg transition-colors ${
                    session?.status === "Completed"
                      ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                      : isRecording
                      ? "bg-red-500 hover:bg-red-600 text-white"
                      : "bg-purple-600 hover:bg-purple-700 text-white"
                  }`}
                  title={
                    session?.status === "Completed"
                      ? "Session completed"
                      : isRecording
                      ? "Stop recording"
                      : "Start recording"
                  }
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="w-4 h-4"
                  >
                    <path d="M8.25 4.5a3.75 3.75 0 117.5 0v8.25a3.75 3.75 0 11-7.5 0V4.5z" />
                    <path d="M6 10.5a.75.75 0 01.75.75v1.5a5.25 5.25 0 1010.5 0v-1.5a.75.75 0 011.5 0v1.5a6.751 6.751 0 01-6 6.709v2.291h3a.75.75 0 010 1.5h-7.5a.75.75 0 010-1.5h3v-2.291a6.751 6.751 0 01-6-6.709v-1.5A.75.75 0 016 10.5z" />
                  </svg>
                </button>
              )}
              {/* Question button - only show when recording */}
              {wsConnected && isRecording && (
                <button
                  onClick={handleToggleQuestion}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    isAsking
                      ? "bg-orange-500 hover:bg-orange-600 text-white"
                      : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                  }`}
                >
                  {isAsking ? "Done" : "❓"}
                </button>
              )}
            </div>
          </div>

          <div
            ref={transcriptContainerRef}
            className="flex-1 overflow-y-auto bg-gray-50 rounded-lg p-3 space-y-2"
          >
            {transcript.length === 0 &&
            !interimText &&
            !broadcastInterimText ? (
              <div className="text-gray-400 text-sm text-center py-8">
                <p>Press 🎤 to start recording</p>
                <p className="text-xs mt-1">
                  or press + to add content manually
                </p>
              </div>
            ) : (
              <>
                {transcript.map((item, index) => (
                  <div key={item.id || index} className="flex flex-col group">
                    {editingIndex === index ? (
                      // Edit mode
                      <div className="bg-blue-50 p-3 rounded border border-blue-200 space-y-2">
                        <input
                          type="text"
                          value={editSpeaker}
                          onChange={(e) => setEditSpeaker(e.target.value)}
                          className="w-full text-xs font-medium text-purple-600 bg-white border border-purple-200 rounded px-2 py-1"
                          placeholder="Speaker..."
                        />
                        <textarea
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          className="w-full text-sm bg-white border rounded px-2 py-1.5 min-h-[50px] resize-none"
                          placeholder="Content..."
                          autoFocus
                        />
                        <div className="flex gap-1">
                          <button
                            onClick={handleSaveEdit}
                            className="p-1.5 bg-green-500 text-white rounded hover:bg-green-600"
                            title="Save"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="p-1.5 bg-gray-400 text-white rounded hover:bg-gray-500"
                            title="Cancel"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      // View mode - Redesigned with role-based colors
                      <div
                        className="relative bg-white rounded-lg px-4 py-3 border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all"
                        style={{
                          fontFamily: "'Times New Roman', Times, serif",
                        }}
                      >
                        {/* VTT Timestamp - cleaner format */}
                        {(item.start_time_vtt || item.end_time_vtt) && (
                          <div className="flex items-center gap-2 mb-2">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 rounded text-[11px] text-gray-500 font-mono">
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                                className="w-3 h-3"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-13a.75.75 0 00-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 000-1.5h-3.25V5z"
                                  clipRule="evenodd"
                                />
                              </svg>
                              {
                                (item.start_time_vtt || "00:00:00").split(
                                  "."
                                )[0]
                              }{" "}
                              →{" "}
                              {(item.end_time_vtt || "00:00:00").split(".")[0]}
                            </span>
                          </div>
                        )}
                        {/* Speaker name with role-based coloring */}
                        {(() => {
                          const displaySpeaker =
                            item.edited_speaker || item.speaker || "Unknown";
                          const speakerLower = displaySpeaker.toLowerCase();
                          const isEdited =
                            !!item.edited_speaker || !!item.edited_text;

                          // Role-based color mapping
                          let roleColor = "text-gray-600 bg-gray-100"; // default
                          let roleLabel = "";

                          if (
                            speakerLower.includes("student") ||
                            speakerLower.includes("sinh viên")
                          ) {
                            roleColor = "text-blue-700 bg-blue-50";
                            roleLabel = "Student";
                          } else if (
                            speakerLower.includes("chair") ||
                            speakerLower.includes("chủ tịch")
                          ) {
                            roleColor = "text-purple-700 bg-purple-50";
                            roleLabel = "Chair";
                          } else if (
                            speakerLower.includes("secretary") ||
                            speakerLower.includes("thư ký")
                          ) {
                            roleColor = "text-emerald-700 bg-emerald-50";
                            roleLabel = "Secretary";
                          } else if (
                            speakerLower.includes("member") ||
                            speakerLower.includes("thành viên")
                          ) {
                            roleColor = "text-amber-700 bg-amber-50";
                            roleLabel = "Member";
                          } else if (
                            [
                              "khách",
                              "unknown",
                              "identifying",
                              "guest",
                            ].includes(speakerLower)
                          ) {
                            roleColor = "text-red-600 bg-red-50";
                            roleLabel = "Unknown";
                          }

                          return (
                            <div className="flex items-center gap-2 mb-1">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${roleColor}`}
                              >
                                {displaySpeaker}
                              </span>
                              {isEdited && (
                                <span className="text-[10px] text-orange-500 italic">
                                  ✎ edited
                                </span>
                              )}
                            </div>
                          );
                        })()}
                        {/* Text content - Times New Roman */}
                        <p
                          className="text-gray-800 text-[15px] leading-relaxed pr-12"
                          style={{
                            fontFamily: "'Times New Roman', Times, serif",
                          }}
                        >
                          {item.edited_text || item.text}
                        </p>
                        {/* Edit/Delete - show on hover, hide if session completed */}
                        {session?.status !== "Completed" && (
                          <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                            <button
                              onClick={() => handleStartEdit(index)}
                              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-100 rounded-md transition-colors"
                              title="Edit"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteEntry(index)}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-100 rounded-md transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
                {/* Broadcast interim - chữ chạy từ member khác */}
                {broadcastInterimText && (
                  <div className="bg-green-50 rounded-lg px-3 py-2 border border-green-100 animate-pulse">
                    <span className="text-xs font-medium text-green-600">
                      speaking...
                    </span>
                    <p className="text-gray-600 text-sm mt-0.5 italic">
                      {broadcastInterimText}
                    </p>
                  </div>
                )}
                {/* Self interim - chữ chạy của chính mình */}
                {interimText && (
                  <div className="bg-purple-50 rounded-lg px-3 py-2 border border-purple-100 animate-pulse">
                    <span className="text-xs font-medium text-purple-500">
                      ...
                    </span>
                    <p className="text-gray-600 text-sm mt-0.5 italic">
                      {interimText}
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Notes Section */}
        <div className="bg-white rounded-lg shadow-sm border p-4 flex flex-col h-[500px]">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-800">Notes</h2>
            {session?.status === "Completed" && (
              <span className="text-xs text-gray-400">
                Session completed - read only
              </span>
            )}
          </div>
          <textarea
            className={`flex-1 w-full p-4 border rounded-md resize-none focus:outline-none text-sm shadow-inner ${
              session?.status === "Completed"
                ? "bg-gray-100 text-gray-500 cursor-not-allowed"
                : "bg-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            }`}
            style={{ fontFamily: "'Times New Roman', Times, serif" }}
            placeholder="- Quick notes...&#10;- Example: The group presented clearly, Demo was stable."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={session?.status === "Completed"}
            readOnly={session?.status === "Completed"}
          />
        </div>
      </div>

      {/* Question Results */}
      {questionResults.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border p-4 mb-4">
          <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
            Recorded Questions
            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
              {questionResults.length}
            </span>
          </h3>
          <div className="space-y-4">
            {questionResults.map((q, i) => (
              <div
                key={i}
                className={`border rounded-md p-3 flex flex-col gap-2 ${
                  q.from_member ? "bg-green-50 border-green-200" : "bg-gray-50"
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    {/* Hiển thị người đặt câu hỏi */}
                    {q.from_member && (
                      <span className="text-xs font-medium text-green-700 mb-1 block">
                        👤 {q.speaker_name || q.speaker || "Member"}
                      </span>
                    )}
                    <p className="text-sm text-gray-800 whitespace-pre-line">
                      {q.question_text || q.text || "(Empty)"}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    {q.from_member && (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                        From Member
                      </span>
                    )}
                    {q.is_duplicate && (
                      <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded">
                        Duplicate
                      </span>
                    )}
                  </div>
                </div>
                {q.similar && q.similar.length > 0 && (
                  <div className="text-xs text-gray-600">
                    <p className="font-medium mb-1">Similar questions:</p>
                    <ul className="list-disc ml-4 space-y-0.5">
                      {q.similar.map((s: any, idx: number) => (
                        <li key={idx}>{s.text}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-end gap-3 mb-8">
        {session?.status === "Completed" ? (
          <button
            disabled
            className="px-6 py-2 text-white bg-green-500 rounded-md text-sm font-medium shadow-sm cursor-not-allowed flex items-center gap-2"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="w-4 h-4"
            >
              <path
                fillRule="evenodd"
                d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z"
                clipRule="evenodd"
              />
            </svg>
            Session Completed
          </button>
        ) : (
          <>
            <button
              onClick={() => window.history.back()}
              className="px-4 py-2 text-gray-600 bg-white border rounded-md hover:bg-gray-50 text-sm font-medium shadow-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveTranscript}
              disabled={saving || transcript.length === 0}
              className="px-4 py-2 text-white bg-purple-600 rounded-md hover:bg-purple-700 text-sm font-medium shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? "Saving..." : "Complete Session"}
            </button>
          </>
        )}
      </div>

      {/* Meeting Minutes Form */}
      <div className="mb-12">
        <div className="flex items-center gap-2 mb-6">
          <div className="h-px flex-1 bg-gray-200"></div>
          <span className="text-gray-400 text-sm font-medium uppercase tracking-wider">
            Meeting Minutes
          </span>
          <div className="h-px flex-1 bg-gray-200"></div>
        </div>
        <MeetingMinutesForm defenseId={id} />
      </div>

      <p className="text-center text-xs text-gray-400 pb-4">
        © 2025 AIDefCom · Smart Graduation Defense
      </p>
    </div>
  );
}
