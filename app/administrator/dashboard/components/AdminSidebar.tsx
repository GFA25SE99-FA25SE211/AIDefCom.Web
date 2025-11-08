"use client";

import SidebarBase from "@/app/sidebar/SidebarBase";
import { LayoutDashboard, Users, ClipboardList } from "lucide-react";

export default function AdminSidebar() {
  const links = [
    {
      href: "/administrator/dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
    },
    {
      href: "/administrator/account-management",
      label: "Account Management",
      icon: Users,
    },
    {
      href: "/administrator/admin-data-management",
      label: "Data Management",
      icon: ClipboardList,
    },
  ];

  return <SidebarBase role="Administrator" links={links} />;
}
