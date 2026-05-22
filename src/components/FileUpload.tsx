"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { createSupabaseBrowser } from "@/lib/supabase";
import {
  DEFAULT_STORAGE_BUCKET,
  buildStoragePath,
  detectFileType,
  parseTagsInput,
  sanitizeFilename,
} from "@/lib/fileHelpers";
import {
  academicSemesters,
  academicYears,
  buildSearchText,
  buildStructuredCategory,
  buildStructuredDescription,
  buildStructuredDocumentType,
  buildStructuredFolderPath,
  buildStructuredTags,
  buildStructuredTitle,
  customDocumentName,
  defaultVaultTaxonomy,
  getWorkload,
  requiresCustomDocumentName,
  usesPersonalRecordType,
  type PersonalRecordType,
  type StructuredUploadMeta,
  type UploadMode,
  type VaultTaxonomy,
} from "@/lib/vaultTaxonomy";
import { defaultVaultPreferences, getVaultPreferences } from "@/lib/vaultSettings";
import { getVaultTaxonomy } from "@/lib/vaultTaxonomySettings";
import type { VaultFolder } from "@/types";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export type UploadMeta = {
  titlePrefix: string;
  description: string;
  tagsInput: string;
  folderId: string | null;
  autoOrganize: boolean;
  structured: StructuredUploadMeta;
};

