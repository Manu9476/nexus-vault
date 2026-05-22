"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { createSupabaseBrowser } from "@/lib/supabase";
import { FileUpload } from "@/components/FileUpload";
import { FileGrid } from "@/components/FileGrid";
import { FileViewer } from "@/components/FileViewer";
import type { FileCardModel } from "@/components/FileCard";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

export default function DocumentsPage() {
  const supabase = useMemo(() => createSupabaseBrowser(), []);

  const [files, setFiles] = useState<FileCardModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"grid" | "list">("list");
  const [query, setQuery] = useState("");

  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerFileId, setViewerFileId] = useState<string | null>(null);

  const fetchFiles = useCallback(async () => {
    if (!supabase) {
      setFiles([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      let q = supabase
        .from("files")
        .select("id,name,file_type,mime_type,size_bytes,created_at,folder_id,tags,description,category,document_type,custom_type_label,search_text,academic_year,semester,course_code,course_title,institution,folders(name)")
        .eq("file_type", "document");

      if (query.trim()) {
        const s = query.trim();
        q = q.or(`name.ilike.%${s}%,description.ilike.%${s}%`);
      }

      const { data, error } = await q
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      setFiles((data ?? []) as any);
    } catch {
      setFiles([]);
    } finally {
      setLoading(false);
    }
  }, [query, supabase]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="font-display text-3xl font-extrabold">Documents</h1>
          <p className="mt-1 text-sm text-nexus-muted">
            PDFs and office files list view.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="w-64">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search documents..."
            />
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
        </div>
      </header>

      <FileUpload onUploaded={fetchFiles} />

      <section>
        <div className="mb-3 flex items-baseline justify-between">
          <div className="font-display text-xl font-bold">Your documents</div>
          <div className="text-sm text-nexus-muted">
            {loading ? "Loading..." : `${files.length} result${files.length === 1 ? "" : "s"}`}
          </div>
        </div>

        {loading ? (
          <Card className="border-nexus-border bg-nexus-surface p-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 9 }).map((_, idx) => (
                <div key={idx} className="rounded-xl border border-nexus-border bg-nexus-surface p-3">
                  <Skeleton className="h-32 w-full" />
                  <Skeleton className="mt-3 h-4 w-3/4" />
                </div>
              ))}
            </div>
          </Card>
        ) : files.length === 0 ? (
          <div className="rounded-xl border border-nexus-border bg-nexus-surface p-8 text-center text-nexus-muted">
            No documents found.
          </div>
        ) : (
          <FileGrid files={files} view={view} onOpen={(id) => {
            setViewerFileId(id);
            setViewerOpen(true);
          }} />
        )}
      </section>

      <FileViewer
        fileId={viewerFileId}
        open={viewerOpen}
        onOpenChange={setViewerOpen}
        onDeleted={fetchFiles}
      />
    </div>
  );
}
