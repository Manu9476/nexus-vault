"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

export type FileCardModel = {
  id: string;
  name: string;
  file_type: "image" | "document" | "video" | "other";
  mime_type: string | null;
  size_bytes: number;
  created_at: string;
  tags: string[] | null;
  description: string | null;
  folder_id: string | null;
};

export function FileCard({
  file,
  onOpen,
}: {
  file: FileCardModel;
  onOpen: (id: string) => void;
}) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);

  const shouldPreview = file.file_type === "image" || file.mime_type === "application/pdf";

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!shouldPreview) return;
      try {
        const res = await fetch(`/api/files/${file.id}/signed-url`, {
          method: "GET",
        });
        if (!res.ok) return;
        const json = await res.json();
        if (mounted) setSignedUrl(json?.signedUrl ?? null);
      } catch {
        // ignore
      }
    })();
    return () => {
      mounted = false;
    };
  }, [file.id, shouldPreview]);

  const created = useMemo(() => new Date(file.created_at).toLocaleDateString(), [file.created_at]);

  return (
    <Card
      className="group cursor-pointer border-zinc-800 bg-zinc-950/30 transition-colors hover:bg-zinc-950/50"
      onClick={() => onOpen(file.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onOpen(file.id);
      }}
    >
      <div className="p-3">
        {file.file_type === "image" && signedUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={signedUrl}
            alt={file.name}
            className="h-32 w-full rounded-lg border border-zinc-800 object-cover"
          />
        ) : (
          <div className="flex h-32 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-950/20 text-zinc-400">
            {file.file_type === "document" ? "PDF/DOC" : "FILE"}
          </div>
        )}

        <div className="mt-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate text-sm font-medium">{file.name}</div>
            <div className="mt-1 text-xs text-zinc-400">{created}</div>
          </div>

          <Badge className="shrink-0 bg-zinc-900/40">{file.file_type}</Badge>
        </div>

        {file.tags?.length ? (
          <div className="mt-2 flex flex-wrap gap-1">
            {file.tags.slice(0, 3).map((t) => (
              <span key={t} className="rounded border border-zinc-800 bg-zinc-900/30 px-1.5 py-0.5 text-[10px] text-zinc-200">
                {t}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </Card>
  );
}

