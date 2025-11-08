import { NextResponse } from "next/server";

export async function POST() {
  try {
    // Tạo phản hồi rỗng
    const res = NextResponse.json({ success: true, message: "Logged out" });

    // Xóa cookie token & role
    res.cookies.set("token", "", {
      httpOnly: true,
      path: "/",
      expires: new Date(0),
    });
    res.cookies.set("role", "", {
      httpOnly: true,
      path: "/",
      expires: new Date(0),
    });

    return res;
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { success: false, message: "Logout failed" },
      { status: 500 }
    );
  }
}
