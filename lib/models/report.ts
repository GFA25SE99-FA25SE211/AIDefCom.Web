// Report Models
export interface ReportDto {
  id: number;
  sessionId: number;
  summary?: string;
  filePath?: string;
  generatedDate?: string;
  status?: string;
  summaryText?: string;
}

export interface ReportCreateDto {
  sessionId: number;
  summary?: string;
  filePath?: string;
}

export interface ReportUpdateDto {
  sessionId: number;
  filePath: string;
  summaryText?: string;
  status: string;
}

