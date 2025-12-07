// Committee Assignment Models
export interface CommitteeAssignmentDto {
  id: number;
  lecturerId: string;
  councilId: number;
  defenseSessionId: number;
  role: string;
  roleName?: string; // API có thể trả về roleName
  councilRoleId?: number; // API có thể trả về councilRoleId
}

export interface CommitteeAssignmentCreateDto {
  lecturerId: string;
  councilId: number;
  councilRoleId: number;
}

export interface CommitteeAssignmentUpdateDto {
  lecturerId: string;
  councilId: number;
  councilRoleId: number;
}

