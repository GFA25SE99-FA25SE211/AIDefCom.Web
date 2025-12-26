"use client";

import SidebarBase from "@/app/sidebar/SidebarBase";
import { Calendar } from "lucide-react";

export default function HomeSidebar() {
  // Cấu hình các liên kết dành cho Lecturer
  const links = [
    {
      href: "/home",
      label: "Defense Sessions List",
      icon: Calendar,
    },
  ];

  // Truyền dữ liệu vào SidebarBase (đồng bộ hệ thống)
  return <SidebarBase role="Lecturer" links={links} />;
}
