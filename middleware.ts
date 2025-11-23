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
  ];

  // Chặn truy cập khi chưa login
  if (!token && protectedRoutes.some((p) => path.startsWith(p))) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Nếu login rồi → redirect vào role page
  if (token && (path === "/" || path === "/login")) {
    const map: Record<string, string> = {
      administrator: "/administrator",
      chair: "/chair",
      secretary: "/secretary",
      moderator: "/moderator",
      member: "/member",
    };
    const dest = map[role || "member"];
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
  ],
};
