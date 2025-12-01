import { apiClient } from './client';
import type { RubricDto } from '@/lib/models';

export interface MajorRubricReadDto {
  id: number;
  majorId: number;
  rubricId: number;
  rubric?: RubricDto;
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

