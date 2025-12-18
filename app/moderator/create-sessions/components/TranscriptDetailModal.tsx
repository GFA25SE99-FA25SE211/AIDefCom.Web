"use client";

import React, { useMemo } from "react";
import Modal from "./Modal";

interface TranscriptData {
  id: number;
  sessionId: number;
  createdAt: string;
  status: "Pending" | "Approved" | "Rejected";
  isApproved: boolean;
  groupName: string;
  date: string;
  time: string;
  location: string;
  transcriptText: string;
  audioFile: string;
}

interface TranscriptEntry {
  id?: string;
  text: string;
  speaker: string;
  timestamp?: string;
  start_time_vtt?: string;
  end_time_vtt?: string;
  edited_speaker?: string;
  edited_text?: string | null;
  user_id?: string;
}

interface TranscriptDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  transcript: TranscriptData | null;
}

const TranscriptDetailModal: React.FC<TranscriptDetailModalProps> = ({
  isOpen,
  onClose,
  transcript,
}) => {
  if (!isOpen || !transcript) return null;

  // Parse transcript JSON
  const transcriptEntries = useMemo(() => {
    if (!transcript.transcriptText) return [];
    
    try {
      // Try to parse as JSON
      const parsed = typeof transcript.transcriptText === 'string' 
        ? JSON.parse(transcript.transcriptText) 
        : transcript.transcriptText;
      
      // If it's an array, return it
      if (Array.isArray(parsed)) {
        return parsed as TranscriptEntry[];
      }
      
      // If it's a single object, wrap it in an array
      if (typeof parsed === 'object' && parsed !== null) {
        return [parsed as TranscriptEntry];
      }
      
      return [];
    } catch (error) {
      // If parsing fails, treat as plain text
      console.warn("Failed to parse transcript as JSON:", error);
      return [];
    }
  }, [transcript.transcriptText]);

  // Format time from VTT format (00:00:19.208) to readable format
  const formatTime = (timeStr?: string) => {
    if (!timeStr) return "";
    // Remove milliseconds if present
    return timeStr.split(".")[0];
  };

  const footer = (
    <button
      type="button"
      className="px-3 py-2 rounded-md border text-sm"
      onClick={onClose}
    >
      Close
    </button>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Transcript Details"
      footerContent={footer}
      className="modal-content-lg"
    >
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-gray-500">Session</p>
            <div className="text-lg font-semibold text-gray-800">
              Group {transcript.groupName} — #{transcript.sessionId}
            </div>
            <div className="text-sm text-gray-500 mt-1">
              {transcript.date} · {transcript.time} · {transcript.location}
            </div>
          </div>
          <div className="text-right">
            <div
              className={`px-2 py-1 rounded-full text-xs ${
                transcript.status === "Pending"
                  ? "bg-yellow-50 text-yellow-700"
                  : transcript.status === "Approved"
                  ? "bg-green-50 text-green-700"
                  : "bg-red-50 text-red-700"
              }`}
            >
              {transcript.status}
            </div>
            <div className="text-xs text-gray-500 mt-2">
              {transcript.createdAt}
            </div>
          </div>
        </div>

        <div className="border rounded-md p-4 bg-white">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">
            Transcript
          </h3>
          {transcriptEntries.length > 0 ? (
            <div className="max-h-96 overflow-y-auto space-y-3">
              {transcriptEntries.map((entry, index) => {
                const displaySpeaker = entry.edited_speaker || entry.speaker;
                const displayText = entry.edited_text !== null && entry.edited_text !== undefined 
                  ? entry.edited_text 
                  : entry.text;
                const timeRange = entry.start_time_vtt && entry.end_time_vtt
                  ? `${formatTime(entry.start_time_vtt)} - ${formatTime(entry.end_time_vtt)}`
                  : entry.timestamp
                  ? new Date(entry.timestamp).toLocaleTimeString()
                  : "";

                return (
                  <div
                    key={entry.id || `entry-${index}`}
                    className="border-l-4 border-blue-500 pl-3 py-2 bg-gray-50 rounded-r"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-blue-700 bg-blue-100 px-2 py-0.5 rounded">
                          {displaySpeaker}
                        </span>
                        {timeRange && (
                          <span className="text-xs text-gray-500">
                            {timeRange}
                          </span>
                        )}
                      </div>
                      {entry.edited_text !== null && entry.edited_text !== undefined && (
                        <span className="text-xs text-green-600 bg-green-100 px-2 py-0.5 rounded">
                          Edited
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-800 leading-relaxed">
                      {displayText || "(No text)"}
                    </p>
                    {entry.edited_text !== null && entry.edited_text !== undefined && entry.text !== entry.edited_text && (
                      <div className="mt-2 pt-2 border-t border-gray-200">
                        <p className="text-xs text-gray-500 mb-1">Original:</p>
                        <p className="text-xs text-gray-600 line-through italic">
                          {entry.text}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-sm text-gray-500 italic">
              {transcript.transcriptText ? (
                <div className="whitespace-pre-wrap max-h-72 overflow-auto">
                  {transcript.transcriptText}
                </div>
              ) : (
                "No transcript data available"
              )}
            </div>
          )}
        </div>

        <div className="border rounded-md p-4 bg-white">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">
            Audio Recording
          </h3>
          <div className="text-sm text-gray-600">
            File: <span className="text-gray-800">{transcript.audioFile}</span>
          </div>
          <div className="mt-3 text-sm text-gray-500 italic">
            (Audio player placeholder — implement audio player in production)
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default TranscriptDetailModal;
