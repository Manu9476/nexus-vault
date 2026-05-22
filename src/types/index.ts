export type VaultFileType = "image" | "document" | "video" | "other";

export type Tags = string[];

export interface VaultFile {
  id: string;
  user_id: string;

  name: string;
  original_filename: string;
  storage_path: string;
  public_url: string | null;

  file_type: VaultFileType;
  mime_type: string | null;
  size_bytes: number;

  folder_id: string | null;
  category: string | null;
  document_type: string | null;
  custom_type_label: string | null;

  description: string | null;
  tags: Tags | null;
  search_text: string | null;
  document_date: string | null;
  academic_year: string | null;
  semester: string | null;
  course_code: string | null;
  course_title: string | null;
  institution: string | null;
  favorite: boolean;
  archived: boolean;

  created_at: string; // ISO
  updated_at: string | null; // ISO
}

export interface VaultFolder {
  id: string;
  user_id: string;
  name: string;
  parent_id: string | null;
  color: string | null;
  icon: string | null;
  created_at: string;
}

