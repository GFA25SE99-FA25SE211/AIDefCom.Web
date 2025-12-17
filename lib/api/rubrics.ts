import { apiClient } from './client';
import type {
  RubricDto,
  RubricCreateDto,
  RubricUpdateDto,
} from '@/lib/models';
import { majorRubricsApi } from './major-rubrics';
import { projectTasksApi } from './project-tasks';

export const rubricsApi = {
  getAll: async () => {
    return apiClient.get<RubricDto[]>('/api/rubrics');
  },

  getById: async (id: number) => {
    return apiClient.get<RubricDto>(`/api/rubrics/${id}`);
  },

  // Get rubric name by ID (uses existing getById endpoint)
  getNameById: async (id: number) => {
    const rubric = await apiClient.get<RubricDto>(`/api/rubrics/${id}`);
    return {
      ...rubric,
      data: rubric.data?.rubricName || ''
    };
  },

  // Get rubric ID by name (uses existing project-tasks endpoint)
  getIdByName: async (rubricName: string) => {
    return projectTasksApi.getRubricIdByName(rubricName);
  },

  // Check if rubric name exists (duplicate check)
  checkNameExists: async (rubricName: string): Promise<boolean> => {
    try {
      await rubricsApi.getIdByName(rubricName);
      return true; // Name exists
    } catch (error: any) {
      if (error.status === 404) {
        return false; // Name does not exist
      }
      throw error; // Re-throw other errors
    }
  },

  // Get rubrics by major ID
  getByMajorId: async (majorId: number) => {
    try {
      const majorRubricsRes = await majorRubricsApi.getByMajorId(majorId);
      const majorRubrics = majorRubricsRes.data || [];
      
      // Get full rubric details for each rubricId
      const rubricPromises = majorRubrics.map(async (mr) => {
        try {
          const rubricRes = await rubricsApi.getById(mr.rubricId);
          return rubricRes.data;
        } catch (error) {
          console.error(`Error fetching rubric ${mr.rubricId}:`, error);
          return null;
        }
      });
      
      const rubrics = await Promise.all(rubricPromises);
      const validRubrics: RubricDto[] = rubrics.filter((r): r is RubricDto => r !== null);
      
      return { data: validRubrics };
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

