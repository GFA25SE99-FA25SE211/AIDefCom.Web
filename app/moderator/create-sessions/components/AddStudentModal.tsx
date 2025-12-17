"use client";

import React, { useState, useEffect, useRef } from "react";
import Modal from "./Modal";
import { studentsApi } from "@/lib/api/students";

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
// Calendar Icon
const CalendarIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    className="w-4 h-4 text-gray-500"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25M3 18.75A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75M3 11.25h18"
    />
  </svg>
);

interface GroupOption {
  id: string;
  name: string;
}

interface SemesterOption {
  id: number;
  name: string;
  startDate?: string;
  endDate?: string;
  isDefault?: boolean;
}

interface AddStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    userId: string;
    groupId: string;
    dob: string;
    gender: string;
    role: string;
    semesterId: string;
  }) => void;
  groupOptions: GroupOption[];
  semesterOptions?: SemesterOption[];
}

const AddStudentModal: React.FC<AddStudentModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  groupOptions = [],
  semesterOptions = [],
}) => {
  const [userId, setUserId] = useState("");
  const [groupId, setGroupId] = useState("");
  const [semesterId, setSemesterId] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState("");
  const [role, setRole] = useState("");
  const [userIdError, setUserIdError] = useState("");
  const [isCheckingUserId, setIsCheckingUserId] = useState(false);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  // Reset states when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setUserId("");
      setGroupId("");

      // Auto-select default semester
      const defaultSemester = semesterOptions.find((s) => s.isDefault);
      setSemesterId(
        defaultSemester
          ? String(defaultSemester.id)
          : semesterOptions.length
          ? String(semesterOptions[0].id)
          : ""
      );

      setDob("");
      setGender("");
      setRole("");
      setUserIdError("");
      setIsCheckingUserId(false);
    }
  }, [isOpen, semesterOptions]);

  // Cleanup debounce timer
  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, []);

  // Check for duplicate student code/userId
  const checkUserIdDuplicate = async (userIdValue: string) => {
    if (!userIdValue.trim()) {
      setUserIdError("");
      setIsCheckingUserId(false);
      return;
    }

    try {
      const exists = await studentsApi.checkStudentCodeExists(
        userIdValue.trim()
      );
      if (exists) {
        setUserIdError("This student code/name already exists in the system");
      } else {
        setUserIdError("");
      }
    } catch (error) {
      console.error("Error checking student code:", error);
      setUserIdError("");
    } finally {
      setIsCheckingUserId(false);
    }
  };

  // Handle userId change with debounce
  const handleUserIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setUserId(value);

    // Clear previous timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    if (value.trim()) {
      setIsCheckingUserId(true);
      setUserIdError("");

      // Set new timer
      debounceTimer.current = setTimeout(() => {
        checkUserIdDuplicate(value);
      }, 500);
    } else {
      setUserIdError("");
      setIsCheckingUserId(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (userIdError) {
      return;
    }

    if (isCheckingUserId) {
      return;
    }

    onSubmit({ userId, groupId, dob, gender, role, semesterId });
    // Reset form
    setUserId("");
    setGroupId("");
    setSemesterId("");
    setDob("");
    setGender("");
    setRole("");
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
        form="add-student-form"
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
      title="Add New Student"
      subtitle="Enter student details below"
      footerContent={footer}
    >
      <form id="add-student-form" onSubmit={handleSubmit} className="space-y-4">
        {/* Student Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Student Name
          </label>
          <div className="relative">
            <input
              type="text"
              value={userId}
              onChange={handleUserIdChange}
              required
              className={`w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 outline-none ${
                userIdError
                  ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                  : isCheckingUserId
                  ? "border-blue-300 focus:border-blue-500 focus:ring-blue-500"
                  : "border-gray-300 focus:ring-blue-500"
              }`}
              placeholder="Enter student's full name"
            />
            {isCheckingUserId && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
          </div>
          {userIdError && (
            <span className="text-red-500 text-sm mt-1">{userIdError}</span>
          )}
          {isCheckingUserId && !userIdError && (
            <span className="text-blue-500 text-sm mt-1">
              Checking student code...
            </span>
          )}
        </div>

        {/* Group ID */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Group
          </label>
          <select
            value={groupId}
            onChange={(e) => setGroupId(e.target.value)}
            required
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="" disabled>
              Select a group
            </option>
            {groupOptions.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </select>
        </div>

        {/* Semester */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Semester <span className="text-red-500">*</span>
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

        {/* Date of Birth */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Date of Birth
          </label>
          <div className="relative">
            <input
              type="date"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-9 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
            <span className="absolute right-2 top-2.5">
              <CalendarIcon />
            </span>
          </div>
        </div>

        {/* Gender */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Gender
          </label>
          <select
            value={gender}
            onChange={(e) => setGender(e.target.value)}
            required
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="" disabled>
              Select gender
            </option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>
        </div>

        {/* Role */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Role
          </label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            required
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="" disabled>
              Select role
            </option>
            <option value="Leader">Leader</option>
            <option value="Member">Member</option>
          </select>
        </div>
      </form>
    </Modal>
  );
};

export default AddStudentModal;
