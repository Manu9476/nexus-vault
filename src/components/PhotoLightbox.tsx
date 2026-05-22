"use client";

import { useEffect, useMemo, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";

import { Button } from "@/components/ui/button";

import type { FileCardModel } from "@/components/FileCard";

export function PhotoLightbox({
  photos,
  open,
  selectedIndex,
  onOpenChange,
  onSelectIndex,
}: {
  photos: FileCardModel[];
  open: boolean;
  selectedIndex: number;
  onOpenChange: (open: boolean) => void;
  onSelectIndex: (nextIndex: number) => void;
}) {
  const selected = photos[selectedIndex];
  const [signedUrl, setSignedUrl] = useState<string | null>(null);

  const canPrev = selectedIndex > 0;
  const canNext = selectedIndex < photos.length - 1;

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!open || !selected) return;
      setSignedUrl(null);
      try {
        const res = await fetch(`/api/files/${selected.id}/signed-url`);
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
  }, [open, selectedIndex, selected, selected?.id]);

  const monthYear = useMemo(() => {
    if (!selected) return "";
    const d = new Date(selected.created_at);
    return d.toLocaleString(undefined, { year: "numeric", month: "long" });
  }, [selected]);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-nexus-bg/80" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[95vw] max-w-6xl -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-xl border border-nexus-border bg-nexus-surface">
          <div className="flex max-h-[90vh] flex-col">
            <div className="flex items-center justify-between gap-3 border-b border-nexus-border p-4">
              <div className="min-w-0">
                <div className="truncate font-display text-base font-bold">{selected?.name ?? "Photo"}</div>
                <div className="mt-1 text-xs text-nexus-muted">{monthYear}</div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  className="border-nexus-border bg-nexus-surface"
                  disabled={!canPrev}
                  onClick={() => canPrev && onSelectIndex(selectedIndex - 1)}
                >
                  Prev
                </Button>
                <Button
                  variant="outline"
                  className="border-nexus-border bg-nexus-surface"
                  disabled={!canNext}
                  onClick={() => canNext && onSelectIndex(selectedIndex + 1)}
                >
                  Next
                </Button>
                <Button variant="ghost" onClick={() => onOpenChange(false)}>
                  Close
                </Button>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-4">
              {signedUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={signedUrl}
                  alt={selected?.name ?? "Photo"}
                  className="h-auto w-full rounded-xl border border-nexus-border object-contain"
                />
              ) : (
                <div className="rounded-xl border border-nexus-border bg-nexus-surface p-6 text-center text-nexus-muted">
                  Loading photo...
                </div>
              )}
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

