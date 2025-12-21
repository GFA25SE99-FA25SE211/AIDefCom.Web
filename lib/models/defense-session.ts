// Defense Session Models
// Matches DefenseSessionReadDto from backend
export interface DefenseSessionDto {
  id: number;
  groupId: string;
  location: string;
  defenseDate: string; // ISO date string (DateTime from backend)
  startTime: string; // HH:MM:SS format (TimeSpan from backend)
  endTime: string; // HH:MM:SS format (TimeSpan from backend)
  status: string; // "Scheduled" | "InProgress" | "Completed" | "Postponed" | "Cancelled"
  councilId: number; // Required in backend (int)
  createdAt: string; // ISO date string (DateTime from backend)
  totalScore?: number | null; // Nullable double from backend
  // Optional fields that might be populated from related entities
  topicTitle_EN?: string; // English topic title (from Group)
  topicTitle_VN?: string; // Vietnamese topic title (from Group)
}

export interface DefenseSessionCreateDto {
  groupId: string;
  location: string;
  defenseDate: string;
  startTime: string;
  endTime: string;
  status?: string;
  councilId?: number;
}

export interface DefenseSessionUpdateDto {
  groupId: string;
  location: string;
  defenseDate: string;
  startTime: string;
  endTime: string;
  status?: string;
  councilId?: number;
}
