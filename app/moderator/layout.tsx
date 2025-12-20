"use client";

import type { ReactNode } from "react";
import ModeratorSidebar from "./create-sessions/components/ModeratorSidebar";
import RoleGuard from "@/components/auth/RoleGuard";

export default function ModeratorLayout({ children }: { children: ReactNode }) {
  return (
    <RoleGuard allowedRoles={["moderator"]}>
      <div className="flex min-h-screen bg-[#F3F6FB]">
        <ModeratorSidebar />
        <main className="flex-1 p-8">{children}</main>
      </div>
    </RoleGuard>
  );
}
