import { apiClient } from './client';
import type {
  RubricDto,
  RubricCreateDto,
  RubricUpdateDto,
} from '@/lib/models';

export const rubricsApi = {
  getAll: async () => {
    return apiClient.get<RubricDto[]>('/api/rubrics');
  },

  getById: async (id: number) => {
    return apiClient.get<RubricDto>(`/api/rubrics/${id}`);
  },

  create: async (data: RubricCreateDto) => {
    return apiClient.post<RubricDto>('/api/rubrics', data);
  },

  update: async (id: number, data: RubricUpdateDto) => {
    return apiClient.put(`/api/rubrics/${id}`, data);
  },

  delete: async (id: number) => {
    return apiClient.delete(`/api/rubrics/${id}`);
  },
};

