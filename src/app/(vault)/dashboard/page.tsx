"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { createSupabaseBrowser } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const idx = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  const val = bytes / Math.pow(1024, idx);
  return `${val.toFixed(val >= 10 || idx === 0 ? 0 : 1)} ${units[idx]}`;
}

export default function DashboardPage() {
  const supabase = useMemo(() => createSupabaseBrowser(), []);

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalFiles: 0,
    photos: 0,
    documents: 0,
    storageUsedBytes: 0,
  });
  const [recent, setRecent] = useState<
    Array<{
      id: string;
      name: string;
      file_type: string;
      created_at: string;
      size_bytes: number;
      folder_id: string | null;
      tags: string[] | null;
      description: string | null;
    }>
  >([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        if (!supabase) {
          // Build/prerender can happen without env vars. In that case we just render skeletons.
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

        const [
          totalFilesRes,
          photosRes,
          docsRes,
          storageBytesRes,
          recentRes,
        ] = await Promise.all([
          supabase
            .from("files")
            .select("id", { count: "exact", head: true }),
          supabase
            .from("files")
            .select("id", { count: "exact", head: true })
            .eq("file_type", "image"),
          supabase
            .from("files")
            .select("id", { count: "exact", head: true })
            .eq("file_type", "document"),
          supabase
            .from("files")
            .select("size_bytes"),
          supabase
            .from("files")
            .select("id,name,file_type,created_at,size_bytes,folder_id,tags,description")
            .order("created_at", { ascending: false })
            .limit(10),
        ]);

        const totalBytes = storageBytesRes.data?.reduce((acc, curr) => acc + (Number(curr.size_bytes) || 0), 0) || 0;

        const nextStats = {
          totalFiles: totalFilesRes.count ?? 0,
          photos: photosRes.count ?? 0,
          documents: docsRes.count ?? 0,
          storageUsedBytes: totalBytes,
        };

        if (!mounted) return;
        setStats(nextStats);
        setRecent((recentRes.data ?? []) as any);
      } catch (e) {
        // We'll render skeleton/empty state if backend isn't configured yet.
        if (!mounted) return;
        setStats({
          totalFiles: 0,
          photos: 0,
          documents: 0,
          storageUsedBytes: 0,
        });
        setRecent([]);
      } finally {
        if (!mounted) return;
        setLoading(false);
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
          <h1 className="font-display text-3xl tracking-wide">Dashboard</h1>
          <p className="mt-1 text-sm text-zinc-400">Your personal archive at a glance.</p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/files"
            className="inline-flex h-10 items-center justify-center rounded-md bg-zinc-800 px-4 text-sm font-medium text-zinc-50 transition-colors hover:bg-zinc-700"
          >
            Quick Upload
          </Link>
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-normal text-zinc-400">
              Total files
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {loading ? <Skeleton className="h-7 w-16" /> : <div className="text-2xl font-display">{stats.totalFiles}</div>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-normal text-zinc-400">
              Photos
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {loading ? (
              <Skeleton className="h-7 w-16" />
            ) : (
              <div className="text-2xl font-display">{stats.photos}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-normal text-zinc-400">
              Documents
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {loading ? (
              <Skeleton className="h-7 w-16" />
            ) : (
              <div className="text-2xl font-display">{stats.documents}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-normal text-zinc-400">
              Storage used
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {loading ? (
              <Skeleton className="h-7 w-24" />
            ) : (
              <div className="text-2xl font-display">{formatBytes(stats.storageUsedBytes)}</div>
            )}
          </CardContent>
        </Card>
      </div>

      <section>
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-xl tracking-wide">Recently added</h2>
          <Link href="/files" className="text-sm text-zinc-400 hover:text-zinc-50">
            View all
          </Link>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {loading ? (
            Array.from({ length: 6 }).map((_, idx) => (
              <Card key={idx} className="p-4">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="mt-3 h-4 w-24" />
                <Skeleton className="mt-3 h-10 w-full" />
              </Card>
            ))
          ) : recent.length === 0 ? (
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/30 p-6 text-zinc-400">
              No files yet. Upload your first photo or document to start building your vault.
            </div>
          ) : (
            recent.map((f) => (
              <Card key={f.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{f.name}</div>
                    <div className="mt-1 text-xs text-zinc-400">
                      {new Date(f.created_at).toLocaleDateString()} · {formatBytes(Number(f.size_bytes ?? 0))}
                    </div>
                  </div>
                  <div className="shrink-0 rounded-full bg-zinc-900 px-2 py-1 text-[10px] text-zinc-200">
                    {f.file_type}
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

