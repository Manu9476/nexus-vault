"use client";

import { useEffect, useMemo, useState } from "react";

import { createSupabaseBrowser } from "@/lib/supabase";
import { FileGrid } from "@/components/FileGrid";
import { FileViewer } from "@/components/FileViewer";
import type { FileCardModel } from "@/components/FileCard";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { VaultFileType } from "@/types";

const filters = [
  { value: "all", label: "All" },
  { value: "image", label: "Photos" },
  { value: "document", label: "Documents" },
  { value: "video", label: "Videos" },
  { value: "other", label: "Other" },
] as const;

export default function GalleryPage() {
  const supabase = useMemo(() => createSupabaseBrowser(), []);
  const [files, setFiles] = useState<FileCardModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | VaultFileType>("all");
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerFileId, setViewerFileId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function fetchGallery() {
      if (!supabase) {
        setFiles([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        let query = supabase
          .from("files")
          .select("id,name,file_type,mime_type,size_bytes,created_at,folder_id,tags,description");

        if (filter !== "all") query = query.eq("file_type", filter);

        const { data, error } = await query
          .order("created_at", { ascending: false })
          .limit(500);

        if (error) throw error;
        if (!mounted) return;
        setFiles((data ?? []) as FileCardModel[]);
      } catch {
        if (!mounted) return;
        setFiles([]);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    fetchGallery();

    return () => {
      mounted = false;
    };
  }, [filter, supabase]);

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="font-display text-3xl font-extrabold">Gallery</h1>
          <p className="mt-1 text-sm text-nexus-muted">
            One visual place for every file in your vault.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {filters.map((item) => (
            <Button
              key={item.value}
              type="button"
              size="sm"
              variant={filter === item.value ? "secondary" : "outline"}
              onClick={() => setFilter(item.value)}
            >
              {item.label}
            </Button>
          ))}
        </div>
      </header>

      <section>
        <div className="mb-3 flex items-baseline justify-between">
          <div className="font-display text-xl font-bold">Everything</div>
          <div className="text-sm text-nexus-muted">
            {loading ? "Loading..." : `${files.length} item${files.length === 1 ? "" : "s"}`}
          </div>
        </div>

        {loading ? (
          <Card className="border-nexus-border bg-nexus-surface p-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 12 }).map((_, idx) => (
                <div key={idx} className="rounded-xl border border-nexus-border bg-nexus-surface p-3">
                  <Skeleton className="h-32 w-full" />
                  <Skeleton className="mt-3 h-4 w-3/4" />
                </div>
              ))}
            </div>
          </Card>
        ) : files.length === 0 ? (
          <div className="rounded-xl border border-nexus-border bg-nexus-surface p-8 text-center text-nexus-muted">
            No files in this view yet.
          </div>
        ) : (
          <FileGrid
            files={files}
            view="grid"
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
      />
    </div>
  );
}
