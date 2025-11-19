// API Client for AIDefCom Backend
import type { ApiResponse } from '@/lib/models';
import { env } from '@/lib/config';

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || env.apiUrl;
  }

  private async getToken(): Promise<string | null> {
    if (typeof window === 'undefined') return null;
    // Try to get token from cookies or localStorage
    const cookies = document.cookie.split(';');
    const tokenCookie = cookies.find(c => c.trim().startsWith('token='));
    if (tokenCookie) {
      return tokenCookie.split('=')[1];
    }
    return localStorage.getItem('token');
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const token = await this.getToken();
    const url = `${this.baseUrl}${endpoint}`;

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token && typeof headers === 'object' && headers !== null) {
      // TypeScript: HeadersInit can be Headers, string[][], or Record<string, string>
      // Only mutate if it's a plain object (Record<string, string>)
      (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (!response.ok) {
        // Try to get error details from response
        let errorData: any = {};
        let errorText = '';
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
        if (errorText.includes('LocalDB') || errorText.includes('PlatformNotSupported')) {
          const errorMessage = 'Database connection error: LocalDB is not supported on macOS. Please configure SQL Server connection string in appsettings.json';
          console.error(`API Error [${endpoint}]:`, {
            status: response.status,
            statusText: response.statusText,
            error: errorText.substring(0, 500), // First 500 chars
            url,
            suggestion: 'Configure database connection string for macOS (use SQL Server or SQLite)',
          });
          throw new Error(errorMessage);
        }
        
        const errorMessage = errorData.message || errorData.Message || errorText.substring(0, 200) || `HTTP error! status: ${response.status}`;
        console.error(`API Error [${endpoint}]:`, {
          status: response.status,
          statusText: response.statusText,
          error: errorData,
          url,
        });
        throw new Error(errorMessage);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`API Error [${endpoint}]:`, error);
      // Re-throw with more context if it's a network error
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        throw new Error(`Network error: Cannot connect to API at ${url}. Make sure the backend is running.`);
      }
      throw error;
    }
  }

  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async put<T>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  async postFormData<T>(endpoint: string, formData: FormData): Promise<ApiResponse<T>> {
    const token = await this.getToken();
    const url = `${this.baseUrl}${endpoint}`;

    const headers: HeadersInit = {};
    if (token && typeof headers === 'object' && headers !== null) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`API Error [${endpoint}]:`, error);
      throw error;
    }
  }
}

export const apiClient = new ApiClient();

