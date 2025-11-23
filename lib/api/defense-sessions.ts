import { apiClient } from './client';
import type {
  DefenseSessionDto,
  DefenseSessionCreateDto,
  DefenseSessionUpdateDto,
} from '@/lib/models';

export const defenseSessionsApi = {
  getAll: async () => {
    return apiClient.get<DefenseSessionDto[]>('/api/defense-sessions');
  },

  getById: async (id: number) => {
    return apiClient.get<DefenseSessionDto>(`/api/defense-sessions/${id}`);
  },

  getByGroupId: async (groupId: string) => {
    return apiClient.get<DefenseSessionDto[]>(`/api/defense-sessions/group/${groupId}`);
  },

  getUsersBySessionId: async (id: number) => {
    return apiClient.get<any[]>(`/api/defense-sessions/${id}/users`);
  },

  create: async (data: DefenseSessionCreateDto) => {
    return apiClient.post<DefenseSessionDto>('/api/defense-sessions', data);
  },

  update: async (id: number, data: DefenseSessionUpdateDto) => {
    return apiClient.put(`/api/defense-sessions/${id}`, data);
  },

  delete: async (id: number) => {
    return apiClient.delete(`/api/defense-sessions/${id}`);
  },
};

