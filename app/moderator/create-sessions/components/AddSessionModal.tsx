"use client";

import React, { useState } from "react";
import Modal from "./Modal";

const PlusIcon = () => (
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

const ClockIcon = () => (
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
      d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

interface AddSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    groupId: string;
    location: string;
    date: string;
    startTime: string;
    endTime: string;
    status: string;
    councilId: number;
  }) => void;
  groupOptions?: { id: string; name: string }[];
  councilOptions?: { id: number; name: string }[];
}

const AddSessionModal: React.FC<AddSessionModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  groupOptions = [],
  councilOptions = [],
}) => {
  const [groupId, setGroupId] = useState("");
  const [location, setLocation] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [status, setStatus] = useState("Scheduled");
  const [councilId, setCouncilId] = useState<number>(0);

  const resetForm = () => {
    setGroupId("");
    setLocation("");
    setDate("");
    setStartTime("");
    setEndTime("");
    setStatus("Scheduled");
    setCouncilId(0);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      groupId,
      location,
      date,
      startTime,
      endTime,
      status,
      councilId,
    });
    resetForm();
  };

  const footer = (
    <>
      <button
        type="button"
        className="px-3 py-2 rounded-md border text-sm"
        onClick={handleClose}
      >
        Cancel
      </button>
      <button
        type="submit"
        form="add-session-form"
        className="px-3 py-2 rounded-md bg-gradient-to-r from-purple-600 to-blue-500 text-white text-sm flex items-center gap-2"
      >
        <PlusIcon /> Add Session
      </button>
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Add New Session"
      subtitle="Create a new defense session for a group"
      footerContent={footer}
    >
      <form id="add-session-form" onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Group <span className="text-red-500">*</span>
          </label>
          <select
            value={groupId}
            onChange={(e) => setGroupId(e.target.value)}
            required
            className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-200 outline-none"
          >
            <option value="">Select a group</option>
            {groupOptions.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Council <span className="text-red-500">*</span>
          </label>
          <select
            value={councilId}
            onChange={(e) => setCouncilId(Number(e.target.value))}
            required
            className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-200 outline-none"
          >
            <option value="0">Select a council</option>
            {councilOptions.map((council) => (
              <option key={council.id} value={council.id}>
                {council.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Location <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="e.g., Room 101, Building A"
            required
            className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-200 outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Defense Date <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-200 outline-none pr-8"
            />
            <div className="absolute right-3 top-2.5">
              <CalendarIcon />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
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
                className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-200 outline-none pr-8"
              />
              <div className="absolute right-3 top-2.5">
                <ClockIcon />
              </div>
            </div>
          </div>
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
                className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-200 outline-none pr-8"
              />
              <div className="absolute right-3 top-2.5">
                <ClockIcon />
              </div>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Status
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-200 outline-none"
          >
            <option value="Scheduled">Scheduled</option>
            <option value="Completed">Completed</option>
          </select>
        </div>
      </form>
    </Modal>
  );
};

export default AddSessionModal;
