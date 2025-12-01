// Defense Session Models
export interface DefenseSessionDto {
  id: number;
  groupId: string;
  location: string;
  defenseDate: string; // ISO date string
  startTime: string; // HH:MM:SS format
  endTime: string; // HH:MM:SS format
  status: string; // "Scheduled" | "Completed" etc.
  councilId?: number; // Optional council ID
  createdAt: string; // ISO date string
  topicTitle_EN?: string; // English topic title
  topicTitle_VN?: string; // Vietnamese topic title
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
