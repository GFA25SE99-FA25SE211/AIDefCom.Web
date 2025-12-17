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

  // Check if topic title (EN) exists (duplicate check)
  checkTopicENExists: async (topicEN: string): Promise<boolean> => {
    try {
      const allGroups = await groupsApi.getAll();
      return (allGroups.data || []).some(
        (group) => 
          (group.topicTitle_EN?.toLowerCase() === topicEN.trim().toLowerCase()) ||
          (group.projectTitle?.toLowerCase() === topicEN.trim().toLowerCase())
      );
    } catch (error) {
      console.error('Error checking topic EN:', error);
      return false;
    }
  },

  // Check if topic title (VN) exists (duplicate check)
  checkTopicVNExists: async (topicVN: string): Promise<boolean> => {
    try {
      const allGroups = await groupsApi.getAll();
      return (allGroups.data || []).some(
        (group) => 
          (group.topicTitle_VN?.toLowerCase() === topicVN.trim().toLowerCase()) ||
          (group.projectTitle?.toLowerCase() === topicVN.trim().toLowerCase())
      );
    } catch (error) {
      console.error('Error checking topic VN:', error);
      return false;
    }
  },
};

