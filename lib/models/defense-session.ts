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
  topicTitle?: string;
  studentRole?: string;
  studentScore?: number;
  grade?: string;
  resultStatus?: string;
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

// Import Result DTOs
export interface ImportErrorDto {
  row: number;
  field: string;
  errorMessage: string;
  value: string;
}

export interface DefenseSessionImportResultDto {
  totalRows: number;
  successCount: number;
  failureCount: number;
  errors: ImportErrorDto[];
  createdDefenseSessionIds: number[];
  message?: string;
}
