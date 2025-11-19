// Council Models
export interface CouncilDto {
  id: number;
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

