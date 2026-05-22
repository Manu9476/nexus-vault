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

  description: string | null;
  tags: Tags | null;

  created_at: string; // ISO
  updated_at: string | null; // ISO
}

export interface VaultFolder {
  id: string;
  user_id: string;
  name: string;
  color: string | null;
  icon: string | null;
  created_at: string;
}

