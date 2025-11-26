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
    if (typeof window === 'undefined') {
      return { userId: null, email: null, name: null, role: null };
    }

    try {
      // Try to get token from cookies
      const cookies = document.cookie.split(';');
      const tokenCookie = cookies.find(c => c.trim().startsWith('token='));
      
      if (!tokenCookie) {
        return { userId: null, email: null, name: null, role: null };
      }

      const token = tokenCookie.split('=')[1];
      
      if (!token || token === 'dummy-token-chair') {
        // Handle hardcoded chair case or no token
        const roleCookie = cookies.find(c => c.trim().startsWith('role='));
        const role = roleCookie ? roleCookie.split('=')[1] : null;
        
        if (role === 'chair') {
          // For hardcoded chair, return a valid lecturer ID from database
          return {
            userId: '0EB5D9FB-4389-45B7-A7AE-23AFBAF461CE', // PGS.TS Lê Văn Chiến
            email: 'chair@fpt.edu.vn',
            name: 'Chair User',
            role: 'chair'
          };
        }
        
        return { userId: null, email: null, name: null, role: null };
      }

      // Decode JWT token
      const decoded = jwtDecode<TokenPayload>(token);

      return {
        userId: decoded["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"] || null,
        email: decoded["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress"] || null,
        name: decoded["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"] || null,
        role: decoded["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"] || null,
      };
    } catch (error) {
      console.error('Error decoding token:', error);
      return { userId: null, email: null, name: null, role: null };
    }
  },

  getCurrentUserId: (): string | null => {
    return authUtils.getCurrentUserInfo().userId;
  },

  isAuthenticated: (): boolean => {
    return authUtils.getCurrentUserId() !== null;
  }
};