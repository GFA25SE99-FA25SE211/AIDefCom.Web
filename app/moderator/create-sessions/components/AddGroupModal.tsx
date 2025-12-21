"use client";

import React, { useState, useEffect, useRef } from "react";
import Modal from "./Modal";
import { groupsApi } from "@/lib/api/groups";

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
  existingGroups?: Array<{
    topicTitle_EN?: string;
    topicTitle_VN?: string;
    projectTitle?: string;
    topicEN?: string;
    topicVN?: string;
  }>;
}

const AddGroupModal: React.FC<AddGroupModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  majorOptions = [],
  semesterOptions = [],
  existingGroups = [],
}) => {
  const [topicEN, setTopicEN] = useState("");
  const [topicVN, setTopicVN] = useState("");
  const [semesterId, setSemesterId] = useState("");
  const [majorId, setMajorId] = useState("");
  const [status, setStatus] = useState("Active");
  const [topicENError, setTopicENError] = useState("");
  const [topicVNError, setTopicVNError] = useState("");
  const [isCheckingEN, setIsCheckingEN] = useState(false);
  const [isCheckingVN, setIsCheckingVN] = useState(false);
  const debounceTimerEN = useRef<NodeJS.Timeout | null>(null);
  const debounceTimerVN = useRef<NodeJS.Timeout | null>(null);

  // Reset states when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setTopicEN("");
      setTopicVN("");

      // Auto-select default semester
      const defaultSemester = semesterOptions.find((s) => (s as any).isDefault);
      setSemesterId(
        defaultSemester
          ? String(defaultSemester.id)
          : semesterOptions.length
          ? String(semesterOptions[0].id)
          : ""
      );

      setMajorId("");
      setStatus("Active");
      setTopicENError("");
      setTopicVNError("");
      setIsCheckingEN(false);
      setIsCheckingVN(false);
    }
  }, [isOpen, semesterOptions]);

  // Cleanup debounce timers
  useEffect(() => {
    return () => {
      if (debounceTimerEN.current) {
        clearTimeout(debounceTimerEN.current);
      }
      if (debounceTimerVN.current) {
        clearTimeout(debounceTimerVN.current);
      }
    };
  }, []);

  // Check for duplicate Topic Title (English) using API
  const checkTopicENDuplicate = async (value: string) => {
    if (!value.trim()) {
      setTopicENError("");
      setIsCheckingEN(false);
      return;
    }

    try {
      const exists = await groupsApi.checkTopicENExists(value.trim());
      if (exists) {
        setTopicENError(
          "This topic title (English) already exists in the system"
        );
      } else {
        setTopicENError("");
      }
    } catch (error) {
      setTopicENError("");
    } finally {
      setIsCheckingEN(false);
    }
  };

  // Check for duplicate Topic Title (Vietnamese) using API
  const checkTopicVNDuplicate = async (value: string) => {
    if (!value.trim()) {
      setTopicVNError("");
      setIsCheckingVN(false);
      return;
    }

    try {
      const exists = await groupsApi.checkTopicVNExists(value.trim());
      if (exists) {
        setTopicVNError(
          "This topic title (Vietnamese) already exists in the system"
        );
      } else {
        setTopicVNError("");
      }
    } catch (error) {
      setTopicVNError("");
    } finally {
      setIsCheckingVN(false);
    }
  };

  // Handle Topic EN change with debounce
  const handleTopicENChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setTopicEN(value);

    // Clear previous timer
    if (debounceTimerEN.current) {
      clearTimeout(debounceTimerEN.current);
    }

    if (value.trim()) {
      setIsCheckingEN(true);
      setTopicENError("");

      // Set new timer
      debounceTimerEN.current = setTimeout(() => {
        checkTopicENDuplicate(value);
      }, 500);
    } else {
      setTopicENError("");
      setIsCheckingEN(false);
    }
  };

  // Handle Topic VN change with debounce
  const handleTopicVNChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setTopicVN(value);

    // Clear previous timer
    if (debounceTimerVN.current) {
      clearTimeout(debounceTimerVN.current);
    }

    if (value.trim()) {
      setIsCheckingVN(true);
      setTopicVNError("");

      // Set new timer
      debounceTimerVN.current = setTimeout(() => {
        checkTopicVNDuplicate(value);
      }, 500);
    } else {
      setTopicVNError("");
      setIsCheckingVN(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Check for errors before submitting
    if (topicENError || topicVNError) {
      return;
    }

    // Wait for any ongoing checks to complete
    if (isCheckingEN || isCheckingVN) {
      return;
    }

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
          <div className="relative">
            <input
              type="text"
              value={topicEN}
              onChange={handleTopicENChange}
              required
              className={`w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 outline-none ${
                topicENError
                  ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                  : isCheckingEN
                  ? "border-blue-300 focus:border-blue-500 focus:ring-blue-500"
                  : "border-gray-300 focus:ring-blue-500"
              }`}
            />
            {isCheckingEN && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
          </div>
          {topicENError && (
            <span className="text-red-500 text-sm mt-1">{topicENError}</span>
          )}
          {isCheckingEN && !topicENError && (
            <span className="text-blue-500 text-sm mt-1">
              Checking topic title (English)...
            </span>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Topic Title (Vietnamese)
          </label>
          <div className="relative">
            <input
              type="text"
              value={topicVN}
              onChange={handleTopicVNChange}
              required
              className={`w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 outline-none ${
                topicVNError
                  ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                  : isCheckingVN
                  ? "border-blue-300 focus:border-blue-500 focus:ring-blue-500"
                  : "border-gray-300 focus:ring-blue-500"
              }`}
            />
            {isCheckingVN && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
          </div>
          {topicVNError && (
            <span className="text-red-500 text-sm mt-1">{topicVNError}</span>
          )}
          {isCheckingVN && !topicVNError && (
            <span className="text-blue-500 text-sm mt-1">
              Checking topic title (Vietnamese)...
            </span>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Semester <span className="text-red-500">*</span>
            <span className="ml-1 text-xs text-gray-500">(Auto-selected)</span>
          </label>
          <input
            type="text"
            value={
              semesterOptions.find((s) => s.id.toString() === semesterId)
                ?.name || ""
            }
            readOnly
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-gray-50 cursor-not-allowed focus:outline-none"
            placeholder="No semester selected"
          />
          {/* Hidden select to maintain form data */}
          <select
            value={semesterId}
            onChange={(e) => setSemesterId(e.target.value)}
            required
            className="hidden"
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
