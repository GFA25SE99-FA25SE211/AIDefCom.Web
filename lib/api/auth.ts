import { apiClient } from './client';
import type {
  LoginDto,
  CreateAccountDto,
  UserDto,
} from '@/lib/models';

export const authApi = {
  login: async (data: LoginDto) => {
    return apiClient.post<{ token: string; refreshToken: string; user: UserDto }>('/api/auth/login', data);
  },

  createAccount: async (data: CreateAccountDto) => {
    return apiClient.post<UserDto>('/api/auth/create-account', data);
  },

  getAllUsers: async () => {
    return apiClient.get<UserDto[]>('/api/auth/users');
  },

  getUserById: async (id: string) => {
    return apiClient.get<UserDto>(`/api/auth/users/${id}`);
  },

  assignRole: async (email: string, role: string) => {
    return apiClient.put('/api/auth/roles/assign', { email, role });
  },

  softDeleteAccount: async (email: string) => {
    return apiClient.delete(`/api/auth/accounts/${email}`);
  },

  restoreAccount: async (email: string) => {
    return apiClient.put(`/api/auth/accounts/${email}/restore`);
  },
};

