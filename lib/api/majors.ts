import { apiClient } from './client';
import type {
  MajorDto,
  MajorCreateDto,
  MajorUpdateDto,
} from '@/lib/models';

export const majorsApi = {
  getAll: async () => {
    return apiClient.get<MajorDto[]>('/api/majors');
  },

  getById: async (id: number) => {
    return apiClient.get<MajorDto>(`/api/majors/${id}`);
  },

  create: async (data: MajorCreateDto) => {
    return apiClient.post<MajorDto>('/api/majors', data);
  },

  update: async (id: number, data: MajorUpdateDto) => {
    return apiClient.put(`/api/majors/${id}`, data);
  },

  delete: async (id: number) => {
    return apiClient.delete(`/api/majors/${id}`);
  },

  // Check if major name exists (duplicate check)
  checkNameExists: async (majorName: string): Promise<boolean> => {
    try {
      const allMajors = await majorsApi.getAll();
      return (allMajors.data || []).some(
        (major) => major.majorName?.toLowerCase() === majorName.trim().toLowerCase()
      );
    } catch (error) {
      console.error('Error checking major name:', error);
      return false;
    }
  },
};

