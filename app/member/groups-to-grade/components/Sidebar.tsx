"use client";

import SidebarBase from "@/app/sidebar/SidebarBase";
import { Calendar, Star, History } from "lucide-react";

export default function MemberSidebar() {
  // Cấu hình các liên kết dành cho Member
  const links = [
    {
      href: "/home",
      label: "Defense Sessions",
      icon: Calendar,
      matchPath: "/member",
    },
    {
      href: "/member/peer-score",
      label: "Peer Scores",
      icon: Star,
    },
    {
      href: "/member/student-history",
      label: "Student History",
      icon: History,
    },
  ];

  // Truyền dữ liệu vào SidebarBase (đồng bộ hệ thống)
  return <SidebarBase role="Member" links={links} />;
}
