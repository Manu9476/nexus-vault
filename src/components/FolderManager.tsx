"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Archive,
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  BookOpen,
  CreditCard,
  Edit3,
  FileText,
  Folder,
  GraduationCap,
  HeartPulse,
  Image,
  Landmark,
  Save,
  ShieldCheck,
  Trash2,
  X,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";

import { createSupabaseBrowser } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import type { VaultFolder } from "@/types";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

type FolderManagerProps = {
  folders: VaultFolder[];
  loading?: boolean;
  emptyText: string;
  onChanged: () => void | Promise<void>;
};

type FolderShape = "soft" | "square" | "pill" | "wide";
type FolderDensity = "comfortable" | "compact" | "large";

type FolderIconOption = {
  value: string;
  label: string;
  icon: LucideIcon;
};

const folderIcons: FolderIconOption[] = [
  { value: "folder", label: "Folder", icon: Folder },
  { value: "archive", label: "Archive", icon: Archive },
  { value: "academic", label: "Academic", icon: GraduationCap },
  { value: "notes", label: "Notes", icon: BookOpen },
  { value: "document", label: "Document", icon: FileText },
  { value: "certificate", label: "Certificate", icon: BadgeCheck },
  { value: "identity", label: "Identity", icon: ShieldCheck },
  { value: "finance", label: "Finance", icon: Landmark },
  { value: "card", label: "Card", icon: CreditCard },
  { value: "medical", label: "Medical", icon: HeartPulse },
  { value: "photos", label: "Photos", icon: Image },
];

const folderColors = [
  { value: "#7B6FCD", label: "Purple" },
  { value: "#FF6B2B", label: "Orange" },
  { value: "#A0A0A8", label: "Gray" },
  { value: "#FFFFFF", label: "White" },
];

const folderShapes: { value: FolderShape; label: string }[] = [
  { value: "soft", label: "Soft" },
  { value: "square", label: "Square" },
  { value: "pill", label: "Pill" },
  { value: "wide", label: "Wide" },
];

const shapeClasses: Record<FolderShape, string> = {
  soft: "rounded-xl",
  square: "rounded-md",
  pill: "rounded-[28px]",
  wide: "rounded-xl sm:col-span-2",
};

const densityClasses: Record<FolderDensity, string> = {
  comfortable: "min-h-32 p-4",
  compact: "min-h-24 p-3",
  large: "min-h-40 p-5",
};

function normalizeShape(shape: string | null): FolderShape {
  if (shape === "square" || shape === "pill" || shape === "wide") return shape;
  return "soft";
}

function getFolderIcon(icon: string | null): LucideIcon {
  return folderIcons.find((item) => item.value === icon)?.icon ?? Folder;
}