export function FileUpload({
  onUploaded,
  defaultFolderId = null,
}: {
  onUploaded?: () => void;
  defaultFolderId?: string | null;
}) {
  const supabase = useMemo(() => createSupabaseBrowser(), []);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const preferences = defaultVaultPreferences;
  const [taxonomy, setTaxonomy] = useState<VaultTaxonomy>(defaultVaultTaxonomy);
  const [hasAppliedClientDefaults, setHasAppliedClientDefaults] = useState(false);
  const defaultUploadMode =
    taxonomy.workloads.some((mode) => mode.value === preferences.defaultUploadMode)
      ? preferences.defaultUploadMode
      : taxonomy.workloads[0]?.value ?? "general";
  const defaultRecordType = taxonomy.recordTypes[0]?.value ?? "record";

  const [folders, setFolders] = useState<VaultFolder[]>([]);
  const [loadingFolders, setLoadingFolders] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [meta, setMeta] = useState<UploadMeta>({
    titlePrefix: "",
    description: "",
    tagsInput: "",
    folderId: defaultFolderId,
    autoOrganize: defaultFolderId ? false : preferences.autoOrganizeUploads,
    structured: {
      mode: defaultUploadMode,
      personalRecordType: defaultRecordType,
      customDocumentName: "",
      academicYear: "1",
      semester: "1",
      courseCode: "",
      courseTitle: "",
      institution: "",
      documentDate: "",
    },
  });

  useEffect(() => {
    function refreshTaxonomy() {
      setTaxonomy(getVaultTaxonomy());
    }

    refreshTaxonomy();
    window.addEventListener("storage", refreshTaxonomy);
    window.addEventListener("nexus:taxonomy-updated", refreshTaxonomy);

    return () => {
      window.removeEventListener("storage", refreshTaxonomy);
      window.removeEventListener("nexus:taxonomy-updated", refreshTaxonomy);
    };
  }, []);

  useEffect(() => {
    if (hasAppliedClientDefaults) return;

    const clientTaxonomy = getVaultTaxonomy();
    const clientPreferences = getVaultPreferences();
    const nextMode = clientTaxonomy.workloads.some(
      (mode) => mode.value === clientPreferences.defaultUploadMode
    )
      ? clientPreferences.defaultUploadMode
      : clientTaxonomy.workloads[0]?.value ?? "general";
    const nextRecordType = clientTaxonomy.recordTypes[0]?.value ?? "record";

    setTaxonomy(clientTaxonomy);
    setMeta((current) => ({
      ...current,
      autoOrganize: defaultFolderId ? false : clientPreferences.autoOrganizeUploads,
      structured: {
        ...current.structured,
        mode: nextMode,
        personalRecordType: nextRecordType,
      },
    }));
    setHasAppliedClientDefaults(true);
  }, [defaultFolderId, hasAppliedClientDefaults]);

  useEffect(() => {
    setMeta((current) => ({
      ...current,
      folderId: defaultFolderId,
      autoOrganize: defaultFolderId ? false : current.autoOrganize,
    }));
  }, [defaultFolderId]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (!supabase) return;
        setLoadingFolders(true);
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
          .from("folders")
          .select("id,user_id,name,parent_id,color,icon,shape,sort_order,created_at")
          .order("sort_order", { ascending: true })
          .order("name", { ascending: true });

        if (!mounted) return;
        if (error) throw error;
        setFolders((data ?? []) as any);
      } catch {
        // ignore: show empty select
      } finally {
        if (mounted) setLoadingFolders(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [supabase]);

  useEffect(() => {
    setMeta((current) => {
      const nextMode = taxonomy.workloads.some((mode) => mode.value === current.structured.mode)
        ? current.structured.mode
        : taxonomy.workloads[0]?.value ?? "general";
      const workload = getWorkload(nextMode, taxonomy);
      const recordTypeOptions = taxonomy.recordTypes.filter((type) => {
        if (!workload?.usesRecordType) return false;
        if (!workload.recordTypeGroups?.length) return true;
        return workload.recordTypeGroups.includes(type.group);
      });
      const nextRecordType = recordTypeOptions.some(
        (type) => type.value === current.structured.personalRecordType
      )
        ? current.structured.personalRecordType
        : recordTypeOptions[0]?.value ?? taxonomy.recordTypes[0]?.value ?? "record";

      if (
        nextMode === current.structured.mode &&
        nextRecordType === current.structured.personalRecordType
      ) {
        return current;
      }

      return {
        ...current,
        structured: {
          ...current.structured,
          mode: nextMode,
          personalRecordType: nextRecordType,
        },
      };
    });
  }, [meta.structured.mode, taxonomy]);

  function updateStructured<K extends keyof StructuredUploadMeta>(
    key: K,
    value: StructuredUploadMeta[K]
  ) {
    setMeta((current) => ({
      ...current,
      structured: {
        ...current.structured,
        [key]: value,
      },
    }));
  }

  async function getOrCreateFolder(userId: string, folderName: string, parentId: string | null) {
    let query = supabase
      .from("folders")
      .select("id")
      .eq("user_id", userId)
      .eq("name", folderName)
      .limit(1);

    query = parentId ? query.eq("parent_id", parentId) : query.is("parent_id", null);

    const { data: existing, error: existingErr } = await query.maybeSingle();

    if (existingErr) throw existingErr;
    if (existing?.id) return existing.id as string;

    const { data: created, error: createErr } = await supabase
      .from("folders")
      .insert({
        user_id: userId,
        name: folderName,
        parent_id: parentId,
        color: null,
        icon: null,
        shape: "soft",
        sort_order: folders.filter((folder) => folder.parent_id === parentId).length,
      })
      .select("id")
      .single();

    if (createErr) throw createErr;
    return created.id as string;
  }

  async function getOrCreateFolderPath(userId: string, folderPath: string[] | null) {
    if (!folderPath?.length) return null;
    let parentId: string | null = null;
    for (const folderName of folderPath) {
      parentId = await getOrCreateFolder(userId, folderName, parentId);
    }
    return parentId;
  }

  function folderPathLabel(folder: VaultFolder) {
    const byId = new Map(folders.map((item) => [item.id, item]));
    const parts = [folder.name];
    let parentId = folder.parent_id;
    const seen = new Set<string>([folder.id]);

    while (parentId && !seen.has(parentId)) {
      const parent = byId.get(parentId);
      if (!parent) break;
      parts.unshift(parent.name);
      seen.add(parent.id);
      parentId = parent.parent_id;
    }

    return parts.join(" / ");
  }

  const folderOptions = useMemo(
    () =>
      folders
        .map((folder) => ({
          ...folder,
          label: folderPathLabel(folder),
        }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [folders]
  );

  async function uploadFiles(files: FileList | File[]) {
    if (!supabase) {
      toast.error("Supabase is not configured yet.");
      return;
    }

    const fileArr = Array.from(files);
    if (fileArr.length === 0) return;

    if (requiresCustomDocumentName(meta.structured, taxonomy) && !customDocumentName(meta.structured)) {
      toast.error("Write what this other document is before uploading.");
      return;
    }

    const { data: authRes, error: userErr } = await supabase.auth.getUser();
    if (userErr || !authRes.user) {
      toast.error("Please login again.");
      return;
    }

    const user = authRes.user;
    const tags = buildStructuredTags(meta.structured, parseTagsInput(meta.tagsInput), taxonomy);
    const generatedDescription = buildStructuredDescription(meta.structured, taxonomy);
    const folderCache = new Map<string, string | null>();

    setIsUploading(true);
    try {
      const uploaded: string[] = [];

      for (let index = 0; index < fileArr.length; index++) {
        const file = fileArr[index];
        const fileId = crypto.randomUUID();
        const originalFilename = file.name;
        const safeOriginal = sanitizeFilename(originalFilename);
        const storagePath = buildStoragePath({
          userId: user.id,
          fileId,
          originalFilename: safeOriginal,
        });

        const fileType = detectFileType({
          fileName: originalFilename,
          mimeType: file.type,
        });
        let targetFolderId = meta.folderId;
        const autoFolderPath = buildStructuredFolderPath(meta.structured, fileType, taxonomy);

        if (!targetFolderId && meta.autoOrganize && autoFolderPath?.length) {
          const cacheKey = autoFolderPath.join("/");
          if (!folderCache.has(cacheKey)) {
            folderCache.set(cacheKey, await getOrCreateFolderPath(user.id, autoFolderPath));
          }
          targetFolderId = folderCache.get(cacheKey) ?? null;
        }

        // Upload to Supabase Storage.
        const { error: storageErr } = await supabase.storage
          .from(DEFAULT_STORAGE_BUCKET)
          .upload(storagePath, file, {
            contentType: file.type || undefined,
          });

        if (storageErr) throw storageErr;

        const title =
          meta.titlePrefix.trim().length > 0
            ? `${meta.titlePrefix.trim()}${fileArr.length > 1 ? ` (${index + 1})` : ""}`
            : buildStructuredTitle({
                meta: meta.structured,
                fallback: originalFilename,
                index,
                total: fileArr.length,
                taxonomy,
              });

        const description = [generatedDescription, meta.description.trim()]
          .filter(Boolean)
          .join("\n");
        const category = buildStructuredCategory(meta.structured, fileType, taxonomy);
        const documentType = buildStructuredDocumentType(meta.structured, fileType, taxonomy);
        const customTypeLabel = customDocumentName(meta.structured) || null;
        const isAcademic = meta.structured.mode.startsWith("academic");
        const searchText = buildSearchText({
          title,
          originalFilename,
          description: description || null,
          tags,
          category,
          documentType,
          customTypeLabel,
          folderPath: autoFolderPath ?? [],
          meta: meta.structured,
        });

        const { error: insertErr } = await supabase.from("files").insert({
          id: fileId,
          user_id: user.id,
          name: title,
          original_filename: originalFilename,
          storage_path: storagePath,
          public_url: null,
          file_type: fileType,
          mime_type: file.type || null,
          size_bytes: file.size,
          folder_id: targetFolderId,
          category,
          document_type: documentType,
          custom_type_label: customTypeLabel,
          description: description || null,
          tags: tags.length ? tags : [],
          search_text: searchText,
          document_date: meta.structured.documentDate || null,
          academic_year: isAcademic ? meta.structured.academicYear || null : null,
          semester: isAcademic ? meta.structured.semester || null : null,
          course_code: isAcademic ? meta.structured.courseCode.trim() || null : null,
          course_title: isAcademic ? meta.structured.courseTitle.trim() || null : null,
          institution: meta.structured.institution.trim() || null,
        });

        if (insertErr) throw insertErr;
        uploaded.push(fileId);
      }

      toast.success(`Uploaded ${uploaded.length} file${uploaded.length === 1 ? "" : "s"}.`);
      setMeta((m) => ({
        ...m,
        titlePrefix: "",
        description: "",
        tagsInput: "",
        structured: {
          ...m.structured,
          customDocumentName: "",
        },
      }));
      onUploaded?.();
    } catch (err: any) {
      toast.error(err?.message ?? "Upload failed.");
    } finally {
      setIsUploading(false);
    }
  }

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files?.length) {
      uploadFiles(e.dataTransfer.files);
    }
  }

  function onDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
  }

  const selectedWorkload = getWorkload(meta.structured.mode, taxonomy);
  const needsCustomDocumentName = requiresCustomDocumentName(meta.structured, taxonomy);
  const usesRecordType = usesPersonalRecordType(meta.structured.mode, taxonomy);
  const usesAcademicFields = Boolean(
    selectedWorkload?.usesAcademicFields || meta.structured.mode.startsWith("academic")
  );
  const suggestedFolderPath = buildStructuredFolderPath(meta.structured, undefined, taxonomy)?.join(" / ");
  const recordTypeOptions = taxonomy.recordTypes.filter((type) => {
    if (!usesRecordType) return false;
    if (!selectedWorkload?.recordTypeGroups?.length) return true;
    return selectedWorkload.recordTypeGroups.includes(type.group);
  });

  return (
    <Card className="border-nexus-border bg-nexus-surface">
      <CardContent className="p-4">
        {!supabase ? (
          <div className="mb-4 rounded-xl border border-nexus-orange/40 bg-nexus-orange/10 p-4 text-sm text-nexus-orange">
            Supabase is not configured yet. Add NEXT_PUBLIC_SUPABASE_URL,
            NEXT_PUBLIC_SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY in .env.local,
            then restart the dev server to enable uploads and folder data.
          </div>
        ) : null}

        <div
          onDrop={onDrop}
          onDragOver={onDragOver}
          className="rounded-xl border border-dashed border-nexus-border bg-nexus-surface p-5"
        >
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="font-display text-lg font-bold">Smart upload</div>
              <div className="mt-1 text-sm text-nexus-muted">
                Add records, results, notes, and supporting files.
              </div>
            </div>

            <div className="flex items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                multiple
                disabled={!supabase || isUploading}
                onChange={(e) => {
                  const input = e.currentTarget;
                  const files = input.files ? Array.from(input.files) : [];
                  if (!files.length) return;
                  void uploadFiles(files).finally(() => {
                    input.value = "";
                  });
                }}
              />
              <Button
                type="button"
                disabled={isUploading || !supabase}
                onClick={() => fileInputRef.current?.click()}
              >
                {isUploading
                  ? "Uploading..."
                  : !supabase
                    ? "Configure Supabase first"
                    : "Choose files"}
              </Button>
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <div className="text-xs text-nexus-muted">Workload</div>
              <select
                className="flex h-10 w-full rounded-xl border border-nexus-border bg-nexus-surface px-3 text-sm text-nexus-text"
                value={meta.structured.mode}
                onChange={(e) =>
                  updateStructured("mode", e.target.value as UploadMode)
                }
                disabled={isUploading}
              >
                {taxonomy.workloads.map((mode) => (
                  <option key={mode.value} value={mode.value}>
                    {mode.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <div className="text-xs text-nexus-muted">Folder</div>
              <select
                className="flex h-10 w-full rounded-xl border border-nexus-border bg-nexus-surface px-3 text-sm text-nexus-text"
                value={meta.folderId ?? ""}
                onChange={(e) => setMeta((m) => ({ ...m, folderId: e.target.value || null }))}
                disabled={isUploading || loadingFolders || Boolean(defaultFolderId)}
              >
                <option value="">
                  {meta.autoOrganize ? "Auto folder" : "Unsorted"}
                </option>
                {folderOptions.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.label}
                  </option>
                ))}
              </select>
              {suggestedFolderPath && !meta.folderId ? (
                <p className="text-xs text-nexus-muted">Suggested: {suggestedFolderPath}</p>
              ) : null}
            </div>

            {usesRecordType ? (
              <div className="space-y-2 md:col-span-2">
                <div className="text-xs text-nexus-muted">Record type</div>
                <select
                  className="flex h-10 w-full rounded-xl border border-nexus-border bg-nexus-surface px-3 text-sm text-nexus-text"
                  value={meta.structured.personalRecordType}
                  onChange={(e) =>
                    updateStructured("personalRecordType", e.target.value as PersonalRecordType)
                  }
                  disabled={isUploading}
                >
                  {recordTypeOptions.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            {needsCustomDocumentName ? (
              <div className="space-y-2 md:col-span-2">
                <div className="text-xs text-nexus-muted">What is this document?</div>
                <Input
                  value={meta.structured.customDocumentName}
                  onChange={(e) => updateStructured("customDocumentName", e.target.value)}
                  placeholder="e.g. Passport, school leaving certificate, fee statement"
                  disabled={isUploading}
                  required
                />
              </div>
            ) : null}

            {usesAcademicFields ? (
              <>
                <div className="space-y-2">
                  <div className="text-xs text-nexus-muted">Year</div>
                  <select
                    className="flex h-10 w-full rounded-xl border border-nexus-border bg-nexus-surface px-3 text-sm text-nexus-text"
                    value={meta.structured.academicYear}
                    onChange={(e) => updateStructured("academicYear", e.target.value)}
                    disabled={isUploading}
                  >
                    {academicYears.map((year) => (
                      <option key={year} value={year}>
                        Year {year}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <div className="text-xs text-nexus-muted">Semester</div>
                  <select
                    className="flex h-10 w-full rounded-xl border border-nexus-border bg-nexus-surface px-3 text-sm text-nexus-text"
                    value={meta.structured.semester}
                    onChange={(e) => updateStructured("semester", e.target.value)}
                    disabled={isUploading}
                  >
                    {academicSemesters.map((semester) => (
                      <option key={semester} value={semester}>
                        Semester {semester}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <div className="text-xs text-nexus-muted">Course code</div>
                  <Input
                    value={meta.structured.courseCode}
                    onChange={(e) => updateStructured("courseCode", e.target.value)}
                    placeholder="e.g. CSC101"
                    disabled={isUploading}
                  />
                </div>

                <div className="space-y-2">
                  <div className="text-xs text-nexus-muted">Course title</div>
                  <Input
                    value={meta.structured.courseTitle}
                    onChange={(e) => updateStructured("courseTitle", e.target.value)}
                    placeholder="e.g. Calculus I"
                    disabled={isUploading}
                  />
                </div>
              </>
            ) : null}

            <div className="space-y-2">
              <div className="text-xs text-nexus-muted">Institution / organization</div>
              <Input
                value={meta.structured.institution}
                onChange={(e) => updateStructured("institution", e.target.value)}
                placeholder="e.g. KNEC, NTSA, University"
                disabled={isUploading}
              />
            </div>

            <div className="space-y-2">
              <div className="text-xs text-nexus-muted">Document date</div>
              <Input
                type="date"
                value={meta.structured.documentDate}
                onChange={(e) => updateStructured("documentDate", e.target.value)}
                disabled={isUploading}
              />
            </div>

            {!defaultFolderId ? (
              <label className="flex items-center gap-2 rounded-xl border border-nexus-border px-3 py-2 text-sm text-nexus-muted md:col-span-2">
                <input
                  type="checkbox"
                  checked={meta.autoOrganize}
                  onChange={(e) =>
                    setMeta((m) => ({ ...m, autoOrganize: e.target.checked }))
                  }
                  disabled={isUploading}
                  className="h-4 w-4 accent-nexus-orange"
                />
                Auto-create the matching folder when no folder is selected
              </label>
            ) : null}

            <div className="space-y-2">
              <div className="text-xs text-nexus-muted">Title (optional)</div>
              <Input
                value={meta.titlePrefix}
                onChange={(e) => setMeta((m) => ({ ...m, titlePrefix: e.target.value }))}
                placeholder="e.g. Tax 2024"
                disabled={isUploading}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <div className="text-xs text-nexus-muted">Description (optional)</div>
              <Input
                value={meta.description}
                onChange={(e) => setMeta((m) => ({ ...m, description: e.target.value }))}
                placeholder="Add notes for future you..."
                disabled={isUploading}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <div className="text-xs text-nexus-muted">Tags (optional)</div>
              <Input
                value={meta.tagsInput}
                onChange={(e) => setMeta((m) => ({ ...m, tagsInput: e.target.value }))}
                placeholder="comma, separated, tags"
                disabled={isUploading}
              />
            </div>
          </div>

          <p className="mt-3 text-xs text-nexus-muted">
            HEIC images are stored safely, but browser preview may need conversion.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

