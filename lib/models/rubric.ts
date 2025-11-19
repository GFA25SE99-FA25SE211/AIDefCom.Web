// Rubric Models
export interface RubricDto {
  id: number;
  rubricName: string;
  description?: string;
}

export interface RubricCreateDto {
  rubricName: string;
  description?: string;
}

export interface RubricUpdateDto {
  rubricName: string;
  description?: string;
}

