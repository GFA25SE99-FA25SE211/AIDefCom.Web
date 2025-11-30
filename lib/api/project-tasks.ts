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

  create: async (data: ProjectTaskCreateDto) => {
    return apiClient.post<ProjectTaskDto>('/api/project-tasks', data);
  },

  update: async (id: number, data: ProjectTaskUpdateDto) => {
    return apiClient.put(`/api/project-tasks/${id}`, data);
  },

  delete: async (id: number) => {
    return apiClient.delete(`/api/project-tasks/${id}`);
  },
};

