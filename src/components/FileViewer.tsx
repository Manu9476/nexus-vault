"use client";

import { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

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
        }),
      });

      if (!res.ok) throw new Error("Failed to update file");
      
      setFile({
        ...file,
        name: editName,
        description: editDescription || null,
        tags: tagsArray.length > 0 ? tagsArray : null,
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

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[95vw] max-w-5xl -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950">
          <div className="flex max-h-[85vh] flex-col">
            <div className="flex items-center justify-between gap-3 border-b border-zinc-800 p-4">
              <div className="min-w-0">
                <div className="truncate font-display text-lg">{file?.name ?? "File preview"}</div>
                <div className="mt-1 text-xs text-zinc-400">
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
                  <Button variant="outline" className="border-red-400/40 text-red-200 hover:bg-red-400/10" onClick={onDelete}>
                    Delete
                  </Button>
                ) : null}
              </div>
            </div>

            <div className="grid max-h-[calc(85vh-64px)] grid-cols-1 gap-0 overflow-auto md:grid-cols-[1fr_320px]">
              <div className="p-4">
                {loading ? (
                  <div className="rounded-xl border border-zinc-800 bg-zinc-900/20 p-6 text-zinc-400">
                    Loading preview...
                  </div>
                ) : canPreviewImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={signedUrl!}
                    alt={file!.name}
                    className="h-auto w-full rounded-xl border border-zinc-800 object-contain"
                  />
                ) : canPreviewPdf ? (
                  <iframe
                    src={signedUrl!}
                    className="h-[70vh] w-full rounded-xl border border-zinc-800 bg-white"
                  />
                ) : (
                  <div className="rounded-xl border border-zinc-800 bg-zinc-900/20 p-6 text-zinc-300">
                    Preview not available for this file type. You can download it instead.
                  </div>
                )}

                {signedUrl ? (
                  <div className="mt-4 flex items-center gap-2">
                    <a
                      href={signedUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center rounded-md bg-amber-400 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-amber-300"
                    >
                      Download
                    </a>
                  </div>
                ) : null}
              </div>

              <div className="border-t border-zinc-800 p-4 md:border-l md:border-t-0">
                <div className="space-y-3">
                  {file ? (
                    isEditing ? (
                      <div className="space-y-4">
                        <div>
                          <label className="text-xs text-zinc-400">Name</label>
                          <Input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-zinc-400">Tags (comma separated)</label>
                          <Input
                            value={editTags}
                            onChange={(e) => setEditTags(e.target.value)}
                            className="mt-1"
                            placeholder="vacation, receipt, 2024"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-zinc-400">Description</label>
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
                        <Card className="border-zinc-800 bg-zinc-950/40 p-3">
                          <div className="text-xs text-zinc-400">Type</div>
                          <div className="mt-1">
                            <Badge>{file.file_type}</Badge>
                          </div>
                          <div className="mt-3 text-xs text-zinc-400">Size</div>
                          <div className="mt-1 text-sm">{file.size_bytes} bytes</div>
                        </Card>

                        {file.tags?.length ? (
                          <Card className="border-zinc-800 bg-zinc-950/40 p-3">
                            <div className="text-xs text-zinc-400">Tags</div>
                            <div className="mt-2 flex flex-wrap gap-1">
                              {file.tags.map((t) => (
                                <span
                                  key={t}
                                  className="rounded border border-zinc-800 bg-zinc-900/30 px-2 py-1 text-[11px] text-zinc-200"
                                >
                                  {t}
                                </span>
                              ))}
                            </div>
                          </Card>
                        ) : null}

                        {file.description ? (
                          <Card className="border-zinc-800 bg-zinc-950/40 p-3">
                            <div className="text-xs text-zinc-400">Description</div>
                            <div className="mt-2 whitespace-pre-wrap text-sm text-zinc-200">
                              {file.description}
                            </div>
                          </Card>
                        ) : null}
                      </>
                    )
                  ) : (
                    <div className="text-sm text-zinc-400">Loading metadata...</div>
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

