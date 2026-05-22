"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, ChevronRight, Folder as FolderIcon, Plus } from "lucide-react";
import { toast } from "sonner";

import { createSupabaseBrowser } from "@/lib/supabase";
import type { VaultFolder } from "@/types";
import { FileUpload } from "@/components/FileUpload";
import { FileGrid } from "@/components/FileGrid";
import { FileViewer } from "@/components/FileViewer";
import type { FileCardModel } from "@/components/FileCard";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

export default function FolderContentsPage() {
  const params = useParams();
  const folderId = Array.isArray(params.id) ? params.id[0] : params.id;
  const supabase = useMemo(() => createSupabaseBrowser(), []);

  const [folder, setFolder] = useState<VaultFolder | null>(null);
  const [allFolders, setAllFolders] = useState<VaultFolder[]>([]);
  const [subfolders, setSubfolders] = useState<VaultFolder[]>([]);
  const [files, setFiles] = useState<FileCardModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [creatingFolder, setCreatingFolder] = useState(false);

  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerFileId, setViewerFileId] = useState<string | null>(null);

  const fetchFolderData = useCallback(async () => {
    if (!folderId) return;
    if (!supabase) {
      setFolder(null);
      setAllFolders([]);
      setSubfolders([]);
      setFiles([]);
      setLoading(false);
      toast.error("Supabase is not configured yet.");
      return;
    }

    setLoading(true);
    try {
      const [folderRes, foldersRes, filesRes] = await Promise.all([
        supabase
          .from("folders")
          .select("id,user_id,name,parent_id,color,icon,created_at")
          .eq("id", folderId)
          .single(),
        supabase
          .from("folders")
          .select("id,user_id,name,parent_id,color,icon,created_at")
          .order("name", { ascending: true }),
        supabase
          .from("files")
          .select("id,name,file_type,mime_type,size_bytes,created_at,folder_id,tags,description,category,document_type,custom_type_label,search_text,academic_year,semester,course_code,course_title,institution,folders(name)")
          .eq("folder_id", folderId)
          .order("created_at", { ascending: false }),
      ]);

      if (folderRes.error) throw folderRes.error;
      if (foldersRes.error) throw foldersRes.error;
      if (filesRes.error) throw filesRes.error;

      const nextFolders = (foldersRes.data ?? []) as VaultFolder[];
      setFolder(folderRes.data as VaultFolder);
      setAllFolders(nextFolders);
      setSubfolders(nextFolders.filter((item) => item.parent_id === folderId));
      setFiles((filesRes.data ?? []) as any);
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to load folder.");
      setSubfolders([]);
      setFiles([]);
    } finally {
      setLoading(false);
    }
  }, [folderId, supabase]);

  useEffect(() => {
    fetchFolderData();
  }, [fetchFolderData]);

  const breadcrumbs = useMemo(() => {
    if (!folder) return [];
    const byId = new Map(allFolders.map((item) => [item.id, item]));
    const trail: VaultFolder[] = [folder];
    let parentId = folder.parent_id;
    const seen = new Set([folder.id]);

    while (parentId && !seen.has(parentId)) {
      const parent = byId.get(parentId);
      if (!parent) break;
      trail.unshift(parent);
      seen.add(parent.id);
      parentId = parent.parent_id;
    }

    return trail;
  }, [allFolders, folder]);

  const parentHref = folder?.parent_id ? `/folders/${folder.parent_id}` : "/folders";

  async function handleCreateSubfolder(e: React.FormEvent) {
    e.preventDefault();
    if (!newFolderName.trim() || !folderId) return;
    if (!supabase) {
      toast.error("Supabase is not configured yet.");
      return;
    }

    setCreatingFolder(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) throw new Error("Not authenticated");

      const { error } = await supabase.from("folders").insert({
        user_id: userId,
        name: newFolderName.trim(),
        parent_id: folderId,
        color: null,
        icon: null,
      });
      if (error) throw error;

      setNewFolderName("");
      await fetchFolderData();
      toast.success("Subfolder created.");
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to create subfolder.");
    } finally {
      setCreatingFolder(false);
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <nav className="mb-3 flex flex-wrap items-center gap-1 text-sm text-nexus-muted">
            <Link href="/folders" className="hover:text-nexus-orange">
              Folders
            </Link>
            {breadcrumbs.map((item) => (
              <span key={item.id} className="flex items-center gap-1">
                <ChevronRight className="h-3 w-3" />
                <Link href={`/folders/${item.id}`} className="hover:text-nexus-orange">
                  {item.name}
                </Link>
              </span>
            ))}
          </nav>
          <h1 className="font-display text-3xl font-extrabold">
            {folder?.name ?? "Folder"}
          </h1>
          <p className="mt-1 text-sm text-nexus-muted">
            Open subfolders or files from this collection.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link href={parentHref}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </Link>
          <Button
            type="button"
            variant={uploadOpen ? "secondary" : "default"}
            size="sm"
            onClick={() => setUploadOpen((open) => !open)}
          >
            {uploadOpen ? "Close upload" : "Upload here"}
          </Button>
          <Button
            variant={view === "grid" ? "secondary" : "outline"}
            size="sm"
            onClick={() => setView("grid")}
          >
            Grid
          </Button>
          <Button
            variant={view === "list" ? "secondary" : "outline"}
            size="sm"
            onClick={() => setView("list")}
          >
            List
          </Button>
        </div>
      </header>

      <Card className="border-nexus-border bg-nexus-surface p-4">
        <form onSubmit={handleCreateSubfolder} className="flex flex-col gap-2 sm:flex-row">
          <Input
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            placeholder="New subfolder name..."
            className="max-w-sm"
          />
          <Button type="submit" disabled={creatingFolder || !newFolderName.trim()}>
            <Plus className="h-4 w-4" />
            Create subfolder
          </Button>
        </form>
      </Card>

      {uploadOpen ? (
        <FileUpload
          onUploaded={() => {
            fetchFolderData();
            setUploadOpen(false);
          }}
          defaultFolderId={folderId}
        />
      ) : null}

      <section>
        <div className="mb-3 flex items-baseline justify-between">
          <div className="font-display text-xl font-bold">Subfolders</div>
          <div className="text-sm text-nexus-muted">
            {loading ? "Loading..." : `${subfolders.length} folder${subfolders.length === 1 ? "" : "s"}`}
          </div>
        </div>

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, idx) => (
              <Skeleton key={idx} className="h-24 w-full rounded-xl" />
            ))}
          </div>
        ) : subfolders.length ? (
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {subfolders.map((item) => (
              <Link key={item.id} href={`/folders/${item.id}`}>
                <Card className="flex h-24 items-center gap-4 rounded-xl border border-nexus-border bg-nexus-surface p-4 transition-colors hover:border-nexus-orange">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-nexus-surface text-nexus-purple">
                    <FolderIcon size={20} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="truncate font-medium text-nexus-text">{item.name}</h3>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-nexus-border bg-nexus-surface p-6 text-center text-nexus-muted">
            No subfolders in this folder.
          </div>
        )}
      </section>

      <section>
        <div className="mb-3 flex items-baseline justify-between">
          <div className="font-display text-xl font-bold">Files</div>
          <div className="text-sm text-nexus-muted">
            {loading ? "Loading..." : `${files.length} result${files.length === 1 ? "" : "s"}`}
          </div>
        </div>

        {loading ? (
          <Card className="border-nexus-border bg-nexus-surface p-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, idx) => (
                <div key={idx} className="rounded-xl border border-nexus-border bg-nexus-surface p-3">
                  <Skeleton className="h-32 w-full" />
                  <Skeleton className="mt-3 h-4 w-3/4" />
                </div>
              ))}
            </div>
          </Card>
        ) : files.length === 0 ? (
          <div className="rounded-xl border border-nexus-border bg-nexus-surface p-8 text-center text-nexus-muted">
            This collection is empty. Upload files above to add them here.
          </div>
        ) : (
          <FileGrid
            files={files}
            view={view}
            onOpen={(id) => {
              setViewerFileId(id);
              setViewerOpen(true);
            }}
          />
        )}
      </section>

      <FileViewer
        fileId={viewerFileId}
        open={viewerOpen}
        onOpenChange={setViewerOpen}
        onDeleted={fetchFolderData}
      />
    </div>
  );
}

