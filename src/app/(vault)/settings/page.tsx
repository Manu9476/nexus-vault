"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";

import { createSupabaseBrowser } from "@/lib/supabase";
import {
  defaultVaultTaxonomy,
  recommendedVaultFolderPaths,
  recommendedVaultFolders,
  type UploadMode,
  type VaultTaxonomy,
} from "@/lib/vaultTaxonomy";
import {
  defaultVaultPreferences,
  getVaultPreferences,
  resetVaultPreferences,
  saveVaultPreferences,
  type FileViewPreference,
  type VaultPreferences,
} from "@/lib/vaultSettings";
import { getVaultTaxonomy } from "@/lib/vaultTaxonomySettings";
import { TaxonomyManager } from "@/components/TaxonomyManager";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type FolderNameRow = {
  id: string;
  name: string;
  parent_id: string | null;
  sort_order: number | null;
};

export default function SettingsPage() {
  const supabase = useMemo(() => createSupabaseBrowser(), []);
  const [preferences, setPreferences] = useState<VaultPreferences>(defaultVaultPreferences);
  const [email, setEmail] = useState<string | null>(null);
  const [checkingAccount, setCheckingAccount] = useState(true);
  const [creatingFolders, setCreatingFolders] = useState(false);
  const [lastFolderSetup, setLastFolderSetup] = useState<string | null>(null);
  const [taxonomy, setTaxonomy] = useState<VaultTaxonomy>(defaultVaultTaxonomy);

  useEffect(() => {
    setPreferences(getVaultPreferences());
  }, []);

  useEffect(() => {
    function refreshTaxonomy() {
      setTaxonomy(getVaultTaxonomy());
    }

    refreshTaxonomy();
    window.addEventListener("storage", refreshTaxonomy);
    window.addEventListener("nexus:taxonomy-updated", refreshTaxonomy);

    return () => {
      window.removeEventListener("storage", refreshTaxonomy);
      window.removeEventListener("nexus:taxonomy-updated", refreshTaxonomy);
    };
  }, []);

  useEffect(() => {
    if (taxonomy.workloads.some((mode) => mode.value === preferences.defaultUploadMode)) return;
    setPreferences((current) => ({
      ...current,
      defaultUploadMode: taxonomy.workloads[0]?.value ?? "general",
    }));
  }, [preferences.defaultUploadMode, taxonomy.workloads]);

  useEffect(() => {
    let mounted = true;

    async function checkAccount() {
      setCheckingAccount(true);
      try {
        if (!supabase) {
          if (mounted) setEmail(null);
          return;
        }

        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (mounted) setEmail(user?.email ?? null);
      } finally {
        if (mounted) setCheckingAccount(false);
      }
    }

    checkAccount();

    return () => {
      mounted = false;
    };
  }, [supabase]);

  function updatePreference<K extends keyof VaultPreferences>(
    key: K,
    value: VaultPreferences[K]
  ) {
    setPreferences((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function savePreferences() {
    const nextPreferences = taxonomy.workloads.some(
      (mode) => mode.value === preferences.defaultUploadMode
    )
      ? preferences
      : {
          ...preferences,
          defaultUploadMode: taxonomy.workloads[0]?.value ?? "general",
        };
    setPreferences(nextPreferences);
    saveVaultPreferences(nextPreferences);
    toast.success("Settings saved.");
  }

  function resetPreferences() {
    resetVaultPreferences();
    setPreferences(defaultVaultPreferences);
    toast.success("Local settings reset.");
  }

  async function createRecommendedFolders() {
    if (!supabase) {
      toast.error("Supabase is not configured yet.");
      return;
    }

    setCreatingFolders(true);
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) throw new Error("Please login again.");

      const { data: existingFolders, error: fetchError } = await supabase
        .from("folders")
        .select("id,name,parent_id,sort_order")
        .eq("user_id", user.id);

      if (fetchError) throw fetchError;

      const knownFolders = [...((existingFolders ?? []) as FolderNameRow[])];
      let createdCount = 0;

      async function ensureFolder(name: string, parentId: string | null) {
        const existing = knownFolders.find(
          (folder) => folder.name === name && folder.parent_id === parentId
        );
        if (existing) return existing.id;

        const { data: created, error: insertError } = await supabase
          .from("folders")
          .insert({
            user_id: user.id,
            name,
            parent_id: parentId,
            color: null,
            icon: null,
            shape: "soft",
            sort_order: knownFolders.filter((folder) => folder.parent_id === parentId).length,
          })
          .select("id,name,parent_id,sort_order")
          .single();

        if (insertError) throw insertError;
        knownFolders.push(created as FolderNameRow);
        createdCount += 1;
        return created.id as string;
      }

      for (const path of recommendedVaultFolderPaths) {
        let parentId: string | null = null;
        for (const folderName of path) {
          parentId = await ensureFolder(folderName, parentId);
        }
      }

      if (!createdCount) {
        setLastFolderSetup("All recommended folders already exist.");
        toast.success("Your folder structure is already ready.");
        return;
      }

      setLastFolderSetup(`Created ${createdCount} folder${createdCount === 1 ? "" : "s"}.`);
      toast.success(`Created ${createdCount} folder${createdCount === 1 ? "" : "s"}.`);
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to create folders.");
    } finally {
      setCreatingFolders(false);
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="font-display text-3xl font-extrabold">Settings</h1>
          <p className="mt-1 text-sm text-nexus-muted">
            Control how Nexus organizes and opens your vault.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/organizer">
            <Badge className="transition-colors hover:border-nexus-orange/70 hover:text-nexus-orange">
              Organizer
            </Badge>
          </Link>
          <Link href="/folders">
            <Badge className="transition-colors hover:border-nexus-orange/70 hover:text-nexus-orange">
              Folders
            </Badge>
          </Link>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <Card className="border-nexus-border bg-nexus-surface">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-nexus-text">
              Defaults
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <label className="space-y-2">
                <span className="block text-xs text-nexus-muted">Default file view</span>
                <select
                  className="h-10 w-full rounded-xl border border-nexus-border bg-nexus-surface px-3 text-sm text-nexus-text"
                  value={preferences.defaultFileView}
                  onChange={(event) =>
                    updatePreference("defaultFileView", event.target.value as FileViewPreference)
                  }
                >
                  <option value="grid">Grid</option>
                  <option value="list">List</option>
                </select>
              </label>

              <label className="space-y-2">
                <span className="block text-xs text-nexus-muted">Default upload workload</span>
                <select
                  className="h-10 w-full rounded-xl border border-nexus-border bg-nexus-surface px-3 text-sm text-nexus-text"
                  value={preferences.defaultUploadMode}
                  onChange={(event) =>
                    updatePreference("defaultUploadMode", event.target.value as UploadMode)
                  }
                >
                  {taxonomy.workloads.map((mode) => (
                    <option key={mode.value} value={mode.value}>
                      {mode.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="flex items-center gap-2 rounded-xl border border-nexus-border px-3 py-2 text-sm text-nexus-muted">
              <input
                type="checkbox"
                checked={preferences.autoOrganizeUploads}
                onChange={(event) =>
                  updatePreference("autoOrganizeUploads", event.target.checked)
                }
                className="h-4 w-4 accent-nexus-orange"
              />
              Auto-create matching folders during structured uploads
            </label>

            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={savePreferences}>
                Save settings
              </Button>
              <Button type="button" variant="outline" onClick={resetPreferences}>
                Reset local settings
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-nexus-border bg-nexus-surface">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-nexus-text">
              Account
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="text-nexus-muted">Supabase</span>
              <Badge className={supabase ? "" : "border-nexus-orange bg-transparent text-nexus-orange"}>
                {supabase ? "Configured" : "Missing env vars"}
              </Badge>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-nexus-muted">Signed in</span>
              <span className="truncate text-right text-nexus-text">
                {checkingAccount ? "Checking..." : email ?? "No"}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-nexus-muted">Storage bucket</span>
              <span className="font-mono text-xs text-nexus-text">nexus-files</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <TaxonomyManager />

      <Card className="border-nexus-border bg-nexus-surface">
        <CardHeader>
          <CardTitle className="text-base font-semibold text-nexus-text">
            Folder Setup
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm text-nexus-muted">
                Create the recommended structure for IDs, certificates, results, and course notes.
              </p>
              {lastFolderSetup ? (
                <p className="mt-1 text-xs text-nexus-orange">{lastFolderSetup}</p>
              ) : null}
            </div>
            <Button
              type="button"
              onClick={createRecommendedFolders}
              disabled={creatingFolders || !supabase}
            >
              {creatingFolders ? "Creating..." : "Create missing folders"}
            </Button>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {recommendedVaultFolders.slice(0, 12).map((folder) => (
              <div
                key={folder}
                className="truncate rounded border border-nexus-border bg-nexus-surface px-3 py-2 text-xs text-nexus-muted"
              >
                {folder}
              </div>
            ))}
          </div>
          <p className="text-xs text-nexus-muted">
            Includes {recommendedVaultFolders.length} recommended folders. Existing folders are skipped.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
