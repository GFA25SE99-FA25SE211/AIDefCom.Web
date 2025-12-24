// Project Task Models
export interface ProjectTaskDto {
  id: number;
  title: string;
  description?: string;
  assignedById: string;
  assignedByName?: string;
  assignedToId: string;
  assignedToName?: string;
  rubricId?: number;
  sessionId?: number;
  status: string;
}

export interface ProjectTaskCreateDto {
  title: string;
  description?: string;
  assignedById: string;
  assignedToId: string;
  rubricId?: number | null;
  sessionId: number;
  status: string;
}

export interface ProjectTaskUpdateDto {
  title: string;
  description?: string;
  assignedById: string;
  assignedToId: string;
  rubricId: number;
  sessionId: number;
  status?: string;
}
