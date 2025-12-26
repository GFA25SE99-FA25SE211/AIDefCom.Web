"use client";

import SidebarBase from "@/app/sidebar/SidebarBase";
import { Calendar, Star } from "lucide-react";

export default function MemberSidebar() {
  // Cấu hình các liên kết dành cho Member
  const links = [
    {
      href: "/home",
      label: "Defense Sessions",
      icon: Calendar,
    },
    {
      href: "/member/peer-score",
      label: "Peer Scores",
      icon: Star,
    },
  ];

  // Truyền dữ liệu vào SidebarBase (đồng bộ hệ thống)
  return <SidebarBase role="Member" links={links} />;
}
