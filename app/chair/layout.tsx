import type { ReactNode } from "react";
import ChairSidebar from "./components/ChairSidebar";
import "@/app/globals.css";

export default function ChairLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-[#F3F6FB]">
      <ChairSidebar />
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
