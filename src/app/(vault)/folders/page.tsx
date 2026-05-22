"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Folder as FolderIcon } from "lucide-react";
import { toast } from "sonner";

import { createSupabaseBrowser } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import type { VaultFolder } from "@/types";

export default function FoldersPage() {
  const supabase = useMemo(() => createSupabaseBrowser(), []);

  const [folders, setFolders] = useState<VaultFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [newFolderName, setNewFolderName] = useState("");
  const [creating, setCreating] = useState(false);

  const fetchFolders = useCallback(async () => {
    if (!supabase) {
      setFolders([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("folders")
        .select("*")
        .is("parent_id", null)
        .order("name", { ascending: true });
      if (error) throw error;
      setFolders((data ?? []) as VaultFolder[]);
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to load folders.");
      setFolders([]);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchFolders();
  }, [fetchFolders]);

  async function handleCreateFolder(e: React.FormEvent) {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    if (!supabase) {
      toast.error("Supabase is not configured yet.");
      return;
    }

    setCreating(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) throw new Error("Not authenticated");

      const { error } = await supabase.from("folders").insert({
        user_id: userId,
        name: newFolderName.trim(),
        parent_id: null,
        color: null,
        icon: null,
      });
      if (error) throw error;
      
      setNewFolderName("");
      await fetchFolders();
      toast.success("Folder created.");
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to create folder.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="font-display text-3xl font-extrabold">Folders</h1>
          <p className="mt-1 text-sm text-nexus-muted">
            Browse your vault from broad collections down to the final document.
          </p>
        </div>
      </header>

      <Card className="border-nexus-border bg-nexus-surface p-4">
        <form onSubmit={handleCreateFolder} className="flex gap-2">
          <Input 
            value={newFolderName}
            onChange={e => setNewFolderName(e.target.value)}
            placeholder="New folder name..." 
            className="max-w-sm"
          />
          <Button type="submit" disabled={creating || !newFolderName.trim()}>
            <Plus className="mr-2 h-4 w-4" />
            Create
          </Button>
        </form>
      </Card>

      <section>
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-xl" />
            ))}
          </div>
        ) : folders.length === 0 ? (
          <div className="rounded-xl border border-nexus-border bg-nexus-surface p-8 text-center text-nexus-muted">
            No folders yet. Create one to organize your files.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {folders.map(folder => (
              <Link key={folder.id} href={`/folders/${folder.id}`}>
                <Card className="flex h-24 items-center gap-4 rounded-xl border border-nexus-border bg-nexus-surface p-4 transition-colors hover:border-nexus-orange">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-nexus-surface text-nexus-purple">
                    <FolderIcon size={20} />
                  </div>
                  <div className="overflow-hidden">
                    <h3 className="truncate font-medium text-nexus-text">{folder.name}</h3>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
