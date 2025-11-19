import { apiClient } from './client';
import { env } from '@/lib/config';
import type {
  StudentDto,
  StudentCreateDto,
  StudentUpdateDto,
  ImportResultDto,
} from '@/lib/models';

export const studentsApi = {
  getAll: async () => {
    return apiClient.get<StudentDto[]>('/api/students');
  },

  getById: async (id: string) => {
    return apiClient.get<StudentDto>(`/api/students/${id}`);
  },

  getByGroupId: async (groupId: string) => {
    return apiClient.get<StudentDto[]>(`/api/students/group/${groupId}`);
  },

  create: async (data: StudentCreateDto) => {
    return apiClient.post<StudentDto>('/api/students', data);
  },

  update: async (id: string, data: StudentUpdateDto) => {
    return apiClient.put(`/api/students/${id}`, data);
  },

  delete: async (id: string) => {
    return apiClient.delete(`/api/students/${id}`);
  },

  import: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.postFormData<ImportResultDto>('/api/students/import', formData);
  },

  downloadTemplate: async () => {
    const response = await fetch(`${env.apiUrl}/api/students/import/template`, {
      method: 'GET',
    });
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Student_Import_Template_${new Date().toISOString().split('T')[0]}.xlsx`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },
};

