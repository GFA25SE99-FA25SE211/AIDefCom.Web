"use client";
import SidebarBase from "@/app/sidebar/SidebarBase";
import { Users, ClipboardList, Calendar } from "lucide-react";

export default function ModeratorSidebar() {
  const links = [
    {
      href: "/moderator/create-sessions",
      label: "Create Sessions",
      icon: Calendar,
    },
    {
      href: "/moderator/manage-council",
      label: "Manage Councils",
      icon: Users,
    },
    {
      href: "/moderator/data-management",
      label: "Data Management",
      icon: ClipboardList,
    },
  ];

  return <SidebarBase role="Moderator" links={links} />;
}
