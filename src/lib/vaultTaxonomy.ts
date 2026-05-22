import type { VaultFileType } from "@/types";

export const personalRecordTypes = [
  { value: "birth-certificate", label: "Birth Certificate", group: "Identity Documents" },
  { value: "national-id", label: "National ID", group: "Identity Documents" },
  { value: "driving-license", label: "Driving License", group: "Identity Documents" },
  { value: "kcse-certificate", label: "KCSE Certificate", group: "Certificates" },
  { value: "certificate", label: "Other Certificate", group: "Certificates" },
  { value: "other-record", label: "Other Personal Record", group: "Other Documents" },
] as const;

export const uploadModes = [
  { value: "general", label: "General file" },
  { value: "personal-record", label: "Personal document" },
  { value: "identity-documents", label: "Identity document" },
  { value: "certificates", label: "Certificate" },
  { value: "academic-result", label: "Academic result" },
  { value: "academic-notes", label: "Course notes" },
  { value: "finance", label: "Finance" },
  { value: "medical", label: "Medical" },
  { value: "legal", label: "Legal" },
  { value: "photos", label: "Photos" },
  { value: "academic-other", label: "Other academic file" },
  { value: "other", label: "Other document" },
] as const;

export const academicYears = ["1", "2", "3", "4", "5"] as const;
export const academicSemesters = ["1", "2", "3"] as const;

export const recommendedVaultFolderPaths = [
  ["Personal Documents"],
  ["Personal Documents", "Identity Documents"],
  ["Personal Documents", "Certificates"],
  ["Personal Documents", "Other Documents"],
  ["Academic"],
  ["Academic", "Results"],
  ...academicYears.map((year) => ["Academic", "Results", `Year ${year}`]),
  ["Academic", "Course Notes"],
  ...academicYears.flatMap((year) =>
    academicSemesters.map((semester) => [
      "Academic",
      "Course Notes",
      `Year ${year}`,
      `Semester ${semester}`,
    ])
  ),
  ["Academic", "Other Files"],
  ["Finance"],
  ["Medical"],
  ["Legal"],
  ["Photos"],
  ["Other Documents"],
];

export const recommendedVaultFolders = recommendedVaultFolderPaths.map((path) =>
  path.join(" / ")
);

export type UploadMode = (typeof uploadModes)[number]["value"];
export type PersonalRecordType = (typeof personalRecordTypes)[number]["value"];

export type StructuredUploadMeta = {
  mode: UploadMode;
  personalRecordType: PersonalRecordType;
  customDocumentName: string;
  academicYear: string;
  semester: string;
  courseCode: string;
  courseTitle: string;
  institution: string;
  documentDate: string;
};

