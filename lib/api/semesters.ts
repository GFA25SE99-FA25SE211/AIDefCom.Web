import { apiClient } from './client';
import type {
  SemesterDto,
  SemesterCreateDto,
  SemesterUpdateDto,
} from '@/lib/models';

export const semestersApi = {
  getAll: async (includeDeleted: boolean = false) => {
    return apiClient.get<SemesterDto[]>(`/api/semesters?includeDeleted=${includeDeleted}`);
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

  restore: async (id: number) => {
    return apiClient.put(`/api/semesters/${id}/restore`, {});
  },

  // Check if semester name exists for a major (duplicate check)
  checkNameExists: async (semesterName: string, majorId: number): Promise<boolean> => {
    try {
      const semesters = await semestersApi.getByMajorId(majorId);
      return (semesters.data || []).some(
        (semester) => semester.semesterName?.toLowerCase() === semesterName.trim().toLowerCase()
      );
    } catch (error) {
      console.error('Error checking semester name:', error);
      return false;
    }
  },
};

