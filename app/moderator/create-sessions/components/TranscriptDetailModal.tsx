"use client";

import React from "react";
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

interface TranscriptDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  transcript: TranscriptData | null;
  onApprove: (id: number) => void;
  onReject: (id: number) => void;
}

const TranscriptDetailModal: React.FC<TranscriptDetailModalProps> = ({
  isOpen,
  onClose,
  transcript,
  onApprove,
  onReject,
}) => {
  if (!isOpen || !transcript) return null;

  const footer = (
    <>
      {transcript.status === "Pending" && (
        <>
          <button
            type="button"
            className="px-3 py-2 rounded-md border text-sm"
            onClick={() => onReject(transcript.id)}
          >
            Reject
          </button>
          <button
            type="button"
            className="px-3 py-2 rounded-md bg-green-600 text-white text-sm"
            onClick={() => onApprove(transcript.id)}
          >
            Approve
          </button>
        </>
      )}
      <button
        type="button"
        className="px-3 py-2 rounded-md border text-sm"
        onClick={onClose}
      >
        Close
      </button>
    </>
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
          <h3 className="text-sm font-semibold text-gray-700 mb-2">
            Transcript
          </h3>
          <div className="text-sm text-gray-700 whitespace-pre-wrap max-h-72 overflow-auto">
            {transcript.transcriptText}
          </div>
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
