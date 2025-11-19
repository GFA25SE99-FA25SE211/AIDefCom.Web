// Group Models
export interface GroupDto {
  id: string;
  groupName: string;
  projectTitle?: string;
  semesterId: number;
}

export interface GroupCreateDto {
  groupName: string;
  projectTitle?: string;
  semesterId: number;
}

export interface GroupUpdateDto {
  groupName: string;
  projectTitle?: string;
  semesterId: number;
}

