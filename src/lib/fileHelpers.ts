import type { VaultFileType } from "@/types";

export const DEFAULT_STORAGE_BUCKET = "nexus-files";

export function sanitizeFilename(filename: string) {
  // Keep it simple for storage paths.
  return filename.replace(/[^a-zA-Z0-9.\-_ ]+/g, "_").trim();
}

export function parseTagsInput(input: string) {
  const trimmed = input.trim();
  if (!trimmed) return [] as string[];
  // Accept comma and/or whitespace separated tags.
  const raw = trimmed
    .split(/[,\n]+/g)
    .flatMap((part) => part.split(/\s+/g))
    .map((t) => t.trim())
    .filter(Boolean);

  // Deduplicate (case-insensitive).
  const seen = new Set<string>();
  const result: string[] = [];
  for (const t of raw) {
    const key = t.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(t);
  }
  return result;
}

export function detectFileType({
  fileName,
  mimeType,
}: {
  fileName: string;
  mimeType: string | null | undefined;
}): VaultFileType {
  const mt = (mimeType ?? "").toLowerCase();
  if (mt.startsWith("image/")) return "image";
  if (mt.startsWith("video/")) return "video";

  const lowerName = fileName.toLowerCase();
  const ext = lowerName.includes(".") ? lowerName.split(".").pop() ?? "" : "";
  const docExts = new Set([
    "pdf",
    "doc",
    "docx",
    "xls",
    "xlsx",
    "ppt",
    "pptx",
    "txt",
    "rtf",
    "csv",
  ]);
  if (mt === "application/pdf" || docExts.has(ext)) return "document";

  return "other";
}

export function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const idx = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  const val = bytes / Math.pow(1024, idx);
  return `${val.toFixed(val >= 10 || idx === 0 ? 0 : 1)} ${units[idx]}`;
}

export function buildStoragePath({
  userId,
  fileId,
  originalFilename,
}: {
  userId: string;
  fileId: string;
  originalFilename: string;
}) {
  const safe = sanitizeFilename(originalFilename);
  return `${userId}/${fileId}/${safe}`;
}

