import { jwtDecode } from "jwt-decode";

interface TokenPayload {
  [key: string]: any;
  "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"?: string;
  "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"?: string;
  "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress"?: string;
  "http://schemas.microsoft.com/ws/2008/06/identity/claims/role"?: string;
}

export const authUtils = {
  getCurrentUserInfo: (): {
    userId: string | null;
    email: string | null;
    name: string | null;
    role: string | null;
  } => {
    if (typeof window === "undefined") {
      return { userId: null, email: null, name: null, role: null };
    }

    try {
      // Get accessToken from localStorage
      const token = localStorage.getItem("accessToken");

      if (!token) {
        return { userId: null, email: null, name: null, role: null };
      }

      if (token === "dummy-token-chair") {
        // Handle hardcoded chair case
        return {
          userId: "0EB5D9FB-4389-45B7-A7AE-23AFBAF461CE", // PGS.TS Lê Văn Chiến
          email: "chair@fpt.edu.vn",
          name: "Chair User",
          role: "chair",
        };
      }

      // Decode JWT token
      const decoded = jwtDecode<TokenPayload>(token);

      // Handle role that could be string or array
      let role =
        decoded["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"];
      if (Array.isArray(role)) {
        role = role[0];
      }

      return {
        userId:
          decoded[
            "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"
          ] ||
          decoded.sub ||
          null,
        email:
          decoded[
            "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress"
          ] ||
          decoded.email ||
          null,
        name:
          decoded[
            "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"
          ] ||
          decoded.name ||
          null,
        role: role?.toLowerCase() || null,
      };
    } catch (error) {
      console.error("Error decoding token:", error);
      return { userId: null, email: null, name: null, role: null };
    }
  },

  getCurrentUserId: (): string | null => {
    return authUtils.getCurrentUserInfo().userId;
  },

  isAuthenticated: (): boolean => {
    return authUtils.getCurrentUserId() !== null;
  },
};
