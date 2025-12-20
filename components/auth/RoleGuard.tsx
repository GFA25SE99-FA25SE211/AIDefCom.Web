"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authUtils } from "@/lib/utils/auth";

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: string[];
}

// Map role to their default dashboard
const getRoleDashboard = (role: string): string => {
  const r = role?.toLowerCase();
  switch (r) {
    case "admin":
    case "administrator":
      return "/administrator";
    case "moderator":
      return "/moderator";
    case "chair":
      return "/chair";
    case "secretary":
      return "/secretary";
    case "member":
      return "/member";
    case "lecturer":
      return "/home";
    default:
      return "/login";
  }
};

export default function RoleGuard({ children, allowedRoles }: RoleGuardProps) {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    const checkRole = () => {
      const { role } = authUtils.getCurrentUserInfo();

      if (!role) {
        // Not logged in
        router.push("/login");
        return;
      }

      setUserRole(role);
      const normalizedRole = role.toLowerCase();
      const normalizedAllowed = allowedRoles.map((r) => r.toLowerCase());

      if (normalizedAllowed.includes(normalizedRole)) {
        setIsAuthorized(true);
      } else {
        setIsAuthorized(false);
      }
    };

    checkRole();
  }, [allowedRoles, router]);

  // Countdown and redirect when not authorized
  useEffect(() => {
    if (isAuthorized === false && userRole) {
      const timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [isAuthorized, userRole]);

  // Separate effect for redirect when countdown reaches 0
  useEffect(() => {
    if (countdown <= 0 && isAuthorized === false && userRole) {
      router.push(getRoleDashboard(userRole));
    }
  }, [countdown, isAuthorized, userRole, router]);

  // Loading state
  if (isAuthorized === null) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  // Access Denied state
  if (isAuthorized === false) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="w-8 h-8 text-red-600"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            Access Denied
          </h1>
          <p className="text-gray-600 mb-4">
            You do not have permission to access this page.
          </p>
          <p className="text-sm text-gray-500 mb-4">
            Your role:{" "}
            <span className="font-semibold text-purple-600 capitalize">
              {userRole}
            </span>
          </p>
          <div className="text-sm text-gray-400">
            Redirecting to your dashboard in{" "}
            <span className="font-bold text-purple-600">{countdown}</span>{" "}
            seconds...
          </div>
          <button
            onClick={() => router.push(getRoleDashboard(userRole || ""))}
            className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
          >
            Go to Dashboard Now
          </button>
        </div>
      </div>
    );
  }

  // Authorized - render children
  return <>{children}</>;
}
