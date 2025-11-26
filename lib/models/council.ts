// Council Models
export interface CouncilDto {
  id: number;
  majorId: number;
  majorName: string;
  councilName?: string;
  description?: string;
  createdDate?: string;
  isActive: boolean;
}

export interface CouncilCreateDto {
  majorId: number;
  description?: string;
  isActive?: boolean;
}

export interface CouncilUpdateDto {
  majorId: number;
  description?: string;
  isActive?: boolean;
}

