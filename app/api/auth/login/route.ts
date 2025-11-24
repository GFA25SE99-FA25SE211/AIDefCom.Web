import { NextResponse } from "next/server";
import { jwtDecode } from "jwt-decode";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    // ============================
// HARDCODED CHAIR ACCOUNT
// ============================
if (email === "chair@fpt.edu.vn" && password === "123456") {
  const role = "chair";

  const res = NextResponse.json({ role });

  // Cookie giống backend
  res.cookies.set("token", "dummy-token-chair", {
    httpOnly: true,
    path: "/",
  });

  res.cookies.set("role", role, {
    httpOnly: true,
    path: "/",
  });

  return res;
}


    const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "https://aidefcomapi.azurewebsites.net";

    const backendRes = await fetch(
      `${API_BASE_URL}/api/auth/login`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
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
      return NextResponse.json(data, { status: backendRes.status });
    }

    const token = data?.data?.accessToken;

    if (!token || typeof token !== "string") {
      return NextResponse.json(
        { message: "Invalid accessToken from backend" },
        { status: 500 }
      );
    }

    const decoded: any = jwtDecode(token);

    const role =
      decoded[
        "http://schemas.microsoft.com/ws/2008/06/identity/claims/role"
      ]?.toLowerCase() || "member";

    const res = NextResponse.json({ role });

    res.cookies.set("token", token, { httpOnly: true, path: "/" });
    res.cookies.set("role", role, { httpOnly: true, path: "/" });

    return res;
  } catch (err) {
    console.error("❌ ERROR:", err);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
