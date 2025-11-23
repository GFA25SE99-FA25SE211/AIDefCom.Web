import { apiClient } from './client';
import type {
  GroupDto,
  GroupCreateDto,
  GroupUpdateDto,
} from '@/lib/models';

export const groupsApi = {
  getAll: async (includeDeleted: boolean = false) => {
    return apiClient.get<GroupDto[]>(`/api/groups?includeDeleted=${includeDeleted}`);
  },

  getById: async (id: string) => {
    return apiClient.get<GroupDto>(`/api/groups/${id}`);
  },

  getBySemesterId: async (semesterId: number) => {
    return apiClient.get<GroupDto[]>(`/api/groups/semester/${semesterId}`);
  },

  create: async (data: GroupCreateDto) => {
    return apiClient.post<GroupDto>('/api/groups', data);
  },

  update: async (id: string, data: GroupUpdateDto) => {
    return apiClient.put(`/api/groups/${id}`, data);
  },

  delete: async (id: string) => {
    return apiClient.delete(`/api/groups/${id}`);
  },

  restore: async (id: string) => {
    return apiClient.put(`/api/groups/${id}/restore`, {});
  },
};

