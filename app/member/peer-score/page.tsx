"use client";

import { Languages } from "lucide-react";

// Icons
const LanguageIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth="1.5"
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M10.5 21l5.25-11.25L21 21m-9-3h7.5M3 5.621a48.474 48.474 0 016-.371m0 0c1.12 0 2.233.038 3.334.114M9 5.25v1.875m0 0H7.5M9 5.25v1.875m0 0H10.5m-1.5 0v3.75m0 0H7.5m1.5 0H10.5m6.375 0l-1.125-2.625M15.375 9.75l-1.125-2.625m0 0H13.125m1.125 2.625v3.75m0 0H13.125m1.125 0h1.125"
    />
  </svg>
);

const MemberIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth="1.5"
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A1.5 1.5 0 0118 21.75H6a1.5 1.5 0 01-1.499-1.632z"
    />
  </svg>
);

const InfoIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth="1.5"
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"
    />
  </svg>
);

// Dữ liệu (giữ nguyên)
const scoreData = [
  {
    groupName: "Group 1",
    projectTitle: "Smart Learning Management System",
    avgScore: "8.60",
    members: [
      {
        name: "Assoc. Prof. Dr. Nguyen Van X",
        score: "8.8",
        status: "Submitted",
      },
      { name: "Dr. Tran Thi Y", score: "9.0", status: "Submitted" },
      { name: "Dr. Le Van Z", score: "8.0", status: "Submitted" },
    ],
  },
  {
    groupName: "Group 2",
    projectTitle: "Intelligent Ride-hailing Application",
    avgScore: "7.75",
    members: [
      {
        name: "Assoc. Prof. Dr. Nguyen Van X",
        score: "7.5",
        status: "Submitted",
      },
      { name: "Dr. Tran Thi Y", score: "-", status: "Pending" },
      { name: "Dr. Le Van Z", score: "8.0", status: "Submitted" },
    ],
  },
  {
    groupName: "Group 3",
    projectTitle: "E-commerce Website",
    avgScore: "8.65",
    members: [
      {
        name: "Assoc. Prof. Dr. Nguyen Van X",
        score: "8.5",
        status: "Submitted",
      },
      { name: "Dr. Tran Thi Y", score: "8.8", status: "Submitted" },
      { name: "Dr. Le Van Z", score: "-", status: "Pending" },
    ],
  },
  {
    groupName: "Group 4",
    projectTitle: "AI Health Consultation Chatbot",
    avgScore: null,
    members: [
      { name: "Assoc. Prof. Dr. Nguyen Van X", score: "-", status: "Pending" },
      { name: "Dr. Tran Thi Y", score: "-", status: "Pending" },
      { name: "Dr. Le Van Z", score: "-", status: "Pending" },
    ],
  },
  {
    groupName: "Group 5",
    projectTitle: "Face Recognition System",
    avgScore: "8.77",
    members: [
      {
        name: "Assoc. Prof. Dr. Nguyen Van X",
        score: "9.0",
        status: "Submitted",
      },
      { name: "Dr. Tran Thi Y", score: "8.5", status: "Submitted" },
      { name: "Dr. Le Van Z", score: "8.8", status: "Submitted" },
    ],
  },
  {
    groupName: "Group 6",
    projectTitle: "Personal Finance Management App",
    avgScore: null,
    members: [
      { name: "Assoc. Prof. Dr. Nguyen Van X", score: "-", status: "Pending" },
      { name: "Dr. Tran Thi Y", score: "-", status: "Pending" },
      { name: "Dr. Le Van Z", score: "-", status: "Pending" },
    ],
  },
  {
    groupName: "Group 7",
    projectTitle: "Hotel Booking System",
    avgScore: "9.00",
    members: [
      {
        name: "Assoc. Prof. Dr. Nguyen Van X",
        score: "9.0",
        status: "Submitted",
      },
      { name: "Dr. Tran Thi Y", score: "9.2", status: "Submitted" },
      { name: "Dr. Le Van Z", score: "8.8", status: "Submitted" },
    ],
  },
];

