import type { VaultFileType } from "@/types";

export type VaultRecordType = {
  value: string;
  label: string;
  group: string;
  requiresCustomDocumentName?: boolean;
};

export type VaultWorkload = {
  value: string;
  label: string;
  category: string;
  documentType: string;
  folderPath: string;
  usesRecordType?: boolean;
  recordTypeGroups?: string[];
  appendRecordGroup?: boolean;
  requiresCustomDocumentName?: boolean;
  usesAcademicFields?: boolean;
  includeCourseCodeInFolder?: boolean;
};

export type VaultTaxonomy = {
  workloads: VaultWorkload[];
  recordTypes: VaultRecordType[];
};

export const personalRecordTypes: VaultRecordType[] = [
  { value: "birth-certificate", label: "Birth Certificate", group: "Identity Documents" },
  { value: "national-id", label: "National ID", group: "Identity Documents" },
  { value: "driving-license", label: "Driving License", group: "Identity Documents" },
  { value: "kcse-certificate", label: "KCSE Certificate", group: "Certificates" },
  {
    value: "certificate",
    label: "Other Certificate",
    group: "Certificates",
    requiresCustomDocumentName: true,
  },
  {
    value: "other-record",
    label: "Other Personal Record",
    group: "Other Documents",
    requiresCustomDocumentName: true,
  },
];

export const uploadModes: VaultWorkload[] = [
  {
    value: "general",
    label: "General file",
    category: "general",
    documentType: "file",
    folderPath: "",
  },
  {
    value: "personal-record",
    label: "Personal document",
    category: "personal-documents",
    documentType: "personal-record",
    folderPath: "Personal Documents",
    usesRecordType: true,
    appendRecordGroup: true,
  },
  {
    value: "identity-documents",
    label: "Identity document",
    category: "personal-documents",
    documentType: "identity-document",
    folderPath: "Personal Documents / Identity Documents",
    usesRecordType: true,
    recordTypeGroups: ["Identity Documents"],
  },
  {
    value: "certificates",
    label: "Certificate",
    category: "personal-documents",
    documentType: "certificate",
    folderPath: "Personal Documents / Certificates",
    usesRecordType: true,
    recordTypeGroups: ["Certificates"],
  },
  {
    value: "academic-result",
    label: "Academic result",
    category: "academic",
    documentType: "academic-result",
    folderPath: "Academic / Results",
    usesAcademicFields: true,
  },
  {
    value: "academic-notes",
    label: "Course notes",
    category: "academic",
    documentType: "course-notes",
    folderPath: "Academic / Course Notes",
    usesAcademicFields: true,
    includeCourseCodeInFolder: true,
  },
  {
    value: "finance",
    label: "Finance",
    category: "finance",
    documentType: "finance",
    folderPath: "Finance",
    requiresCustomDocumentName: true,
  },
  {
    value: "medical",
    label: "Medical",
    category: "medical",
    documentType: "medical",
    folderPath: "Medical",
    requiresCustomDocumentName: true,
  },
  {
    value: "legal",
    label: "Legal",
    category: "legal",
    documentType: "legal",
    folderPath: "Legal",
    requiresCustomDocumentName: true,
  },
  {
    value: "photos",
    label: "Photos",
    category: "photos",
    documentType: "photo",
    folderPath: "Photos",
  },
  {
    value: "academic-other",
    label: "Other academic file",
    category: "academic",
    documentType: "academic-file",
    folderPath: "Academic / Other Files",
    requiresCustomDocumentName: true,
    usesAcademicFields: true,
  },
  {
    value: "other",
    label: "Other document",
    category: "other",
    documentType: "other",
    folderPath: "Other Documents",
    requiresCustomDocumentName: true,
  },
];

export const defaultVaultTaxonomy: VaultTaxonomy = {
  workloads: uploadModes,
  recordTypes: personalRecordTypes,
};

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

export type UploadMode = string;
export type PersonalRecordType = string;

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

export function splitFolderPath(folderPath: string) {
  return folderPath
    .split("/")
    .map((part) => clean(part))
    .filter(Boolean);
}

export function getWorkload(mode: UploadMode, taxonomy?: VaultTaxonomy) {
  const workloads = taxonomy?.workloads?.length ? taxonomy.workloads : uploadModes;
  return workloads.find((item) => item.value === mode) ?? uploadModes.find((item) => item.value === mode);
}

function recordTypesForTaxonomy(taxonomy?: VaultTaxonomy) {
  return taxonomy?.recordTypes?.length ? taxonomy.recordTypes : personalRecordTypes;
}

function personalType(meta: StructuredUploadMeta, taxonomy?: VaultTaxonomy) {
  const recordTypes = recordTypesForTaxonomy(taxonomy);
  return (
    recordTypes.find((item) => item.value === meta.personalRecordType) ??
    recordTypes[0] ?? { value: "record", label: "Record", group: "Personal Documents" }
  );
}

export function usesPersonalRecordType(mode: UploadMode, taxonomy?: VaultTaxonomy) {
  const workload = getWorkload(mode, taxonomy);
  return Boolean(workload?.usesRecordType);
}

export function requiresCustomDocumentName(meta: StructuredUploadMeta, taxonomy?: VaultTaxonomy) {
  const workload = getWorkload(meta.mode, taxonomy);
  const recordType = usesPersonalRecordType(meta.mode, taxonomy)
    ? personalType(meta, taxonomy)
    : null;
  return Boolean(workload?.requiresCustomDocumentName || recordType?.requiresCustomDocumentName);
}

export function customDocumentName(meta: StructuredUploadMeta) {
  return clean(meta.customDocumentName);
}

