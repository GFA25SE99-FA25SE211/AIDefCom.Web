"use client";
import SidebarBase from "@/app/sidebar/SidebarBase";
import { ClipboardList, Mic } from "lucide-react";

export default function SecretarySidebar() {
  const links = [
    { href: "/secretary", label: "Manage Reports", icon: ClipboardList },
    {
      href: "/home",
      label: "Session Transcript",
      icon: Mic,
      matchPath: "/secretary/transcript",
    },
  ];

  return <SidebarBase role="Secretary" links={links} />;
}