export function normalizeTag(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function code(value: string) {
  return value.trim().toUpperCase().replace(/\s+/g, "");
}

function clean(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function personalType(meta: StructuredUploadMeta) {
  return (
    personalRecordTypes.find((item) => item.value === meta.personalRecordType) ??
    personalRecordTypes[0]
  );
}

export function usesPersonalRecordType(mode: UploadMode) {
  return mode === "personal-record" || mode === "identity-documents" || mode === "certificates";
}

export function requiresCustomDocumentName(meta: StructuredUploadMeta) {
  return (
    meta.mode === "academic-other" ||
    meta.mode === "other" ||
    (usesPersonalRecordType(meta.mode) &&
      (meta.personalRecordType === "certificate" || meta.personalRecordType === "other-record"))
  );
}

export function customDocumentName(meta: StructuredUploadMeta) {
  return clean(meta.customDocumentName);
}

export function buildStructuredCategory(meta: StructuredUploadMeta, fileType?: VaultFileType) {
  if (meta.mode === "photos" || fileType === "image") return "photos";
  if (usesPersonalRecordType(meta.mode)) return "personal-documents";
  if (meta.mode.startsWith("academic")) return "academic";
  if (meta.mode === "finance") return "finance";
  if (meta.mode === "medical") return "medical";
  if (meta.mode === "legal") return "legal";
  if (meta.mode === "other") return "other";
  return "general";
}

export function buildStructuredDocumentType(meta: StructuredUploadMeta, fileType?: VaultFileType) {
  if (usesPersonalRecordType(meta.mode)) return personalType(meta).value;
  if (meta.mode === "academic-result") return "academic-result";
  if (meta.mode === "academic-notes") return "course-notes";
  if (meta.mode === "academic-other") return normalizeTag(customDocumentName(meta)) || "academic-file";
  if (meta.mode === "finance") return "finance";
  if (meta.mode === "medical") return "medical";
  if (meta.mode === "legal") return "legal";
  if (meta.mode === "photos" || fileType === "image") return "photo";
  if (meta.mode === "other") return normalizeTag(customDocumentName(meta)) || "other";
  return fileType ?? "file";
}

export function buildStructuredFolderPath(meta: StructuredUploadMeta, fileType?: VaultFileType) {
  const customName = customDocumentName(meta);
  const courseCode = code(meta.courseCode);

  if (meta.mode === "photos" || fileType === "image") return ["Photos"];

  if (usesPersonalRecordType(meta.mode)) {
    const type = personalType(meta);
    const group =
      meta.mode === "identity-documents"
        ? "Identity Documents"
        : meta.mode === "certificates"
          ? "Certificates"
          : type.group;
    const path = ["Personal Documents", group];
    if (type.value === "other-record" && customName) path.push(customName);
    if (type.value === "certificate" && customName) path.push(customName);
    return path;
  }

  if (meta.mode === "academic-result") {
    const path = ["Academic", "Results"];
    if (meta.academicYear) path.push(`Year ${meta.academicYear}`);
    if (meta.semester) path.push(`Semester ${meta.semester}`);
    return path;
  }

  if (meta.mode === "academic-notes") {
    const path = ["Academic", "Course Notes"];
    if (meta.academicYear) path.push(`Year ${meta.academicYear}`);
    if (meta.semester) path.push(`Semester ${meta.semester}`);
    if (courseCode) path.push(courseCode);
    return path;
  }

  if (meta.mode === "academic-other") {
    const path = ["Academic", "Other Files"];
    if (meta.academicYear) path.push(`Year ${meta.academicYear}`);
    if (customName) path.push(customName);
    return path;
  }

  if (meta.mode === "finance") return ["Finance"];
  if (meta.mode === "medical") return ["Medical"];
  if (meta.mode === "legal") return ["Legal"];
  if (meta.mode === "other") return customName ? ["Other Documents", customName] : ["Other Documents"];

  return null;
}

export function buildStructuredFolderName(meta: StructuredUploadMeta, fileType?: VaultFileType) {
  return buildStructuredFolderPath(meta, fileType)?.join(" / ") ?? null;
}

export function buildStructuredTags(meta: StructuredUploadMeta, manualTags: string[]) {
  const tags = new Set<string>();
  const customName = customDocumentName(meta);

  for (const tag of manualTags) {
    const normalized = normalizeTag(tag);
    if (normalized) tags.add(normalized);
  }

  if (meta.mode !== "general") tags.add(`mode:${meta.mode}`);

  const category = buildStructuredCategory(meta);
  if (category) tags.add(category);

  const documentType = buildStructuredDocumentType(meta);
  if (documentType) tags.add(documentType);

  if (usesPersonalRecordType(meta.mode)) {
    const type = personalType(meta);
    tags.add("personal-record");
    tags.add(type.value);
    tags.add(`record:${type.value}`);
    tags.add(normalizeTag(type.label));
  }

  if (meta.mode.startsWith("academic")) {
    tags.add("academic");
    if (meta.academicYear) {
      tags.add(`year-${meta.academicYear}`);
      tags.add(`year:${meta.academicYear}`);
    }
    if (meta.semester) {
      tags.add(`semester-${meta.semester}`);
      tags.add(`semester:${meta.semester}`);
    }
    const courseCode = code(meta.courseCode);
    if (courseCode) {
      tags.add(courseCode.toLowerCase());
      tags.add(`course:${courseCode}`);
    }
    const courseTitle = normalizeTag(meta.courseTitle);
    if (courseTitle) tags.add(courseTitle);
  }

  const institution = normalizeTag(meta.institution);
  if (institution) tags.add(institution);

  const customTag = normalizeTag(customName);
  if (customTag) {
    tags.add(customTag);
    tags.add(`custom:${customTag}`);
  }

  if (meta.mode === "academic-result") tags.add("results");
  if (meta.mode === "academic-notes") tags.add("notes");

  return Array.from(tags);
}

export function buildStructuredTitle({
  meta,
  fallback,
  index,
  total,
}: {
  meta: StructuredUploadMeta;
  fallback: string;
  index: number;
  total: number;
}) {
  let title = fallback;
  const courseCode = code(meta.courseCode);
  const customName = customDocumentName(meta);

  if (usesPersonalRecordType(meta.mode)) {
    title = customName || personalType(meta).label;
  }

  if (meta.mode === "academic-result") {
    const year = meta.academicYear ? `Year ${meta.academicYear}` : "Academic";
    const semester = meta.semester ? ` Semester ${meta.semester}` : "";
    title = courseCode ? `${courseCode} Results - ${year}${semester}` : `${year}${semester} Results`;
  }

  if (meta.mode === "academic-notes") {
    const year = meta.academicYear ? `Year ${meta.academicYear}` : "Academic";
    const semester = meta.semester ? ` Semester ${meta.semester}` : "";
    title = courseCode ? `${courseCode} Notes - ${year}${semester}` : `${year}${semester} Notes`;
  }

  if (meta.mode === "academic-other") {
    const year = meta.academicYear ? `Year ${meta.academicYear}` : "Academic";
    if (courseCode && customName) title = `${courseCode} ${customName} - ${year}`;
    else if (courseCode) title = `${courseCode} File - ${year}`;
    else title = customName ? `${customName} - ${year}` : `${year} Academic File`;
  }

  if (meta.mode === "finance") title = customName || "Finance Document";
  if (meta.mode === "medical") title = customName || "Medical Document";
  if (meta.mode === "legal") title = customName || "Legal Document";
  if (meta.mode === "photos") title = customName || fallback;
  if (meta.mode === "other") title = customName || fallback;

  return total > 1 ? `${title} (${index + 1})` : title;
}

export function buildStructuredDescription(meta: StructuredUploadMeta) {
  const parts: string[] = [];
  const courseCode = code(meta.courseCode);
  const customName = customDocumentName(meta);

  if (usesPersonalRecordType(meta.mode)) {
    parts.push(`Record: ${customName || personalType(meta).label}`);
  }

  if (meta.mode.startsWith("academic")) {
    if (meta.academicYear) parts.push(`Year: ${meta.academicYear}`);
    if (meta.semester) parts.push(`Semester: ${meta.semester}`);
    if (courseCode) parts.push(`Course: ${courseCode}`);
    if (clean(meta.courseTitle)) parts.push(`Course title: ${clean(meta.courseTitle)}`);
    if (customName) parts.push(`Document: ${customName}`);
  }

  if (clean(meta.institution)) parts.push(`Institution: ${clean(meta.institution)}`);
  if (meta.documentDate) parts.push(`Document date: ${meta.documentDate}`);

  return parts.join(" | ");
}

export function buildSearchText(input: {
  title: string;
  originalFilename: string;
  description: string | null;
  tags: string[];
  category: string;
  documentType: string;
  customTypeLabel: string | null;
  folderPath: string[];
  meta: StructuredUploadMeta;
}) {
  return [
    input.title,
    input.originalFilename,
    input.description ?? "",
    input.category,
    input.documentType,
    input.customTypeLabel ?? "",
    input.folderPath.join(" "),
    input.meta.academicYear ? `year ${input.meta.academicYear}` : "",
    input.meta.semester ? `semester ${input.meta.semester}` : "",
    code(input.meta.courseCode),
    input.meta.courseTitle,
    input.meta.institution,
    input.meta.documentDate,
    ...input.tags,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function matchesVaultSearch(
  file: {
    name: string;
    description: string | null;
    tags: string[] | null;
    file_type?: string | null;
    category?: string | null;
    document_type?: string | null;
    custom_type_label?: string | null;
    search_text?: string | null;
    academic_year?: string | null;
    semester?: string | null;
    course_code?: string | null;
    course_title?: string | null;
    institution?: string | null;
    folders?: { name?: string | null } | null;
  },
  query: string
) {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return true;

  const normalized = normalizeTag(trimmed);
  const tokens = trimmed
    .split(/\s+/g)
    .map((token) => token.trim())
    .filter(Boolean);
  const haystack = [
    file.name,
    file.description ?? "",
    file.file_type ?? "",
    file.category ?? "",
    file.document_type ?? "",
    file.custom_type_label ?? "",
    file.search_text ?? "",
    file.academic_year ? `year ${file.academic_year}` : "",
    file.semester ? `semester ${file.semester}` : "",
    file.course_code ?? "",
    file.course_title ?? "",
    file.institution ?? "",
    file.folders?.name ?? "",
    ...(file.tags ?? []),
  ]
    .join(" ")
    .toLowerCase();

  return (
    haystack.includes(trimmed) ||
    (!!normalized && haystack.includes(normalized)) ||
    tokens.every((token) => haystack.includes(token) || haystack.includes(normalizeTag(token)))
  );
}
