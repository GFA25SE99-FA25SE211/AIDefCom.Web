import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  // Token hiện tại được lưu trong localStorage, không phải cookies
  // Middleware chạy ở server-side và không thể truy cập localStorage
  // Authentication sẽ được xử lý ở client-side bởi useVoiceEnrollmentCheck hook
  // Middleware chỉ để xử lý một số redirect cơ bản

  const path = req.nextUrl.pathname;

  // Redirect từ root "/" về login
  if (path === "/") {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/"],
};
