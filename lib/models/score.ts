// Score Models
export interface ScoreDto {
  id: number;
  studentId: string;
  rubricId: number;
  score: number;
  defenseSessionId: number;
  lecturerId?: string;
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

