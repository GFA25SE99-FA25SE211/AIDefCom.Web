// API Client for AIDefCom Backend
import type { ApiResponse } from "@/lib/models";
import { env } from "@/lib/config";

class ApiClient {
  private baseUrl: string;
  private isRefreshing: boolean = false;
  private refreshPromise: Promise<boolean> | null = null;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || env.apiUrl;
  }

  private async getToken(): Promise<string | null> {
    if (typeof window === "undefined") return null;
    // Get accessToken from localStorage
    return localStorage.getItem("accessToken");
  }

  private async getRefreshToken(): Promise<string | null> {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("refreshToken");
  }

  private async getUserId(): Promise<string | null> {
    if (typeof window === "undefined") return null;
    try {
      const token = localStorage.getItem("accessToken");
      if (!token) return null;
      // Decode JWT to get userId
      const payload = JSON.parse(atob(token.split(".")[1]));
      return (
        payload[
          "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"
        ] ||
        payload.sub ||
        payload.userId ||
        null
      );
    } catch {
      return null;
    }
  }

  // Refresh the access token using refresh token
  private async refreshAccessToken(): Promise<boolean> {
    // Prevent multiple simultaneous refresh calls
    if (this.isRefreshing && this.refreshPromise) {
      return this.refreshPromise;
    }

    this.isRefreshing = true;
    this.refreshPromise = this.doRefreshToken();

    try {
      const result = await this.refreshPromise;
      return result;
    } finally {
      this.isRefreshing = false;
      this.refreshPromise = null;
    }
  }

  private async doRefreshToken(): Promise<boolean> {
    try {
      const refreshToken = await this.getRefreshToken();
      const userId = await this.getUserId();

      if (!refreshToken || !userId) {
        console.warn("No refresh token or userId available");
        return false;
      }

      const response = await fetch(`${this.baseUrl}/api/auth/refresh-token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, refreshToken }),
      });

      if (!response.ok) {
        console.error("Refresh token failed:", response.status);
        // Clear tokens and redirect to login
        this.clearTokensAndRedirect();
        return false;
      }

      const data = await response.json();

      if (data?.data?.accessToken) {
        localStorage.setItem("accessToken", data.data.accessToken);
        if (data.data.refreshToken) {
          localStorage.setItem("refreshToken", data.data.refreshToken);
        }
        console.log("Token refreshed successfully");
        return true;
      }

      return false;
    } catch (error) {
      console.error("Error refreshing token:", error);
      this.clearTokensAndRedirect();
      return false;
    }
  }

  private clearTokensAndRedirect(): void {
    if (typeof window !== "undefined") {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      // Redirect to login page
      window.location.href = "/login";
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    isRetry: boolean = false
  ): Promise<ApiResponse<T>> {
    const token = await this.getToken();
    const url = `${this.baseUrl}${endpoint}`;

    const headers: HeadersInit = {
      "Content-Type": "application/json",
      ...options.headers,
    };

    if (token && typeof headers === "object" && headers !== null) {
      // TypeScript: HeadersInit can be Headers, string[][], or Record<string, string>
      // Only mutate if it's a plain object (Record<string, string>)
      (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      // Handle 401 - Try to refresh token and retry (only once)
      if (response.status === 401 && !isRetry) {
        console.log("Access token expired, attempting to refresh...");
        const refreshed = await this.refreshAccessToken();

        if (refreshed) {
          // Retry the original request with new token
          return this.request<T>(endpoint, options, true);
        }
        // If refresh failed, clearTokensAndRedirect was called in refreshAccessToken
      }

      if (!response.ok) {
        // Try to get error details from response
        let errorData: any = {};
        let errorText = "";
        try {
          errorText = await response.text();
          if (errorText) {
            try {
              errorData = JSON.parse(errorText);
            } catch (e) {
              // If not JSON, use text as message
              errorData = { message: errorText };
            }
          }
        } catch (e) {
          // If parsing fails, use empty object
        }

        // Check for database connection errors
        if (
          errorText.includes("LocalDB") ||
          errorText.includes("PlatformNotSupported")
        ) {
          const errorMessage =
            "Database connection error: LocalDB is not supported on macOS. Please configure SQL Server connection string in appsettings.json";
          console.error(`API Error [${endpoint}]:`, {
            status: response.status,
            statusText: response.statusText,
            error: errorText.substring(0, 500), // First 500 chars
            url,
            suggestion:
              "Configure database connection string for macOS (use SQL Server or SQLite)",
          });
          throw new Error(errorMessage);
        }

        const errorMessage =
          errorData.message ||
          errorData.Message ||
          errorText.substring(0, 200) ||
          `HTTP error! status: ${response.status}`;

        // Check if this is an expected error (403, 404) that should be handled silently
        const isExpectedError = response.status === 403 || response.status === 404;
        
        // Provide concise error messages based on status code
        let userFriendlyMessage = errorMessage;
        if (response.status === 404) {
          userFriendlyMessage = "Item not found";
        } else if (response.status === 401) {
          userFriendlyMessage = "Session expired. Please login again";
        } else if (response.status === 403) {
          userFriendlyMessage =
            "You do not have permission to perform this action";
        } else if (response.status === 500) {
          userFriendlyMessage = "Server error";
        } else if (response.status >= 400) {
          userFriendlyMessage =
            errorMessage.substring(0, 50) || "Request failed";
        }

        // For expected errors (403, 404), return a response object instead of throwing
        // This prevents Next.js from logging the error
        if (isExpectedError) {
          return {
            code: response.status,
            message: userFriendlyMessage,
            data: null as T,
          } as ApiResponse<T>;
        }

        // Only log unexpected errors (not 403/404 which are common permission/resource errors)
        console.error(`API Error [${endpoint}]:`, {
          status: response.status,
          statusText: response.statusText,
          error: errorData,
          url,
          rawResponse: errorText.substring(0, 500),
        });

        // For unexpected errors, throw normally
        const enrichedError = new Error(userFriendlyMessage);
        (enrichedError as any).status = response.status;
        (enrichedError as any).errorData = errorData;
        (enrichedError as any).isExpectedError = false;
        throw enrichedError;
      }

      // Handle empty response body (common for DELETE operations)
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        try {
          const data = await response.json();
          return data;
        } catch (jsonError) {
          // If JSON parsing fails but response was ok, return a success indicator
          console.warn(
            `JSON parsing failed for successful response [${endpoint}]:`,
            jsonError
          );
          return {
            code: response.status,
            message: "Operation completed successfully",
            data: null as T,
          };
        }
      } else {
        // For non-JSON responses (e.g., plain text or empty), return success
        const textData = await response.text();
        return {
          code: response.status,
          message: textData || "Operation completed successfully",
          data: textData as T,
        };
      }
    } catch (error) {
      console.error(`API Error [${endpoint}]:`, error);
      // Re-throw with more context if it's a network error
      if (
        error instanceof TypeError &&
        (error.message === "Failed to fetch" || error.message.includes("fetch"))
      ) {
        const errorMessage = `Network error: Cannot connect to API at ${url}. 
        
Possible causes:
- Backend server is not running
- CORS is not configured correctly
- Network connectivity issues
- Invalid API URL

Please check:
1. Is the backend server running?
2. Is the API URL correct? (Current: ${this.baseUrl})
3. Are CORS settings configured in the backend?`;

        console.error("Network Error Details:", {
          endpoint,
          url,
          baseUrl: this.baseUrl,
          error: error.message,
          stack: error instanceof Error ? error.stack : undefined,
        });

        const networkError = new Error(errorMessage);
        (networkError as any).isNetworkError = true;
        (networkError as any).url = url;
        (networkError as any).baseUrl = this.baseUrl;
        (networkError as any).originalError = error;
        throw networkError;
      }
      throw error;
    }
  }

  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: "GET" });
  }

  async post<T>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async put<T>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: "DELETE" });
  }

  async postFormData<T>(
    endpoint: string,
    formData: FormData
  ): Promise<ApiResponse<T>> {
    const token = await this.getToken();
    const url = `${this.baseUrl}${endpoint}`;

    const headers: HeadersInit = {};
    if (token && typeof headers === "object" && headers !== null) {
      (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
    }
    // Note: Do NOT set Content-Type header - browser will automatically set it with boundary for FormData

    try {
      const response = await fetch(url, {
        method: "POST",
        headers,
        body: formData,
      });

      if (!response.ok) {
        // Try to get detailed error information
        let errorData: any = {};
        let errorText = "";
        try {
          errorText = await response.text();
          if (errorText) {
            try {
              errorData = JSON.parse(errorText);
            } catch (e) {
              errorData = { message: errorText };
            }
          }
        } catch (e) {
          errorData = { message: `HTTP error! status: ${response.status}` };
        }

        // Build comprehensive error message
        let errorMessage =
          errorData.message ||
          errorData.Message ||
          errorData.title ||
          errorText ||
          `HTTP error! status: ${response.status}`;

        // Simplify database errors to be more concise
        if (errorMessage.includes("saving the entity changes")) {
          errorMessage = "Database error - check your data";
        } else if (errorMessage.includes("constraint")) {
          errorMessage = "Data conflict detected";
        } else if (errorMessage.includes("duplicate")) {
          errorMessage = "Duplicate data found";
        }

        // Keep error messages short - only use first 50 characters
        errorMessage = errorMessage.substring(0, 50);

        console.error(`API FormData Error [${endpoint}]:`, {
          status: response.status,
          statusText: response.statusText,
          error: errorData,
          url,
          fullResponse: errorText,
        });

        // Create error object with full details
        const error = new Error(errorMessage);
        (error as any).errorData = errorData;
        (error as any).status = response.status;
        throw error;
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`API FormData Error [${endpoint}]:`, error);
      throw error;
    }
  }
}

export const apiClient = new ApiClient();
