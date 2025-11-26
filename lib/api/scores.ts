import { apiClient } from "./client";
import type { ScoreDto, ScoreCreateDto, ScoreUpdateDto } from "@/lib/models";

export const scoresApi = {
  getByStudentId: async (studentId: string) => {
    return apiClient.get<ScoreDto[]>(`/api/scores/student/${studentId}`);
  },

  getByRubricId: async (rubricId: number) => {
    return apiClient.get<ScoreDto[]>(`/api/scores/rubric/${rubricId}`);
  },

  create: async (data: ScoreCreateDto) => {
    return apiClient.post<ScoreDto>("/api/scores", data);
  },

  update: async (id: number, data: ScoreUpdateDto) => {
    return apiClient.put(`/api/scores/${id}`, data);
  },

  delete: async (id: number) => {
    return apiClient.delete(`/api/scores/${id}`);
  },
};
