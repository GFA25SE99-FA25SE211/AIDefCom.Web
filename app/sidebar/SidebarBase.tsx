"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { LogOut } from "lucide-react";

interface SidebarBaseProps {
  role: "Chair" | "Secretary" | "Moderator" | "Member" | "Administrator" | "Lecturer";
  links: { href: string; label: string; icon: React.ElementType }[];
}

export default function SidebarBase({ role, links }: SidebarBaseProps) {
  const pathname = usePathname();
  const router = useRouter();

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
        <div className="flex items-center gap-3 px-6 py-6 border-b border-white/10">
          <img src="/favicon-new.ico" alt="logo" className="w-8" />
          <span className="text-lg font-semibold tracking-wide">AIDefCom</span>
        </div>

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
