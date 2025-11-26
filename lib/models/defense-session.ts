// Defense Session Models
export interface DefenseSessionDto {
  id: number;
  groupId: string;
  location: string;
  defenseDate: string; // ISO date string
  startTime: string;   // HH:MM:SS format
  endTime: string;     // HH:MM:SS format
  status: string;      // "Scheduled" | "Completed" etc.
<<<<<<< HEAD
  councilId: number;
=======
  councilId?: number;
>>>>>>> bfff009a91c3fee4ec4401d5cb1162270064f665
  createdAt: string;   // ISO date string
}

export interface DefenseSessionCreateDto {
  groupId: string;
  location: string;
  defenseDate: string;
  startTime: string;
  endTime: string;
  status?: string;
  councilId: number;
}

export interface DefenseSessionUpdateDto {
  groupId: string;
  location: string;
  defenseDate: string;
  startTime: string;
  endTime: string;
  status?: string;
  councilId: number;
}

