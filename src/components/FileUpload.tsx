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
  buildStructuredDescription,
  buildStructuredFolderName,
  buildStructuredTags,
  buildStructuredTitle,
  personalRecordTypes,
  uploadModes,
  type PersonalRecordType,
  type StructuredUploadMeta,
  type UploadMode,
} from "@/lib/vaultTaxonomy";
import { getVaultPreferences } from "@/lib/vaultSettings";
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
  const preferences = useMemo(() => getVaultPreferences(), []);

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
      mode: preferences.defaultUploadMode,
      personalRecordType: "birth-certificate",
      academicYear: "1",
      semester: "1",
      courseCode: "",
      courseTitle: "",
    },
  });

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
          .select("id,user_id,name,color,icon,created_at")
          .order("created_at", { ascending: false });

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

  async function getOrCreateFolder(userId: string, folderName: string) {
    const { data: existing, error: existingErr } = await supabase
      .from("folders")
      .select("id")
      .eq("user_id", userId)
      .eq("name", folderName)
      .maybeSingle();

    if (existingErr) throw existingErr;
    if (existing?.id) return existing.id as string;

    const { data: created, error: createErr } = await supabase
      .from("folders")
      .insert({
        user_id: userId,
        name: folderName,
        color: null,
        icon: null,
      })
      .select("id")
      .single();

    if (createErr) throw createErr;
    return created.id as string;
  }

  async function uploadFiles(files: FileList | File[]) {
    if (!supabase) {
      toast.error("Supabase is not configured yet.");
      return;
    }

    const fileArr = Array.from(files);
    if (fileArr.length === 0) return;

    const { data: authRes, error: userErr } = await supabase.auth.getUser();
    if (userErr || !authRes.user) {
      toast.error("Please login again.");
      return;
    }

    const user = authRes.user;
    const tags = buildStructuredTags(meta.structured, parseTagsInput(meta.tagsInput));
    const generatedDescription = buildStructuredDescription(meta.structured);

    setIsUploading(true);
    try {
      const uploaded: string[] = [];
      let targetFolderId = meta.folderId;
      const autoFolderName = buildStructuredFolderName(meta.structured);

      if (!targetFolderId && meta.autoOrganize && autoFolderName) {
        targetFolderId = await getOrCreateFolder(user.id, autoFolderName);
      }

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
              });

        const description = [generatedDescription, meta.description.trim()]
          .filter(Boolean)
          .join("\n");

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
          description: description || null,
          tags: tags.length ? tags : [],
        });

        if (insertErr) throw insertErr;
        uploaded.push(fileId);
      }

      toast.success(`Uploaded ${uploaded.length} file${uploaded.length === 1 ? "" : "s"}.`);
      setMeta((m) => ({ ...m, titlePrefix: "", description: "", tagsInput: "" }));
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

  return (
    <Card className="border-zinc-800 bg-zinc-950/30">
      <CardContent className="p-4">
        {!supabase ? (
          <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
            Supabase is not configured yet. Add NEXT_PUBLIC_SUPABASE_URL,
            NEXT_PUBLIC_SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY in .env.local,
            then restart the dev server to enable uploads and folder data.
          </div>
        ) : null}

        <div
          onDrop={onDrop}
          onDragOver={onDragOver}
          className="rounded-xl border border-dashed border-zinc-800 bg-zinc-950/20 p-5"
        >
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="font-display text-lg tracking-wide">Smart upload</div>
              <div className="mt-1 text-sm text-zinc-400">
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
              <div className="text-xs text-zinc-400">Workload</div>
              <select
                className="flex h-10 w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 text-sm text-zinc-50"
                value={meta.structured.mode}
                onChange={(e) =>
                  updateStructured("mode", e.target.value as UploadMode)
                }
                disabled={isUploading}
              >
                {uploadModes.map((mode) => (
                  <option key={mode.value} value={mode.value}>
                    {mode.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <div className="text-xs text-zinc-400">Folder</div>
              <select
                className="flex h-10 w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 text-sm text-zinc-50"
                value={meta.folderId ?? ""}
                onChange={(e) => setMeta((m) => ({ ...m, folderId: e.target.value || null }))}
                disabled={isUploading || loadingFolders || Boolean(defaultFolderId)}
              >
                <option value="">
                  {meta.autoOrganize ? "Auto folder" : "Unsorted"}
                </option>
                {folders.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>

            {meta.structured.mode === "personal-record" ? (
              <div className="space-y-2 md:col-span-2">
                <div className="text-xs text-zinc-400">Record type</div>
                <select
                  className="flex h-10 w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 text-sm text-zinc-50"
                  value={meta.structured.personalRecordType}
                  onChange={(e) =>
                    updateStructured("personalRecordType", e.target.value as PersonalRecordType)
                  }
                  disabled={isUploading}
                >
                  {personalRecordTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            {meta.structured.mode.startsWith("academic") ? (
              <>
                <div className="space-y-2">
                  <div className="text-xs text-zinc-400">Year</div>
                  <select
                    className="flex h-10 w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 text-sm text-zinc-50"
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
                  <div className="text-xs text-zinc-400">Semester</div>
                  <select
                    className="flex h-10 w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 text-sm text-zinc-50"
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
                  <div className="text-xs text-zinc-400">Course code</div>
                  <Input
                    value={meta.structured.courseCode}
                    onChange={(e) => updateStructured("courseCode", e.target.value)}
                    placeholder="e.g. CSC101"
                    disabled={isUploading}
                  />
                </div>

                <div className="space-y-2">
                  <div className="text-xs text-zinc-400">Course title</div>
                  <Input
                    value={meta.structured.courseTitle}
                    onChange={(e) => updateStructured("courseTitle", e.target.value)}
                    placeholder="e.g. Calculus I"
                    disabled={isUploading}
                  />
                </div>
              </>
            ) : null}

            {!defaultFolderId ? (
              <label className="flex items-center gap-2 rounded-md border border-zinc-800 px-3 py-2 text-sm text-zinc-300 md:col-span-2">
                <input
                  type="checkbox"
                  checked={meta.autoOrganize}
                  onChange={(e) =>
                    setMeta((m) => ({ ...m, autoOrganize: e.target.checked }))
                  }
                  disabled={isUploading}
                  className="h-4 w-4 accent-amber-400"
                />
                Auto-create the matching folder when no folder is selected
              </label>
            ) : null}

            <div className="space-y-2">
              <div className="text-xs text-zinc-400">Title (optional)</div>
              <Input
                value={meta.titlePrefix}
                onChange={(e) => setMeta((m) => ({ ...m, titlePrefix: e.target.value }))}
                placeholder="e.g. Tax 2024"
                disabled={isUploading}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <div className="text-xs text-zinc-400">Description (optional)</div>
              <Input
                value={meta.description}
                onChange={(e) => setMeta((m) => ({ ...m, description: e.target.value }))}
                placeholder="Add notes for future you..."
                disabled={isUploading}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <div className="text-xs text-zinc-400">Tags (optional)</div>
              <Input
                value={meta.tagsInput}
                onChange={(e) => setMeta((m) => ({ ...m, tagsInput: e.target.value }))}
                placeholder="comma, separated, tags"
                disabled={isUploading}
              />
            </div>
          </div>

          <p className="mt-3 text-xs text-zinc-500">
            HEIC images are stored safely, but browser preview may need conversion.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

