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
  createdAt?: string;
}

export interface ScoreCreateDto {
  studentId: string;
  rubricId: number;
  score: number;
  defenseSessionId: number;
}

export interface ScoreUpdateDto {
  score: number;
}
