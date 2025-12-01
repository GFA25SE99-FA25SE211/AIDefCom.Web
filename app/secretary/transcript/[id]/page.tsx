"use client";

import { useState, useEffect, useRef, use, useCallback } from "react";
import Link from "next/link";
import { useAudioRecorder } from "@/lib/hooks/useAudioRecorder";
import { swalConfig, closeSwal } from "@/lib/utils/sweetAlert";
import { defenseSessionsApi, groupsApi } from "@/lib/api";
import { DefenseSessionDto } from "@/lib/models";

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
  const [interimText, setInterimText] = useState("");
  const [packetsSent, setPacketsSent] = useState(0);
  const [questionResults, setQuestionResults] = useState<any[]>([]);

  // Use a ref to keep track of the latest transcript for efficient updates
  const transcriptRef = useRef<STTEvent[]>([]);
  const transcriptContainerRef = useRef<HTMLDivElement | null>(null);
  const questionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const waitingForQuestionResult = useRef<boolean>(false);
  const [hasQuestionFinalText, setHasQuestionFinalText] = useState(false);

  // Initialize client-side only to avoid hydration mismatch
  useEffect(() => {
    setIsClient(true);

    const fetchSession = async () => {
      try {
        const response = await defenseSessionsApi.getById(Number(id));
        if (response.data) {
          const sessionData = response.data;
          // Fetch group details to get topicTitle_EN
          if (sessionData.groupId) {
            try {
              const groupResponse = await groupsApi.getById(
                sessionData.groupId
              );
              if (groupResponse.data) {
                sessionData.topicTitle_EN = groupResponse.data.topicTitle_EN;
                sessionData.topicTitle_VN = groupResponse.data.topicTitle_VN;
              }
            } catch (groupError) {
              console.error("Failed to fetch group details:", groupError);
            }
          }
          setSession(sessionData);
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

  const handleSTTEvent = useCallback((msg: any) => {
    console.log("handleSTTEvent received:", msg);
    const eventType = msg.type || msg.event;

    if (eventType === "partial" || eventType === "recognizing") {
      setInterimText(msg.text || "");
    } else if (eventType === "result" || eventType === "recognized") {
      setInterimText("");
      // Normalize event structure for state
      setTranscript((prev) => [...prev, { ...msg, event: "recognized" }]);

      // If in question mode, mark that we have final text
      // Note: isAsking is not available here due to circular dependency with useAudioRecorder
      // if (isAsking && msg.text) {
      //   setHasQuestionFinalText(true);
      // }
    } else if (eventType === "question_mode_started") {
      console.log("Question mode started", msg.session_id);
      swalConfig.info("Bắt đầu ghi nhận câu hỏi");
      // Reset flag when starting new question
      setHasQuestionFinalText(false);
    } else if (eventType === "question_mode_result") {
      console.log("Question mode result", msg);

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

      if (msg.is_duplicate) {
        swalConfig.warning(
          "Câu hỏi bị trùng",
          "Hệ thống đã ghi nhận câu hỏi này trước đó."
        );
        // Do not add duplicate question to UI list
      } else {
        setQuestionResults((prev) => [msg, ...prev]);
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
    }
  }, []);

  useEffect(() => {
    const el = transcriptContainerRef.current;
    if (!el) return;
    // Always scroll to bottom when transcript or interimText changes
    // Use requestAnimationFrame to ensure DOM updated
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
  }, [transcript, interimText]);

  const WS_URL = `ws://localhost:8000/ws/stt?defense_session_id=${id}`;

  const {
    isRecording,
    isAsking,
    wsConnected,
    startRecording,
    stopRecording,
    toggleAsk,
    stopSession,
  } = useAudioRecorder({
    wsUrl: WS_URL,
    onWsEvent: handleSTTEvent,
    autoConnect: true,
  });

  const handleToggleRecording = async () => {
    if (isRecording) {
      stopRecording(); // Chỉ tạm dừng mic, WebSocket vẫn mở
    } else {
      setPacketsSent(0);
      await startRecording();
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
      questionTimeoutRef.current = setTimeout(() => {
        // Chỉ show nếu vẫn đang chờ kết quả
        if (waitingForQuestionResult.current) {
          swalConfig.warning(
            "Đang xử lý câu hỏi...",
            "Hệ thống đang phân tích câu hỏi. Bạn có thể tiếp tục buổi bảo vệ, kết quả sẽ hiển thị khi hoàn tất."
          );
        }
      }, 5000);

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
      <div className="mb-8">
        <Link
          href="/secretary/transcript"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-900 mb-4 transition-colors"
        >
          <svg
            className="w-4 h-4 mr-1"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          Back to Dashboard
        </Link>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="flex flex-col md:flex-row justify-between items-start gap-4">
            <div className="space-y-3 flex-1">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-gray-900">
                  Defense Session{" "}
                  <span className="text-indigo-600">#{session.groupId}</span>
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                  {session.status || "Scheduled"}
                </span>
              </div>

              {session.topicTitle_EN && (
                <p className="text-lg text-gray-700 font-medium leading-relaxed">
                  {session.topicTitle_EN}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-gray-500">
                <div className="flex items-center gap-1.5">
                  <svg
                    className="w-4 h-4 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  {session.location}
                </div>
                {session.defenseDate && (
                  <div className="flex items-center gap-1.5">
                    <svg
                      className="w-4 h-4 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    {new Date(session.defenseDate).toLocaleDateString()}
                  </div>
                )}
                {session.startTime && session.endTime && (
                  <div className="flex items-center gap-1.5">
                    <svg
                      className="w-4 h-4 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    {session.startTime.slice(0, 5)} -{" "}
                    {session.endTime.slice(0, 5)}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Technical Status Bar */}
          <div className="mt-6 pt-4 border-t border-gray-100 flex items-center gap-6 text-xs font-mono text-gray-500">
            <div className="flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full ${
                  wsConnected ? "bg-emerald-500" : "bg-rose-500"
                }`}
              ></span>
              <span>System: {wsConnected ? "Online" : "Offline"}</span>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full ${
                  isRecording ? "bg-rose-500 animate-pulse" : "bg-slate-300"
                }`}
              ></span>
              <span>Mic: {isRecording ? "Active" : "Standby"}</span>
            </div>
            <div className="text-gray-400 truncate max-w-xs" title={WS_URL}>
              {WS_URL}
            </div>
          </div>
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
                  disabled={isAsking && !hasQuestionFinalText}
                  className={`px-3 py-2 rounded-md text-white text-xs font-medium transition-colors ${
                    isAsking
                      ? "bg-orange-600 hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      : "bg-indigo-500 hover:bg-indigo-600"
                  }`}
                  title={
                    isAsking && !hasQuestionFinalText
                      ? "Vui lòng nói câu hỏi hoàn chỉnh"
                      : ""
                  }
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
            {transcript.length === 0 && !interimText ? (
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
          <li>Nhấn lại để kết thúc, hệ thống sẽ trả về câu hỏi đã nhận được</li>
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
                className="border rounded-md p-3 bg-gray-50 flex flex-col gap-2"
              >
                <div className="flex justify-between items-start">
                  <p className="text-sm text-gray-800 whitespace-pre-line">
                    {q.question_text || q.text || "(Trống)"}
                  </p>
                  {q.is_duplicate && (
                    <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded">
                      Trùng lặp
                    </span>
                  )}
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
