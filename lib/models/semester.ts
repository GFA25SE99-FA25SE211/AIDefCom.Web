// Semester Models
export interface SemesterDto {
  id: number;
  semesterName: string;
  year: number;
  startDate: string;
  endDate: string;
  majorId: number;
}

export interface SemesterCreateDto {
  semesterName: string;
  year: number;
  startDate: string;
  endDate: string;
  majorId: number;
}

export interface SemesterUpdateDto {
  semesterName: string;
  year: number;
  startDate: string;
  endDate: string;
  majorId: number;
}

