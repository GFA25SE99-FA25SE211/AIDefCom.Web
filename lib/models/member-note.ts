// Member Note Models
export interface MemberNoteDto {
  id: number;
  committeeAssignmentId: string;
  userName?: string | null;
  sessionId: number;
  noteContent?: string | null;
  createdAt: string;
}

export interface MemberNoteCreateDto {
  lecturerId: string;
  sessionId: number;
  noteContent?: string;
}

export interface MemberNoteUpdateDto {
  noteContent?: string;
}
