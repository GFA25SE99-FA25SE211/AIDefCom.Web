import { apiClient } from './client';
import type {
  ReportDto,
  ReportCreateDto,
  ReportUpdateDto,
} from '@/lib/models';

export const reportsApi = {
  getAll: async () => {
    return apiClient.get<ReportDto[]>('/api/reports');
  },

  getById: async (id: number) => {
    return apiClient.get<ReportDto>(`/api/reports/${id}`);
  },

  getBySessionId: async (sessionId: number) => {
    return apiClient.get<ReportDto[]>(`/api/reports/session/${sessionId}`);
  },

  create: async (data: ReportCreateDto) => {
    return apiClient.post<ReportDto>('/api/reports', data);
  },

  update: async (id: number, data: ReportUpdateDto) => {
    return apiClient.put(`/api/reports/${id}`, data);
  },

  delete: async (id: number) => {
    return apiClient.delete(`/api/reports/${id}`);
  },

  restore: async (id: number) => {
    return apiClient.put(`/api/reports/${id}/restore`, {});
  },

  getByLecturerId: async (lecturerId: string) => {
    return apiClient.get<ReportDto[]>(`/api/reports/lecturer/${lecturerId}`);
  },

  approve: async (id: number) => {
    return apiClient.put(`/api/reports/${id}/approve`, {});
  },

  reject: async (id: number) => {
    return apiClient.put(`/api/reports/${id}/reject`, {});
  },
};

