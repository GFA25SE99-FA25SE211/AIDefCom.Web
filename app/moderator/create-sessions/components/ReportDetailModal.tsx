"use client";

import React, { useState } from "react";
import Modal from "./Modal";
import { Download, Copy, Check } from "lucide-react";

interface ReportData {
  id: number;
  sessionId: number;
  generatedDate: string;
  summary: string;
  filePath: string;
  sessionName?: string; // Optional session name for better display
}

interface ReportDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: ReportData | null;
  onDownload?: (filePath: string) => void;
}

const ReportDetailModal: React.FC<ReportDetailModalProps> = ({
  isOpen,
  onClose,
  report,
  onDownload,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !report) return null;

  const handleDownloadClick = () => {
    if (onDownload) {
      onDownload(report.filePath);
    }
  };

  const handleCopyPath = async () => {
    try {
      await navigator.clipboard.writeText(report.filePath);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      // Failed to copy
    }
  };

  const isUrl = report.filePath.startsWith("http://") || report.filePath.startsWith("https://");

  const footer = (
    <div className="flex items-center justify-between w-full">
      <button
        type="button"
        className="px-4 py-2 rounded-md border border-gray-300 text-sm text-gray-700 hover:bg-gray-50"
        onClick={onClose}
      >
        Close
      </button>
      {onDownload && report.filePath && (
        <button
          type="button"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-blue-600 text-white text-sm hover:bg-blue-700 transition-colors"
          onClick={handleDownloadClick}
        >
          <Download className="w-4 h-4" />
          Download Report
        </button>
      )}
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Report Details"
      footerContent={footer}
      className="modal-content-lg"
    >
      <div className="space-y-4">
        {/* Session Info */}
        <div className="flex items-start justify-between pb-4 border-b">
          <div>
            <p className="text-xs text-gray-500 mb-1">Session</p>
            <div className="text-lg font-semibold text-gray-800">
              {report.sessionName || `Session #${report.sessionId}`}
            </div>
            {report.sessionName && (
              <div className="text-xs text-gray-500 mt-1">
                ID: {report.sessionId}
              </div>
            )}
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500 mb-1">Generated Date</p>
            <div className="text-base font-medium text-gray-800">
              {report.generatedDate}
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="border rounded-lg p-4 bg-gray-50">
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            Summary
          </h3>
          <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
            {report.summary && report.summary !== "No summary" ? (
              report.summary
            ) : (
              <span className="text-gray-400 italic">No summary available</span>
            )}
          </div>
        </div>

        {/* File Information */}
        <div className="border rounded-lg p-4 bg-white">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-700">
              File Information
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyPath}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded border border-gray-300 transition-colors"
                title="Copy file path"
              >
                {copied ? (
                  <>
                    <Check className="w-3 h-3" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    Copy
                  </>
                )}
              </button>
              {isUrl && (
                <a
                  href={report.filePath}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-2 py-1 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded border border-blue-300 transition-colors"
                >
                  Open Link
                </a>
              )}
            </div>
          </div>
          <div className="bg-gray-50 rounded p-3 border border-gray-200">
            <p className="text-xs text-gray-500 mb-1">File Path:</p>
            <p className="text-xs text-gray-800 break-all font-mono">
              {report.filePath || "No file path available"}
            </p>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default ReportDetailModal;
