import type { ReactNode } from "react";
import MemberSidebar from "./groups-to-grade/components/Sidebar";

export default function MemberLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-[#F3F6FB]">
      {/* Sidebar cố định */}
      <MemberSidebar />

      {/* Main content */}
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
