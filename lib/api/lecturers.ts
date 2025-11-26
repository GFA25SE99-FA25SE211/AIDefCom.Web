import { apiClient } from './client';
import { env } from '@/lib/config';
import type { ImportResultDto } from '@/lib/models';

export const lecturersApi = {
  importLecturers: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.postFormData<ImportResultDto>('/api/lecturers/import', formData);
  },

  downloadTemplate: async () => {
    const response = await fetch(`${env.apiUrl}/api/lecturers/import/template`, {
      method: 'GET',
    });
    if (!response.ok) {
      throw new Error('Failed to download lecturer template');
    }
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Lecturer_Import_Template_${new Date().toISOString().split('T')[0]}.xlsx`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },
};


