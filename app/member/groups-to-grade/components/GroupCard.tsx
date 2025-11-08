"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Users, Calendar, ClipboardList } from "lucide-react";

export type GroupStatus = "Graded" | "Not Graded";
export type SessionStatus = "Upcoming" | "Completed";

interface GroupCardProps {
  groupName: string;
  projectTitle: string;
  status: GroupStatus;
  members: string;
  sessionTitle: string;
  sessionStatus: SessionStatus;
  sessionDateTime: string;
}

const GroupCard: React.FC<GroupCardProps> = ({
  groupName,
  projectTitle,
  status,
  members,
  sessionTitle,
  sessionStatus,
  sessionDateTime,
}) => {
  const router = useRouter();
  const isGraded = status === "Graded";
  const sessionStatusClass = sessionStatus.toLowerCase();

  const handleGradeClick = () => {
    const groupId = groupName.split(" ")[1];
    router.push(
      isGraded
        ? `/member/grading/view/${groupId}`
        : `/member/grading/grade/${groupId}`
    );
  };

  return (
    <article className="bg-white shadow-sm rounded-2xl p-5 hover:shadow-md transition border border-gray-100">
      {/* Header */}
      <header className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <ClipboardList className="w-5 h-5 text-indigo-500" />
          <h2 className="font-semibold text-gray-800 text-lg">{groupName}</h2>
          <span
            className={`ml-2 text-xs px-2 py-1 rounded-full ${
              isGraded
                ? "bg-green-100 text-green-700"
                : "bg-gray-100 text-gray-600"
            }`}
          >
            {status}
          </span>
        </div>

        <button
          onClick={handleGradeClick}
          className={`px-3 py-1.5 text-sm font-medium rounded-lg transition ${
            isGraded
              ? "bg-gradient-to-r from-purple-500 to-blue-500 text-white hover:opacity-90"
              : "border border-gray-300 text-gray-700 hover:bg-gray-100"
          }`}
        >
          {isGraded ? "View/Edit Score" : "Grade"}
        </button>
      </header>

      {/* Body */}
      <div className="space-y-3 text-sm text-gray-700">
        <div>
          <h3 className="font-medium text-gray-800">{projectTitle}</h3>
        </div>

        <div className="flex items-center gap-2 text-gray-600">
          <Users className="w-4 h-4" />
          <span>{members}</span>
        </div>

        {/* Session Info */}
        <div className="pt-2 border-t border-gray-100">
          <div className="flex items-center justify-between mb-1">
            <h4 className="text-sm font-semibold text-gray-800">
              {sessionTitle}
            </h4>
            <span
              className={`text-xs px-2 py-1 rounded-full ${
                sessionStatusClass === "upcoming"
                  ? "bg-yellow-100 text-yellow-700"
                  : "bg-blue-100 text-blue-700"
              }`}
            >
              {sessionStatus}
            </span>
          </div>
          <div className="flex items-center gap-2 text-gray-600">
            <Calendar className="w-4 h-4" />
            <span>{sessionDateTime}</span>
          </div>
        </div>
      </div>
    </article>
  );
};

export default GroupCard;
