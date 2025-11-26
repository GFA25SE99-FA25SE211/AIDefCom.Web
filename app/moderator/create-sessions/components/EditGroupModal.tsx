"use client";

import React, { useState, useEffect } from "react";
import Modal from "./Modal";

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
      d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

interface Group {
  id: string;
  topicEN: string;
  topicVN: string;
  semester: string;
  semesterId: number;
  majorId: number;
  status: string;
}

interface EditGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (
    id: string,
    data: {
      topicEN: string;
      topicVN: string;
      semesterId: string;
      majorId: string;
      status: string;
    }
  ) => void;
  groupData: Group | null;
  majorOptions?: { id: number; name: string }[];
  semesterOptions?: { id: number; name: string }[];
}

const EditGroupModal: React.FC<EditGroupModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  groupData,
  majorOptions = [],
  semesterOptions = [],
}) => {
  const [topicEN, setTopicEN] = useState("");
  const [topicVN, setTopicVN] = useState("");
  const [semesterId, setSemesterId] = useState("");
  const [majorId, setMajorId] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    if (groupData) {
      setTopicEN(groupData.topicEN);
      setTopicVN(groupData.topicVN);
      setSemesterId(String(groupData.semesterId));
      setMajorId(String(groupData.majorId));
      setStatus(groupData.status);
    } else {
      setTopicEN("");
      setTopicVN("");
      setSemesterId("");
      setMajorId("");
      setStatus("");
    }
  }, [groupData, majorOptions, semesterOptions]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupData) return;
    onSubmit(groupData.id, { topicEN, topicVN, semesterId, majorId, status });
  };

  const footer = (
    <>
      <button
        type="button"
        className="px-3 py-2 rounded-md border text-sm"
        onClick={onClose}
      >
        Cancel
      </button>
      <button
        type="submit"
        form="edit-group-form"
        className="px-3 py-2 rounded-md bg-blue-600 text-white text-sm flex items-center gap-2"
      >
        <SaveIcon /> Save Changes
      </button>
    </>
  );

  if (!groupData) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Edit Group (ID: ${groupData.id})`}
      subtitle="Update group details below"
      footerContent={footer}
    >
      <form id="edit-group-form" onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Group ID
          </label>
          <input
            type="text"
            value={groupData.id}
            disabled
            className="w-full border rounded-md px-3 py-2 text-sm bg-gray-100 text-gray-500 cursor-not-allowed"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Topic Title (English) <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={topicEN}
            onChange={(e) => setTopicEN(e.target.value)}
            required
            className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-200 outline-none"
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
            className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-200 outline-none"
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
            className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-200 outline-none"
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
            className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-200 outline-none"
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
            className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-200 outline-none"
            required
          >
            <option value="Active">Active</option>
            <option value="Completed">Completed</option>
            <option value="Pending">Pending</option>
          </select>
        </div>
      </form>
    </Modal>
  );
};

export default EditGroupModal;
