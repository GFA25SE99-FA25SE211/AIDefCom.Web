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

interface AddStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    userId: string;
    groupId: string;
    dob: string;
    gender: string;
    role: string;
  }) => void;
}

const AddStudentModal: React.FC<AddStudentModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [userId, setUserId] = useState("");
  const [groupId, setGroupId] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState("");
  const [role, setRole] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ userId, groupId, dob, gender, role });
    setUserId("");
    setGroupId("");
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
        {/* User ID */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            User ID
          </label>
          <input
            type="text"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            required
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        {/* Group ID */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Group ID
          </label>
          <input
            type="text"
            value={groupId}
            onChange={(e) => setGroupId(e.target.value)}
            required
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
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
