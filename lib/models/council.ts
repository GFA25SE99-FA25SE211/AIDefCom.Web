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
  councilName: string;
  description?: string;
}

export interface CouncilUpdateDto {
  councilName: string;
  description?: string;
}

