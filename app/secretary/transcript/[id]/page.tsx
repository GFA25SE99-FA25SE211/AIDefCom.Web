"use client";

import { useState, useEffect, useRef, use } from "react";
import Link from "next/link";
import { useAudioRecorder } from "@/lib/hooks/useAudioRecorder";
import { swalConfig, closeSwal } from "@/lib/utils/sweetAlert";
// import { useSTTWebSocket, STTEvent } from "@/lib/hooks/useSTTWebSocket";
import { defenseSessionsApi } from "@/lib/api/defense-sessions";
import { DefenseSessionDto } from "@/lib/models";

// Define STTEvent locally if needed or import from a shared types file
interface STTEvent {
  event: string;
  text?: string;
  speaker?: string;
  session_id?: string;
  message?: string;
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

  // Initialize client-side only to avoid hydration mismatch
  useEffect(() => {
    setIsClient(true);

    const fetchSession = async () => {
      try {
        const response = await defenseSessionsApi.getById(Number(id));
        if (response.data) {
          setSession(response.data);
        }
      } catch (error) {
        console.error("Failed to fetch session:", error);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchSession();
    }
  }, [id]);

  const handleSTTEvent = (msg: any) => {
    const eventType = msg.type || msg.event;

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

      // Normalize event structure for state
      setTranscript((prev) => [...prev, { ...msg, event: "recognized" }]);

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
        setTranscript((prev) => [
          ...prev,
          {
            event: "recognized",
            type: "result",
            text: msg.text,
            speaker: msg.speaker || "Member",
            user_id: msg.user_id,
            timestamp: msg.timestamp,
            from_broadcast: true, // Đánh dấu là từ broadcast
          },
        ]);
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
      const speakerName = msg.speaker || "Member";
      setBroadcastInterimText(`${speakerName}: ${msg.text || ""}`);
    } else if (eventType === "broadcast_question_started") {
      // Member bắt đầu đặt câu hỏi - dùng toast nhẹ nhàng
      if (
        msg.source_session_id &&
        msg.source_session_id === mySessionIdRef.current
      ) {
        return;
      }
      const speakerName = msg.speaker || "Member";
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
      const speakerName = msg.speaker || "Member";
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

      const speakerName = msg.speaker || "Member";
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
  const WS_URL = `wss://fastapi-service.happyforest-7c6ec975.southeastasia.azurecontainerapps.io/ws/stt?defense_session_id=${id}`;

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
    } else {
      setPacketsSent(0);
      await startRecording();
      // Broadcast session:start cho member biết thư ký đã bắt đầu
      if (!hasStartedSession) {
        // Chờ một chút để WS kết nối xong
        setTimeout(() => {
          broadcastSessionStart();
          setHasStartedSession(true);
        }, 500);
      }
    }
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

  const handleSaveTranscript = async () => {
    // TODO: Lưu transcript vào database
    console.log("Saving transcript...", transcript);
    if (session) {
      console.log("Defense Session ID:", session.id);
    } else {
      console.warn("No session loaded; cannot log Defense Session ID.");
    }

    // Broadcast session:end để member biết phiên đã kết thúc
    if (hasStartedSession) {
      broadcastSessionEnd();
      setHasStartedSession(false);
    }

    // Kết thúc phiên và đóng WebSocket
    stopSession();

    // TODO: Call API to save
    alert("Transcript saved successfully!");
  };

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
      <div className="mb-6">
        <Link
          href="/secretary/transcript"
          className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
        >
          ← Back
        </Link>
        <h1 className="text-2xl font-semibold text-gray-800 mt-2">
          Defense Session - Group {session.groupId}
        </h1>
        <p className="text-gray-500 text-sm">
          Currently presenting: Group {session.groupId}{" "}
          <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded ml-2">
            {session.location}
          </span>
        </p>
        {/* Debug Info */}
        <div className="mt-2 p-2 bg-gray-100 rounded text-xs text-gray-600 font-mono">
          <p>Recording: {isRecording ? "Yes" : "No"}</p>
          <p>WebSocket: {wsConnected ? "Connected" : "Disconnected"}</p>
          <p>WS URL: {WS_URL}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Transcript Section */}
        <div className="bg-white rounded-lg shadow-sm border p-4 flex flex-col h-[500px]">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-800">Transcript</h2>
            <div className="flex items-center gap-2">
              <span
                className={`text-xs px-2 py-1 rounded-full ${
                  wsConnected && isRecording
                    ? "bg-green-100 text-green-800"
                    : wsConnected
                    ? "bg-yellow-100 text-yellow-800"
                    : "bg-gray-100 text-gray-800"
                }`}
              >
                {wsConnected && isRecording
                  ? "Recording"
                  : wsConnected
                  ? "Connected"
                  : "Offline"}
              </span>
              {!isAsking && (
                <button
                  onClick={handleToggleRecording}
                  className={`px-4 py-2 rounded-md text-white text-sm font-medium transition-colors flex items-center gap-2 ${
                    isRecording
                      ? "bg-red-500 hover:bg-red-600"
                      : "bg-purple-600 hover:bg-purple-700"
                  }`}
                >
                  {isRecording ? (
                    <>
                      <span>Stop Mic</span>
                    </>
                  ) : (
                    <>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        className="w-4 h-4"
                      >
                        <path d="M8.25 4.5a3.75 3.75 0 117.5 0v8.25a3.75 3.75 0 11-7.5 0V4.5z" />
                        <path d="M6 10.5a.75.75 0 01.75.75v1.5a5.25 5.25 0 1010.5 0v-1.5a.75.75 0 011.5 0v1.5a6.751 6.751 0 01-6 6.709v2.291h3a.75.75 0 010 1.5h-7.5a.75.75 0 010-1.5h3v-2.291a6.751 6.751 0 01-6-6.709v-1.5A.75.75 0 016 10.5z" />
                      </svg>
                      <span>Start Mic</span>
                    </>
                  )}
                </button>
              )}
              {wsConnected && isRecording && (
                <button
                  onClick={handleToggleQuestion}
                  className={`px-3 py-2 rounded-md text-white text-xs font-medium transition-colors ${
                    isAsking
                      ? "bg-orange-600 hover:bg-orange-700"
                      : "bg-indigo-500 hover:bg-indigo-600"
                  }`}
                >
                  {isAsking ? "Kết thúc đặt câu hỏi" : "Đặt câu hỏi"}
                </button>
              )}
            </div>
          </div>

