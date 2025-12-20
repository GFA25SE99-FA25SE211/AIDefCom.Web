"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { authUtils } from "@/lib/utils/auth";

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: string[];
  redirectTo?: string;
}

export default function RoleGuard({
  children,
  allowedRoles,
  redirectTo,
}: RoleGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkAccess = () => {
      const userInfo = authUtils.getCurrentUserInfo();
      const userRole = userInfo.role?.toLowerCase();

      // If no token, redirect to login
      if (!authUtils.isAuthenticated()) {
        if (pathname !== "/login") {
          router.push("/login");
        }
        setIsChecking(false);
        return;
      }

      // Check if user role is allowed
      const normalizedAllowedRoles = allowedRoles.map((r) => r.toLowerCase());
      const isAllowed =
        userRole &&
        normalizedAllowedRoles.some(
          (allowedRole) =>
            userRole === allowedRole ||
            (allowedRole === "administrator" && userRole === "admin") ||
            (allowedRole === "admin" && userRole === "administrator")
        );

      if (!isAllowed) {
        // Redirect based on user role
        const redirectPath = redirectTo || getDefaultRedirectPath(userRole);
        // Only redirect if not already on the target path
        if (pathname !== redirectPath) {
          router.push(redirectPath);
        }
        setIsChecking(false);
        return;
      }

      setIsChecking(false);
    };

    checkAccess();
  }, [router, allowedRoles, redirectTo, pathname]);

  // Helper function to get default redirect path based on role
  const getDefaultRedirectPath = (role: string | null): string => {
    if (!role) return "/login";

    switch (role.toLowerCase()) {
      case "admin":
      case "administrator":
        return "/administrator";
      case "moderator":
        return "/moderator";
      case "lecturer":
        return "/member";
      case "chair":
        return "/chair";
      case "secretary":
        return "/secretary";
      default:
        return "/home";
    }
  };

  // Show loading state while checking
  if (isChecking) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Checking access...</p>
        </div>
      </div>
    );
  }

  // Check authentication and role before rendering
  const userInfo = authUtils.getCurrentUserInfo();
  const userRole = userInfo.role?.toLowerCase();

  if (!authUtils.isAuthenticated()) {
    return null; // Will redirect in useEffect
  }

  const normalizedAllowedRoles = allowedRoles.map((r) => r.toLowerCase());
  const isAllowed =
    userRole &&
    normalizedAllowedRoles.some(
      (allowedRole) =>
        userRole === allowedRole ||
        (allowedRole === "administrator" && userRole === "admin") ||
        (allowedRole === "admin" && userRole === "administrator")
    );

  if (!isAllowed) {
    return null; // Will redirect in useEffect
  }

  return <>{children}</>;
}

