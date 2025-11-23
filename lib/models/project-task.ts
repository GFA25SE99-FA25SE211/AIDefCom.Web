// Project Task Models
export interface ProjectTaskDto {
  id: number;
  title: string;
  description?: string;
  assignedById: string;
  assignedToId: string;
  status: string;
}

export interface ProjectTaskCreateDto {
  title: string;
  description?: string;
  assignedToId: string;
}

export interface ProjectTaskUpdateDto {
  title: string;
  description?: string;
  assignedToId: string;
  status?: string;
}

