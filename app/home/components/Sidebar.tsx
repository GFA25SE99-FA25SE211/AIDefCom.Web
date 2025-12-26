"use client";

import SidebarBase from "@/app/sidebar/SidebarBase";
import { Calendar, History } from "lucide-react";

export default function HomeSidebar() {
  // Cấu hình các liên kết dành cho Lecturer
  const links = [
    {
      href: "/home",
      label: "Defense Sessions List",
      icon: Calendar,
    },
    {
      href: "/member/student-history",
      label: "Student History",
      icon: History,
    },
  ];

  // Truyền dữ liệu vào SidebarBase (đồng bộ hệ thống)
  return <SidebarBase role="Lecturer" links={links} />;
}

