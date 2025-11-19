import { apiClient } from './client';
import type {
  CouncilDto,
  CouncilCreateDto,
  CouncilUpdateDto,
} from '@/lib/models';

export const councilsApi = {
  getAll: async (includeInactive: boolean = false) => {
    return apiClient.get<CouncilDto[]>(`/api/councils?includeInactive=${includeInactive}`);
  },

  getById: async (id: number) => {
    return apiClient.get<CouncilDto>(`/api/councils/${id}`);
  },

  create: async (data: CouncilCreateDto) => {
    return apiClient.post<CouncilDto>('/api/councils', data);
  },

  update: async (id: number, data: CouncilUpdateDto) => {
    return apiClient.put(`/api/councils/${id}`, data);
  },

  softDelete: async (id: number) => {
    return apiClient.delete(`/api/councils/${id}`);
  },

  restore: async (id: number) => {
    return apiClient.put(`/api/councils/${id}/restore`);
  },
};

