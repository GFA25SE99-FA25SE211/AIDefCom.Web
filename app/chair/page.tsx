"use client";

import { useVoiceEnrollmentCheck } from "@/lib/hooks/useVoiceEnrollmentCheck";
import ChairGroups from "./components/ChairGroup";

export default function Page() {
  const { isChecking } = useVoiceEnrollmentCheck();

  if (isChecking) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return <ChairGroups />;
}
