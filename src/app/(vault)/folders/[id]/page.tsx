"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

import { createSupabaseBrowser } from "@/lib/supabase";
import type { VaultFolder } from "@/types";
import { FileUpload } from "@/components/FileUpload";
import { FileGrid } from "@/components/FileGrid";
import { FileViewer } from "@/components/FileViewer";
import type { FileCardModel } from "@/components/FileCard";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function FolderContentsPage() {
  const params = useParams();
  const folderId = Array.isArray(params.id) ? params.id[0] : params.id;
  const supabase = useMemo(() => createSupabaseBrowser(), []);

  const [folder, setFolder] = useState<VaultFolder | null>(null);
  const [files, setFiles] = useState<FileCardModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"grid" | "list">("grid");

  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerFileId, setViewerFileId] = useState<string | null>(null);

  async function fetchFolderData() {
    if (!supabase || !folderId) return;

    setLoading(true);
    try {
      const { data: folderData, error: folderErr } = await supabase
        .from("folders")
        .select("id,user_id,name,color,icon,created_at")
        .eq("id", folderId)
        .single();

      if (folderErr) throw folderErr;
      setFolder(folderData as VaultFolder);

      const { data: filesData, error: filesErr } = await supabase
        .from("files")
        .select("id,name,file_type,mime_type,size_bytes,created_at,folder_id,tags,description")
        .eq("folder_id", folderId)
        .order("created_at", { ascending: false });

      if (filesErr) throw filesErr;
      setFiles((filesData ?? []) as any);
    } catch (err) {
      console.error(err);
      setFiles([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchFolderData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase, folderId]);

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="font-display text-3xl tracking-wide">
            {folder?.name ?? "Folder"}
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            Collection contents and uploads.
          </p>
        </div>

        <div className="flex items-center gap-2">
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

      <FileUpload onUploaded={fetchFolderData} defaultFolderId={folderId} />

      <section>
        <div className="mb-3 flex items-baseline justify-between">
          <div className="font-display text-xl tracking-wide">Files</div>
          <div className="text-sm text-zinc-400">
            {loading ? "Loading..." : `${files.length} result${files.length === 1 ? "" : "s"}`}
          </div>
        </div>

        {loading ? (
          <Card className="border-zinc-800 bg-zinc-950/30 p-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, idx) => (
                <div key={idx} className="rounded-xl border border-zinc-800 bg-zinc-950/30 p-3">
                  <Skeleton className="h-32 w-full" />
                  <Skeleton className="mt-3 h-4 w-3/4" />
                </div>
              ))}
            </div>
          </Card>
        ) : files.length === 0 ? (
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/30 p-8 text-center text-zinc-400">
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

