import { apiClient } from './client';
import type { RubricDto } from '@/lib/models';

export interface MajorRubricReadDto {
  id: number;
  majorId: number;
  majorName?: string;
  rubricId: number;
  rubricName?: string;
  // Note: Backend returns RubricId and RubricName, not full Rubric object
  // To get full Rubric info, call rubricsApi.getById(rubricId)
}

export const majorRubricsApi = {
  getAll: async (includeDeleted: boolean = false) => {
    return apiClient.get<MajorRubricReadDto[]>(`/api/major-rubrics?includeDeleted=${includeDeleted}`);
  },

  getByMajorId: async (majorId: number) => {
    return apiClient.get<MajorRubricReadDto[]>(`/api/major-rubrics/major/${majorId}`);
  },

  getByRubricId: async (rubricId: number) => {
    return apiClient.get<MajorRubricReadDto[]>(`/api/major-rubrics/rubric/${rubricId}`);
  },
};


