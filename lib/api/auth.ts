import { apiClient } from "./client";
import type {
  LoginDto,
  CreateAccountDto,
  UserDto,
  UpdateAccountDto,
} from "@/lib/models";

export const authApi = {
  login: async (data: LoginDto) => {
    return apiClient.post<{
      token: string;
      refreshToken: string;
      user: UserDto;
    }>("/api/auth/login", data);
  },

  createAccount: async (data: CreateAccountDto) => {
    return apiClient.post<UserDto>("/api/auth/create-account", data);
  },

  getAllUsers: async () => {
    return apiClient.get<UserDto[]>("/api/auth/users");
  },

  getUserById: async (id: string) => {
    return apiClient.get<UserDto>(`/api/auth/users/${id}`);
  },

  assignRole: async (email: string, role: string) => {
    return apiClient.put("/api/auth/roles/assign", { email, role });
  },

  updateAccount: async (id: string, data: UpdateAccountDto) => {
    return apiClient.put<UserDto>(`/api/auth/users/${id}`, data);
  },

  softDeleteAccount: async (email: string) => {
    // URL encode the email to handle special characters
    const encodedEmail = encodeURIComponent(email);
    return apiClient.delete(`/api/auth/accounts/${encodedEmail}`);
  },

  restoreAccount: async (email: string) => {
    return apiClient.put(`/api/auth/accounts/${email}/restore`);
  },

  changePassword: async (data: {
    currentPassword: string;
    newPassword: string;
  }) => {
    // Use local proxy route to ensure token is passed from server-side cookies
    const response = await fetch("/api/auth/password", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || "Failed to change password");
    }

    return response.json();
  },

  // Check if email exists (duplicate check)
  checkEmailExists: async (email: string): Promise<boolean> => {
    try {
      const allUsers = await authApi.getAllUsers();
      return (allUsers.data || []).some(
        (user) => user.email?.toLowerCase() === email.trim().toLowerCase()
      );
    } catch (error) {
      console.error('Error checking email:', error);
      return false;
    }
  },
};
