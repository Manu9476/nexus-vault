"use client";

import { useMemo } from "react";

import { FileCard, type FileCardModel } from "@/components/FileCard";

export function FileGrid({
  files,
  view,
  onOpen,
}: {
  files: FileCardModel[];
  view: "grid" | "list";
  onOpen: (id: string) => void;
}) {
  const isGrid = view === "grid";

  const containerClass = isGrid
    ? "grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
    : "space-y-3";

  const listCardClass = isGrid ? "" : "p-3";

  const rendered = useMemo(() => {
    if (!files.length) return null;
    return (
      <div className={containerClass}>
        {files.map((f) => (
          <div key={f.id} className={listCardClass}>
            <FileCard file={f} onOpen={onOpen} />
          </div>
        ))}
      </div>
    );
  }, [files, containerClass, listCardClass, onOpen]);

  return rendered;
}

