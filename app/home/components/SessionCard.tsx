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
  const [sessionRole, setSessionRole] = useState<string | null>(null);
  const [isCheckingRole, setIsCheckingRole] = useState(true);
  const isCompleted = status === "Completed";
  const sessionStatusClass = status.toLowerCase();

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB");
  };

  // Check user's role in this session
  useEffect(() => {
    const checkSessionRole = async () => {
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

        // Check role in session (not system role)
        try {
          const lecturersRes = await defenseSessionsApi.getUsersBySessionId(sessionId);
          if (lecturersRes.data) {
            const currentUserInSession = lecturersRes.data.find(
              (user: any) => 
                String(user.id).toLowerCase() === String(currentUserId).toLowerCase()
            );

            if (currentUserInSession && currentUserInSession.role) {
              // Get role from session, not system role
              const roleInSession = currentUserInSession.role.toLowerCase();
              setSessionRole(roleInSession);
              // KHÔNG lưu session role ở đây - chỉ lưu khi vào trang detail
            }
          }
        } catch (err) {
          console.error("Failed to check session role:", err);
        }
      } catch (err) {
        console.error("Error checking role:", err);
      } finally {
        setIsCheckingRole(false);
      }
    };

    checkSessionRole();
  }, [sessionId]);

  const handleViewClick = () => {
    // KHÔNG lưu session role ở đây - chỉ lưu khi vào trang detail cụ thể
    // Redirect based on user's role in this session
    if (sessionRole === "chair") {
      // Chair in session -> chair detail page
      router.push(`/chair/groups/${groupId}`);
    } else if (sessionRole === "member") {
      // Member in session -> grading page
      router.push(`/member/grading/view/${groupId}`);
    } else if (sessionRole === "secretary") {
      // Secretary in session -> transcript page (using sessionId)
      router.push(`/secretary/transcript/${sessionId}`);
    } else {
      // Not in session or no role -> home detail page
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

