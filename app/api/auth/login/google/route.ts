import { NextResponse } from "next/server";
import { jwtDecode } from "jwt-decode";
import { BACKEND_API_URL } from "@/lib/config/api-urls";

export async function POST(req: Request) {
  try {
    const { token } = await req.json();

    const API_BASE_URL =
      process.env.NEXT_PUBLIC_API_BASE_URL || BACKEND_API_URL;

    console.log(
      "🔵 Calling backend Google login API:",
      `${API_BASE_URL}/api/auth/login/google`
    );

    const backendRes = await fetch(
      `${API_BASE_URL}/api/auth/login/google/lecturer`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
        cache: "no-store",
      }
    );

    const text = await backendRes.text();
    let data: any;

    try {
      data = JSON.parse(text);
    } catch {
      console.error("❌ Backend trả HTML:", text);
      return NextResponse.json(
        { message: "Invalid backend JSON", raw: text },
        { status: 500 }
      );
    }

    if (!backendRes.ok) {
      console.error("❌ Backend error:", data);

      // Check if user is not registered (404 or specific message)
      if (
        backendRes.status === 404 ||
        (data?.message && data.message.toLowerCase().includes("not found")) ||
        (data?.message && data.message.toLowerCase().includes("registered"))
      ) {
        return NextResponse.json(
          {
            message:
              "Email is not registered in the system. Please contact administrator to create an account",
          },
          { status: 404 }
        );
      }

      return NextResponse.json(data, { status: backendRes.status });
    }

    const accessToken = data?.data?.accessToken;

    if (!accessToken || typeof accessToken !== "string") {
      return NextResponse.json(
        { message: "Invalid accessToken from backend", data },
        { status: 500 }
      );
    }

    const decoded: any = jwtDecode(accessToken);
    console.log("🔵 Decoded JWT:", JSON.stringify(decoded, null, 2));

    let roleClaim =
      decoded["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"];

    // Nếu role là array nhiều role, lấy role đầu tiên
    if (Array.isArray(roleClaim)) {
      roleClaim = roleClaim[0];
    }

    const role = (roleClaim || "member").toLowerCase();
    console.log("🔵 User role extracted:", role);

    const userId =
      decoded.sub ||
      decoded.id ||
      decoded[
        "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"
      ] ||
      decoded["http://schemas.microsoft.com/identity/claims/objectidentifier"];

    // Extract user info
    const user = data?.data?.user || {
      id: userId,
      email: decoded.email,
      fullName: decoded.name || decoded.unique_name || decoded.email,
      roles: [role],
      role: role,
    };

    const res = NextResponse.json({ role, user });

    res.cookies.set("token", accessToken, { httpOnly: true, path: "/" });
    res.cookies.set("role", role, { httpOnly: true, path: "/" });

    return res;
  } catch (err) {
    console.error("❌ Google login error:", err);
    return NextResponse.json(
      { message: "Internal Server Error", error: String(err) },
      { status: 500 }
    );
  }
}
