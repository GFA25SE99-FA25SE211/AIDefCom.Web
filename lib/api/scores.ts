import { apiClient } from './client';
import type { ScoreDto, ScoreCreateDto, ScoreUpdateDto } from '@/lib/models/score';

// Type alias for compatibility
export type ScoreReadDto = ScoreDto;

export const scoresApi = {
  // Get all scores
  getAll: async () => {
    return apiClient.get<ScoreDto[]>('/api/scores');
  },

  // Get score by ID
  getById: async (id: number) => {
    return apiClient.get<ScoreDto>(`/api/scores/${id}`);
  },

  // Get scores by student ID
  getByStudentId: async (studentId: string) => {
    return apiClient.get<ScoreDto[]>(`/api/scores/student/${studentId}`);
  },

  // Get scores by evaluator ID
  getByEvaluatorId: async (evaluatorId: string) => {
    return apiClient.get<ScoreDto[]>(`/api/scores/evaluator/${evaluatorId}`);
  },

  // Get scores by session ID
  getBySessionId: async (sessionId: number) => {
    return apiClient.get<ScoreDto[]>(`/api/scores/session/${sessionId}`);
  },

  // Get scores by rubric ID
  getByRubricId: async (rubricId: number) => {
    return apiClient.get<ScoreDto[]>(`/api/scores/rubric/${rubricId}`);
  },

  // Create new score
  create: async (data: ScoreCreateDto) => {
    return apiClient.post<ScoreDto>('/api/scores', data);
  },

  // Update score
  update: async (id: number, data: ScoreUpdateDto) => {
    return apiClient.put<ScoreDto>(`/api/scores/${id}`, data);
  },

  // Delete score
  delete: async (id: number) => {
    return apiClient.delete(`/api/scores/${id}`);
  },

  // Bulk create scores
  bulkCreate: async (scores: ScoreCreateDto[]) => {
    return apiClient.post<ScoreDto[]>('/api/scores/bulk', scores);
  },

  // Get scores summary by session and group
  getSummaryBySessionAndGroup: async (sessionId: number, groupId: string) => {
    return apiClient.get(`/api/scores/summary/${sessionId}/${groupId}`);
  },
};
