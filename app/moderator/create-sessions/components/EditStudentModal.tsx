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
const CalendarIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    className="w-4 h-4 text-gray-400"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5h18v11.25z"
    />
  </svg>
);

interface Student {
  id: number;
  userId: string;
  groupId: number;
  dob: string;
  gender: string;
  role: "Leader" | "Member";
}

interface EditStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (
    id: number,
    data: {
      userId: string;
      groupId: string;
      dob: string;
      gender: string;
      role: string;
    }
  ) => void;
  studentData: Student | null;
}

const EditStudentModal: React.FC<EditStudentModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  studentData,
}) => {
  const [userId, setUserId] = useState("");
  const [groupId, setGroupId] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState("");
  const [role, setRole] = useState("");

  useEffect(() => {
    if (studentData) {
      setUserId(studentData.userId);
      setGroupId(String(studentData.groupId));
      setDob(studentData.dob);
      setGender(studentData.gender);
      setRole(studentData.role);
    } else {
      setUserId("");
      setGroupId("");
      setDob("");
      setGender("");
      setRole("");
    }
  }, [studentData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentData) return;
    onSubmit(studentData.id, { userId, groupId, dob, gender, role });
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
        form="edit-student-form"
        className="px-3 py-2 rounded-md bg-blue-600 text-white text-sm flex items-center gap-2"
      >
        <SaveIcon /> Save Changes
      </button>
    </>
  );

  if (!studentData) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Edit Student (ID: ${studentData.id})`}
      subtitle="Update student details below"
      footerContent={footer}
    >
      <form
        id="edit-student-form"
        onSubmit={handleSubmit}
        className="space-y-5"
      >
        {/* User ID */}
        <div>
          <label
            htmlFor="editUserId"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            User ID
          </label>
          <input
            type="text"
            id="editUserId"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            required
            className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-200 outline-none"
          />
        </div>

        {/* Group ID */}
        <div>
          <label
            htmlFor="editGroupId"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Group ID
          </label>
          <input
            type="text"
            id="editGroupId"
            value={groupId}
            onChange={(e) => setGroupId(e.target.value)}
            required
            className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-200 outline-none"
          />
        </div>

        {/* Date of Birth */}
        <div>
          <label
            htmlFor="editDob"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Date of Birth
          </label>
          <div className="relative">
            <input
              type="date"
              id="editDob"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              required
              className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-200 outline-none pr-8"
            />
            <div className="absolute right-3 top-2.5">
              <CalendarIcon />
            </div>
          </div>
        </div>

        {/* Gender */}
        <div>
          <label
            htmlFor="editGender"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Gender
          </label>
          <select
            id="editGender"
            value={gender}
            onChange={(e) => setGender(e.target.value)}
            required
            className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-200 outline-none"
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
          <label
            htmlFor="editStudentRole"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Role
          </label>
          <select
            id="editStudentRole"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            required
            className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-200 outline-none"
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

export default EditStudentModal;
