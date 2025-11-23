// Report Models
export interface ReportDto {
  id: number;
  sessionId: number;
  summary?: string;
  filePath?: string;
  generatedDate?: string;
}

export interface ReportCreateDto {
  sessionId: number;
  summary?: string;
  filePath?: string;
}

export interface ReportUpdateDto {
  summary?: string;
  filePath?: string;
}

