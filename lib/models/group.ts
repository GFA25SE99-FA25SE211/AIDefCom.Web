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
}

export interface GroupCreateDto {
  projectCode: string;
  topicTitle_EN: string;
  topicTitle_VN: string;
  semesterId: number;
  majorId: number;
  status: string;
}

export interface GroupUpdateDto {
  projectCode: string;
  topicTitle_EN: string;
  topicTitle_VN: string;
  semesterId: number;
  majorId: number;
  status: string;
}

