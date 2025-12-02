"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { voiceApi } from "@/lib/api/voice";

export default function VoiceGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const checkVoiceStatus = async () => {
      try {
        const userStr = localStorage.getItem("user");
        if (!userStr) {
          // Not logged in, let middleware handle it or redirect
          // But if we are here, we assume middleware allowed access.
          // If no user in localStorage, maybe session expired?
          setAuthorized(true); // Let page handle empty user or redirect
          setChecking(false);
          return;
        }

        const user = JSON.parse(userStr);
        const role = user.roles?.[0]?.toLowerCase() || user.role?.toLowerCase();

        // Admin bypass
        if (role === "admin" || role === "administrator") {
          setAuthorized(true);
          setChecking(false);
          return;
        }

        // Check voice status
        // TEMPORARILY DISABLED: Voice enrollment check
        // const status = await voiceApi.getStatus(user.id);

        // if (status.enrollment_status !== "enrolled") {
        //   router.push("/voice-enroll");
        // } else {
        //   setAuthorized(true);
        // }
        
        // Allow access without voice enrollment check
        setAuthorized(true);
      } catch (error) {
        console.error("VoiceGuard check failed:", error);
        // TEMPORARILY DISABLED: Allow access even if check fails
        // router.push("/voice-enroll");
        setAuthorized(true);
      } finally {
        setChecking(false);
      }
    };

    checkVoiceStatus();
  }, [router]);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-500">Verifying security status...</div>
      </div>
    );
  }

  if (!authorized) {
    return null; // Will redirect
  }

  return <>{children}</>;
}
