import { apiClient } from './client';
import { env } from '@/lib/config';
import type {
  CouncilDto,
  CouncilCreateDto,
  CouncilUpdateDto,
} from '@/lib/models';

export const councilsApi = {
  getAll: async (includeInactive: boolean = false) => {
    return apiClient.get<CouncilDto[]>(`/api/councils?includeInactive=${includeInactive}`);
  },

  getById: async (id: number) => {
    return apiClient.get<CouncilDto>(`/api/councils/${id}`);
  },

  create: async (data: CouncilCreateDto) => {
    return apiClient.post<CouncilDto>('/api/councils', data);
  },

  update: async (id: number, data: CouncilUpdateDto) => {
    return apiClient.put(`/api/councils/${id}`, data);
  },

  softDelete: async (id: number) => {
    return apiClient.delete(`/api/councils/${id}`);
  },

  restore: async (id: number) => {
    return apiClient.put(`/api/councils/${id}/restore`);
  },

  downloadTemplate: async () => {
    // Get token from localStorage
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    
    if (!token || token === 'dummy-token-chair' || token.trim() === '') {
      throw new Error('Authentication required. Please login first.');
    }

    const response = await fetch(`${env.apiUrl}/api/councils/import/template`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new Error('Authentication failed. Please login again.');
      }
      const errorText = await response.text();
      throw new Error(`Failed to download council template: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Council_Import_Template_${new Date().toISOString().split('T')[0]}.xlsx`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },

  importWithCommittees: async (majorId: number, file: File) => {
    const formData = new FormData();
    formData.append('MajorId', String(majorId));
    formData.append('File', file);
    return apiClient.postFormData<any>('/api/councils/import', formData);
  },

  // Check if council description exists for a major (duplicate check)
  checkDescriptionExists: async (description: string, majorId: number): Promise<boolean> => {
    try {
      const allCouncils = await councilsApi.getAll(true);
      return (allCouncils.data || []).some(
        (council) => 
          council.majorId === majorId &&
          council.description?.toLowerCase() === description.trim().toLowerCase()
      );
    } catch (error) {
      return false;
    }
  },
};