          <div
            ref={transcriptContainerRef}
            className="flex-1 overflow-y-auto bg-white rounded-md border p-4 space-y-3 shadow-inner"
          >
            {transcript.length === 0 &&
            !interimText &&
            !broadcastInterimText ? (
              <div className="text-gray-400 text-sm space-y-1">
                <p>- Transcript sẽ hiển thị ở đây...</p>
                <p>- Ghi âm, chỉnh sửa hoặc thêm nội dung thủ công.</p>
              </div>
            ) : (
              <>
                {transcript.map((item, index) => (
                  <div key={index} className="flex flex-col">
                    <span className="text-xs font-bold text-blue-600 mb-0.5">
                      {item.speaker || "Unknown"}
                    </span>
                    <p className="text-gray-800 text-sm bg-gray-50 p-2 rounded border border-gray-100">
                      {item.text}
                    </p>
                  </div>
                ))}
                {/* Broadcast interim - chữ chạy từ member khác */}
                {broadcastInterimText && (
                  <div className="flex flex-col opacity-70">
                    <span className="text-xs font-bold text-green-600 mb-0.5">
                      (đang nói...)
                    </span>
                    <p className="text-gray-600 text-sm bg-green-50 p-2 rounded border border-green-100 italic">
                      {broadcastInterimText}
                    </p>
                  </div>
                )}
                {/* Self interim - chữ chạy của chính mình */}
                {interimText && (
                  <div className="flex flex-col opacity-70">
                    <span className="text-xs font-bold text-gray-500 mb-0.5">
                      ...
                    </span>
                    <p className="text-gray-600 text-sm bg-gray-50 p-2 rounded border border-gray-100 italic">
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

      {/* Usage Instructions */}
      <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
        <h3 className="text-sm font-semibold text-gray-800 mb-2">
          Usage Instructions:
        </h3>
        <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
          <li>Click &quot;Start Mic&quot; to begin recording</li>
          <li>
            Use &quot;Pause&quot; to temporarily stop and &quot;Resume&quot; to
            continue
          </li>
          <li>Click &quot;End&quot; to finish the recording session</li>
          <li>You can edit or take notes at any time</li>
          <li>Nhấn "Đặt câu hỏi" để vào chế độ ghi nhận câu hỏi</li>
          <li>Nhấn lại để kết thúc, hệ thống sẽ trả về câu hỏi đã bắt được</li>
        </ul>
      </div>

      {/* Question Results */}
      {questionResults.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
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
                        👤 {q.speaker || "Member"}
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
          disabled={!wsConnected && transcript.length === 0}
          className="px-4 py-2 text-white bg-purple-600 rounded-md hover:bg-purple-700 text-sm font-medium shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Save Transcript
        </button>
      </div>

      <p className="text-center text-xs text-gray-400 pb-4">
        © 2025 AIDefCom · Smart Graduation Defense
      </p>
    </div>
  );
}
