// Project Task Models
export interface ProjectTaskDto {
  id: number;
  title: string;
  description?: string;
  assignedById: string;
  assignedToId: string;
  rubricId?: number;
  status: string;
}

export interface ProjectTaskCreateDto {
  title: string;
  description?: string;
  assignedById: string;
  assignedToId: string;
  rubricId?: number | null;
  status: string;
}

export interface ProjectTaskUpdateDto {
  title: string;
  description?: string;
  assignedToId: string;
  status?: string;
}
