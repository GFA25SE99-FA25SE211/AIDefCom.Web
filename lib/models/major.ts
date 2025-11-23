// Major Models
export interface MajorDto {
  id: number;
  majorName: string;
  description?: string;
}

export interface MajorCreateDto {
  majorName: string;
  description?: string;
}

export interface MajorUpdateDto {
  majorName: string;
  description?: string;
}

