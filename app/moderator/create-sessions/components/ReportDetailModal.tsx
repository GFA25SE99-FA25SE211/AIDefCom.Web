"use client";

import React from "react";
import Modal from "./Modal";

interface ReportData {
  id: number;
  sessionId: number;
  generatedDate: string;
  summary: string;
  filePath: string;
}

interface ReportDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: ReportData | null;
  onDownload?: (filePath: string) => void; // Tạm optional để ẩn button download
}

const ReportDetailModal: React.FC<ReportDetailModalProps> = ({
  isOpen,
  onClose,
  report,
  onDownload,
}) => {
  if (!isOpen || !report) return null;

  const handleDownloadClick = () => {
    if (onDownload) {
      onDownload(report.filePath);
      onClose();
    }
  };

  const footer = (
    <>
      <button
        type="button"
        className="px-3 py-2 rounded-md border text-sm"
        onClick={onClose}
      >
        Close
      </button>
      {/* Tạm ẩn button download */}
      {/* {onDownload && (
        <button
          type="button"
          className="px-3 py-2 rounded-md bg-blue-600 text-white text-sm"
          onClick={handleDownloadClick}
        >
          Download Report
        </button>
      )} */}
    </>
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
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">Session ID</p>
            <div className="text-base font-medium text-gray-800">
              {report.sessionId}
            </div>
          </div>
          <div className="text-sm text-gray-500">
            <p className="text-sm">Generated</p>
            <div className="text-base font-medium text-gray-800">
              {report.generatedDate}
            </div>
          </div>
        </div>

        <div className="border rounded-md p-4 bg-gray-50">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Summary</h3>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">
            {report.summary}
          </p>
        </div>

        <div className="border rounded-md p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">
            File Information
          </h3>
          <p className="text-sm text-gray-600">
            Path: <span className="text-gray-800">{report.filePath}</span>
          </p>
        </div>
      </div>
    </Modal>
  );
};

export default ReportDetailModal;
