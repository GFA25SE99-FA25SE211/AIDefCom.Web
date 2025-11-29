"use client";

import { useState, useEffect, useRef, use } from "react";
import Link from "next/link";
import { useAudioRecorder } from "@/lib/hooks/useAudioRecorder";
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
  const [interimText, setInterimText] = useState("");
  const [packetsSent, setPacketsSent] = useState(0);

  // Use a ref to keep track of the latest transcript for efficient updates
  const transcriptRef = useRef<STTEvent[]>([]);

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

    if (eventType === "partial" || eventType === "recognizing") {
      setInterimText(msg.text || "");
    } else if (eventType === "result" || eventType === "recognized") {
      setInterimText("");
      // Normalize event structure for state
      setTranscript((prev) => [...prev, { ...msg, event: "recognized" }]);
    } else if (eventType === "session_started") {
      console.log("Session started:", msg.session_id);
    } else if (eventType === "error") {
      console.error("STT Error:", msg.message || msg.error);
    } else if (eventType === "speaker_identified") {
      console.log("Speaker identified:", msg.speaker);
      // Optional: update UI with speaker info if needed
    }
  };

  // Use local backend URL for debugging
  // Backend automatically identifies speaker, so we don't need to send speaker param
  // REMOVING defense_session_id to match Python script behavior (which works).
  const WS_URL = `ws://localhost:8000/ws/stt`;
  // const WS_URL = `ws://localhost:8000/ws/stt?defense_session_id=${id}`;

  const {
    isRecording,
    isAsking,
    startRecording,
    stopRecording,
    toggleAsk,
    stopSession,
  } = useAudioRecorder({
    wsUrl: WS_URL,
    onWsEvent: handleSTTEvent,
  });

  const handleToggleRecording = async () => {
    if (isRecording) {
      stopSession(); // Use stopSession to close WS and stop recording
    } else {
      setPacketsSent(0);
      await startRecording();
    }
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
          <p>Status: {isRecording ? "Recording" : "Idle"}</p>
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
                  isRecording
                    ? "bg-green-100 text-green-800"
                    : "bg-gray-100 text-gray-800"
                }`}
              >
                {isRecording ? "Live" : "Offline"}
              </span>
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
            </div>
          </div>

          <div className="flex-1 overflow-y-auto bg-white rounded-md border p-4 space-y-3 shadow-inner">
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
        </ul>
      </div>

      <div className="flex justify-end gap-3 mb-8">
        <button className="px-4 py-2 text-gray-600 bg-white border rounded-md hover:bg-gray-50 text-sm font-medium shadow-sm">
          Cancel
        </button>
        <button className="px-4 py-2 text-white bg-purple-600 rounded-md hover:bg-purple-700 text-sm font-medium shadow-sm">
          Save Transcript
        </button>
      </div>

      <p className="text-center text-xs text-gray-400 pb-4">
        © 2025 AIDefCom · Smart Graduation Defense
      </p>
    </div>
  );
}
