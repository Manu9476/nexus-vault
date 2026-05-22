export const personalRecordTypes = [
  { value: "birth-certificate", label: "Birth Certificate", folder: "Personal Records - Identity" },
  { value: "national-id", label: "National ID", folder: "Personal Records - Identity" },
  { value: "driving-license", label: "Driving License", folder: "Personal Records - Identity" },
  { value: "kcse-certificate", label: "KCSE Certificate", folder: "Personal Records - Certificates" },
  { value: "certificate", label: "Other Certificate", folder: "Personal Records - Certificates" },
  { value: "other-record", label: "Other Personal Record", folder: "Personal Records - Other" },
] as const;

export const uploadModes = [
  { value: "general", label: "General file" },
  { value: "personal-record", label: "ID / certificate / license" },
  { value: "academic-result", label: "Academic result" },
  { value: "academic-notes", label: "Course notes" },
  { value: "academic-other", label: "Other academic file" },
] as const;

export const academicYears = ["1", "2", "3", "4", "5"] as const;
export const academicSemesters = ["1", "2", "3"] as const;

export type UploadMode = (typeof uploadModes)[number]["value"];
export type PersonalRecordType = (typeof personalRecordTypes)[number]["value"];

export type StructuredUploadMeta = {
  mode: UploadMode;
  personalRecordType: PersonalRecordType;
  academicYear: string;
  semester: string;
  courseCode: string;
  courseTitle: string;
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

function personalType(meta: StructuredUploadMeta) {
  return personalRecordTypes.find((item) => item.value === meta.personalRecordType) ?? personalRecordTypes[0];
}

export function buildStructuredFolderName(meta: StructuredUploadMeta) {
  if (meta.mode === "personal-record") {
    return personalType(meta).folder;
  }

  if (meta.mode === "academic-result") {
    return meta.academicYear
      ? `Academic Results - Year ${meta.academicYear}`
      : "Academic Results";
  }

  if (meta.mode === "academic-notes") {
    const courseCode = code(meta.courseCode);
    const yearPart = meta.academicYear ? `Year ${meta.academicYear}` : "Unsorted";
    const semesterPart = meta.semester ? `Semester ${meta.semester}` : "No Semester";
    return courseCode
      ? `Course Notes - ${yearPart} - ${semesterPart} - ${courseCode}`
      : `Course Notes - ${yearPart} - ${semesterPart}`;
  }

  if (meta.mode === "academic-other") {
    return meta.academicYear ? `Academic Files - Year ${meta.academicYear}` : "Academic Files";
  }

  return null;
}

export function buildStructuredTags(meta: StructuredUploadMeta, manualTags: string[]) {
  const tags = new Set<string>();

  for (const tag of manualTags) {
    const normalized = normalizeTag(tag);
    if (normalized) tags.add(normalized);
  }

  if (meta.mode !== "general") tags.add(`mode:${meta.mode}`);

  if (meta.mode === "personal-record") {
    const type = personalType(meta);
    tags.add("personal-record");
    tags.add(type.value);
    tags.add(`record:${type.value}`);
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

  if (meta.mode === "personal-record") {
    title = personalType(meta).label;
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
    title = courseCode ? `${courseCode} File - ${year}` : `${year} Academic File`;
  }

  return total > 1 ? `${title} (${index + 1})` : title;
}

export function buildStructuredDescription(meta: StructuredUploadMeta) {
  const parts: string[] = [];
  const courseCode = code(meta.courseCode);

  if (meta.mode === "personal-record") parts.push(`Record: ${personalType(meta).label}`);

  if (meta.mode.startsWith("academic")) {
    if (meta.academicYear) parts.push(`Year: ${meta.academicYear}`);
    if (meta.semester) parts.push(`Semester: ${meta.semester}`);
    if (courseCode) parts.push(`Course: ${courseCode}`);
    if (meta.courseTitle.trim()) parts.push(`Course title: ${meta.courseTitle.trim()}`);
  }

  return parts.join(" | ");
}

export function matchesVaultSearch(
  file: {
    name: string;
    description: string | null;
    tags: string[] | null;
    file_type?: string | null;
  },
  query: string
) {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return true;

  const normalized = normalizeTag(trimmed);
  const haystack = [
    file.name,
    file.description ?? "",
    file.file_type ?? "",
    ...(file.tags ?? []),
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(trimmed) || (!!normalized && haystack.includes(normalized));
}
