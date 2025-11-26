// Member Note Models
export interface MemberNoteDto {
  id: number;
  committeeAssignmentId: string;
  userName?: string | null;
  groupId: string;
  noteContent: string;
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
