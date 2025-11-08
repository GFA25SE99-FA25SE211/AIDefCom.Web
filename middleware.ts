import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const token = req.cookies.get("token")?.value;
  const role = req.cookies.get("role")?.value;
  const path = req.nextUrl.pathname;

  // Nếu chưa login mà vào các route private → redirect /login
  if (
    !token &&
    (path.startsWith("/administrator") ||
      path.startsWith("/chair") ||
      path.startsWith("/secretary") ||
      path.startsWith("/moderator") ||
      path.startsWith("/member"))
  ) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Nếu đã login → redirect từ / hoặc /login theo role
  if (token && (path === "/" || path === "/login")) {
    const redirectMap: Record<string, string> = {
      administrator: "/administrator",
      chair: "/chair",
      secretary: "/secretary",
      moderator: "/moderator",
      member: "/member",
    };
    const target = redirectMap[role || ""] || "/";
    return NextResponse.redirect(new URL(target, req.url));
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
