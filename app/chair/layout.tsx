"use client";

import type { ReactNode } from "react";
import ChairSidebar from "./components/ChairSidebar";
import "@/app/globals.css";
import VoiceGuard from "@/components/auth/VoiceGuard";
import RoleGuard from "@/components/auth/RoleGuard";

export default function ChairLayout({ children }: { children: ReactNode }) {
  return (
    <RoleGuard allowedRoles={["chair", "lecturer"]}>
      <VoiceGuard>
        <div className="flex min-h-screen bg-[#F3F6FB]">
          <ChairSidebar />
          <main className="flex-1 p-8">{children}</main>
        </div>
      </VoiceGuard>
    </RoleGuard>
  );
}
