"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { swalConfig } from "@/lib/utils/sweetAlert";

export default function TranscriptSessionPage() {
  const { id } = useParams();
  const router = useRouter();

  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [notes, setNotes] = useState("");
  const [listening, setListening] = useState(false);
  const [paused, setPaused] = useState(false);
  let recognition: any;

  if (typeof window !== "undefined" && "webkitSpeechRecognition" in window) {
    const SpeechRecognition = (window as any).webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.lang = "vi-VN";
  }

  const handleStartMic = () => {
    if (!recognition) return;
    setListening(true);
    setPaused(false);
    recognition.start();

    recognition.onresult = (event: any) => {
      const result = event.results[event.results.length - 1];
      let speech = result[0].transcript.trim();
      if (result.isFinal) {
        const now = new Date();
        const timestamp = `[${now.getHours().toString().padStart(2, "0")}:${now
          .getMinutes()
          .toString()
          .padStart(2, "0")}] `;
        speech = timestamp + speech.charAt(0).toUpperCase() + speech.slice(1);
        if (!/[.!?]$/.test(speech)) speech += ".";
        setText((prev) => (prev ? prev + "\n" + speech : speech));
      }
    };

    recognition.onend = () => {
      if (listening && !paused) recognition.start();
    };
  };

  const handlePauseMic = () => {
    if (!recognition) return;
    if (!paused) {
      recognition.stop();
      setPaused(true);
    } else {
      recognition.start();
      setPaused(false);
    }
  };

  const handleStopMic = () => {
    if (recognition) recognition.stop();
    setListening(false);
    setPaused(false);
  };

  useEffect(() => {
    const savedText = localStorage.getItem(`transcript-${id}`);
    const savedNotes = localStorage.getItem(`notes-${id}`);
    if (savedText) setText(savedText);
    if (savedNotes) setNotes(savedNotes);
  }, [id]);

  const handleSave = async () => {
    console.log("Saving local transcript...", { text, notes });
    await swalConfig.success("Transcript saved", "Your local transcript was saved.");
  };

  return (
    <div className="page-container">
      <button
        onClick={() => router.push("/secretary")}
        className="text-sm text-gray-600 hover:text-gray-800 mb-3"
      >
        ← Back
      </button>

      <div className="main-header">
        <h1 className="text-2xl font-semibold text-gray-800">
          Defense Session - Group {id}
        </h1>
        <p className="text-sm text-gray-500">
          Currently presenting: Group {id}
          <span className="ml-2 badge badge-info">
            Smart Learning Management System
          </span>
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* --- Transcript --- */}
        <div className="card-base border flex flex-col">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-semibold text-gray-800">Transcript</h2>

            <div className="flex gap-2">
              {!listening ? (
                <button
                  onClick={handleStartMic}
                  className="btn-primary text-sm"
                >
                  🎙 Start Mic
                </button>
              ) : (
                <>
                  <button
                    onClick={handlePauseMic}
                    className={`text-sm px-3 py-2 rounded-lg font-medium text-white transition ${
                      paused
                        ? "bg-green-600 hover:opacity-90"
                        : "bg-yellow-500 hover:opacity-90"
                    }`}
                  >
                    {paused ? "▶ Resume" : "⏸ Pause"}
                  </button>
                  <button
                    onClick={handleStopMic}
                    className="btn-secondary text-sm"
                  >
                    ⏹ End
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Textarea đồng bộ với Notes */}
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="input-base h-[380px] resize-none leading-6 text-sm placeholder-gray-400"
            placeholder={`- Transcript sẽ hiển thị ở đây...\n- Ghi âm, chỉnh sửa hoặc thêm nội dung thủ công.`}
          />
        </div>

        {/* Notes */}
        <div className="card-base border flex flex-col">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">Notes</h2>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="input-base h-[380px] resize-none leading-6"
            placeholder={`- Ghi chú nhanh...\n- Ví dụ: Nhóm trình bày rõ ràng, Demo ổn định.`}
          />
        </div>
      </div>

      <div className="card-compact bg-purple-50 mt-8 text-sm text-gray-700">
        <p className="font-semibold mb-2">Usage Instructions:</p>
        <ul className="list-disc ml-5 space-y-1">
          <li>Click "Start Mic" to begin recording</li>
          <li>Use "Pause" to temporarily stop and "Resume" to continue</li>
          <li>Click "End" to finish the recording session</li>
          <li>You can edit or take notes at any time</li>
        </ul>
      </div>

      <div className="flex justify-end gap-3 mt-6">
        <button className="btn-secondary">Cancel</button>
        <button onClick={handleSave} className="btn-primary">
          Save Transcript
        </button>
      </div>

      <p className="page-footer">© 2025 AIDefCom · Smart Graduation Defense</p>
    </div>
  );
}
