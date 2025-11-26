import { apiClient } from './client';
import type {
  CommitteeAssignmentDto,
  CommitteeAssignmentCreateDto,
  CommitteeAssignmentUpdateDto,
} from '@/lib/models';

export const committeeAssignmentsApi = {
  getAll: async () => {
    return apiClient.get<CommitteeAssignmentDto[]>('/api/committee-assignments');
  },

  getById: async (id: number | string) => {
    return apiClient.get<CommitteeAssignmentDto>(`/api/committee-assignments/${id}`);
  },

  getByCouncilId: async (councilId: number) => {
    return apiClient.get<CommitteeAssignmentDto[]>(`/api/committee-assignments/council/${councilId}`);
  },

  getBySessionId: async (sessionId: number) => {
    return apiClient.get<CommitteeAssignmentDto[]>(`/api/committee-assignments/session/${sessionId}`);
  },

  getByLecturerId: async (lecturerId: string) => {
    return apiClient.get<CommitteeAssignmentDto[]>(`/api/committee-assignments/lecturer/${lecturerId}`);
  },

  create: async (data: CommitteeAssignmentCreateDto) => {
    return apiClient.post<CommitteeAssignmentDto>('/api/committee-assignments', data);
  },

  update: async (id: number | string, data: CommitteeAssignmentUpdateDto) => {
    return apiClient.put(`/api/committee-assignments/${id}`, data);
  },

  delete: async (id: number | string) => {
    return apiClient.delete(`/api/committee-assignments/${id}`);
  },
};

