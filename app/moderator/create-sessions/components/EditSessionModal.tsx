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

interface Session {
  id: number;
  groupId: number;
  location: string;
  date: string;
  time: string;
  status: "Scheduled" | "Completed";
}

interface EditSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (
    id: number,
    data: {
      groupId: string;
      location: string;
      date: string;
      time: string;
      status: string;
    }
  ) => void;
  sessionData: Session | null;
}

const EditSessionModal: React.FC<EditSessionModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  sessionData,
}) => {
  const [groupId, setGroupId] = useState("");
  const [location, setLocation] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    if (sessionData) {
      setGroupId(String(sessionData.groupId));
      setLocation(sessionData.location);
      setDate(sessionData.date);
      const startTime = sessionData.time.split(" - ")[0] || "";
      setTime(startTime);
      setStatus(sessionData.status);
    } else {
      setGroupId("");
      setLocation("");
      setDate("");
      setTime("");
      setStatus("");
    }
  }, [sessionData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionData) return;
    onSubmit(sessionData.id, { groupId, location, date, time, status });
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
        form="edit-session-form"
        className="px-3 py-2 rounded-md bg-blue-600 text-white text-sm flex items-center gap-2"
      >
        <SaveIcon /> Save Changes
      </button>
    </>
  );

  if (!sessionData) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Edit Session (ID: ${sessionData.id})`}
      subtitle="Update session details below"
      footerContent={footer}
    >
      <form
        id="edit-session-form"
        onSubmit={handleSubmit}
        className="space-y-5"
      >
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Group ID
          </label>
          <input
            type="text"
            value={groupId}
            onChange={(e) => setGroupId(e.target.value)}
            required
            className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-200 outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Location
          </label>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            required
            className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-200 outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Date
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

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Time (Start)
          </label>
          <div className="relative">
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
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
            Status
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            required
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

export default EditSessionModal;
