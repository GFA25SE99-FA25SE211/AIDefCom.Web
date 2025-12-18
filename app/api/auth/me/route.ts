import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { jwtDecode } from "jwt-decode";
import { BACKEND_API_URL } from "@/lib/config/api-urls";

export async function GET(request: Request) {
  try {
    // Lấy token từ Authorization header (Bearer token)
    const authHeader = request.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!token) {
      return NextResponse.json(
        { message: "Not authenticated" },
        { status: 401 }
      );
    }

    // Decode token to get user info
    const decoded: any = jwtDecode(token);

    // Extract user info from JWT claims
    const userId =
      decoded.sub ||
      decoded.id ||
      decoded[
        "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"
      ] ||
      decoded["http://schemas.microsoft.com/identity/claims/objectidentifier"];

    const email =
      decoded.email ||
      decoded[
        "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress"
      ];

    const name =
      decoded.name ||
      decoded.unique_name ||
      decoded["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"];

    let roleClaim =
      decoded["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"];

    // If role is array, take first one
    if (Array.isArray(roleClaim)) {
      roleClaim = roleClaim[0];
    }

    const role = roleClaim || "member";

    // Try to fetch additional user info from backend (optional)
    let fullUserInfo = null;
    if (userId) {
      try {
        const backendRes = await fetch(
          `${BACKEND_API_URL}/api/auth/users/${userId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: "application/json",
            },
          }
        );

        if (backendRes.ok) {
          const data = await backendRes.json();
          fullUserInfo = data.data || data;
        }
      } catch (err) {
        // Ignore backend fetch errors, use JWT info
        console.warn("Could not fetch additional user info:", err);
      }
    }

    const user = fullUserInfo || {
      id: userId,
      email: email,
      fullName: name,
      userName: name,
      role: role,
      roles: Array.isArray(roleClaim) ? roleClaim : [role],
    };

    return NextResponse.json({ user });
  } catch (error) {
    console.error("Error in /api/auth/me:", error);
    return NextResponse.json(
      { message: "Failed to get user info" },
      { status: 500 }
    );
  }
}