export function FolderManager({
  folders,
  loading = false,
  emptyText,
  onChanged,
}: FolderManagerProps) {
  const supabase = useMemo(() => createSupabaseBrowser(), []);
  const [density, setDensity] = useState<FolderDensity>("comfortable");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editIcon, setEditIcon] = useState("folder");
  const [editColor, setEditColor] = useState("#7B6FCD");
  const [editShape, setEditShape] = useState<FolderShape>("soft");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const orderedFolders = useMemo(
    () =>
      [...folders].sort((a, b) => {
        const orderA = a.sort_order ?? 0;
        const orderB = b.sort_order ?? 0;
        if (orderA !== orderB) return orderA - orderB;
        return a.name.localeCompare(b.name);
      }),
    [folders]
  );

  function startEdit(folder: VaultFolder) {
    setEditingId(folder.id);
    setEditName(folder.name);
    setEditIcon(folder.icon ?? "folder");
    setEditColor(folder.color ?? "#7B6FCD");
    setEditShape(normalizeShape(folder.shape));
  }

  function cancelEdit() {
    setEditingId(null);
    setEditName("");
    setEditIcon("folder");
    setEditColor("#7B6FCD");
    setEditShape("soft");
  }

  async function saveFolder(folderId: string) {
    if (!supabase) {
      toast.error("Supabase is not configured yet.");
      return;
    }

    const nextName = editName.trim();
    if (!nextName) {
      toast.error("Folder name cannot be empty.");
      return;
    }

    setSavingId(folderId);
    try {
      const { error } = await supabase
        .from("folders")
        .update({
          name: nextName,
          icon: editIcon,
          color: editColor,
          shape: editShape,
        })
        .eq("id", folderId);

      if (error) throw error;
      cancelEdit();
      await onChanged();
      toast.success("Folder updated.");
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to update folder.");
    } finally {
      setSavingId(null);
    }
  }

  async function deleteFolder(folder: VaultFolder) {
    if (!supabase) {
      toast.error("Supabase is not configured yet.");
      return;
    }

    const ok = confirm(
      `Delete "${folder.name}"? Files inside this folder will stay in your vault, but they will become unsorted.`
    );
    if (!ok) return;

    setSavingId(folder.id);
    try {
      const { error } = await supabase.from("folders").delete().eq("id", folder.id);
      if (error) throw error;
      await onChanged();
      toast.success("Folder deleted.");
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to delete folder.");
    } finally {
      setSavingId(null);
    }
  }

  async function persistOrder(nextFolders: VaultFolder[]) {
    if (!supabase) {
      toast.error("Supabase is not configured yet.");
      return;
    }

    setSavingId("order");
    try {
      const updates = await Promise.all(
        nextFolders.map((folder, index) =>
          supabase.from("folders").update({ sort_order: index }).eq("id", folder.id)
        )
      );
      const failed = updates.find((result) => result.error);
      if (failed?.error) throw failed.error;
      await onChanged();
      toast.success("Folder order saved.");
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to reorder folders.");
    } finally {
      setSavingId(null);
    }
  }

  async function moveFolder(folderId: string, direction: -1 | 1) {
    const currentIndex = orderedFolders.findIndex((folder) => folder.id === folderId);
    const nextIndex = currentIndex + direction;
    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= orderedFolders.length) return;

    const nextFolders = [...orderedFolders];
    const [moved] = nextFolders.splice(currentIndex, 1);
    nextFolders.splice(nextIndex, 0, moved);
    await persistOrder(nextFolders);
  }

  async function dropFolder(targetId: string) {
    if (!draggedId || draggedId === targetId) return;

    const fromIndex = orderedFolders.findIndex((folder) => folder.id === draggedId);
    const targetIndex = orderedFolders.findIndex((folder) => folder.id === targetId);
    if (fromIndex < 0 || targetIndex < 0) return;

    const nextFolders = [...orderedFolders];
    const [moved] = nextFolders.splice(fromIndex, 1);
    nextFolders.splice(targetIndex, 0, moved);
    setDraggedId(null);
    setDragOverId(null);
    await persistOrder(nextFolders);
  }

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <Skeleton key={index} className="h-32 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (orderedFolders.length === 0) {
    return (
      <div className="rounded-xl border border-nexus-border bg-nexus-surface p-8 text-center text-nexus-muted">
        {emptyText}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-xl border border-nexus-border bg-nexus-surface p-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-sm font-bold text-nexus-text">Folder appearance</div>
          <div className="text-xs text-nexus-muted">
            Drag cards to reorder, or edit names, icons, colors, and shapes.
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {(["comfortable", "compact", "large"] as FolderDensity[]).map((option) => (
            <Button
              key={option}
              type="button"
              size="sm"
              variant={density === option ? "default" : "outline"}
              onClick={() => setDensity(option)}
            >
              {option[0].toUpperCase() + option.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid auto-rows-fr gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
        {orderedFolders.map((folder, index) => {
          const isEditing = editingId === folder.id;
          const Icon = getFolderIcon(folder.icon);
          const iconColor = folder.color ?? "#7B6FCD";
          const shape = normalizeShape(folder.shape);
          const isBusy = savingId === folder.id || savingId === "order";

          return (
            <Card
              key={folder.id}
              className={cn(
                "group flex flex-col justify-between border-l-4 bg-nexus-surface transition-colors hover:border-nexus-orange/70",
                draggedId === folder.id && "opacity-60",
                dragOverId === folder.id && "ring-2 ring-nexus-orange/50",
                shapeClasses[shape],
                densityClasses[density]
              )}
              style={{ borderLeftColor: iconColor }}
              draggable={!isEditing && !isBusy}
              onDragStart={(event) => {
                if (isEditing || isBusy) return;
                setDraggedId(folder.id);
                event.dataTransfer.effectAllowed = "move";
              }}
              onDragOver={(event) => {
                if (!draggedId || draggedId === folder.id || isBusy) return;
                event.preventDefault();
                setDragOverId(folder.id);
              }}
              onDragLeave={() => {
                if (dragOverId === folder.id) setDragOverId(null);
              }}
              onDrop={(event) => {
                event.preventDefault();
                void dropFolder(folder.id);
              }}
              onDragEnd={() => {
                setDraggedId(null);
                setDragOverId(null);
              }}
            >
              {isEditing ? (
                <div className="space-y-3">
                  <Input
                    value={editName}
                    onChange={(event) => setEditName(event.target.value)}
                    placeholder="Folder name"
                    disabled={isBusy}
                  />

                  <div className="grid gap-2 sm:grid-cols-2">
                    <label className="space-y-1">
                      <span className="text-xs text-nexus-muted">Icon</span>
                      <select
                        className="h-10 w-full rounded-xl border border-nexus-border bg-nexus-surface px-3 text-sm text-nexus-text"
                        value={editIcon}
                        onChange={(event) => setEditIcon(event.target.value)}
                        disabled={isBusy}
                      >
                        {folderIcons.map((item) => (
                          <option key={item.value} value={item.value}>
                            {item.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="space-y-1">
                      <span className="text-xs text-nexus-muted">Shape</span>
                      <select
                        className="h-10 w-full rounded-xl border border-nexus-border bg-nexus-surface px-3 text-sm text-nexus-text"
                        value={editShape}
                        onChange={(event) => setEditShape(event.target.value as FolderShape)}
                        disabled={isBusy}
                      >
                        {folderShapes.map((item) => (
                          <option key={item.value} value={item.value}>
                            {item.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <div>
                    <div className="mb-2 text-xs text-nexus-muted">Accent color</div>
                    <div className="flex flex-wrap gap-2">
                      {folderColors.map((color) => (
                        <button
                          key={color.value}
                          type="button"
                          aria-label={color.label}
                          title={color.label}
                          disabled={isBusy}
                          onClick={() => setEditColor(color.value)}
                          className={cn(
                            "h-8 w-8 rounded-full border transition-transform hover:scale-105 disabled:opacity-50",
                            editColor === color.value
                              ? "border-nexus-orange ring-2 ring-nexus-orange/40"
                              : "border-nexus-border"
                          )}
                          style={{ backgroundColor: color.value }}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => saveFolder(folder.id)}
                      disabled={isBusy}
                    >
                      <Save className="h-4 w-4" />
                      Save
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={cancelEdit}
                      disabled={isBusy}
                    >
                      <X className="h-4 w-4" />
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <Link
                    href={`/folders/${folder.id}`}
                    className="flex min-h-0 flex-1 items-center gap-4 rounded-lg outline-none transition-colors focus-visible:ring-2 focus-visible:ring-nexus-orange/70"
                  >
                    <div
                      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-nexus-border bg-nexus-bg"
                      style={{ color: iconColor }}
                    >
                      <Icon className="h-6 w-6" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="truncate text-lg font-extrabold text-nexus-text">
                        {folder.name}
                      </h3>
                      <p className="mt-1 text-xs text-nexus-muted">
                        Open folder
                      </p>
                    </div>
                  </Link>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-nexus-border pt-3">
                    <div className="flex gap-1">
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        aria-label={`Move ${folder.name} left`}
                        title="Move left"
                        disabled={index === 0 || isBusy}
                        onClick={() => moveFolder(folder.id, -1)}
                      >
                        <ArrowLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        aria-label={`Move ${folder.name} right`}
                        title="Move right"
                        disabled={index === orderedFolders.length - 1 || isBusy}
                        onClick={() => moveFolder(folder.id, 1)}
                      >
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="flex gap-1">
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        aria-label={`Edit ${folder.name}`}
                        title="Edit folder"
                        disabled={isBusy}
                        onClick={() => startEdit(folder)}
                      >
                        <Edit3 className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        aria-label={`Delete ${folder.name}`}
                        title="Delete folder"
                        disabled={isBusy}
                        onClick={() => deleteFolder(folder)}
                        className="hover:border-nexus-orange hover:text-nexus-orange"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
