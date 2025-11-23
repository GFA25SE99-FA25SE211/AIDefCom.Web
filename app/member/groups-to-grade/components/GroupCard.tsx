"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Users, Calendar, ClipboardList } from "lucide-react";

export type GroupStatus = "Graded" | "Not Graded";
export type SessionStatus = "Upcoming" | "Completed";

interface GroupCardProps {
  groupId: string;
  groupName: string;
  projectTitle: string;
  status: GroupStatus;
  members: string;
  sessionTitle: string;
  sessionStatus: SessionStatus;
  sessionDateTime: string;
}

const GroupCard: React.FC<GroupCardProps> = ({
  groupId,
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
    router.push(
      isGraded
        ? `/member/grading/view/${groupId}`
        : `/member/grading/grade/${groupId}`
    );
  };

  return (
    <article className="bg-white shadow-sm rounded-2xl p-4 sm:p-5 hover:shadow-md transition border border-gray-100 min-h-[280px] flex flex-col max-w-full overflow-hidden">
      {/* Header */}
      <header className="mb-3">
        <div className="flex items-start justify-between gap-2 sm:gap-3">
          <div className="flex items-center gap-1 sm:gap-2 min-w-0 flex-1 overflow-hidden">
            <ClipboardList className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-500 flex-shrink-0" />
            <h2 className="font-semibold text-gray-800 text-sm sm:text-base lg:text-lg truncate">
              {groupName}
            </h2>
            <span
              className={`text-xs px-1.5 sm:px-2 py-1 rounded-full flex-shrink-0 ${
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
            className={`px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm font-medium rounded-md sm:rounded-lg transition flex-shrink-0 whitespace-nowrap min-w-0 ${
              isGraded
                ? "bg-gradient-to-r from-purple-500 to-blue-500 text-white hover:opacity-90"
                : "border border-gray-300 text-gray-700 hover:bg-gray-100"
            }`}
          >
            Grade
          </button>
        </div>
      </header>

      {/* Body */}
      <div className="space-y-3 text-sm text-gray-700 flex-grow">
        <div>
          <h3 className="font-medium text-gray-800 break-words">
            {projectTitle}
          </h3>
        </div>

        <div className="flex items-center gap-2 text-gray-600">
          <Users className="w-4 h-4 flex-shrink-0" />
          <span className="text-xs sm:text-sm truncate">{members}</span>
        </div>

        {/* Session Info - Pushed to bottom */}
        <div className="pt-2 border-t border-gray-100 mt-auto">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h4 className="text-sm font-semibold text-gray-800 truncate flex-1">
              {sessionTitle}
            </h4>
            <span
              className={`text-xs px-2 py-1 rounded-full flex-shrink-0 ${
                sessionStatusClass === "upcoming"
                  ? "bg-yellow-100 text-yellow-700"
                  : "bg-blue-100 text-blue-700"
              }`}
            >
              {sessionStatus}
            </span>
          </div>
          <div className="flex items-center gap-2 text-gray-600">
            <Calendar className="w-4 h-4 flex-shrink-0" />
            <span className="text-xs sm:text-sm">{sessionDateTime}</span>
          </div>
        </div>
      </div>
    </article>
  );
};

export default GroupCard;
