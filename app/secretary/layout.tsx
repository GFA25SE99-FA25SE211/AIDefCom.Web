"use client";

import type { ReactNode } from "react";
import SecretarySidebar from "./components/SecretarySidebar";
import VoiceGuard from "@/components/auth/VoiceGuard";

export default function SecretaryLayout({ children }: { children: ReactNode }) {
  return (
    <VoiceGuard>
      <div className="flex min-h-screen bg-[#F3F6FB]">
        <SecretarySidebar />
        <main className="flex-1 p-8">{children}</main>
      </div>
    </VoiceGuard>
  );
}
