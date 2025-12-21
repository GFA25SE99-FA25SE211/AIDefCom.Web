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
  userId: string;
  groupId: string;
  content: string;
}

export interface MemberNoteUpdateDto {
  content: string;
}
