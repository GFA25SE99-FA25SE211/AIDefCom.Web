import { apiClient } from "./client";
import type { NoteDto, NoteCreateDto, NoteUpdateDto } from "@/lib/models";

export const notesApi = {
  getAll: async () => {
    return apiClient.get<NoteDto[]>("/api/notes");
  },

  getById: async (id: number) => {
    return apiClient.get<NoteDto>(`/api/notes/${id}`);
  },

  getBySessionId: async (sessionId: number) => {
    return apiClient.get<NoteDto>(`/api/notes/session/${sessionId}`);
  },

  create: async (data: NoteCreateDto) => {
    return apiClient.post<NoteDto>("/api/notes", data);
  },

  update: async (id: number, data: NoteUpdateDto) => {
    return apiClient.put(`/api/notes/${id}`, data);
  },

  delete: async (id: number) => {
    return apiClient.delete(`/api/notes/${id}`);
  },
};