export function buildStructuredCategory(
  meta: StructuredUploadMeta,
  fileType?: VaultFileType,
  taxonomy?: VaultTaxonomy
) {
  const workload = getWorkload(meta.mode, taxonomy);
  if (workload?.category) return workload.category;
  if (fileType === "image") return "photos";
  return "general";
}

export function buildStructuredDocumentType(
  meta: StructuredUploadMeta,
  fileType?: VaultFileType,
  taxonomy?: VaultTaxonomy
) {
  const workload = getWorkload(meta.mode, taxonomy);
  if (usesPersonalRecordType(meta.mode, taxonomy)) return personalType(meta, taxonomy).value;
  if (meta.mode === "academic-result") return "academic-result";
  if (meta.mode === "academic-notes") return "course-notes";
  if (meta.mode === "academic-other") return normalizeTag(customDocumentName(meta)) || "academic-file";
  if (workload?.requiresCustomDocumentName && customDocumentName(meta)) {
    return normalizeTag(customDocumentName(meta)) || workload.documentType;
  }
  if (workload?.documentType) return workload.documentType;
  if (fileType === "image") return "photo";
  if (meta.mode === "other") return normalizeTag(customDocumentName(meta)) || "other";
  return fileType ?? "file";
}

export function buildStructuredFolderPath(
  meta: StructuredUploadMeta,
  fileType?: VaultFileType,
  taxonomy?: VaultTaxonomy
) {
  const workload = getWorkload(meta.mode, taxonomy);
  const customName = customDocumentName(meta);
  const courseCode = code(meta.courseCode);

  if (meta.mode === "photos" || (!workload && fileType === "image")) return ["Photos"];

  if (usesPersonalRecordType(meta.mode, taxonomy)) {
    const type = personalType(meta, taxonomy);
    const group =
      meta.mode === "identity-documents"
        ? "Identity Documents"
        : meta.mode === "certificates"
          ? "Certificates"
          : type.group;
    const path = splitFolderPath(workload?.folderPath ?? "Personal Documents");
    if (workload?.appendRecordGroup && group && path[path.length - 1] !== group) path.push(group);
    if (type.requiresCustomDocumentName && customName) path.push(customName);
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

  if (workload) {
    const path = splitFolderPath(workload.folderPath || workload.label);
    if (workload.usesAcademicFields) {
      if (meta.academicYear) path.push(`Year ${meta.academicYear}`);
      if (meta.semester) path.push(`Semester ${meta.semester}`);
      if (workload.includeCourseCodeInFolder && courseCode) path.push(courseCode);
    }
    if (workload.requiresCustomDocumentName && customName) path.push(customName);
    return path.length ? path : null;
  }

  return null;
}

export function buildStructuredFolderName(
  meta: StructuredUploadMeta,
  fileType?: VaultFileType,
  taxonomy?: VaultTaxonomy
) {
  return buildStructuredFolderPath(meta, fileType, taxonomy)?.join(" / ") ?? null;
}

export function buildStructuredTags(
  meta: StructuredUploadMeta,
  manualTags: string[],
  taxonomy?: VaultTaxonomy
) {
  const tags = new Set<string>();
  const customName = customDocumentName(meta);
  const workload = getWorkload(meta.mode, taxonomy);

  for (const tag of manualTags) {
    const normalized = normalizeTag(tag);
    if (normalized) tags.add(normalized);
  }

  if (meta.mode !== "general") tags.add(`mode:${meta.mode}`);
  if (workload?.label) tags.add(normalizeTag(workload.label));

  const category = buildStructuredCategory(meta, undefined, taxonomy);
  if (category) tags.add(category);

  const documentType = buildStructuredDocumentType(meta, undefined, taxonomy);
  if (documentType) tags.add(documentType);

  if (usesPersonalRecordType(meta.mode, taxonomy)) {
    const type = personalType(meta, taxonomy);
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
  taxonomy,
}: {
  meta: StructuredUploadMeta;
  fallback: string;
  index: number;
  total: number;
  taxonomy?: VaultTaxonomy;
}) {
  let title = fallback;
  const courseCode = code(meta.courseCode);
  const customName = customDocumentName(meta);
  const workload = getWorkload(meta.mode, taxonomy);

  if (usesPersonalRecordType(meta.mode, taxonomy)) {
    title = customName || personalType(meta, taxonomy).label;
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
  if (!uploadModes.some((mode) => mode.value === meta.mode) && workload) {
    if (workload.usesAcademicFields) {
      const year = meta.academicYear ? `Year ${meta.academicYear}` : workload.label;
      const semester = meta.semester ? ` Semester ${meta.semester}` : "";
      title = courseCode
        ? `${courseCode} ${customName || workload.label} - ${year}${semester}`
        : `${customName || workload.label} - ${year}${semester}`;
    } else {
      title = customName || workload.label || fallback;
    }
  }

  return total > 1 ? `${title} (${index + 1})` : title;
}

export function buildStructuredDescription(meta: StructuredUploadMeta, taxonomy?: VaultTaxonomy) {
  const parts: string[] = [];
  const courseCode = code(meta.courseCode);
  const customName = customDocumentName(meta);
  const workload = getWorkload(meta.mode, taxonomy);

  if (workload?.label) parts.push(`Workload: ${workload.label}`);

  if (usesPersonalRecordType(meta.mode, taxonomy)) {
    parts.push(`Record: ${customName || personalType(meta, taxonomy).label}`);
  }

  if (meta.mode.startsWith("academic") || workload?.usesAcademicFields) {
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
