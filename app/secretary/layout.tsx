"use client";

import type { ReactNode } from "react";
import SecretarySidebar from "./components/SecretarySidebar";
import VoiceGuard from "@/components/auth/VoiceGuard";
import RoleGuard from "@/components/auth/RoleGuard";

export default function SecretaryLayout({ children }: { children: ReactNode }) {
  return (
    <RoleGuard allowedRoles={["secretary", "lecturer"]}>
      <VoiceGuard>
        <div className="flex min-h-screen bg-[#F3F6FB]">
          <SecretarySidebar />
          <main className="flex-1 p-8">{children}</main>
        </div>
      </VoiceGuard>
    </RoleGuard>
  );
}
