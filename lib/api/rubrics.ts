import { apiClient } from './client';
import type {
  RubricDto,
  RubricCreateDto,
  RubricUpdateDto,
} from '@/lib/models';
import { majorRubricsApi } from './major-rubrics';

export const rubricsApi = {
  getAll: async () => {
    return apiClient.get<RubricDto[]>('/api/rubrics');
  },

  getById: async (id: number) => {
    return apiClient.get<RubricDto>(`/api/rubrics/${id}`);
  },

  // Get rubrics by major ID
  getByMajorId: async (majorId: number) => {
    try {
      const majorRubricsRes = await majorRubricsApi.getByMajorId(majorId);
      const majorRubrics = majorRubricsRes.data || [];
      // Extract rubrics from major-rubric relationships
      const rubrics: RubricDto[] = majorRubrics
        .map((mr) => mr.rubric)
        .filter((r): r is RubricDto => r !== undefined);
      return { data: rubrics };
    } catch (error) {
      console.error('Error fetching rubrics by major:', error);
      return { data: [] };
    }
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

