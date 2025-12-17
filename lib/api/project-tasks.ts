import { apiClient } from './client';
import type {
  ProjectTaskDto,
  ProjectTaskCreateDto,
  ProjectTaskUpdateDto,
} from '@/lib/models';

export const projectTasksApi = {
  getAll: async () => {
    return apiClient.get<ProjectTaskDto[]>('/api/project-tasks');
  },

  getById: async (id: number) => {
    return apiClient.get<ProjectTaskDto>(`/api/project-tasks/${id}`);
  },

  getByAssigner: async (assignedById: string) => {
    return apiClient.get<ProjectTaskDto[]>(`/api/project-tasks/assigner/${assignedById}`);
  },

  getByAssignee: async (assignedToId: string) => {
    return apiClient.get<ProjectTaskDto[]>(`/api/project-tasks/assignee/${assignedToId}`);
  },

  getByAssigneeAndSession: async (assignedToId: string, sessionId: number) => {
    return apiClient.get<ProjectTaskDto[]>(`/api/project-tasks/assignee/${assignedToId}/session/${sessionId}`);
  },

  getRubricNamesByAssigneeAndSession: async (assignedToId: string, sessionId: number) => {
    return apiClient.get<string[]>(`/api/project-tasks/assignee/${assignedToId}/session/${sessionId}/rubrics`);
  },

  getRubricsByLecturerAndSession: async (lecturerId: string, sessionId: number) => {
    return apiClient.get<string[]>(`/api/project-tasks/lecturer/${lecturerId}/session/${sessionId}/rubrics`);
  },

  getRubricIdByName: async (rubricName: string) => {
    return apiClient.get<number>(`/api/project-tasks/rubric/by-name/${encodeURIComponent(rubricName)}`);
  },

  create: async (data: ProjectTaskCreateDto) => {
    return apiClient.post<ProjectTaskDto>('/api/project-tasks', data);
  },

  update: async (id: number, data: ProjectTaskUpdateDto) => {
    return apiClient.put(`/api/project-tasks/${id}`, data);
  },

  delete: async (id: number) => {
    return apiClient.delete(`/api/project-tasks/${id}`);
  },

  // Check if task title exists (duplicate check)
  checkTitleExists: async (title: string): Promise<boolean> => {
    try {
      const allTasks = await projectTasksApi.getAll();
      return (allTasks.data || []).some(
        (task) => task.title?.toLowerCase() === title.trim().toLowerCase()
      );
    } catch (error) {
      console.error('Error checking task title:', error);
      return false;
    }
  },
};

