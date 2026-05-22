import type { UploadMode } from "@/lib/vaultTaxonomy";

export type FileViewPreference = "grid" | "list";

export type VaultPreferences = {
  defaultFileView: FileViewPreference;
  defaultUploadMode: UploadMode;
  autoOrganizeUploads: boolean;
};

export const defaultVaultPreferences: VaultPreferences = {
  defaultFileView: "grid",
  defaultUploadMode: "personal-record",
  autoOrganizeUploads: true,
};

const storageKey = "nexus:vault-preferences";

export function getVaultPreferences(): VaultPreferences {
  if (typeof window === "undefined") return defaultVaultPreferences;

  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return defaultVaultPreferences;
    const parsed = JSON.parse(raw) as Partial<VaultPreferences>;

    return {
      defaultFileView:
        parsed.defaultFileView === "list" || parsed.defaultFileView === "grid"
          ? parsed.defaultFileView
          : defaultVaultPreferences.defaultFileView,
      defaultUploadMode:
        typeof parsed.defaultUploadMode === "string"
          ? parsed.defaultUploadMode
          : defaultVaultPreferences.defaultUploadMode,
      autoOrganizeUploads:
        typeof parsed.autoOrganizeUploads === "boolean"
          ? parsed.autoOrganizeUploads
          : defaultVaultPreferences.autoOrganizeUploads,
    };
  } catch {
    return defaultVaultPreferences;
  }
}

export function saveVaultPreferences(preferences: VaultPreferences) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(storageKey, JSON.stringify(preferences));
}

export function resetVaultPreferences() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(storageKey);
}
