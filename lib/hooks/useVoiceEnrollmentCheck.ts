"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { voiceApi } from "@/lib/api/voice";

// Roles that don't require voice enrollment
const EXEMPT_ROLES = ["administrator", "admin", "moderator"];

interface UseVoiceEnrollmentCheckResult {
  isChecking: boolean;
  isEnrolled: boolean;
}

/**
 * Hook to check voice enrollment status.
 * Redirects to /voice-enroll if user is not enrolled (except for exempt roles).
 *
 * @param redirectOnFail - If true, redirects to /voice-enroll when not enrolled (default: true)
 * @returns { isChecking, isEnrolled }
 */
export function useVoiceEnrollmentCheck(
  redirectOnFail: boolean = true
): UseVoiceEnrollmentCheckResult {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);
  const [isEnrolled, setIsEnrolled] = useState(false);

  useEffect(() => {
    const checkVoiceEnrollment = async () => {
      try {
        // Lấy userId và role từ localStorage
        const userId = localStorage.getItem("userId");

        if (!userId) {
          if (redirectOnFail) {
            router.push("/login");
          }
          return;
        }

        // Lấy role từ localStorage
        const userRole = localStorage.getItem("userRole") || "";

        // Check if user's role is exempt from voice enrollment
        if (EXEMPT_ROLES.includes(userRole)) {
          setIsEnrolled(true);
          setIsChecking(false);
          return;
        }

        // Check voice enrollment status
        const status = await voiceApi.getStatus(userId);

        if (status.enrollment_status === "enrolled") {
          setIsEnrolled(true);
          setIsChecking(false);
        } else {
          // Not enrolled
          setIsEnrolled(false);
          setIsChecking(false);
          if (redirectOnFail) {
            router.push("/voice-enroll");
          }
        }
      } catch (error) {
        console.error("Error checking voice enrollment:", error);
        setIsChecking(false);
        if (redirectOnFail) {
          router.push("/voice-enroll");
        }
      }
    };

    checkVoiceEnrollment();
  }, [router, redirectOnFail]);

  return { isChecking, isEnrolled };
}
