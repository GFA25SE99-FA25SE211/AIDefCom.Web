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

      const user = {
        id: "8EB5D9FB-4389-4587-A7AE-23AFBAF461CE",
        email: "lecturer1@university.edu",
        fullName: "PGS.TS Le Van Chien",
        roles: ["Chair"],
        role: "Chair",
      };

      const res = NextResponse.json({ role, user });

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

    const API_BASE_URL =
      process.env.NEXT_PUBLIC_API_BASE_URL ||
      "https://aidefcomapi.azurewebsites.net";

    const backendRes = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
      cache: "no-store",
    });

    const text = await backendRes.text();
    let data: any;

    // Backend có thể trả HTML → cần kiểm tra JSON
    try {
      data = JSON.parse(text);
    } catch {
      console.error("❌ Backend returned non-JSON:", text);
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

    const rawRole =
      decoded["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"];

    let role = "member";

    if (typeof rawRole === "string") {
      role = rawRole.toLowerCase();
    } else if (Array.isArray(rawRole) && typeof rawRole[0] === "string") {
      role = rawRole[0].toLowerCase();
    }

    // USER EXTRACTION

    const userId =
      decoded.sub ||
      decoded.id ||
      decoded[
        "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"
      ] ||
      decoded["http://schemas.microsoft.com/identity/claims/objectidentifier"];

    if (!userId && !data?.data?.user) {
      console.error("❌ Cannot extract User ID from token:", decoded);
    }

    // Prioritize backend user data over JWT decoded values
    let user = data?.data?.user
      ? {
          ...data.data.user,
          roles: data.data.user.roles || [role],
          role: role,
        }
      : {
          id: userId,
          email: decoded.email || email,
          fullName: decoded.name || decoded.unique_name || email,
          roles: [role],
          role: role,
        };

    // If user doesn't have fullName or ID looks wrong, fetch from GET /api/auth/users
    if (!user.fullName || user.fullName === user.email || !data?.data?.user) {
      try {
        const userDetailsRes = await fetch(`${API_BASE_URL}/api/auth/users`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (userDetailsRes.ok) {
          const userDetailsData = await userDetailsRes.json();
          // Find current user in the list by email (most reliable)
          const currentUser = userDetailsData?.data?.find(
            (u: any) =>
              u.email?.toLowerCase() === (decoded.email || email)?.toLowerCase()
          );

          if (currentUser) {
            // Update user with correct data from database
            user.id = currentUser.id;
            user.fullName =
              currentUser.fullName || currentUser.name || user.fullName;
            console.log(
              `✅ User data fetched from database: ${user.id} (${user.fullName})`
            );
          }
        }
      } catch (error) {
        console.error("Failed to fetch user details:", error);
        // Continue with existing user data
      }
    }

    const res = NextResponse.json({ role, user });

    // Lưu cookie giống backend
    res.cookies.set("token", token, { httpOnly: true, path: "/" });
    res.cookies.set("role", role, { httpOnly: true, path: "/" });

    return res;
  } catch (err) {
    console.error("❌ ERROR:", err);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
