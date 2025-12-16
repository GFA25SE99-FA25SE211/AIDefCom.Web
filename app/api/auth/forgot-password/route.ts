import { NextResponse } from "next/server";
import { BACKEND_API_URL } from "@/lib/config/api-urls";

// Ignore SSL errors for localhost testing if needed
if (process.env.NODE_ENV === "development") {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || BACKEND_API_URL;

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { message: "Email is required" },
        { status: 400 }
      );
    }

    const origin = request.headers.get("origin") || "http://localhost:3000";

    // Use the environment variable for the API URL
    const res = await fetch(`${API_BASE_URL}/api/auth/password/forgot`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        accept: "*/*",
        Origin: origin,
        Referer: `${origin}/forgot-password`,
      },
      body: JSON.stringify({
        email,
        clientUri: "https://aidefcom.io.vn/reset-password",
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      // Check for "User not found" error from backend
      let errorMessage = data.message || "Failed to send reset email";

      if (
        data.details?.toLowerCase().includes("user not found") ||
        data.message?.toLowerCase().includes("user not found") ||
        data.details?.toLowerCase().includes("not found")
      ) {
        errorMessage =
          "This email address is not registered in our system. Please check and try again.";
      }

      return NextResponse.json(
        { message: errorMessage },
        { status: res.status }
      );
    }

    return NextResponse.json(
      { message: "Password reset email sent" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
