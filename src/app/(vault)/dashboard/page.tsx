"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { createSupabaseBrowser } from "@/lib/supabase";
import { FileGrid } from "@/components/FileGrid";
import { FileViewer } from "@/components/FileViewer";
import type { FileCardModel } from "@/components/FileCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const idx = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  const val = bytes / Math.pow(1024, idx);
  return `${val.toFixed(val >= 10 || idx === 0 ? 0 : 1)} ${units[idx]}`;
}

type StorageUsageRow = {
  size_bytes: number | string | null;
};

export default function DashboardPage() {
  const supabase = useMemo(() => createSupabaseBrowser(), []);

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalFiles: 0,
    photos: 0,
    documents: 0,
    storageUsedBytes: 0,
  });
  const [recent, setRecent] = useState<FileCardModel[]>([]);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerFileId, setViewerFileId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        if (!supabase) {
          if (!mounted) return;
          setStats({
            totalFiles: 0,
            photos: 0,
            documents: 0,
            storageUsedBytes: 0,
          });
          setRecent([]);
          return;
        }

        const [totalFilesRes, photosRes, docsRes, storageBytesRes, recentRes] =
          await Promise.all([
            supabase.from("files").select("id", { count: "exact", head: true }),
            supabase
              .from("files")
              .select("id", { count: "exact", head: true })
              .eq("file_type", "image"),
            supabase
              .from("files")
              .select("id", { count: "exact", head: true })
              .eq("file_type", "document"),
            supabase.from("files").select("size_bytes"),
            supabase
              .from("files")
              .select("id,name,file_type,mime_type,created_at,size_bytes,folder_id,tags,description,category,document_type,custom_type_label,search_text,academic_year,semester,course_code,course_title,institution,folders(name)")
              .order("created_at", { ascending: false })
              .limit(10),
          ]);

        const storageRows = (storageBytesRes.data ?? []) as StorageUsageRow[];
        const totalBytes = storageRows.reduce(
          (acc, curr) => acc + (Number(curr.size_bytes) || 0),
          0
        );

        if (!mounted) return;
        setStats({
          totalFiles: totalFilesRes.count ?? 0,
          photos: photosRes.count ?? 0,
          documents: docsRes.count ?? 0,
          storageUsedBytes: totalBytes,
        });
        setRecent((recentRes.data ?? []) as FileCardModel[]);
      } catch {
        if (!mounted) return;
        setStats({
          totalFiles: 0,
          photos: 0,
          documents: 0,
          storageUsedBytes: 0,
        });
        setRecent([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [supabase]);

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="font-display text-3xl font-extrabold">Dashboard</h1>
          <p className="mt-1 text-sm text-nexus-muted">Your personal archive at a glance.</p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/upload"
            className="inline-flex h-10 items-center justify-center rounded-full bg-nexus-orange px-4 text-sm font-bold text-white transition-colors hover:bg-nexus-orange"
          >
            Quick Upload
          </Link>
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-4">
        <Link href="/files" className="block">
        <Card className="h-full transition-colors hover:border-nexus-orange">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-normal text-nexus-muted">Total files</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {loading ? (
              <Skeleton className="h-7 w-16" />
            ) : (
              <div className="font-display text-2xl font-extrabold">{stats.totalFiles}</div>
            )}
          </CardContent>
        </Card>
        </Link>

        <Link href="/photos" className="block">
        <Card className="h-full transition-colors hover:border-nexus-orange">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-normal text-nexus-muted">Photos</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {loading ? (
              <Skeleton className="h-7 w-16" />
            ) : (
              <div className="font-display text-2xl font-extrabold">{stats.photos}</div>
            )}
          </CardContent>
        </Card>
        </Link>

        <Link href="/documents" className="block">
        <Card className="h-full transition-colors hover:border-nexus-orange">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-normal text-nexus-muted">Documents</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {loading ? (
              <Skeleton className="h-7 w-16" />
            ) : (
              <div className="font-display text-2xl font-extrabold">{stats.documents}</div>
            )}
          </CardContent>
        </Card>
        </Link>

        <Link href="/gallery" className="block">
        <Card className="h-full transition-colors hover:border-nexus-orange">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-normal text-nexus-muted">Storage used</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {loading ? (
              <Skeleton className="h-7 w-24" />
            ) : (
              <div className="font-display text-2xl font-extrabold">{formatBytes(stats.storageUsedBytes)}</div>
            )}
          </CardContent>
        </Card>
        </Link>
      </div>

      <section>
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-xl font-bold">Recently added</h2>
          <Link href="/gallery" className="text-sm text-nexus-muted hover:text-nexus-text">
            View gallery
          </Link>
        </div>

        <div className="mt-4">
          {loading ? (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, idx) => (
                <Card key={idx} className="p-4">
                  <Skeleton className="h-32 w-full" />
                  <Skeleton className="mt-3 h-4 w-32" />
                  <Skeleton className="mt-3 h-4 w-24" />
                </Card>
              ))}
            </div>
          ) : recent.length === 0 ? (
            <div className="rounded-xl border border-nexus-border bg-nexus-surface p-6 text-nexus-muted">
              No files yet. Upload your first photo or document to start building your vault.
            </div>
          ) : (
            <FileGrid
              files={recent}
              view="grid"
              onOpen={(id) => {
                setViewerFileId(id);
                setViewerOpen(true);
              }}
            />
          )}
        </div>
      </section>

      <FileViewer
        fileId={viewerFileId}
        open={viewerOpen}
        onOpenChange={setViewerOpen}
      />
    </div>
  );
}
