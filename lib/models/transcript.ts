// Transcript Models
export interface TranscriptDto {
  id: number;
  sessionId: number;
  transcriptText?: string;
  audioFilePath?: string;
  createdAt?: string;
  isApproved?: boolean;
}

export interface TranscriptCreateDto {
  sessionId: number;
  transcriptText?: string;
  audioFilePath?: string;
}

export interface TranscriptUpdateDto {
  transcriptText?: string;
  audioFilePath?: string;
  isApproved?: boolean;
}

