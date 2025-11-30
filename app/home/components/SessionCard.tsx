"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Calendar, MapPin, Users, Clock } from "lucide-react";
import { defenseSessionsApi } from "@/lib/api/defense-sessions";

export type SessionStatus = "Upcoming" | "Completed" | "Scheduled";

interface SessionCardProps {
  sessionId: number;
  groupId: string;
  groupName: string;
  projectTitle: string;
  location: string;
  defenseDate: string;
  startTime: string;
  endTime: string;
  status: SessionStatus;
  members?: string;
}

const SessionCard: React.FC<SessionCardProps> = ({
  sessionId,
  groupId,
  groupName,
  projectTitle,
  location,
  defenseDate,
  startTime,
  endTime,
  status,
  members,
}) => {
  const router = useRouter();
  const [isChair, setIsChair] = useState(false);
  const [isCheckingRole, setIsCheckingRole] = useState(true);
  const isCompleted = status === "Completed";
  const sessionStatusClass = status.toLowerCase();

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB");
  };

  // Check if current user is chair in this session
  useEffect(() => {
    const checkChairRole = async () => {
      try {
        setIsCheckingRole(true);
        
        // Get current user from localStorage
        const storedUser = localStorage.getItem("user");
        if (!storedUser) {
          setIsCheckingRole(false);
          return;
        }

        const parsedUser = JSON.parse(storedUser);
        const currentUserId = parsedUser.id;

        // Check if user has system Chair role
        const isSystemChair = 
          (parsedUser.roles && parsedUser.roles.some((r: string) => r.toLowerCase() === "chair")) ||
          (parsedUser.role && parsedUser.role.toLowerCase() === "chair");

        if (isSystemChair) {
          setIsChair(true);
          setIsCheckingRole(false);
          return;
        }

        // Check role in session
        try {
          const lecturersRes = await defenseSessionsApi.getUsersBySessionId(sessionId);
          if (lecturersRes.data) {
            const currentUserInSession = lecturersRes.data.find(
              (user: any) => 
                String(user.id).toLowerCase() === String(currentUserId).toLowerCase()
            );

            if (
              currentUserInSession &&
              currentUserInSession.role &&
              currentUserInSession.role.toLowerCase() === "chair"
            ) {
              setIsChair(true);
            }
          }
        } catch (err) {
          console.error("Failed to check chair role:", err);
        }
      } catch (err) {
        console.error("Error checking role:", err);
      } finally {
        setIsCheckingRole(false);
      }
    };

    checkChairRole();
  }, [sessionId]);

  const handleViewClick = () => {
    // If user is chair, navigate to chair detail page, otherwise to home detail page
    if (isChair) {
      router.push(`/chair/groups/${groupId}`);
    } else {
      router.push(`/home/view/${groupId}`);
    }
  };

  return (
    <article className="bg-white shadow-sm rounded-2xl p-4 sm:p-5 hover:shadow-md transition border border-gray-100 min-h-[280px] flex flex-col max-w-full overflow-hidden">
      {/* Header */}
      <header className="mb-3">
        <div className="flex items-start justify-between gap-2 sm:gap-3">
          <div className="flex items-center gap-1 sm:gap-2 min-w-0 flex-1 overflow-hidden">
            <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-500 flex-shrink-0" />
            <h2 className="font-semibold text-gray-800 text-sm sm:text-base lg:text-lg truncate">
              {groupName}
            </h2>
            <span
              className={`text-xs px-1.5 sm:px-2 py-1 rounded-full flex-shrink-0 ${
                sessionStatusClass === "completed"
                  ? "bg-blue-100 text-blue-700"
                  : sessionStatusClass === "upcoming"
                  ? "bg-yellow-100 text-yellow-700"
                  : "bg-green-100 text-green-700"
              }`}
            >
              {status}
            </span>
          </div>

          <button
            onClick={handleViewClick}
            className="px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm font-medium rounded-md sm:rounded-lg transition flex-shrink-0 whitespace-nowrap min-w-0 bg-gradient-to-r from-purple-500 to-blue-500 text-white hover:opacity-90"
          >
            View
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

        {members && (
          <div className="flex items-center gap-2 text-gray-600">
            <Users className="w-4 h-4 flex-shrink-0" />
            <span className="text-xs sm:text-sm truncate">{members}</span>
          </div>
        )}

        <div className="flex items-center gap-2 text-gray-600">
          <MapPin className="w-4 h-4 flex-shrink-0" />
          <span className="text-xs sm:text-sm truncate">{location || "TBD"}</span>
        </div>

        {/* Session Info - Pushed to bottom */}
        <div className="pt-2 border-t border-gray-100 mt-auto">
          <div className="flex items-center gap-2 text-gray-600 mb-2">
            <Calendar className="w-4 h-4 flex-shrink-0" />
            <span className="text-xs sm:text-sm">{formatDate(defenseDate)}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-600">
            <Clock className="w-4 h-4 flex-shrink-0" />
            <span className="text-xs sm:text-sm">
              {startTime && endTime
                ? `${startTime.substring(0, 5)} - ${endTime.substring(0, 5)}`
                : startTime
                ? `${startTime.substring(0, 5)} - TBD`
                : "TBD"}
            </span>
          </div>
        </div>
      </div>
    </article>
  );
};

export default SessionCard;

