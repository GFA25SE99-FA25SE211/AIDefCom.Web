"use client";

import React, { useState } from "react";
import { MapPin, Users, X } from "lucide-react";

const CalendarIcon = () => (
  <svg
    className="w-4 h-4 text-gray-500"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M6.75 3v2.25M17.25 3v2.25M3 9h18M4.5 7.5h15A1.5 1.5 0 0 1 21 9v10.5A1.5 1.5 0 0 1 19.5 21h-15A1.5 1.5 0 0 1 3 19.5V9a1.5 1.5 0 0 1 1.5-1.5Z"
    />
  </svg>
);

const ClockIcon = () => (
  <svg
    className="w-4 h-4 text-gray-500"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 6v6l3.5 2.1M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
    />
  </svg>
);

// --- Type định nghĩa ---
export interface SessionFormData {
  groupId: string;
  councilId: number;
  defenseDate: string;
  startTime: string;
  endTime: string;
  location: string;
  status?: string;
}

interface CreateSessionFormProps {
  onCancel: () => void;
  onSubmit: (formData: SessionFormData) => void;
  groups: Array<{
    id: string;
    groupName?: string;
    projectCode?: string;
    topicTitle_EN?: string;
    topicTitle_VN?: string;
  }>;
  councils: Array<{ id: number; councilName?: string; majorName?: string }>;
}

// --- Component chính ---
const CreateSessionForm: React.FC<CreateSessionFormProps> = ({
  onCancel,
  onSubmit,
  groups,
  councils,
}) => {
  const [groupId, setGroupId] = useState("");
  const [councilId, setCouncilId] = useState("");
  const [defenseDate, setDefenseDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [location, setLocation] = useState("");
  const [status, setStatus] = useState("Scheduled");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !groupId ||
      !councilId ||
      !defenseDate ||
      !startTime ||
      !endTime ||
      !location
    ) {
      return;
    }

    // Validate end time is after start time
    if (startTime && endTime && startTime >= endTime) {
      alert("End time must be after start time");
      return;
    }

    const formData: SessionFormData = {
      groupId,
      councilId: parseInt(councilId, 10),
      defenseDate,
      startTime,
      endTime,
      location,
      status: status,
    };
    onSubmit(formData);
  };

  const getGroupDisplayName = (group: (typeof groups)[0]) => {
    return (
      group.groupName ||
      group.projectCode ||
      group.topicTitle_EN ||
      group.topicTitle_VN ||
      `Group ${group.id?.slice(0, 8) || ""}`
    );
  };

  const getCouncilDisplayName = (council: (typeof councils)[0]) => {
    return (
      council.councilName ||
      `Council ${council.id}${
        council.majorName ? ` (${council.majorName})` : ""
      }`
    );
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow border border-gray-100">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-r from-purple-600 to-blue-500 text-white rounded-lg shadow">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">
              Create New Defense Session
            </h2>
            <p className="text-sm text-gray-500">
              Fill in the details to schedule a new defense session
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Grid chính */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Group Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Group <span className="text-red-500">*</span>
            </label>
            <select
              value={groupId}
              onChange={(e) => setGroupId(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="">Select a group</option>
              {groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {getGroupDisplayName(group)}
                </option>
              ))}
            </select>
          </div>

          {/* Council Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Council <span className="text-red-500">*</span>
            </label>
            <select
              value={councilId}
              onChange={(e) => setCouncilId(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="">Select a council</option>
              {councils.map((council) => (
                <option key={council.id} value={council.id}>
                  {getCouncilDisplayName(council)}
                </option>
              ))}
            </select>
          </div>

          {/* Defense Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Defense Date <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="date"
                value={defenseDate}
                onChange={(e) => setDefenseDate(e.target.value)}
                required
                min={new Date().toISOString().split("T")[0]}
                className="custom-picker-input w-full border border-gray-300 rounded-lg px-3 py-2 pr-10 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <span className="absolute right-3 top-2.5 pointer-events-none z-0">
                <CalendarIcon />
              </span>
            </div>
          </div>

          {/* Start Time */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Start Time <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
                className="custom-picker-input w-full border border-gray-300 rounded-lg px-3 py-2 pr-10 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <span className="absolute right-3 top-2.5 pointer-events-none z-0">
                <ClockIcon />
              </span>
            </div>
          </div>

          {/* End Time */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              End Time <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
                min={startTime || undefined}
                className="custom-picker-input w-full border border-gray-300 rounded-lg px-3 py-2 pr-10 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <span className="absolute right-3 top-2.5 pointer-events-none z-0">
                <ClockIcon />
              </span>
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Location <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="e.g. Room A-301, Building A"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <span className="absolute right-3 top-2.5 text-gray-500 pointer-events-none">
                <MapPin className="w-4 h-4" />
              </span>
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="Scheduled">Scheduled</option>
              <option value="InProgress">In Progress</option>
              <option value="Completed">Completed</option>
            </select>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-100 transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm bg-gradient-to-r from-purple-600 to-blue-500 text-white shadow hover:opacity-90 transition"
          >
            <Users className="w-4 h-4" /> Create Session
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateSessionForm;
