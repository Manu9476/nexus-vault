import {
  defaultVaultTaxonomy,
  normalizeTag,
  type VaultRecordType,
  type VaultTaxonomy,
  type VaultWorkload,
} from "@/lib/vaultTaxonomy";

const taxonomyStorageKey = "nexus:vault-taxonomy";

export function createTaxonomyId(label: string, fallback = "custom") {
  return normalizeTag(label) || `${fallback}-${Date.now()}`;
}

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
}

function cleanList(value: unknown) {
  if (!Array.isArray(value)) return undefined;
  const groups = value.map(cleanText).filter(Boolean);
  return groups.length ? groups : undefined;
}

export function sanitizeWorkload(value: Partial<VaultWorkload>, fallbackLabel = "Custom workload") {
  const label = cleanText(value.label) || fallbackLabel;
  const workload: VaultWorkload = {
    value: cleanText(value.value) || createTaxonomyId(label, "workload"),
    label,
    category: normalizeTag(cleanText(value.category) || label) || "custom",
    documentType: normalizeTag(cleanText(value.documentType) || label) || "document",
    folderPath: cleanText(value.folderPath) || label,
    usesRecordType: Boolean(value.usesRecordType),
    recordTypeGroups: cleanList(value.recordTypeGroups),
    appendRecordGroup: Boolean(value.appendRecordGroup),
    requiresCustomDocumentName: Boolean(value.requiresCustomDocumentName),
    usesAcademicFields: Boolean(value.usesAcademicFields),
    includeCourseCodeInFolder: Boolean(value.includeCourseCodeInFolder),
  };

  if (!workload.usesRecordType) {
    delete workload.recordTypeGroups;
    workload.appendRecordGroup = false;
  }

  if (!workload.usesAcademicFields) {
    workload.includeCourseCodeInFolder = false;
  }

  return workload;
}

export function sanitizeRecordType(
  value: Partial<VaultRecordType>,
  fallbackLabel = "Custom record"
) {
  const label = cleanText(value.label) || fallbackLabel;
  return {
    value: cleanText(value.value) || createTaxonomyId(label, "record"),
    label,
    group: cleanText(value.group) || "Other Documents",
    requiresCustomDocumentName: Boolean(value.requiresCustomDocumentName),
  };
}

function ensureUniqueValues<T extends { value: string }>(items: T[], fallback: string) {
  const seen = new Set<string>();
  return items.map((item) => {
    let nextValue = item.value || fallback;
    if (!seen.has(nextValue)) {
      seen.add(nextValue);
      return item;
    }

    let index = 2;
    while (seen.has(`${nextValue}-${index}`)) index += 1;
    nextValue = `${nextValue}-${index}`;
    seen.add(nextValue);
    return { ...item, value: nextValue };
  });
}

export function sanitizeVaultTaxonomy(value: Partial<VaultTaxonomy> | null | undefined) {
  const workloads = ensureUniqueValues(Array.isArray(value?.workloads)
    ? value!.workloads.map((item) => sanitizeWorkload(item))
    : defaultVaultTaxonomy.workloads, "workload");
  const recordTypes = ensureUniqueValues(Array.isArray(value?.recordTypes)
    ? value!.recordTypes.map((item) => sanitizeRecordType(item))
    : defaultVaultTaxonomy.recordTypes, "record");

  return {
    workloads: workloads.length ? workloads : defaultVaultTaxonomy.workloads,
    recordTypes: recordTypes.length ? recordTypes : defaultVaultTaxonomy.recordTypes,
  };
}

export function getVaultTaxonomy(): VaultTaxonomy {
  if (typeof window === "undefined") return defaultVaultTaxonomy;

  try {
    const raw = window.localStorage.getItem(taxonomyStorageKey);
    if (!raw) return defaultVaultTaxonomy;
    return sanitizeVaultTaxonomy(JSON.parse(raw) as Partial<VaultTaxonomy>);
  } catch {
    return defaultVaultTaxonomy;
  }
}

export function saveVaultTaxonomy(taxonomy: VaultTaxonomy) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(taxonomyStorageKey, JSON.stringify(sanitizeVaultTaxonomy(taxonomy)));
  window.dispatchEvent(new Event("nexus:taxonomy-updated"));
}

export function resetVaultTaxonomy() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(taxonomyStorageKey);
  window.dispatchEvent(new Event("nexus:taxonomy-updated"));
}
