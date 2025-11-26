// Score Models  
export interface ScoreDto {
  id: number;
  value: number;
  rubricId: number;
  rubricName?: string;
  evaluatorId: string;
  evaluatorName?: string;
  studentId: string;
  studentName?: string;
  sessionId: number;
  comment?: string;
  createdAt: string;
}

export interface ScoreCreateDto {
  value: number;
  rubricId: number;
  evaluatorId: string;
  studentId: string;
  sessionId: number;
  comment?: string;
}

export interface ScoreUpdateDto {
  value: number;
  comment?: string;
}

