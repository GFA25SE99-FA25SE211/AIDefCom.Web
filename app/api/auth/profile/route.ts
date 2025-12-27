import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtDecode } from "jwt-decode";
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
    const { fullName, phoneNumber } = body;

    // Decode token to get user ID
    const decoded: any = jwtDecode(token);
    const userId =
      decoded.sub ||
      decoded.id ||
      decoded[
        "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"
      ] ||
      decoded["http://schemas.microsoft.com/identity/claims/objectidentifier"];

    if (!userId) {
      return NextResponse.json(
        { message: "Could not determine user ID" },
        { status: 400 }
      );
    }

    // Get current user email from token
    const email =
      decoded.email ||
      decoded[
        "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress"
      ];

    // Call backend API to update user
    const backendRes = await fetch(
      `${BACKEND_API_URL}/api/auth/users/${userId}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
        body: JSON.stringify({
          fullName,
          email, // Required field
          phoneNumber,
        }),
      }
    );

    if (!backendRes.ok) {
      const errorData = await backendRes.json().catch(() => ({}));
      return NextResponse.json(
        {
          message:
            errorData.message ||
            errorData.Message ||
            "Failed to update profile",
        },
        { status: backendRes.status }
      );
    }

    const data = await backendRes.json().catch(() => ({}));

    return NextResponse.json({
      message: "Profile updated successfully",
      user: data.data || data,
    });
  } catch (error) {
    console.error("Error in /api/auth/profile:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
