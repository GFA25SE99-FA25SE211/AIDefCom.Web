// Student Models
export interface StudentDto {
  id: string;
  userName?: string; // Backend returns UserName (which is FullName)
  email?: string;
  dateOfBirth?: string;
  gender?: string;
  // Optional fields that might not be in backend response
  studentCode?: string;
  fullName?: string;
  phoneNumber?: string;
  groupId?: string;
}

export interface StudentCreateDto {
  studentCode: string;
  fullName: string;
  userName?: string; // Add userName to match API expectations
  email?: string;
  phoneNumber?: string;
  groupId?: string;
  dateOfBirth?: string;
  gender?: string;
}

export interface StudentUpdateDto {
  studentCode: string;
  fullName: string;
  email?: string;
  phoneNumber?: string;
  groupId?: string;
}

export interface ImportResultDto {
  successCount: number;
  failureCount: number;
  errors?: string[];
}

export interface StudentGroupImportResultDto extends ImportResultDto {
  message?: string;
  createdStudentIds?: string[];
  createdGroupIds?: string[];
}

