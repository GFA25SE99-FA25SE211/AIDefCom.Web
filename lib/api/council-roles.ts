import { apiClient } from "./client";

export interface CouncilRole {
  id: number;
  roleName: string;
  description?: string;
}

export interface CouncilRoleCreate {
  roleName: string;
  description?: string;
}

export interface CouncilRoleUpdate {
  roleName: string;
  description?: string;
}

export const councilRolesApi = {
  // Get all council roles
  getAll: (includeDeleted = false) =>
    apiClient.get<CouncilRole[]>(`/api/council-roles?includeDeleted=${includeDeleted}`),

  // Get council role by ID
  getById: (id: number) =>
    apiClient.get<CouncilRole>(`/api/council-roles/${id}`),

  // Get council role by name
  getByRoleName: (roleName: string) =>
    apiClient.get<CouncilRole>(`/api/council-roles/by-name/${roleName}`),

  // Get standard roles (default roles)
  getStandardRoles: () =>
    apiClient.get<CouncilRole[]>(`/api/council-roles/standard`),

  // Create council role
  create: (data: CouncilRoleCreate) =>
    apiClient.post<CouncilRole>(`/api/council-roles`, data),

  // Update council role
  update: (id: number, data: CouncilRoleUpdate) =>
    apiClient.put<void>(`/api/council-roles/${id}`, data),

  // Delete council role
  delete: (id: number) =>
    apiClient.delete<void>(`/api/council-roles/${id}`),

  // Restore council role
  restore: (id: number) =>
    apiClient.post<void>(`/api/council-roles/${id}/restore`),
};