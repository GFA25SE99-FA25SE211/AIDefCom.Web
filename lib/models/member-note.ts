// Member Note Models
export interface MemberNoteDto {
  id: number;
  userId: string;
  groupId: string;
  content: string;
  createdAt?: string;
}

export interface MemberNoteCreateDto {
  userId: string;
  groupId: string;
  content: string;
}

export interface MemberNoteUpdateDto {
  content: string;
}

