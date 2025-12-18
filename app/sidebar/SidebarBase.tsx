"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { LogOut } from "lucide-react";
import { useEffect, useState } from "react";

interface SidebarBaseProps {
  role:
    | "Chair"
    | "Secretary"
    | "Moderator"
    | "Member"
    | "Administrator"
    | "Lecturer";
  links: { href: string; label: string; icon: React.ElementType }[];
}

export default function SidebarBase({ role, links }: SidebarBaseProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [userName, setUserName] = useState<string>("");
  const [userRole, setUserRole] = useState<string>("");
  const [sessionRole, setSessionRole] = useState<string>("");

  // Lấy thông tin user từ API (bảo mật hơn localStorage)
  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const res = await fetch("/api/auth/me", { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          const user = data.user;
          const name = user?.fullName || user?.userName || "";
          setUserName(name);

          let roleFromUser = "";
          if (user?.role) {
            roleFromUser = user.role;
          } else if (user?.roles && user.roles.length > 0) {
            roleFromUser = user.roles[0];
          } else {
            roleFromUser = role; // Fallback to prop role
          }
          setUserRole(roleFromUser);
        }
      } catch (err) {
        console.error("Error fetching user info:", err);
      }
    };

    fetchUserInfo();

    // Lấy session role từ localStorage (nếu có)
    const storedSessionRole = localStorage.getItem("sessionRole");
    if (storedSessionRole) {
      setSessionRole(storedSessionRole);
    } else {
      setSessionRole("");
    }
  }, [role]);

  // Lắng nghe thay đổi localStorage để cập nhật session role
  useEffect(() => {
    const handleStorageChange = () => {
      try {
        const storedSessionRole = localStorage.getItem("sessionRole");
        if (storedSessionRole) {
          setSessionRole(storedSessionRole);
        } else {
          setSessionRole("");
        }
      } catch (err) {
        console.error("Error reading session role:", err);
      }
    };

    // Lắng nghe sự kiện storage
    window.addEventListener("storage", handleStorageChange);

    // Kiểm tra định kỳ (vì storage event chỉ hoạt động giữa các tab)
    const interval = setInterval(handleStorageChange, 500);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  // Kiểm tra route active

  const isActive = (href: string) => {
    if (pathname === href) return true;

    if (pathname.startsWith(href)) {
      const isSubPath = pathname.startsWith(href + "/") || href === "/";

      if (isSubPath) {
        const betterMatch = links.find(
          (link) =>
            link.href !== href &&
            pathname.startsWith(link.href) &&
            link.href.length > href.length
        );

        if (betterMatch) return false;

        return true;
      }
    }

    return false;
  };

  // Xử lý logout
  const handleLogout = async () => {
    try {
      // Xóa session role khi logout
      localStorage.removeItem("sessionRole");
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
    } catch (err) {
      console.error("Logout failed", err);
    }
  };

  return (
    <aside className="w-64 bg-[#0F1D37] text-white flex flex-col justify-between">
      {/* Header */}
      <div>
        <Link
          href="/home"
          className="flex items-center gap-3 px-6 py-4 border-b border-white/10 hover:bg-white/5 transition-colors cursor-pointer"
        >
          <img src="/favicon-new.ico" alt="logo" className="w-8" />
          <span className="text-lg font-semibold tracking-wide">AIDefCom</span>
        </Link>

        {/* User Info - Clickable to go to Profile */}
        {userName && (
          <Link
            href="/profile"
            className="block px-6 py-4 border-b border-white/10 hover:bg-white/5 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                {userName.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {userName}
                </p>
                {userRole && (
                  <p className="text-xs text-gray-300 capitalize truncate">
                    {userRole}
                  </p>
                )}
                {sessionRole && (
                  <p className="text-xs text-blue-300 capitalize truncate mt-0.5">
                    {sessionRole} (Session)
                  </p>
                )}
              </div>
            </div>
          </Link>
        )}

        {/* Navigation */}
        <nav className="mt-6 px-4 space-y-2 text-sm font-medium relative">
          {links.map((link) => {
            const active = isActive(link.href);
            const Icon = link.icon;

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`relative flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 overflow-hidden ${
                  active
                    ? "text-white"
                    : "text-gray-300 hover:text-white hover:bg-white/10"
                }`}
              >
                {active && (
                  <motion.div
                    layoutId="active-bg"
                    className="absolute inset-0 rounded-lg bg-gradient-to-r from-purple-600 to-blue-500 shadow-md"
                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                  />
                )}
                <Icon className="w-4 h-4 relative z-10" />
                <span className="relative z-10">{link.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Logout */}
      <button
        onClick={handleLogout}
        className="flex items-center gap-2 text-left px-4 py-3 text-sm text-gray-300 hover:text-white hover:bg-white/10 transition"
      >
        <LogOut className="w-4 h-4" />
        Logout
      </button>
    </aside>
  );
}
