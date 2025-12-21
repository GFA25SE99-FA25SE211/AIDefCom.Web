import { apiClient } from './client';
import { env } from '@/lib/config';
import type { ImportResultDto } from '@/lib/models';

export const lecturersApi = {
  importLecturers: async (file: File) => {
    const formData = new FormData();
    // ASP.NET Core parameter binding: parameter name is 'file', so field name should be 'file'
    formData.append('file', file);
    return apiClient.postFormData<ImportResultDto>('/api/lecturers/import', formData);
  },

  downloadTemplate: async () => {
    // Get token from localStorage
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    
    if (!token || token === 'dummy-token-chair') {
      throw new Error('Authentication required. Please login first.');
    }

    const response = await fetch(`${env.apiUrl}/api/lecturers/import/template`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new Error('Authentication failed. Please login again.');
      }
      throw new Error(`Failed to download template: ${response.statusText}`);
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


