import type { ReactNode } from "react";
import AdminSidebar from "./dashboard/components/AdminSidebar";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-[#F3F6FB]">
      <AdminSidebar />
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
