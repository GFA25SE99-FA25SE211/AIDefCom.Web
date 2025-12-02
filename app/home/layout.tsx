import type { ReactNode } from "react";
import HomeSidebar from "./components/Sidebar";
import VoiceGuard from "@/components/auth/VoiceGuard";

export default function HomeLayout({ children }: { children: ReactNode }) {
  return (
    <VoiceGuard>
      <div className="flex min-h-screen bg-[#F3F6FB]">
        {/* Sidebar cố định */}
        <HomeSidebar />

        {/* Main content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </VoiceGuard>
  );
}
