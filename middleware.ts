import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const token = req.cookies.get("token")?.value;
  const role = req.cookies.get("role")?.value;
  const path = req.nextUrl.pathname;

  const protectedRoutes = [
    "/administrator",
    "/chair",
    "/secretary",
    "/moderator",
    "/member",
    "/home",
  ];

  // Chặn truy cập khi chưa login
  if (!token && protectedRoutes.some((p) => path.startsWith(p))) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Nếu login rồi → redirect vào role page
  if (token && (path === "/" || path === "/login")) {
    // Block student role - redirect to login with error
    if (role?.toLowerCase() === "student") {
      const response = NextResponse.redirect(new URL("/login", req.url));
      // Clear cookies to prevent infinite loop
      response.cookies.delete("token");
      response.cookies.delete("role");
      return response;
    }

    const map: Record<string, string> = {
      administrator: "/administrator",
      lecturer: "/home",
      chair: "/chair",
      secretary: "/secretary",
      moderator: "/moderator",
      member: "/member",
    };
    const dest = map[role?.toLowerCase() || "member"] || "/member";
    return NextResponse.redirect(new URL(dest, req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/login",
    "/administrator/:path*",
    "/chair/:path*",
    "/secretary/:path*",
    "/moderator/:path*",
    "/member/:path*",
    "/home/:path*",
  ],
};
