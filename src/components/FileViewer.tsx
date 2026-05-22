"use client";

import { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { toast } from "sonner";

import { createSupabaseBrowser } from "@/lib/supabase";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { VaultFolder } from "@/types";

type ViewerFile = {
  id: string;
  name: string;
  file_type: "image" | "document" | "video" | "other";
  mime_type: string | null;
  size_bytes: number;
  created_at: string;
  folder_id: string | null;
  description: string | null;
  tags: string[] | null;
  category: string | null;
  document_type: string | null;
  custom_type_label: string | null;
  document_date: string | null;
  academic_year: string | null;
  semester: string | null;
  course_code: string | null;
  course_title: string | null;
  institution: string | null;
  favorite: boolean;
  archived: boolean;
  folders?: { name?: string | null } | null;
};

export function FileViewer({
  fileId,
  open,
  onOpenChange,
  onDeleted,
}: {
  fileId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted?: () => void;
}) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [file, setFile] = useState<ViewerFile | null>(null);
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editTags, setEditTags] = useState("");
  const [editFolderId, setEditFolderId] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editDocumentType, setEditDocumentType] = useState("");
  const [editCustomTypeLabel, setEditCustomTypeLabel] = useState("");
  const [editDocumentDate, setEditDocumentDate] = useState("");
  const [editInstitution, setEditInstitution] = useState("");
  const [folders, setFolders] = useState<VaultFolder[]>([]);

  useEffect(() => {
    if (!open) return;
    let mounted = true;
    const supabase = createSupabaseBrowser();
    if (!supabase) return;

    (async () => {
      const { data } = await supabase
        .from("folders")
        .select("id,user_id,name,parent_id,color,icon,shape,sort_order,created_at")
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true });
      if (mounted) setFolders((data ?? []) as VaultFolder[]);
    })();

    return () => {
      mounted = false;
    };
  }, [open]);

  useEffect(() => {
    if (!open || !fileId) return;
    let mounted = true;

    (async () => {
      setLoading(true);
      setFile(null);
      setSignedUrl(null);
      setIsEditing(false);
      try {
        const res = await fetch(`/api/files/${fileId}/signed-url`);
        if (!res.ok) throw new Error("Failed to load file preview");
        const json = await res.json();

        if (!mounted) return;
        setSignedUrl(json?.signedUrl ?? null);
        const fetchedFile = json?.file ?? null;
        setFile(fetchedFile);
        if (fetchedFile) {
          setEditName(fetchedFile.name);
          setEditDescription(fetchedFile.description ?? "");
          setEditTags(fetchedFile.tags?.join(", ") ?? "");
          setEditFolderId(fetchedFile.folder_id ?? "");
          setEditCategory(fetchedFile.category ?? "");
          setEditDocumentType(fetchedFile.document_type ?? "");
          setEditCustomTypeLabel(fetchedFile.custom_type_label ?? "");
          setEditDocumentDate(fetchedFile.document_date ?? "");
          setEditInstitution(fetchedFile.institution ?? "");
        }
      } catch (err: any) {
        toast.error(err?.message ?? "Failed to load file preview");
        if (!mounted) return;
        setFile(null);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [fileId, open]);

  async function onDelete() {
    if (!fileId) return;
    const ok = confirm("Delete this file? This cannot be undone.");
    if (!ok) return;

    try {
      const res = await fetch(`/api/files/${fileId}/delete`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Delete failed");
      toast.success("File deleted.");
      onOpenChange(false);
      onDeleted?.();
    } catch (err: any) {
      toast.error(err?.message ?? "Delete failed.");
    }
  }

  async function onSave() {
    if (!fileId || !file) return;
    try {
      const tagsArray = editTags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      const res = await fetch(`/api/files/${fileId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName,
          description: editDescription,
          tags: tagsArray.length > 0 ? tagsArray : null,
          folder_id: editFolderId || null,
          category: editCategory || null,
          document_type: editDocumentType || null,
          custom_type_label: editCustomTypeLabel || null,
          document_date: editDocumentDate || null,
          academic_year: file.academic_year,
          semester: file.semester,
          course_code: file.course_code,
          course_title: file.course_title,
          institution: editInstitution || null,
          favorite: file.favorite,
          archived: file.archived,
        }),
      });

      if (!res.ok) throw new Error("Failed to update file");
      
      setFile({
        ...file,
        name: editName,
        description: editDescription || null,
        tags: tagsArray.length > 0 ? tagsArray : null,
        folder_id: editFolderId || null,
        category: editCategory || null,
        document_type: editDocumentType || null,
        custom_type_label: editCustomTypeLabel || null,
        document_date: editDocumentDate || null,
        institution: editInstitution || null,
      });
      setIsEditing(false);
      toast.success("File updated.");
      onDeleted?.(); // Refresh parent lists
    } catch (err: any) {
      toast.error(err?.message ?? "Update failed.");
    }
  }

  const canPreviewImage = file?.file_type === "image" && signedUrl;
  const canPreviewPdf = file?.mime_type === "application/pdf" && signedUrl;
  const folderName = file?.folders?.name ?? "Unsorted";

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-nexus-bg/80" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[95vw] max-w-5xl -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-xl border border-nexus-border bg-nexus-surface">
          <div className="flex max-h-[85vh] flex-col">
            <div className="flex items-center justify-between gap-3 border-b border-nexus-border p-4">
              <div className="min-w-0">
                <div className="truncate font-display text-lg font-bold">{file?.name ?? "File preview"}</div>
                <div className="mt-1 text-xs text-nexus-muted">
                  {file ? new Date(file.created_at).toLocaleString() : null}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  onClick={() => onOpenChange(false)}
                >
                  Close
                </Button>
                {file ? (
                  <Button variant="outline" className="border-nexus-orange text-nexus-orange hover:bg-nexus-orange hover:text-white" onClick={onDelete}>
                    Delete
                  </Button>
                ) : null}
              </div>
            </div>

            <div className="grid max-h-[calc(85vh-64px)] grid-cols-1 gap-0 overflow-auto md:grid-cols-[1fr_320px]">
              <div className="p-4">
                {loading ? (
                  <div className="rounded-xl border border-nexus-border bg-nexus-surface p-6 text-nexus-muted">
                    Loading preview...
                  </div>
                ) : canPreviewImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={signedUrl!}
                    alt={file!.name}
                    className="h-auto w-full rounded-xl border border-nexus-border object-contain"
                  />
                ) : canPreviewPdf ? (
                  <iframe
                    src={signedUrl!}
                    className="h-[70vh] w-full rounded-xl border border-nexus-border bg-white"
                  />
                ) : (
                  <div className="rounded-xl border border-nexus-border bg-nexus-surface p-6 text-nexus-muted">
                    Preview not available for this file type. You can download it instead.
                  </div>
                )}

                {signedUrl ? (
                  <div className="mt-4 flex items-center gap-2">
                    <a
                      href={signedUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center rounded-full bg-nexus-orange px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-nexus-orange"
                    >
                      Download
                    </a>
                  </div>
                ) : null}
              </div>

              <div className="border-t border-nexus-border p-4 md:border-l md:border-t-0">
                <div className="space-y-3">
                  {file ? (
                    isEditing ? (
                      <div className="space-y-4">
                        <div>
                          <label className="text-xs text-nexus-muted">Name</label>
                          <Input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-nexus-muted">Tags (comma separated)</label>
                          <Input
                            value={editTags}
                            onChange={(e) => setEditTags(e.target.value)}
                            className="mt-1"
                            placeholder="vacation, receipt, 2024"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-nexus-muted">Folder</label>
                          <select
                            className="mt-1 flex h-10 w-full rounded-xl border border-nexus-border bg-nexus-surface px-3 text-sm text-nexus-text"
                            value={editFolderId}
                            onChange={(e) => setEditFolderId(e.target.value)}
                          >
                            <option value="">Unsorted</option>
                            {folders.map((folder) => (
                              <option key={folder.id} value={folder.id}>
                                {folder.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div>
                            <label className="text-xs text-nexus-muted">Category</label>
                            <Input
                              value={editCategory}
                              onChange={(e) => setEditCategory(e.target.value)}
                              className="mt-1"
                              placeholder="personal-documents"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-nexus-muted">Document type</label>
                            <Input
                              value={editDocumentType}
                              onChange={(e) => setEditDocumentType(e.target.value)}
                              className="mt-1"
                              placeholder="kcse-certificate"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="text-xs text-nexus-muted">Custom label</label>
                          <Input
                            value={editCustomTypeLabel}
                            onChange={(e) => setEditCustomTypeLabel(e.target.value)}
                            className="mt-1"
                            placeholder="Passport, transcript, fee statement"
                          />
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div>
                            <label className="text-xs text-nexus-muted">Institution</label>
                            <Input
                              value={editInstitution}
                              onChange={(e) => setEditInstitution(e.target.value)}
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-nexus-muted">Document date</label>
                            <Input
                              type="date"
                              value={editDocumentDate}
                              onChange={(e) => setEditDocumentDate(e.target.value)}
                              className="mt-1"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="text-xs text-nexus-muted">Description</label>
                          <Textarea
                            value={editDescription}
                            onChange={(e) => setEditDescription(e.target.value)}
                            className="mt-1 min-h-[100px]"
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button onClick={onSave} className="flex-1">
                            Save
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => setIsEditing(false)}
                            className="flex-1"
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex justify-end">
                          <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                            Edit Details
                          </Button>
                        </div>
                        <Card className="border-nexus-border bg-nexus-surface p-3">
                          <div className="text-xs text-nexus-muted">Type</div>
                          <div className="mt-1">
                            <Badge>{file.custom_type_label ?? file.document_type ?? file.file_type}</Badge>
                          </div>
                          <div className="mt-3 text-xs text-nexus-muted">Folder</div>
                          <div className="mt-1 text-sm">{folderName}</div>
                          {file.category ? (
                            <>
                              <div className="mt-3 text-xs text-nexus-muted">Category</div>
                              <div className="mt-1 text-sm">{file.category}</div>
                            </>
                          ) : null}
                          {file.institution ? (
                            <>
                              <div className="mt-3 text-xs text-nexus-muted">Institution</div>
                              <div className="mt-1 text-sm">{file.institution}</div>
                            </>
                          ) : null}
                          <div className="mt-3 text-xs text-nexus-muted">Size</div>
                          <div className="mt-1 text-sm">{file.size_bytes} bytes</div>
                        </Card>

                        {file.tags?.length ? (
                          <Card className="border-nexus-border bg-nexus-surface p-3">
                            <div className="text-xs text-nexus-muted">Tags</div>
                            <div className="mt-2 flex flex-wrap gap-1">
                              {file.tags.map((t) => (
                                <span
                                  key={t}
                                  className="rounded border border-nexus-border bg-nexus-surface px-2 py-1 text-[11px] text-nexus-muted"
                                >
                                  {t}
                                </span>
                              ))}
                            </div>
                          </Card>
                        ) : null}

                        {file.description ? (
                          <Card className="border-nexus-border bg-nexus-surface p-3">
                            <div className="text-xs text-nexus-muted">Description</div>
                            <div className="mt-2 whitespace-pre-wrap text-sm text-nexus-muted">
                              {file.description}
                            </div>
                          </Card>
                        ) : null}
                      </>
                    )
                  ) : (
                    <div className="text-sm text-nexus-muted">Loading metadata...</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

