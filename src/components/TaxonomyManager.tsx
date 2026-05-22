"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, RotateCcw, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  defaultVaultTaxonomy,
  normalizeTag,
  type VaultRecordType,
  type VaultTaxonomy,
  type VaultWorkload,
} from "@/lib/vaultTaxonomy";
import {
  createTaxonomyId,
  getVaultTaxonomy,
  resetVaultTaxonomy,
  sanitizeVaultTaxonomy,
  saveVaultTaxonomy,
} from "@/lib/vaultTaxonomySettings";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

function uniqueId(label: string, taken: string[], fallback: string) {
  const base = createTaxonomyId(label, fallback);
  if (!taken.includes(base)) return base;

  let index = 2;
  while (taken.includes(`${base}-${index}`)) index += 1;
  return `${base}-${index}`;
}

function splitGroups(value: string) {
  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

export function TaxonomyManager() {
  const [taxonomy, setTaxonomy] = useState<VaultTaxonomy>(defaultVaultTaxonomy);

  useEffect(() => {
    setTaxonomy(getVaultTaxonomy());
  }, []);

  const recordGroups = useMemo(
    () =>
      Array.from(new Set(taxonomy.recordTypes.map((type) => type.group).filter(Boolean))).sort(
        (a, b) => a.localeCompare(b)
      ),
    [taxonomy.recordTypes]
  );

  function updateWorkload(value: string, patch: Partial<VaultWorkload>) {
    setTaxonomy((current) => ({
      ...current,
      workloads: current.workloads.map((workload) =>
        workload.value === value ? { ...workload, ...patch } : workload
      ),
    }));
  }

  function updateRecordType(value: string, patch: Partial<VaultRecordType>) {
    setTaxonomy((current) => ({
      ...current,
      recordTypes: current.recordTypes.map((recordType) =>
        recordType.value === value ? { ...recordType, ...patch } : recordType
      ),
    }));
  }

  function addWorkload() {
    setTaxonomy((current) => {
      const nextValue = uniqueId(
        "New workload",
        current.workloads.map((item) => item.value),
        "workload"
      );
      return {
        ...current,
        workloads: [
          ...current.workloads,
          {
            value: nextValue,
            label: "New workload",
            category: "custom",
            documentType: "custom-document",
            folderPath: "Custom Documents",
            requiresCustomDocumentName: true,
          },
        ],
      };
    });
  }

  function deleteWorkload(value: string) {
    const workload = taxonomy.workloads.find((item) => item.value === value);
    const ok = confirm(`Delete workload "${workload?.label ?? value}" from upload choices?`);
    if (!ok) return;

    setTaxonomy((current) => ({
      ...current,
      workloads:
        current.workloads.length > 1
          ? current.workloads.filter((item) => item.value !== value)
          : current.workloads,
    }));
  }

  function addRecordType() {
    setTaxonomy((current) => {
      const nextValue = uniqueId(
        "New record type",
        current.recordTypes.map((item) => item.value),
        "record"
      );
      return {
        ...current,
        recordTypes: [
          ...current.recordTypes,
          {
            value: nextValue,
            label: "New record type",
            group: "Other Documents",
            requiresCustomDocumentName: false,
          },
        ],
      };
    });
  }

  function deleteRecordType(value: string) {
    const recordType = taxonomy.recordTypes.find((item) => item.value === value);
    const ok = confirm(`Delete record type "${recordType?.label ?? value}" from upload choices?`);
    if (!ok) return;

    setTaxonomy((current) => ({
      ...current,
      recordTypes:
        current.recordTypes.length > 1
          ? current.recordTypes.filter((item) => item.value !== value)
          : current.recordTypes,
    }));
  }

  function saveChanges() {
    const sanitized = sanitizeVaultTaxonomy(taxonomy);
    setTaxonomy(sanitized);
    saveVaultTaxonomy(sanitized);
    toast.success("Vault controls saved.");
  }

  function resetDefaults() {
    const ok = confirm("Reset workloads and record types back to Nexus defaults?");
    if (!ok) return;
    resetVaultTaxonomy();
    setTaxonomy(defaultVaultTaxonomy);
    toast.success("Vault controls reset.");
  }

  return (
    <Card className="border-nexus-border bg-nexus-surface">
      <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle className="text-base font-semibold text-nexus-text">
            Vault Controls
          </CardTitle>
          <p className="mt-1 text-sm text-nexus-muted">
            Create, edit, or remove upload workloads and record types.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={saveChanges}>
            <Save className="h-4 w-4" />
            Save controls
          </Button>
          <Button type="button" variant="outline" onClick={resetDefaults}>
            <RotateCcw className="h-4 w-4" />
            Reset defaults
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <section className="space-y-3">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-sm font-bold text-nexus-text">Workloads</h3>
              <p className="text-xs text-nexus-muted">
                These appear in Upload as the main document category choices.
              </p>
            </div>
            <Button type="button" size="sm" onClick={addWorkload}>
              <Plus className="h-4 w-4" />
              New workload
            </Button>
          </div>

          <div className="space-y-3">
            {taxonomy.workloads.map((workload) => (
              <div
                key={workload.value}
                className="rounded-xl border border-nexus-border bg-nexus-bg p-4"
              >
                <div className="grid gap-3 lg:grid-cols-4">
                  <label className="space-y-1">
                    <span className="text-xs text-nexus-muted">Name shown to you</span>
                    <Input
                      value={workload.label}
                      onChange={(event) =>
                        updateWorkload(workload.value, { label: event.target.value })
                      }
                    />
                  </label>

                  <label className="space-y-1">
                    <span className="text-xs text-nexus-muted">Internal key</span>
                    <Input
                      value={workload.value}
                      onChange={(event) =>
                        updateWorkload(workload.value, {
                          value: normalizeTag(event.target.value) || workload.value,
                        })
                      }
                    />
                  </label>

                  <label className="space-y-1">
                    <span className="text-xs text-nexus-muted">Category saved on files</span>
                    <Input
                      value={workload.category}
                      onChange={(event) =>
                        updateWorkload(workload.value, {
                          category: normalizeTag(event.target.value),
                        })
                      }
                      placeholder="personal-documents"
                    />
                  </label>

                  <label className="space-y-1">
                    <span className="text-xs text-nexus-muted">Document type</span>
                    <Input
                      value={workload.documentType}
                      onChange={(event) =>
                        updateWorkload(workload.value, {
                          documentType: normalizeTag(event.target.value),
                        })
                      }
                      placeholder="certificate"
                    />
                  </label>
                </div>

                <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_220px]">
                  <label className="space-y-1">
                    <span className="text-xs text-nexus-muted">Auto folder path</span>
                    <Input
                      value={workload.folderPath}
                      onChange={(event) =>
                        updateWorkload(workload.value, { folderPath: event.target.value })
                      }
                      placeholder="Personal Documents / Certificates"
                    />
                  </label>

                  <label className="space-y-1">
                    <span className="text-xs text-nexus-muted">Allowed record groups</span>
                    <Input
                      value={workload.recordTypeGroups?.join(", ") ?? ""}
                      onChange={(event) =>
                        updateWorkload(workload.value, {
                          recordTypeGroups: splitGroups(event.target.value),
                        })
                      }
                      placeholder={recordGroups.join(", ")}
                      disabled={!workload.usesRecordType}
                    />
                  </label>
                </div>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap gap-3">
                    <label className="flex items-center gap-2 text-xs text-nexus-muted">
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-nexus-orange"
                        checked={Boolean(workload.usesRecordType)}
                        onChange={(event) =>
                          updateWorkload(workload.value, {
                            usesRecordType: event.target.checked,
                          })
                        }
                      />
                      Uses record types
                    </label>
                    <label className="flex items-center gap-2 text-xs text-nexus-muted">
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-nexus-orange"
                        checked={Boolean(workload.appendRecordGroup)}
                        disabled={!workload.usesRecordType}
                        onChange={(event) =>
                          updateWorkload(workload.value, {
                            appendRecordGroup: event.target.checked,
                          })
                        }
                      />
                      Add record group to folder
                    </label>
                    <label className="flex items-center gap-2 text-xs text-nexus-muted">
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-nexus-orange"
                        checked={Boolean(workload.requiresCustomDocumentName)}
                        onChange={(event) =>
                          updateWorkload(workload.value, {
                            requiresCustomDocumentName: event.target.checked,
                          })
                        }
                      />
                      Ask “what is this?”
                    </label>
                    <label className="flex items-center gap-2 text-xs text-nexus-muted">
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-nexus-orange"
                        checked={Boolean(workload.usesAcademicFields)}
                        onChange={(event) =>
                          updateWorkload(workload.value, {
                            usesAcademicFields: event.target.checked,
                          })
                        }
                      />
                      Academic fields
                    </label>
                    <label className="flex items-center gap-2 text-xs text-nexus-muted">
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-nexus-orange"
                        checked={Boolean(workload.includeCourseCodeInFolder)}
                        disabled={!workload.usesAcademicFields}
                        onChange={(event) =>
                          updateWorkload(workload.value, {
                            includeCourseCodeInFolder: event.target.checked,
                          })
                        }
                      />
                      Folder by course code
                    </label>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => deleteWorkload(workload.value)}
                    disabled={taxonomy.workloads.length <= 1}
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-sm font-bold text-nexus-text">Record Types</h3>
              <p className="text-xs text-nexus-muted">
                These appear inside workloads like identity documents and certificates.
              </p>
            </div>
            <Button type="button" size="sm" onClick={addRecordType}>
              <Plus className="h-4 w-4" />
              New record type
            </Button>
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            {taxonomy.recordTypes.map((recordType) => (
              <div
                key={recordType.value}
                className="rounded-xl border border-nexus-border bg-nexus-bg p-4"
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="space-y-1">
                    <span className="text-xs text-nexus-muted">Name shown to you</span>
                    <Input
                      value={recordType.label}
                      onChange={(event) =>
                        updateRecordType(recordType.value, { label: event.target.value })
                      }
                    />
                  </label>

                  <label className="space-y-1">
                    <span className="text-xs text-nexus-muted">Internal key</span>
                    <Input
                      value={recordType.value}
                      onChange={(event) =>
                        updateRecordType(recordType.value, {
                          value: normalizeTag(event.target.value) || recordType.value,
                        })
                      }
                    />
                  </label>

                  <label className="space-y-1 sm:col-span-2">
                    <span className="text-xs text-nexus-muted">Group</span>
                    <Input
                      value={recordType.group}
                      onChange={(event) =>
                        updateRecordType(recordType.value, { group: event.target.value })
                      }
                      placeholder="Identity Documents"
                    />
                  </label>
                </div>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                  <label className="flex items-center gap-2 text-xs text-nexus-muted">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-nexus-orange"
                      checked={Boolean(recordType.requiresCustomDocumentName)}
                      onChange={(event) =>
                        updateRecordType(recordType.value, {
                          requiresCustomDocumentName: event.target.checked,
                        })
                      }
                    />
                    Ask “what is this?” when selected
                  </label>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => deleteRecordType(recordType.value)}
                    disabled={taxonomy.recordTypes.length <= 1}
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </CardContent>
    </Card>
  );
}
