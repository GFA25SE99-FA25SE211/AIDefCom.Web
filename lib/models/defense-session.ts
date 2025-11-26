// Defense Session Models
export interface DefenseSessionDto {
  id: number;
  groupId: string;
  location: string;
  defenseDate: string; // ISO date string
  startTime: string;   // HH:MM:SS format
  endTime: string;     // HH:MM:SS format
  status: string;      // "Scheduled" | "Completed" etc.
  councilId?: number;
  createdAt: string;   // ISO date string
}

export interface DefenseSessionCreateDto {
  groupId: string;
  location: string;
  defenseDate: string;
  startTime: string;
  endTime: string;
}

export interface DefenseSessionUpdateDto {
  groupId: string;
  location: string;
  defenseDate: string;
  startTime: string;
  endTime: string;
}

