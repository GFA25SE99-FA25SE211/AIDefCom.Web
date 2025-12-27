import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { BACKEND_API_URL } from "@/lib/config/api-urls";

export async function PUT(request: Request) {
  try {
    // Try to get token from Authorization header first, then fall back to cookie
    const authHeader = request.headers.get("Authorization");
    let token: string | undefined;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7); // Remove "Bearer " prefix
    } else {
      const cookieStore = await cookies();
      token = cookieStore.get("token")?.value;
    }

    if (!token) {
      return NextResponse.json(
        { message: "Not authenticated" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { message: "Current password and new password are required" },
        { status: 400 }
      );
    }

    // Call backend API to change password
    const backendRes = await fetch(`${BACKEND_API_URL}/api/auth/password`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      body: JSON.stringify({
        currentPassword,
        newPassword,
        confirmNewPassword: newPassword, // Backend requires this field
      }),
    });

    if (!backendRes.ok) {
      const errorData = await backendRes.json().catch(() => ({}));
      return NextResponse.json(
        {
          message:
            errorData.message ||
            errorData.Message ||
            "Failed to change password",
        },
        { status: backendRes.status }
      );
    }

    return NextResponse.json({ message: "Password changed successfully" });
  } catch (error) {
    console.error("Error in /api/auth/password:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
