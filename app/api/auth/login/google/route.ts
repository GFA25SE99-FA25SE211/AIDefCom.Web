import { NextResponse } from "next/server";
import { jwtDecode } from "jwt-decode";

export async function POST(req: Request) {
  try {
    const { token } = await req.json();

    const backendRes = await fetch(
      "https://aidefcomapi.azurewebsites.net/api/auth/login/google",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      }
    );

    const text = await backendRes.text();
    const data = JSON.parse(text);

    if (!backendRes.ok) {
      return NextResponse.json(data, { status: backendRes.status });
    }

    const decoded: any = jwtDecode(data.accessToken);

    const role =
      decoded[
        "http://schemas.microsoft.com/ws/2008/06/identity/claims/role"
      ]?.toLowerCase() || "member";

    const res = NextResponse.json({ role });

    res.cookies.set("token", data.accessToken, { httpOnly: true, path: "/" });
    res.cookies.set("role", role, { httpOnly: true, path: "/" });

    return res;
  } catch (err) {
    console.error("Google login error:", err);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
