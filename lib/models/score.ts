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
<<<<<<< HEAD
  createdAt: string;
=======
  createdAt?: string;
>>>>>>> bfff009a91c3fee4ec4401d5cb1162270064f665
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
