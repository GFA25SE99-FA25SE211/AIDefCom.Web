"use client";

import type { ReactNode } from "react";
import SecretarySidebar from "./components/SecretarySidebar";

export default function SecretaryLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-[#F3F6FB]">
      <SecretarySidebar />
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
