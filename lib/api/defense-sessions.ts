import { apiClient } from "./client";
import { env } from "@/lib/config";
import type {
  DefenseSessionDto,
  DefenseSessionCreateDto,
  DefenseSessionUpdateDto,
} from "@/lib/models";

export const defenseSessionsApi = {
  getAll: async (includeDeleted: boolean = false) => {
    return apiClient.get<DefenseSessionDto[]>(
      `/api/defense-sessions?includeDeleted=${includeDeleted}`
    );
  },

  getById: async (id: number) => {
    return apiClient.get<DefenseSessionDto>(`/api/defense-sessions/${id}`);
  },

  getByGroupId: async (groupId: string) => {
    return apiClient.get<DefenseSessionDto[]>(
      `/api/defense-sessions/group/${groupId}`
    );
  },

  getByLecturerId: async (lecturerId: string) => {
    return apiClient.get<DefenseSessionDto[]>(
      `/api/defense-sessions/lecturer/${lecturerId}`
    );
  },

  getByStudentId: async (studentId: string) => {
    return apiClient.get<DefenseSessionDto[]>(
      `/api/defense-sessions/student/${studentId}`
    );
  },

  getUsersBySessionId: async (id: number) => {
    return apiClient.get<any[]>(`/api/defense-sessions/${id}/users`);
  },

  create: async (data: DefenseSessionCreateDto) => {
    return apiClient.post<DefenseSessionDto>("/api/defense-sessions", data);
  },

  update: async (id: number, data: DefenseSessionUpdateDto) => {
    return apiClient.put(`/api/defense-sessions/${id}`, data);
  },

  delete: async (id: number) => {
    return apiClient.delete(`/api/defense-sessions/${id}`);
  },

  downloadTemplate: async () => {
    const response = await fetch(
      `${env.apiUrl}/api/defense-sessions/import/template`,
      {
        method: "GET",
      }
    );
    if (!response.ok) {
      throw new Error("Failed to download defense session template");
    }
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `DefenseSessions_Template_${
      new Date().toISOString().split("T")[0]
    }.xlsx`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },

  importFromFile: async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return apiClient.postFormData("/api/defense-sessions/import", formData);
  },

  // Start a defense session (change status to InProgress)
  start: async (id: number) => {
    return apiClient.put<DefenseSessionDto>(
      `/api/defense-sessions/${id}/start`
    );
  },

  // Complete a defense session (change status to Completed)
  complete: async (id: number) => {
    return apiClient.put<DefenseSessionDto>(
      `/api/defense-sessions/${id}/complete`
    );
  },

  // Check if session exists for a group on a specific date/time (duplicate check)
  checkSessionExists: async (groupId: string, date: string, startTime: string): Promise<boolean> => {
    try {
      const sessions = await defenseSessionsApi.getByGroupId(groupId);
      return (sessions.data || []).some(
        (session) => {
          const sessionDate = session.defenseDate ? new Date(session.defenseDate).toISOString().split('T')[0] : '';
          const sessionTime = session.startTime || '';
          return sessionDate === date && sessionTime === startTime;
        }
      );
    } catch (error) {
      console.error('Error checking session:', error);
      return false;
    }
  },
};
