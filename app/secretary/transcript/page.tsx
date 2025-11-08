"use client";

import Link from "next/link";

export default function TranscriptListPage() {
  const groups = [
    {
      id: 1,
      name: "Group 1",
      topic: "Smart Learning Management System",
      status: "Submitted",
    },
    {
      id: 2,
      name: "Group 2",
      topic: "Intelligent Ride-hailing Application",
      status: "Pending",
    },
    {
      id: 3,
      name: "Group 3",
      topic: "E-commerce Website",
      status: "Submitted",
    },
    {
      id: 4,
      name: "Group 4",
      topic: "AI Health Consultation Chatbot",
      status: "Pending",
    },
    {
      id: 5,
      name: "Group 5",
      topic: "Face Recognition System",
      status: "Submitted",
    },
  ];

  return (
    <div className="page-container">
      <div className="main-header">
        <h1 className="text-2xl font-semibold text-gray-800">
          Session Transcripts
        </h1>
        <p className="text-gray-500 text-sm">
          Select a group to view or edit the transcript.
        </p>
      </div>

      <div className="dashboard-grid md:grid-cols-2 lg:grid-cols-3">
        {groups.map((g) => (
          <Link
            key={g.id}
            href={`/secretary/transcript/${g.id}`}
            className="card-base hover:shadow-md transition cursor-pointer border flex flex-col justify-between"
          >
            <div>
              <h2 className="text-lg font-semibold text-gray-800">{g.name}</h2>
              <p className="text-sm text-gray-500 mt-1">{g.topic}</p>
            </div>

            <span
              className={`mt-4 badge ${
                g.status === "Submitted" ? "badge-success" : "badge-warning"
              }`}
            >
              {g.status}
            </span>
          </Link>
        ))}
      </div>

      <p className="page-footer">© 2025 AIDefCom · Smart Graduation Defense</p>
    </div>
  );
}
