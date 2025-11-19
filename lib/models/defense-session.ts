// Defense Session Models
export interface DefenseSessionDto {
  id: number;
  groupId: string;
  sessionDate: string;
  sessionTime: string;
  location?: string;
  status?: string;
}

export interface DefenseSessionCreateDto {
  groupId: string;
  sessionDate: string;
  sessionTime: string;
  location?: string;
}

export interface DefenseSessionUpdateDto {
  groupId: string;
  sessionDate: string;
  sessionTime: string;
  location?: string;
}

