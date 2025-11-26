"use client";

import React, { useState } from "react";
import Modal from "./Modal";

// Icon Save
const SaveIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    className="w-4 h-4"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 4.5v15m7.5-7.5h-15"
    />
  </svg>
);

interface AddGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    topicEN: string;
    topicVN: string;
    semesterId: string;
    majorId: string;
    status: string;
  }) => void;
  majorOptions?: { id: number; name: string }[];
  semesterOptions?: { id: number; name: string }[];
}

const AddGroupModal: React.FC<AddGroupModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  majorOptions = [],
  semesterOptions = [],
}) => {
  const [topicEN, setTopicEN] = useState("");
  const [topicVN, setTopicVN] = useState("");
  const [semesterId, setSemesterId] = useState("");
  const [majorId, setMajorId] = useState("");
  const [status, setStatus] = useState("Active");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ topicEN, topicVN, semesterId, majorId, status });
    setTopicEN("");
    setTopicVN("");
    setSemesterId("");
    setMajorId("");
    setStatus("Active");
  };

  const footer = (
    <div className="flex justify-end gap-2">
      <button
        type="button"
        onClick={onClose}
        className="px-4 py-2 border rounded-lg text-sm text-gray-700 hover:bg-gray-100"
      >
        Cancel
      </button>
      <button
        type="submit"
        form="add-group-form"
        className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-gradient-to-r from-purple-600 to-blue-500 text-white hover:opacity-90"
      >
        <SaveIcon />
        Save
      </button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Group"
      subtitle="Enter group details below"
      footerContent={footer}
    >
      <form id="add-group-form" onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Topic Title (English)
          </label>
          <input
            type="text"
            value={topicEN}
            onChange={(e) => setTopicEN(e.target.value)}
            required
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Topic Title (Vietnamese)
          </label>
          <input
            type="text"
            value={topicVN}
            onChange={(e) => setTopicVN(e.target.value)}
            required
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Semester <span className="text-red-500">*</span>
          </label>
          <select
            value={semesterId}
            onChange={(e) => setSemesterId(e.target.value)}
            required
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="">Select a semester</option>
            {semesterOptions.map((semester) => (
              <option key={semester.id} value={semester.id}>
                {semester.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Major <span className="text-red-500">*</span>
          </label>
          <select
            value={majorId}
            onChange={(e) => setMajorId(e.target.value)}
            required
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="">Select a major</option>
            {majorOptions.map((major) => (
              <option key={major.id} value={major.id}>
                {major.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Status
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            required
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="" disabled>
              Select status
            </option>
            <option value="Active">Active</option>
            <option value="Completed">Completed</option>
            <option value="Pending">Pending</option>
          </select>
        </div>
      </form>
    </Modal>
  );
};

export default AddGroupModal;
