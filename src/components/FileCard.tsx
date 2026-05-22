"use client";

import { useEffect, useMemo, useState } from "react";
import { File, FileText, Image as ImageIcon, Video } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { formatBytes } from "@/lib/fileHelpers";

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
  category?: string | null;
  document_type?: string | null;
  custom_type_label?: string | null;
  search_text?: string | null;
  academic_year?: string | null;
  semester?: string | null;
  course_code?: string | null;
  course_title?: string | null;
  institution?: string | null;
  folders?: { name?: string | null } | null;
};

export function FileCard({
  file,
  onOpen,
}: {
  file: FileCardModel;
  onOpen: (id: string) => void;
}) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [previewChecked, setPreviewChecked] = useState(false);

  const isPdf = file.mime_type === "application/pdf";
  const isDocument = file.file_type === "document";
  const shouldPreview = file.file_type === "image" || isDocument;
  const pdfPreviewUrl = signedUrl ? `${signedUrl}#toolbar=0&navpanes=0&scrollbar=0&page=1` : null;
  const PreviewIcon =
    file.file_type === "image"
      ? ImageIcon
      : file.file_type === "video"
        ? Video
        : file.file_type === "document"
          ? FileText
          : File;

  useEffect(() => {
    let mounted = true;
    (async () => {
      setPreviewChecked(false);
      setSignedUrl(null);
      if (!shouldPreview) {
        setPreviewChecked(true);
        return;
      }
      try {
        const res = await fetch(`/api/files/${file.id}/signed-url`, {
          method: "GET",
        });
        if (!res.ok) return;
        const json = await res.json();
        if (mounted) setSignedUrl(json?.signedUrl ?? null);
      } catch {
        // ignore
      } finally {
        if (mounted) setPreviewChecked(true);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [file.id, shouldPreview]);

  const created = useMemo(() => new Date(file.created_at).toLocaleDateString(), [file.created_at]);
  const primaryBadge = file.custom_type_label ?? file.document_type ?? file.file_type;
  const locationHint = file.folders?.name ?? file.category ?? file.file_type;

  return (
    <Card
      className="group cursor-pointer border-nexus-border bg-nexus-surface transition-colors hover:border-nexus-orange"
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
            className="h-32 w-full rounded-lg border border-nexus-border object-cover"
          />
        ) : (isPdf || isDocument) && pdfPreviewUrl ? (
          <div className="h-32 overflow-hidden rounded-lg border border-nexus-border bg-white">
            <iframe
              src={pdfPreviewUrl}
              title={`${file.name} preview`}
              className="pointer-events-none h-[210px] w-full origin-top scale-[0.72] border-0 bg-white"
              tabIndex={-1}
            />
          </div>
        ) : shouldPreview ? (
          <div className="flex h-32 flex-col items-center justify-center gap-2 rounded-lg border border-nexus-border bg-nexus-surface text-sm text-nexus-muted">
            <PreviewIcon className="h-8 w-8 text-nexus-purple" />
            <span>{previewChecked ? "Open document" : "Loading preview..."}</span>
          </div>
        ) : (
          <div className="flex h-32 flex-col items-center justify-center gap-2 rounded-lg border border-nexus-border bg-nexus-surface text-nexus-muted">
            <PreviewIcon className="h-8 w-8 text-nexus-purple" />
            <span className="text-xs font-medium uppercase">{file.file_type}</span>
          </div>
        )}

        <div className="mt-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate text-sm font-medium">{file.name}</div>
            <div className="mt-1 truncate text-xs text-nexus-muted">
              {created} - {formatBytes(file.size_bytes)}
            </div>
            <div className="mt-1 truncate text-xs text-nexus-muted">{locationHint}</div>
          </div>

          <Badge className="max-w-[120px] shrink-0 truncate">{primaryBadge}</Badge>
        </div>

        {file.tags?.length ? (
          <div className="mt-2 flex flex-wrap gap-1">
            {file.tags.slice(0, 3).map((t) => (
              <span key={t} className="rounded border border-nexus-border bg-nexus-surface px-1.5 py-0.5 text-[10px] text-nexus-muted">
                {t}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </Card>
  );
}

