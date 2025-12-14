"use client";

import React, { useState, useEffect } from "react";
import Modal from "../../../moderator/create-sessions/components/Modal";

interface Report {
  id: number;
  sessionId: number;
  summary?: string;
  filePath?: string;
}

interface EditReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (id: number, data: { summary?: string; filePath?: string }) => void;
  reportData: Report | null;
  sessionName?: string;
}

const EditReportModal: React.FC<EditReportModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  reportData,
  sessionName,
}) => {
  const [summary, setSummary] = useState("");
  const [filePath, setFilePath] = useState("");

  useEffect(() => {
    if (reportData) {
      setSummary(reportData.summary || "");
      setFilePath(reportData.filePath || "");
    } else {
      setSummary("");
      setFilePath("");
    }
  }, [reportData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportData) return;
    onSubmit(reportData.id, { summary, filePath });
    onClose();
  };

  if (!reportData) return null;

  const footer = (
    <div className="modal-footer">
      <button type="button" className="btn-secondary" onClick={onClose}>
        Cancel
      </button>
      <button type="submit" form="edit-report-form" className="btn-primary">
        Save Changes
      </button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Edit Report: ${reportData.id}`}
      subtitle="Update the details for this report."
      footerContent={footer}
    >
      <form id="edit-report-form" onSubmit={handleSubmit} className="form-grid">
        <div className="form-group">
          <label htmlFor="session-name">Session</label>
          <input
            id="session-name"
            type="text"
            value={sessionName || `Session ${reportData.sessionId}`}
            disabled
            className="bg-gray-100"
          />
        </div>

        <div className="form-group">
          <label htmlFor="report-summary">Summary</label>
          <textarea
            id="report-summary"
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="Enter report summary..."
            rows={5}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
          />
        </div>

        <div className="form-group">
          <label htmlFor="report-filepath">File Path</label>
          <input
            id="report-filepath"
            type="text"
            value={filePath}
            onChange={(e) => setFilePath(e.target.value)}
            placeholder="Enter file path or URL..."
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
          />
        </div>
      </form>
    </Modal>
  );
};

export default EditReportModal;