export default function PeerScoresPage() {
  return (
    <>
      <main className="main-content">
        <header className="main-header flex flex-col md:flex-row md:items-center md:justify-between bg-white p-5 rounded-2xl shadow-sm border border-gray-100 mb-6">
          {/* Left side */}
          <div>
            <h1 className="text-xl font-semibold text-gray-800">
              Peer Member Scores
            </h1>
            <p className="text-gray-500 text-sm">
              View consolidated scores from all committee members (read-only)
            </p>
          </div>

          {/* Right side */}
          <div className="flex justify-end mt-4 md:mt-0">
            <button className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-blue-500 text-white text-sm font-medium shadow-sm hover:opacity-90 transition">
              <Languages className="w-4 h-4" />
              <span>Tiếng Việt</span>
            </button>
          </div>
        </header>

        <div className="note-box bg-white rounded-xl border border-gray-100 shadow-sm p-5 my-6 flex gap-4 items-center">
          {/* Icon */}
          <div className="note-icon flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-r from-purple-600 to-blue-500 text-white shadow-md">
            <InfoIcon />
          </div>

          {/* Text */}
          <div className="note-content text-sm text-gray-700">
            <strong className="block text-gray-800 mb-0.5">Note:</strong>
            <p className="text-gray-500 leading-snug">
              This table is for reference only. You cannot edit other members'
              scores. The average score will be calculated automatically when
              all members complete their grading.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {scoreData.map((group) => (
            <div
              key={group.groupName}
              className="score-card bg-white rounded-xl shadow p-5"
            >
              <div className="score-card-header flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-gray-800">
                    {group.groupName}
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    {group.projectTitle}
                  </p>
                </div>

                {group.avgScore ? (
                  <div className="avg-badge bg-blue-50 text-blue-700 px-3 py-2 rounded-md text-sm font-medium h-min">
                    Avg: {group.avgScore}
                  </div>
                ) : (
                  <div className="avg-badge bg-gray-50 text-gray-500 px-3 py-2 rounded-md text-sm h-min">
                    No score
                  </div>
                )}
              </div>

              <div className="score-table mt-4 border-t pt-4">
                <div className="score-table-header grid grid-cols-12 text-sm text-gray-500 font-medium pb-2">
                  <span className="col-span-7">Committee Member</span>
                  <span className="col-span-3 text-center">Score</span>
                  <span className="col-span-2 text-right">Status</span>
                </div>

                {group.members.map((member) => (
                  <div
                    key={member.name}
                    className="score-table-row grid grid-cols-12 items-center py-3 border-b last:border-b-0"
                  >
                    <div className="col-span-7 flex items-center gap-3 text-sm text-gray-800">
                      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600">
                        <MemberIcon />
                      </div>
                      <span>{member.name}</span>
                    </div>

                    <div className="col-span-3 text-center">
                      <span
                        className={`score-value ${
                          member.status === "Pending"
                            ? "text-gray-400"
                            : "text-gray-800"
                        } font-medium`}
                      >
                        {member.score}
                      </span>
                    </div>

                    <div className="col-span-2 text-right">
                      <span
                        className={`status-badge inline-block px-3 py-1 rounded-full text-xs ${
                          member.status === "Pending"
                            ? "bg-yellow-50 text-yellow-700"
                            : "bg-green-50 text-green-700"
                        }`}
                      >
                        {member.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <footer className="page-footer text-center text-sm text-gray-500 mt-8">
          © 2025 AIDefCom - Smart Graduation Defense
        </footer>

        <button
          className="help-btn fixed bottom-6 right-6 w-10 h-10 rounded-full bg-gradient-to-r from-purple-600 to-blue-500 text-white flex items-center justify-center shadow-lg"
          aria-label="Help"
        >
          ?
        </button>
      </main>
    </>
  );
}
