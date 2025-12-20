"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { defenseSessionsApi } from "@/lib/api/defense-sessions";
import { authUtils } from "@/lib/utils/auth";

interface UseSessionRoleCheckResult {
  isChecking: boolean;
  sessionRole: string | null;
  isAuthorized: boolean;
  groupId: number | null;
}

/**
 * Hook to check if current user has the expected role in a specific defense session.
 * Redirects to the correct page if user has a different role.
 *
 * @param sessionId - The defense session ID to check
 * @param expectedRole - The role expected for this page (e.g., "secretary", "chair", "member")
 * @param redirectOnMismatch - If true, redirects to correct page when role doesn't match
 */
export function useSessionRoleCheck(
  sessionId: string | number,
  expectedRole: string,
  redirectOnMismatch: boolean = true
): UseSessionRoleCheckResult {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);
  const [sessionRole, setSessionRole] = useState<string | null>(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [groupId, setGroupId] = useState<number | null>(null);

  useEffect(() => {
    const checkSessionRole = async () => {
      try {
        setIsChecking(true);

        // Get current user ID
        const currentUserId = authUtils.getCurrentUserId();
        if (!currentUserId) {
          router.push("/login");
          return;
        }

        // Get session details to retrieve groupId
        const sessionRes = await defenseSessionsApi.getById(Number(sessionId));
        const session = sessionRes.data;
        if (session?.groupId) {
          setGroupId(Number(session.groupId));
        }

        // Get all users in this session, including their roles
        const lecturersRes = await defenseSessionsApi.getUsersBySessionId(
          Number(sessionId)
        );

        if (!lecturersRes.data) {
          console.warn("No users found in session");
          setIsChecking(false);
          setIsAuthorized(false);
          if (redirectOnMismatch) {
            router.push("/home");
          }
          return;
        }

        // Find current user in the session
        const currentUserInSession = lecturersRes.data.find(
          (user: any) =>
            String(user.id).toLowerCase() ===
            String(currentUserId).toLowerCase()
        );

        if (!currentUserInSession) {
          console.warn("Current user not found in session");
          setIsChecking(false);
          setIsAuthorized(false);
          if (redirectOnMismatch) {
            router.push("/home");
          }
          return;
        }

        const roleInSession = currentUserInSession.role?.toLowerCase() || "";
        setSessionRole(roleInSession);

        // Check if role matches expected role
        if (roleInSession === expectedRole.toLowerCase()) {
          setIsAuthorized(true);
        } else {
          setIsAuthorized(false);

          if (redirectOnMismatch && session?.groupId) {
            // Redirect to correct page based on actual role
            const gId = session.groupId;
            const sId = sessionId;

            if (roleInSession === "chair") {
              router.push(`/chair/groups/${gId}`);
            } else if (roleInSession === "secretary") {
              router.push(`/secretary/transcript/${sId}`);
            } else if (roleInSession === "member") {
              router.push(`/member/grading/view/${gId}`);
            } else {
              router.push(`/home/view/${gId}`);
            }
          }
        }
      } catch (error) {
        console.error("Error checking session role:", error);
        setIsAuthorized(false);
      } finally {
        setIsChecking(false);
      }
    };

    if (sessionId) {
      checkSessionRole();
    }
  }, [sessionId, expectedRole, redirectOnMismatch, router]);

  return { isChecking, sessionRole, isAuthorized, groupId };
}
