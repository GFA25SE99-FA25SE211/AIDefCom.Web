"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useVoiceEnrollmentCheck } from "@/lib/hooks/useVoiceEnrollmentCheck";

export default function MemberHomePage() {
  const router = useRouter();
  const { isChecking, isEnrolled } = useVoiceEnrollmentCheck();

  useEffect(() => {
    if (!isChecking && isEnrolled) {
      router.push("/member/defense-sessions");
    }
  }, [isChecking, isEnrolled, router]);

  if (isChecking) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return null;
}
