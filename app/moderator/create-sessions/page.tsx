// app/moderator/create-sessions/page.tsx
"use client";

import React, { useState } from "react";
import CreateSessionForm, {
  SessionFormData,
} from "./components/CreateSessionForm"; // nếu file này chưa có, giữ import và tự thêm component form

// Inline SVG icons nhỏ gọn (kích thước 20x20)
const Icon = ({ children }: { children: React.ReactNode }) => (
  <span className="inline-flex w-5 h-5 items-center justify-center text-white">
    {children}
  </span>
);

const CreateIcon = () => (
  <svg
    className="w-5 h-5"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 4.5v15m7.5-7.5h-15"
    />
  </svg>
);
const TotalIcon = () => (
  <svg
    className="w-5 h-5"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25"
    />
  </svg>
);
const ScheduledIcon = () => (
  <svg
    className="w-5 h-5"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0"
    />
  </svg>
);
const CompletedIcon = () => (
  <svg
    className="w-5 h-5"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0"
    />
  </svg>
);
const GroupIcon = () => (
  <svg
    className="w-5 h-5"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M18 18.72a9.094 9.094 0 00-3.741-.56"
    />
  </svg>
);
const CalendarIcon = () => (
  <svg
    className="w-4 h-4 inline-block mr-2"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
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
    className="w-4 h-4 inline-block mr-2"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5" />
  </svg>
);
const LocationIcon = () => (
  <svg
    className="w-4 h-4 inline-block mr-2"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"
    />
  </svg>
);

// Dummy data
const summaryData = { total: 3, scheduled: 2, completed: 1 };
const scheduledSessions = [
  {
    id: 1,
    groupName: "Group Alpha",
    date: "15/01/2025",
    time: "09:00 AM",
    location: "Room A-301",
  },
  {
    id: 2,
    groupName: "Group Beta",
    date: "15/01/2025",
    time: "11:00 AM",
    location: "Room A-301",
  },
];
const completedSessions = [
  {
    id: 3,
    groupName: "Group Gamma",
    date: "10/01/2025",
    time: "02:00 PM",
    location: "Room B-205",
  },
];

export default function CreateSessionsPage() {
  const [isFormVisible, setIsFormVisible] = useState(false);

  const handleCreateSession = (formData: SessionFormData) => {
    console.log("New session data:", formData);
    alert("Session created! (Check console for data)");
    setIsFormVisible(false);
  };

  return (
    <div className="max-w-[1100px] mx-auto">
      {/* header */}
      <div className="flex items-start justify-between gap-6 mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Create Defense Sessions</h1>
          <p className="text-sm text-gray-600 mt-1">
            Schedule and manage defense sessions for student groups
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsFormVisible(true)}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-blue-500 text-white px-4 py-2 rounded-lg shadow"
          >
            <CreateIcon />
            <span className="text-sm font-medium">Create New Session</span>
          </button>
        </div>
      </div>

      {/* form */}
      {isFormVisible && (
        <div className="bg-white rounded-xl shadow p-6 mb-6">
          <CreateSessionForm
            onCancel={() => setIsFormVisible(false)}
            onSubmit={handleCreateSession}
          />
        </div>
      )}

      {/* summary cards */}
      {!isFormVisible && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-white p-4 rounded-lg shadow flex items-center gap-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-indigo-500">
                <TotalIcon />
              </div>
              <div>
                <div className="text-xl font-semibold">{summaryData.total}</div>
                <div className="text-sm text-gray-500">Total Sessions</div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg shadow flex items-center gap-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-yellow-400">
                <ScheduledIcon />
              </div>
              <div>
                <div className="text-xl font-semibold">
                  {summaryData.scheduled}
                </div>
                <div className="text-sm text-gray-500">Scheduled</div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg shadow flex items-center gap-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-green-500">
                <CompletedIcon />
              </div>
              <div>
                <div className="text-xl font-semibold">
                  {summaryData.completed}
                </div>
                <div className="text-sm text-gray-500">Completed</div>
              </div>
            </div>
          </div>

          {/* scheduled list */}
          <section className="mb-6">
            <h2 className="text-lg font-semibold mb-3">Scheduled Sessions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {scheduledSessions.map((s) => (
                <div
                  key={s.id}
                  className="bg-white rounded-lg shadow p-4 relative"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-md bg-purple-50 flex items-center justify-center">
                      <GroupIcon />
                    </div>
                    <h3 className="text-md font-medium">{s.groupName}</h3>
                  </div>
                  <div className="text-sm text-gray-600 flex flex-col gap-1">
                    <div>
                      <CalendarIcon />
                      {s.date}
                    </div>
                    <div>
                      <ClockIcon />
                      {s.time}
                    </div>
                    <div>
                      <LocationIcon />
                      {s.location}
                    </div>
                  </div>
                  <span className="absolute right-3 top-3 text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full">
                    Scheduled
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* completed list */}
          <section className="mb-10">
            <h2 className="text-lg font-semibold mb-3">Completed Sessions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {completedSessions.map((s) => (
                <div
                  key={s.id}
                  className="bg-white rounded-lg shadow p-4 relative"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-md bg-green-50 flex items-center justify-center">
                      <GroupIcon />
                    </div>
                    <h3 className="text-md font-medium">{s.groupName}</h3>
                  </div>
                  <div className="text-sm text-gray-600 flex flex-col gap-1">
                    <div>
                      <CalendarIcon />
                      {s.date}
                    </div>
                    <div>
                      <ClockIcon />
                      {s.time}
                    </div>
                    <div>
                      <LocationIcon />
                      {s.location}
                    </div>
                  </div>
                  <span className="absolute right-3 top-3 text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                    Completed
                  </span>
                </div>
              ))}
            </div>
          </section>

          <footer className="text-xs text-gray-400">
            © 2025 AIDefCom - Smart Graduation Defense
          </footer>
        </>
      )}
    </div>
  );
}
