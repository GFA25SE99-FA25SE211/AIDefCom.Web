import { apiClient } from './client';
import type {
  TranscriptDto,
  TranscriptCreateDto,
  TranscriptUpdateDto,
} from '@/lib/models';

export const transcriptsApi = {
  getAll: async () => {
    return apiClient.get<TranscriptDto[]>('/api/transcripts');
  },

  getById: async (id: number) => {
    return apiClient.get<TranscriptDto>(`/api/transcripts/${id}`);
  },

  getBySessionId: async (sessionId: number) => {
    return apiClient.get<TranscriptDto[]>(`/api/transcripts/session/${sessionId}`);
  },

  create: async (data: TranscriptCreateDto) => {
    return apiClient.post<TranscriptDto>('/api/transcripts', data);
  },

  update: async (id: number, data: TranscriptUpdateDto) => {
    return apiClient.put(`/api/transcripts/${id}`, data);
  },

  delete: async (id: number) => {
    return apiClient.delete(`/api/transcripts/${id}`);
  },

  restore: async (id: number) => {
    return apiClient.put(`/api/transcripts/${id}/restore`, {});
  },
};

