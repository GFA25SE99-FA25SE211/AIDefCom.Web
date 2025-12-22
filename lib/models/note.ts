// Note Models (for NotesController - /api/notes)
export interface NoteDto {
  id: number;
  sessionId: number;
  title: string;
  content: string;
  createdAt: string;
  updatedAt?: string | null;
}

export interface NoteCreateDto {
  sessionId: number;
  title: string;
  content: string;
}

export interface NoteUpdateDto {
  title: string;
  content: string;
}

