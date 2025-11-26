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
          rawResponse: errorText.substring(0, 500), // Include raw response for debugging
        });
        
        // Provide more descriptive error messages based on status code
        let userFriendlyMessage = errorMessage;
        if (response.status === 404) {
          userFriendlyMessage = `Resource not found: ${errorMessage}`;
        } else if (response.status === 401) {
          userFriendlyMessage = `Authentication required: ${errorMessage}`;
        } else if (response.status === 403) {
          userFriendlyMessage = `Access forbidden: ${errorMessage}`;
        } else if (response.status === 500) {
          userFriendlyMessage = `Server error: ${errorMessage}`;
        } else if (response.status >= 400 && response.status < 500) {
          userFriendlyMessage = `Client error (${response.status}): ${errorMessage}`;
        } else if (response.status >= 500) {
          userFriendlyMessage = `Server error (${response.status}): ${errorMessage}`;
        }
        
        throw new Error(userFriendlyMessage);
      }

      // Handle empty response body (common for DELETE operations)
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        try {
          const data = await response.json();
          return data;
        } catch (jsonError) {
          // If JSON parsing fails but response was ok, return a success indicator
          console.warn(`JSON parsing failed for successful response [${endpoint}]:`, jsonError);
          return { 
            code: response.status, 
            message: 'Operation completed successfully',
            data: null as T
          };
        }
      } else {
        // For non-JSON responses (e.g., plain text or empty), return success
        const textData = await response.text();
        return { 
          code: response.status,
          message: textData || 'Operation completed successfully',
          data: textData as T
        };
      }
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
    // Note: Do NOT set Content-Type header - browser will automatically set it with boundary for FormData

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: formData,
      });

      if (!response.ok) {
        // Try to get detailed error information
        let errorData: any = {};
        let errorText = '';
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
        let errorMessage = errorData.message || errorData.Message || errorData.title || errorText || `HTTP error! status: ${response.status}`;
        
        // Add details if available
        if (errorData.details) {
          errorMessage += `\n\nDetails: ${errorData.details}`;
        }
        
        // Add data field if it contains error info
        if (errorData.data && typeof errorData.data === 'string') {
          errorMessage += `\n\nAdditional info: ${errorData.data}`;
        }
        
        // Common database errors - provide helpful messages
        if (errorMessage.includes('saving the entity changes')) {
          errorMessage = 'Database error: ' + errorMessage + 
            '\n\nPossible causes:\n' +
            '- Invalid Semester ID or Major ID\n' +
            '- Duplicate data (student/group already exists)\n' +
            '- Missing required fields in Excel file\n' +
            '- Foreign key constraint violation';
        }
        
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

