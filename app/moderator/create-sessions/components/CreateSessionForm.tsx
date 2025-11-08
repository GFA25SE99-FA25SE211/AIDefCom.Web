"use client";

import React, { useState } from "react";

// --- Icons nhỏ gọn (Tailwind-friendly) ---
const IconWrapper = ({ children }: { children: React.ReactNode }) => (
  <span className="inline-flex w-5 h-5 items-center justify-center">
    {children}
  </span>
);

const CreateIcon = () => (
  <svg
    className="w-5 h-5"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 4.5v15m7.5-7.5h-15"
    />
  </svg>
);
const CalendarIcon = () => (
  <svg
    className="w-4 h-4"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5"
    />
  </svg>
);
const ClockIcon = () => (
  <svg
    className="w-4 h-4"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5" />
  </svg>
);
const AddMemberIcon = () => (
  <svg
    className="w-4 h-4"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3M10 7a3.5 3.5 0 11-7 0"
    />
  </svg>
);
const RemoveIcon = () => (
  <svg
    className="w-4 h-4"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M6 18L18 6M6 6l12 12"
    />
  </svg>
);
const SaveIcon = () => (
  <svg
    className="w-4 h-4"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 4.5v15m7.5-7.5h-15"
    />
  </svg>
);

// --- Type định nghĩa ---
export interface SessionFormData {
  groupName: string;
  projectTitle: string;
  defenseDate: string;
  defenseTime: string;
  location: string;
  members: string[];
}

interface CreateSessionFormProps {
  onCancel: () => void;
  onSubmit: (formData: SessionFormData) => void;
}

// --- Component chính ---
const CreateSessionForm: React.FC<CreateSessionFormProps> = ({
  onCancel,
  onSubmit,
}) => {
  const [groupName, setGroupName] = useState("");
  const [projectTitle, setProjectTitle] = useState("");
  const [defenseDate, setDefenseDate] = useState("");
  const [defenseTime, setDefenseTime] = useState("");
  const [location, setLocation] = useState("");
  const [members, setMembers] = useState<string[]>([""]);

  const addMemberInput = () => setMembers([...members, ""]);
  const removeMemberInput = (i: number) =>
    setMembers(members.filter((_, idx) => idx !== i));
  const handleMemberChange = (i: number, v: string) => {
    const newMembers = [...members];
    newMembers[i] = v;
    setMembers(newMembers);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formData: SessionFormData = {
      groupName,
      projectTitle,
      defenseDate,
      defenseTime,
      location,
      members: members.filter((m) => m.trim() !== ""),
    };
    onSubmit(formData);
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow border border-gray-100">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-r from-purple-600 to-blue-500 text-white rounded-lg shadow">
          <CreateIcon />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Create New Defense Session</h2>
          <p className="text-sm text-gray-500">
            Fill in the details to schedule a new defense session
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Grid chính */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Group Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Group Name
            </label>
            <input
              type="text"
              placeholder="e.g. Group Alpha"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          {/* Project Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Project Title
            </label>
            <input
              type="text"
              placeholder="Enter project title"
              value={projectTitle}
              onChange={(e) => setProjectTitle(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          {/* Defense Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Defense Date
            </label>
            <div className="relative">
              <input
                type="date"
                value={defenseDate}
                onChange={(e) => setDefenseDate(e.target.value)}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <span className="absolute right-3 top-2.5 text-gray-500">
                <CalendarIcon />
              </span>
            </div>
          </div>

          {/* Time */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Time
            </label>
            <div className="relative">
              <input
                type="time"
                value={defenseTime}
                onChange={(e) => setDefenseTime(e.target.value)}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <span className="absolute right-3 top-2.5 text-gray-500">
                <ClockIcon />
              </span>
            </div>
          </div>

          {/* Location */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Location
            </label>
            <input
              type="text"
              placeholder="e.g. Room A-301, Building A"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
        </div>

        {/* Group Members */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">
              Group Members
            </label>
            <button
              type="button"
              onClick={addMemberInput}
              className="flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition"
            >
              <AddMemberIcon /> Add Member
            </button>
          </div>

          <div className="space-y-2">
            {members.map((member, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder={`Student ${i + 1} (ID or Name)`}
                  value={member}
                  onChange={(e) => handleMemberChange(i, e.target.value)}
                  required={i === 0}
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
                {members.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeMemberInput(i)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition"
                    title="Remove Member"
                  >
                    <RemoveIcon />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border rounded-lg text-sm text-gray-700 hover:bg-gray-100 transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm bg-gradient-to-r from-purple-600 to-blue-500 text-white shadow hover:opacity-90 transition"
          >
            <SaveIcon /> Create Session
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateSessionForm;
