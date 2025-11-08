"use client";
import SidebarBase from "@/app/sidebar/SidebarBase";
import { Users, FileText } from "lucide-react";

export default function ChairSidebar() {
  const links = [
    { href: "/chair", label: "My Groups", icon: Users },
    { href: "/chair/report", label: "Report Status", icon: FileText },
  ];

  return <SidebarBase role="Chair" links={links} />;
}
