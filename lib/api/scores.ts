import { ApiResponse } from '../models/common';
import { apiClient } from './client';
import type { ScoreCreateDto as ScoreCreateDtoType, ScoreUpdateDto as ScoreUpdateDtoType, ScoreDto } from '../models/score';

export interface ScoreReadDto {
  id: number;
  value: number;
  rubricId: number;
  rubricName?: string;
  evaluatorId: string;
  evaluatorName?: string;
  studentId: string;
  studentName?: string;
  sessionId: number;
  comment?: string;
  createdAt: string;
}

export const scoresApi = {
  // Get all scores
  getAll: async (): Promise<ApiResponse<ScoreReadDto[]>> => {
    const response = await apiClient.get<ScoreReadDto[]>('/api/scores');
    return response;
  },

  // Get score by ID
  getById: async (id: number): Promise<ApiResponse<ScoreReadDto>> => {
    const response = await apiClient.get<ScoreReadDto>(`/api/scores/${id}`);
    return response;
  },

  // Get scores by session ID
  getBySessionId: async (sessionId: number): Promise<ApiResponse<ScoreReadDto[]>> => {
    const response = await apiClient.get<ScoreReadDto[]>(`/api/scores/session/${sessionId}`);
    return response;
  },

  // Get scores by student ID
  getByStudentId: async (studentId: string): Promise<ApiResponse<ScoreReadDto[]>> => {
    const response = await apiClient.get<ScoreReadDto[]>(`/api/scores/student/${studentId}`);
    return response;
  },

  // Get scores by evaluator ID
  getByEvaluatorId: async (evaluatorId: string): Promise<ApiResponse<ScoreReadDto[]>> => {
    const response = await apiClient.get<ScoreReadDto[]>(`/api/scores/evaluator/${evaluatorId}`);
    return response;
  },

  // Create new score
  create: async (score: ScoreCreateDtoType): Promise<ApiResponse<ScoreReadDto>> => {
    const response = await apiClient.post<ScoreReadDto>('/api/scores', score);
    return response;
  },

  // Update score
  update: async (id: number, score: ScoreUpdateDtoType): Promise<ApiResponse<void>> => {
    const response = await apiClient.put<void>(`/api/scores/${id}`, score);
    return response;
  },

  // Delete score
  delete: async (id: number): Promise<ApiResponse<void>> => {
    const response = await apiClient.delete<void>(`/api/scores/${id}`);
    return response;
  },

  // Bulk create scores for a session
  bulkCreate: async (scores: ScoreCreateDtoType[]): Promise<ApiResponse<ScoreReadDto[]>> => {
    const response = await apiClient.post<ScoreReadDto[]>('/api/scores/bulk', scores);
    return response;
  },

  // Get scores summary by session and group
  getSummaryBySessionAndGroup: async (sessionId: number, groupId: string): Promise<ApiResponse<any>> => {
    const response = await apiClient.get<any>(`/api/scores/summary/${sessionId}/${groupId}`);
    return response;
  }
};