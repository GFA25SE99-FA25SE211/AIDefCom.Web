// Committee Assignment Models
export interface CommitteeAssignmentDto {
  id: number;
  lecturerId: string;
  councilId: number;
  defenseSessionId: number;
  role: string;
}

export interface CommitteeAssignmentCreateDto {
  lecturerId: string;
  councilId: number;
  defenseSessionId: number;
  role: string;
}

export interface CommitteeAssignmentUpdateDto {
  lecturerId: string;
  councilId: number;
  defenseSessionId: number;
  role: string;
}

