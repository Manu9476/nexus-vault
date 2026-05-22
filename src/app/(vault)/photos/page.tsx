"use client";

import { useEffect, useMemo, useState } from "react";

import { createSupabaseBrowser } from "@/lib/supabase";
import type { FileCardModel } from "@/components/FileCard";
import { PhotoLightbox } from "@/components/PhotoLightbox";

import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function monthYearLabel(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, { year: "numeric", month: "long" });
}

function PhotoThumb({
  photo,
  onClick,
}: {
  photo: FileCardModel;
  onClick: () => void;
}) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch(`/api/files/${photo.id}/signed-url`);
        if (!res.ok) return;
        const json = await res.json();
        if (!mounted) return;
        setSignedUrl(json?.signedUrl ?? null);
      } catch {
        // ignore
      }
    })();

    return () => {
      mounted = false;
    };
  }, [photo.id]);

  return (
    <button
      type="button"
      onClick={onClick}
      className="mb-4 w-full break-inside-avoid rounded-xl"
    >
      {signedUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={signedUrl}
          alt={photo.name}
          className="h-auto w-full rounded-xl border border-nexus-border bg-nexus-surface object-cover"
        />
      ) : (
        <div className="h-40 w-full rounded-xl border border-nexus-border bg-nexus-surface p-3">
          <Skeleton className="h-full w-full" />
        </div>
      )}
    </button>
  );
}

export default function PhotosPage() {
  const supabase = useMemo(() => createSupabaseBrowser(), []);
  const [photos, setPhotos] = useState<FileCardModel[]>([]);
  const [loading, setLoading] = useState(true);

  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        if (!supabase) {
          if (!mounted) return;
          setPhotos([]);
          return;
        }

        const { data, error } = await supabase
          .from("files")
          .select("id,name,created_at,file_type,mime_type,size_bytes,folder_id,tags,description")
          .eq("file_type", "image")
          .order("created_at", { ascending: false })
          .limit(200);
        if (error) throw error;
        if (!mounted) return;
        setPhotos((data ?? []) as any);
      } catch {
        if (!mounted) return;
        setPhotos([]);
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [supabase]);

  const grouped = useMemo(() => {
    const map = new Map<string, FileCardModel[]>();
    for (const p of photos) {
      const key = monthYearLabel(p.created_at);
      const current = map.get(key) ?? [];
      current.push(p);
      map.set(key, current);
    }

    return Array.from(map.entries()).map(([label, items]) => ({
      label,
      items,
    }));
  }, [photos]);

  const indexById = useMemo(() => {
    const m = new Map<string, number>();
    photos.forEach((p, idx) => m.set(p.id, idx));
    return m;
  }, [photos]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-extrabold">Photos</h1>
        <p className="mt-1 text-sm text-nexus-muted">Masonry gallery grouped by month/year.</p>
      </header>

      <Card className="border-nexus-border bg-nexus-surface">
        <div className="p-4">
          {loading ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 9 }).map((_, idx) => (
                <div key={idx} className="rounded-xl border border-nexus-border bg-nexus-surface p-3">
                  <Skeleton className="h-36 w-full" />
                </div>
              ))}
            </div>
          ) : photos.length === 0 ? (
            <div className="rounded-xl border border-nexus-border bg-nexus-surface p-8 text-center text-nexus-muted">
              No photos yet. Upload an image to start your gallery.
            </div>
          ) : (
            <div className="space-y-8">
              {grouped.map((g) => (
                <section key={g.label}>
                  <h2 className="mb-3 font-display text-xl font-bold text-nexus-text">
                    {g.label}
                  </h2>
                  <div className="columns-2 gap-4 sm:columns-3 md:columns-4">
                    {g.items.map((p) => (
                      <PhotoThumb
                        key={p.id}
                        photo={p}
                        onClick={() => {
                          setSelectedIndex(indexById.get(p.id) ?? 0);
                          setLightboxOpen(true);
                        }}
                      />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      </Card>

      <PhotoLightbox
        photos={photos}
        open={lightboxOpen}
        selectedIndex={selectedIndex}
        onOpenChange={setLightboxOpen}
        onSelectIndex={setSelectedIndex}
      />
    </div>
  );
}


