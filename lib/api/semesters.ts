import { apiClient } from './client';
import type {
  SemesterDto,
  SemesterCreateDto,
  SemesterUpdateDto,
} from '@/lib/models';

export const semestersApi = {
  getAll: async () => {
    return apiClient.get<SemesterDto[]>('/api/semesters');
  },

  getById: async (id: number) => {
    return apiClient.get<SemesterDto>(`/api/semesters/${id}`);
  },

  getByMajorId: async (majorId: number) => {
    return apiClient.get<SemesterDto[]>(`/api/semesters/major/${majorId}`);
  },

  create: async (data: SemesterCreateDto) => {
    return apiClient.post<SemesterDto>('/api/semesters', data);
  },

  update: async (id: number, data: SemesterUpdateDto) => {
    return apiClient.put(`/api/semesters/${id}`, data);
  },

  delete: async (id: number) => {
    return apiClient.delete(`/api/semesters/${id}`);
  },
};

