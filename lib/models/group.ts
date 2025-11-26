// Group Models
export interface GroupDto {
  id: string;
  groupName?: string;
  projectCode?: string;
  projectTitle?: string;
  topicTitle_EN?: string;
  topicTitle_VN?: string;
  semesterId: number;
  semesterName?: string;
  majorId?: number;
  majorName?: string;
  status?: string;
  totalScore?: number | null;
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

