"use client";

import { useState, useEffect, useRef, use } from "react";
import Link from "next/link";
import { useAudioRecorder } from "@/lib/hooks/useAudioRecorder";
import { swalConfig, closeSwal } from "@/lib/utils/sweetAlert";
// import { useSTTWebSocket, STTEvent } from "@/lib/hooks/useSTTWebSocket";
import { defenseSessionsApi } from "@/lib/api/defense-sessions";
import { transcriptsApi } from "@/lib/api/transcripts";
import { DefenseSessionDto, TranscriptDto } from "@/lib/models";
import MeetingMinutesForm from "../../components/MeetingMinutesForm";
import { Pencil, Check, X, Trash2, Plus } from "lucide-react";

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
}

export default function TranscriptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
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
  const RECORDING_API_BASE = "https://aidefcomapi.azurewebsites.net";

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
        // Fetch session info
        const response = await defenseSessionsApi.getById(Number(id));
        if (response.data) {
          setSession(response.data);

          // Lấy session role của user hiện tại
          try {
            const storedUser = localStorage.getItem("user");
            if (storedUser) {
              const parsedUser = JSON.parse(storedUser);
              const currentUserId = parsedUser.id;

              const lecturersRes = await defenseSessionsApi.getUsersBySessionId(
                Number(id)
              );
              if (lecturersRes.data) {
                const currentUserInSession = lecturersRes.data.find(
                  (user: any) =>
                    String(user.id).toLowerCase() ===
                    String(currentUserId).toLowerCase()
                );

                if (currentUserInSession && currentUserInSession.role) {
                  const sessionRoleValue =
                    currentUserInSession.role.toLowerCase();
                  localStorage.setItem("sessionRole", sessionRoleValue);
                }
              }
            }
          } catch (err) {
            console.error("Failed to get session role:", err);
          }
        }

        // Fetch existing transcript
        const transcriptRes = await transcriptsApi.getBySessionId(Number(id));
        if (transcriptRes.data && transcriptRes.data.length > 0) {
          const existingTranscript = transcriptRes.data[0];
          setExistingTranscriptId(existingTranscript.id);

          // Parse stored transcript text (JSON format)
          if (existingTranscript.transcriptText) {
            try {
              const parsed = JSON.parse(existingTranscript.transcriptText);
              if (Array.isArray(parsed)) {
                // Convert to STTEvent format with unique IDs
                const loadedTranscript: STTEvent[] = parsed.map(
                  (item: any, index: number) => ({
                    event: "recognized",
                    text: item.text || item.content || "",
                    speaker: item.speaker || item.speaker_name || "Unknown",
                    id: item.id || `loaded_${index}_${Date.now()}`,
                    isNew: false,
                  })
                );
                // Load from DB - this is saved/finalized data
                setTranscript(loadedTranscript);
                transcriptLoadedRef.current = true; // Mark as loaded to prevent Redis overwrite
                console.log(
                  "📦 Loaded transcript from DB:",
                  loadedTranscript.length,
                  "entries"
                );
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
              console.log(
                "📦 Loaded transcript (plain text) from DB:",
                loadedTranscript.length,
                "entries"
              );
            }
          }
        }
      } catch (error) {
        console.error("Failed to fetch session/transcript:", error);
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
    console.log("📨 [Secretary] STT Event:", eventType, msg);

    // Handle WebSocket connected event
    if (eventType === "connected") {
      console.log("✅ WebSocket connected:", msg);
      if (msg.session_id) {
        setMySessionId(msg.session_id);
        mySessionIdRef.current = msg.session_id;
      }
      return;
    }

    // Handle cached transcript from Redis (sent on reconnect)
    if (eventType === "cached_transcript") {
      console.log("📂 Received cached transcript from Redis:", msg);
      const cachedLines = msg.lines || [];

      // Only use Redis cache if we don't already have data loaded from DB
      // DB data = saved/finalized transcript, Redis = working draft
      if (cachedLines.length > 0 && !transcriptLoadedRef.current) {
        // Convert cached lines to STTEvent format
        const loadedTranscript: STTEvent[] = cachedLines.map(
          (line: any, index: number) => ({
            event: "recognized",
            text: line.text || "",
            speaker: line.speaker || "Unknown",
            speaker_name: line.speaker_name || line.speaker,
            user_id: line.user_id,
            id: line.id || `cached_${index}_${Date.now()}`,
            isNew: false,
          })
        );

        setTranscript(loadedTranscript);
        transcriptLoadedRef.current = true;
        console.log(
          "✅ Loaded",
          loadedTranscript.length,
          "lines from Redis cache (no DB data)"
        );
        swalConfig.toast.success(
          `Đã khôi phục ${loadedTranscript.length} dòng transcript từ cache`
        );
      } else if (cachedLines.length > 0) {
        console.log(
          "⏭️ Skipped Redis cache - already have DB data:",
          transcript.length,
          "entries"
        );
      } else {
        console.log("📂 Redis cache is empty");
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

      // Normalize event structure for state with unique ID
      const newEntry: STTEvent = {
        ...msg,
        event: "recognized",
        id: `stt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        isNew: true,
      };
      setTranscript((prev) => [...prev, newEntry]);
      setHasUnsavedChanges(true);

      // If in question mode, mark that we have final text
      if (isAsking && msg.text) {
        setHasQuestionFinalText(true);
      }
    } else if (eventType === "question_mode_started") {
      console.log("Question mode started", msg.session_id);
      swalConfig.info("Bắt đầu ghi nhận câu hỏi");
      // Reset flag when starting new question
      setHasQuestionFinalText(false);
    } else if (eventType === "question_mode_result") {
      // Kết quả câu hỏi của CHÍNH MÌNH (thư ký tự đặt)
      console.log("Question mode result (self)", msg);

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
          "Câu hỏi bị trùng",
          "Hệ thống đã ghi nhận câu hỏi này trước đó."
        );
      } else {
        // Thêm vào danh sách (không cần dedup vì đây là event trực tiếp)
        if (questionText) {
          setQuestionResults((prev) => [{ ...msg, from_self: true }, ...prev]);
        }
        swalConfig.success("Câu hỏi hợp lệ", "Đã ghi nhận câu hỏi mới.");
      }
    } else if (eventType === "session_started") {
      console.log("Session started:", msg.session_id);
    } else if (eventType === "error") {
      console.error("STT Error:", msg.message || msg.error);
      swalConfig.error(
        "Lỗi STT",
        msg.message || msg.error || "Đã xảy ra lỗi không xác định"
      );
    } else if (eventType === "speaker_identified") {
      console.log("Speaker identified:", msg.speaker);
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
        const newEntry: STTEvent = {
          event: "recognized",
          text: msg.text,
          speaker: msg.speaker_name || msg.speaker || "Đang xác định",
          id: `broadcast_${Date.now()}_${Math.random()
            .toString(36)
            .substr(2, 9)}`,
          isNew: true,
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
      const speakerName = msg.speaker_name || msg.speaker || "Đang xác định";
      setBroadcastInterimText(`${speakerName}: ${msg.text || ""}`);
    } else if (eventType === "broadcast_question_started") {
      // Member bắt đầu đặt câu hỏi - dùng toast nhẹ nhàng
      if (
        msg.source_session_id &&
        msg.source_session_id === mySessionIdRef.current
      ) {
        return;
      }
      const speakerName = msg.speaker_name || msg.speaker || "Thành viên";
      // Toast notification - không chặn màn hình
      swalConfig.toast.info(`${speakerName} đang đặt câu hỏi...`);
    } else if (eventType === "broadcast_question_processing") {
      // Member kết thúc đặt câu hỏi, đang xử lý
      // Dùng toast để thư ký biết nhưng KHÔNG bị chặn làm việc
      if (
        msg.source_session_id &&
        msg.source_session_id === mySessionIdRef.current
      ) {
        return;
      }
      const speakerName = msg.speaker_name || msg.speaker || "Thành viên";
      // Toast nhẹ - tự đóng sau 3s, không cần bấm OK
      swalConfig.toast.info(`Đang xử lý câu hỏi từ ${speakerName}...`);
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
        console.log("🚫 Duplicate question broadcast ignored:", questionId);
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

      const speakerName = msg.speaker_name || msg.speaker || "Thành viên";
      const questionText = msg.question_text || "";

      if (msg.is_duplicate) {
        swalConfig.warning(
          "Câu hỏi bị trùng",
          `Câu hỏi từ ${speakerName} đã được ghi nhận trước đó.`
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
          "Câu hỏi hợp lệ",
          `Đã ghi nhận câu hỏi từ ${speakerName}.`
        );
      }
    } else if (eventType === "connected") {
      console.log(
        "✅ WebSocket connected:",
        msg.session_id,
        "room_size:",
        msg.room_size
      );
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

  // Use local backend URL for debugging
  // Backend automatically identifies speaker, so we don't need to send speaker param
  // REMOVING defense_session_id to match Python script behavior (which works).
  //const WS_URL = `ws://localhost:8000/ws/stt?defense_session_id=${id}`;
  const WS_URL = `wss://ai-service.thankfultree-4b6bfec6.southeastasia.azurecontainerapps.io/ws/stt?defense_session_id=${id}`;

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
      stopRecording(); // Chỉ tạm dừng mic của thư ký, WebSocket vẫn mở
      // KHÔNG broadcast mic:disabled - student vẫn có thể nói
      // Pause session recording khi dừng mic
      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state === "recording"
      ) {
        mediaRecorderRef.current.pause();
        console.log("🎙️ Session recording paused");
      }
    } else {
      setPacketsSent(0);
      await startRecording();
      // Broadcast session:start cho member biết thư ký đã bắt đầu/resume
      if (!hasStartedSession) {
        // Chờ một chút để WS kết nối xong
        setTimeout(() => {
          broadcastSessionStart();
          setHasStartedSession(true);
        }, 500);
      } else {
        // Đã bắt đầu session trước đó, resume → gửi lại session:start để mobile app biết có thể tiếp tục
        setTimeout(() => {
          broadcastSessionStart();
        }, 100);
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
        console.log("🎙️ Session recording resumed");
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
        console.log(
          "🎙️ Session recording stopped, chunks:",
          recordingChunksRef.current.length
        );
      };

      // Start recording (gather every 1 second)
      recordingStartTimeRef.current = performance.now();
      mediaRecorder.start(1000);
      setIsSessionRecording(true);
      console.log(
        "🎙️ Session recording started (mime:",
        mediaRecorder.mimeType || mimeType || "default",
        ")"
      );
    } catch (error: any) {
      console.error("Failed to start session recording:", error);
      swalConfig.toast.error("Không thể bắt đầu ghi âm phiên");
    }
  };

  // Stop recording and upload to Azure
  const stopAndUploadRecording = async (): Promise<void> => {
    return new Promise(async (resolve) => {
      if (!mediaRecorderRef.current || !isSessionRecording) {
        console.log("⏭️ No active recording to upload");
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

        console.log(
          "🎙️ Recording completed:",
          (sizeBytes / 1024).toFixed(1),
          "KB, duration:",
          durationSec,
          "s"
        );

        if (sizeBytes === 0) {
          console.warn("⚠️ Recording is empty, skipping upload");
          setIsSessionRecording(false);
          setIsUploadingRecording(false);
          resolve();
          return;
        }

        // Get user ID
        let userId = "unknown";
        try {
          const storedUser = localStorage.getItem("user");
          if (storedUser) {
            const parsedUser = JSON.parse(storedUser);
            userId = parsedUser.id || "unknown";
          }
        } catch {}

        // Step 1: Begin upload to get SAS URL
        console.log("📤 Begin upload (mime:", mimeType, ")");
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
        console.log("✅ SAS obtained. RecordingId:", uploadRecordingId);

        // Step 2: PUT blob to Azure SAS URL
        console.log("📤 Uploading to Azure...");
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
        console.log("✅ Upload completed");

        // Step 3: Finalize recording
        console.log(
          "📤 Finalizing... (durationSec:",
          durationSec,
          ", sizeBytes:",
          sizeBytes,
          ", transcriptId:",
          existingTranscriptId,
          ")"
        );
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
        console.log("✅ Recording finalized successfully");
        swalConfig.toast.success("Đã lưu bản ghi âm phiên bảo vệ");

        // Cleanup
        setIsSessionRecording(false);
        mediaRecorderRef.current = null;
        recordingChunksRef.current = [];
        resolve();
      } catch (error: any) {
        console.error("❌ Recording upload error:", error);
        swalConfig.toast.error("Không thể upload bản ghi âm: " + error.message);
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
        "Đang xử lý câu hỏi...",
        "Vui lòng chờ hệ thống phân tích câu hỏi"
      );

      // 3. Sau 5s, nếu vẫn chưa có kết quả thì show nút "Tiếp tục"
      // Popup upgrade timeout (separate from enable timer). Use a separate timeout so we don't conflict with earlier stored one
      const upgradePopupTimeout = setTimeout(() => {
        if (waitingForQuestionResult.current) {
          swalConfig.warning(
            "Đang xử lý câu hỏi...",
            "Hệ thống đang phân tích câu hỏi. Bạn có thể tiếp tục buổi bảo vệ, kết quả sẽ hiển thị khi hoàn tất."
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
    setEditText(transcript[index].text || "");
    setEditSpeaker(transcript[index].speaker || "");
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
      newTranscript[editingIndex] = {
        ...newTranscript[editingIndex],
        text: editText,
        speaker: editSpeaker,
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
      speaker: "Thư ký",
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
      swalConfig.error("Lỗi", "Không tìm thấy phiên bảo vệ");
      return;
    }

    if (transcript.length === 0) {
      swalConfig.error("Lỗi", "Không có nội dung transcript để lưu");
      return;
    }

    try {
      setSaving(true);
      console.log("📤 Starting save transcript to DB...");
      console.log("   existingTranscriptId:", existingTranscriptId);
      console.log("   session.id:", session.id);
      console.log("   transcript.length:", transcript.length);

      // Prepare transcript data as JSON
      const transcriptData = transcript.map((item) => ({
        id: item.id,
        text: item.text,
        speaker: item.speaker,
        speaker_name: item.speaker_name,
      }));

      const transcriptText = JSON.stringify(transcriptData);
      console.log("   transcriptText length:", transcriptText.length);

      if (existingTranscriptId) {
        // Update existing transcript
        console.log(
          "📝 Updating existing transcript ID:",
          existingTranscriptId
        );
        const updateResult = await transcriptsApi.update(existingTranscriptId, {
          transcriptText: transcriptText,
          status: "Completed",
        });
        console.log("✅ Update result:", updateResult);
      } else {
        // Create new transcript
        console.log("📝 Creating new transcript for session:", session.id);
        const result = await transcriptsApi.create({
          sessionId: session.id,
          transcriptText: transcriptText,
          status: "Completed",
        });
        console.log("✅ Create result:", result);
        if (result.data) {
          setExistingTranscriptId(result.data.id);
          console.log("   New transcript ID:", result.data.id);
        }
      }

      setHasUnsavedChanges(false);
      swalConfig.success("Thành công", "Đã lưu transcript vào Database!");

      // Upload recording to Azure (if recording was active)
      if (isSessionRecording) {
        swalConfig.loading("Đang upload bản ghi âm...", "Vui lòng chờ");
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
    } catch (error: any) {
      console.error("❌ Failed to save transcript:", error);
      console.error("   Error details:", JSON.stringify(error, null, 2));
      swalConfig.error(
        "Lỗi lưu transcript",
        error.message ||
          error.response?.data?.message ||
          "Không thể lưu vào Database. Kiểm tra Console để biết chi tiết."
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

      const transcriptData = transcript.map((item) => ({
        id: item.id,
        text: item.text,
        speaker: item.speaker,
        speaker_name: item.speaker_name,
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
        swalConfig.toast.success("Đã lưu");
      }
      console.log("✅ Auto-saved transcript");
    } catch (error: any) {
      console.error("Failed to auto save:", error);
      if (showToast) {
        swalConfig.toast.error("Không thể lưu");
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

      // Set new timer for auto-save after 3 seconds
      autoSaveTimerRef.current = setTimeout(() => {
        handleAutoSave(false);
      }, 3000);
    }

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [hasUnsavedChanges, transcript, session]);

  if (!isClient) return null;
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
              Phiên bảo vệ - Nhóm {session.groupId}
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
                {wsConnected ? "Đã kết nối" : "Chưa kết nối"}
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
                  {transcript.length} dòng
                </span>
              )}
              {/* Auto-save status */}
              {saving ? (
                <span className="text-xs text-gray-400 italic">
                  Đang lưu...
                </span>
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
                className="p-1.5 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded transition-colors"
                title="Thêm dòng"
              >
                <Plus className="w-4 h-4" />
              </button>
              {/* Mic button - compact */}
              {!isAsking && (
                <button
                  onClick={handleToggleRecording}
                  className={`p-2 rounded-lg transition-colors ${
                    isRecording
                      ? "bg-red-500 hover:bg-red-600 text-white"
                      : "bg-purple-600 hover:bg-purple-700 text-white"
                  }`}
                  title={isRecording ? "Dừng ghi âm" : "Bắt đầu ghi âm"}
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
                  {isAsking ? "Xong" : "❓"}
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
                <p>Nhấn 🎤 để bắt đầu ghi âm</p>
                <p className="text-xs mt-1">
                  hoặc nhấn + để thêm nội dung thủ công
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
                          placeholder="Người nói..."
                        />
                        <textarea
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          className="w-full text-sm bg-white border rounded px-2 py-1.5 min-h-[50px] resize-none"
                          placeholder="Nội dung..."
                          autoFocus
                        />
                        <div className="flex gap-1">
                          <button
                            onClick={handleSaveEdit}
                            className="p-1.5 bg-green-500 text-white rounded hover:bg-green-600"
                            title="Lưu"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="p-1.5 bg-gray-400 text-white rounded hover:bg-gray-500"
                            title="Hủy"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      // View mode - compact
                      <div className="relative bg-white rounded-lg px-3 py-2 border border-gray-100 hover:border-gray-200 transition-colors">
                        <span className="text-xs font-medium text-purple-600">
                          {item.speaker || "Unknown"}
                        </span>
                        <p className="text-gray-800 text-sm mt-0.5 pr-12">
                          {item.text}
                        </p>
                        {/* Edit/Delete - show on hover */}
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-0.5">
                          <button
                            onClick={() => handleStartEdit(index)}
                            className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                            title="Sửa"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleDeleteEntry(index)}
                            className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                            title="Xóa"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                {/* Broadcast interim - chữ chạy từ member khác */}
                {broadcastInterimText && (
                  <div className="bg-green-50 rounded-lg px-3 py-2 border border-green-100 animate-pulse">
                    <span className="text-xs font-medium text-green-600">
                      đang nói...
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
          </div>
          <textarea
            className="flex-1 w-full p-4 bg-white border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm shadow-inner"
            placeholder="- Ghi chú nhanh...&#10;- Ví dụ: Nhóm trình bày rõ ràng, Demo ổn định."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
      </div>

      {/* Question Results */}
      {questionResults.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border p-4 mb-4">
          <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
            Câu hỏi đã ghi nhận
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
                        👤 {q.speaker_name || q.speaker || "Thành viên"}
                      </span>
                    )}
                    <p className="text-sm text-gray-800 whitespace-pre-line">
                      {q.question_text || q.text || "(Trống)"}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    {q.from_member && (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                        Từ Member
                      </span>
                    )}
                    {q.is_duplicate && (
                      <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded">
                        Trùng lặp
                      </span>
                    )}
                  </div>
                </div>
                {q.similar && q.similar.length > 0 && (
                  <div className="text-xs text-gray-600">
                    <p className="font-medium mb-1">Câu hỏi tương tự:</p>
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
          {saving ? "Đang lưu..." : "Hoàn tất phiên"}
        </button>
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
