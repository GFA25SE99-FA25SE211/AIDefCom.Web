import { apiClient } from "./client";
import type {
  MemberNoteDto,
  MemberNoteCreateDto,
  MemberNoteUpdateDto,
} from "@/lib/models";

export const memberNotesApi = {
  getAll: async () => {
    return apiClient.get<MemberNoteDto[]>("/api/member-notes");
  },

  getById: async (id: number) => {
    return apiClient.get<MemberNoteDto>(`/api/member-notes/${id}`);
  },

  getByGroupId: async (groupId: string) => {
    return apiClient.get<MemberNoteDto[]>(`/api/member-notes/group/${groupId}`);
  },

  getBySessionId: async (sessionId: number) => {
    return apiClient.get<MemberNoteDto[]>(
      `/api/member-notes/session/${sessionId}`
    );
  },

  getByUserId: async (userId: string) => {
    return apiClient.get<MemberNoteDto[]>(`/api/member-notes/user/${userId}`);
  },

  create: async (data: MemberNoteCreateDto) => {
    return apiClient.post<MemberNoteDto>("/api/member-notes", data);
  },

  update: async (id: number, data: MemberNoteUpdateDto) => {
    return apiClient.put(`/api/member-notes/${id}`, data);
  },

  delete: async (id: number) => {
    return apiClient.delete(`/api/member-notes/${id}`);
  },
};
