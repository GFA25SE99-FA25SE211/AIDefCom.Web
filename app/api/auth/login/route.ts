import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    // Giả lập kiểm tra tài khoản (thêm administrator, moderator, member)
    let role = "";
    if (email === "chair@fpt.edu.vn" && password === "123456") {
      role = "chair";
    } else if (email === "secretary@fpt.edu.vn" && password === "123456") {
      role = "secretary";
    } else if (email === "admin@fpt.edu.vn" && password === "123456") {
      role = "administrator";
    } else if (email === "moderator@fpt.edu.vn" && password === "123456") {
      role = "moderator";
    } else if (email === "member@fpt.edu.vn" && password === "123456") {
      role = "member";
    } else {
      return NextResponse.json(
        { success: false, message: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Tạo phản hồi + set cookie
    const res = NextResponse.json({
      success: true,
      role,
      message: "Login successful",
    });

    const secure = process.env.NODE_ENV === "production";
    const maxAge = 60 * 60 * 24 * 7; // 7 days

    res.cookies.set("token", "mock-token", {
      httpOnly: true,
      sameSite: "lax",
      secure,
      path: "/",
      maxAge,
    });

    res.cookies.set("role", role, {
      httpOnly: true,
      sameSite: "lax",
      secure,
      path: "/",
      maxAge,
    });

    return res;
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { success: false, message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
