"use client";
import SidebarBase from "@/app/sidebar/SidebarBase";
import { ClipboardList, Mic } from "lucide-react";

export default function SecretarySidebar() {
  const links = [
    { href: "/secretary", label: "Manage Reports", icon: ClipboardList },
    { href: "/secretary/transcript", label: "Session Transcript", icon: Mic },
  ];

  return <SidebarBase role="Secretary" links={links} />;
}
