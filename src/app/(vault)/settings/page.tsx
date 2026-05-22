"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";

import { createSupabaseBrowser } from "@/lib/supabase";
import {
  recommendedVaultFolders,
  uploadModes,
  type UploadMode,
} from "@/lib/vaultTaxonomy";
import {
  defaultVaultPreferences,
  getVaultPreferences,
  resetVaultPreferences,
  saveVaultPreferences,
  type FileViewPreference,
  type VaultPreferences,
} from "@/lib/vaultSettings";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type FolderNameRow = {
  name: string;
};

export default function SettingsPage() {
  const supabase = useMemo(() => createSupabaseBrowser(), []);
  const [preferences, setPreferences] = useState<VaultPreferences>(defaultVaultPreferences);
  const [email, setEmail] = useState<string | null>(null);
  const [checkingAccount, setCheckingAccount] = useState(true);
  const [creatingFolders, setCreatingFolders] = useState(false);
  const [lastFolderSetup, setLastFolderSetup] = useState<string | null>(null);

  useEffect(() => {
    setPreferences(getVaultPreferences());
  }, []);

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
    saveVaultPreferences(preferences);
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
        .select("name")
        .eq("user_id", user.id);

      if (fetchError) throw fetchError;

      const existing = new Set(
        ((existingFolders ?? []) as FolderNameRow[]).map((folder) => folder.name)
      );
      const missing = recommendedVaultFolders.filter((folderName) => !existing.has(folderName));

      if (!missing.length) {
        setLastFolderSetup("All recommended folders already exist.");
        toast.success("Your folder structure is already ready.");
        return;
      }

      const { error: insertError } = await supabase.from("folders").insert(
        missing.map((name) => ({
          user_id: user.id,
          name,
          color: null,
          icon: null,
        }))
      );

      if (insertError) throw insertError;

      setLastFolderSetup(`Created ${missing.length} folder${missing.length === 1 ? "" : "s"}.`);
      toast.success(`Created ${missing.length} folder${missing.length === 1 ? "" : "s"}.`);
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
          <h1 className="font-display text-3xl tracking-wide">Settings</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Control how Nexus organizes and opens your vault.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/organizer">
            <Badge className="transition-colors hover:border-amber-300/70 hover:text-amber-200">
              Organizer
            </Badge>
          </Link>
          <Link href="/folders">
            <Badge className="transition-colors hover:border-amber-300/70 hover:text-amber-200">
              Folders
            </Badge>
          </Link>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <Card className="border-zinc-800 bg-zinc-950/30">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-zinc-100">
              Defaults
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <label className="space-y-2">
                <span className="block text-xs text-zinc-400">Default file view</span>
                <select
                  className="h-10 w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 text-sm text-zinc-50"
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
                <span className="block text-xs text-zinc-400">Default upload workload</span>
                <select
                  className="h-10 w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 text-sm text-zinc-50"
                  value={preferences.defaultUploadMode}
                  onChange={(event) =>
                    updatePreference("defaultUploadMode", event.target.value as UploadMode)
                  }
                >
                  {uploadModes.map((mode) => (
                    <option key={mode.value} value={mode.value}>
                      {mode.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="flex items-center gap-2 rounded-md border border-zinc-800 px-3 py-2 text-sm text-zinc-300">
              <input
                type="checkbox"
                checked={preferences.autoOrganizeUploads}
                onChange={(event) =>
                  updatePreference("autoOrganizeUploads", event.target.checked)
                }
                className="h-4 w-4 accent-amber-400"
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

        <Card className="border-zinc-800 bg-zinc-950/30">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-zinc-100">
              Account
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="text-zinc-400">Supabase</span>
              <Badge className={supabase ? "border-emerald-400/40 text-emerald-200" : "border-red-400/40 text-red-200"}>
                {supabase ? "Configured" : "Missing env vars"}
              </Badge>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-zinc-400">Signed in</span>
              <span className="truncate text-right text-zinc-100">
                {checkingAccount ? "Checking..." : email ?? "No"}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-zinc-400">Storage bucket</span>
              <span className="font-mono text-xs text-zinc-100">nexus-files</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-zinc-800 bg-zinc-950/30">
        <CardHeader>
          <CardTitle className="text-base font-semibold text-zinc-100">
            Folder Setup
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm text-zinc-300">
                Create the recommended structure for IDs, certificates, results, and course notes.
              </p>
              {lastFolderSetup ? (
                <p className="mt-1 text-xs text-emerald-200">{lastFolderSetup}</p>
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
                className="truncate rounded border border-zinc-800 bg-zinc-900/30 px-3 py-2 text-xs text-zinc-300"
              >
                {folder}
              </div>
            ))}
          </div>
          <p className="text-xs text-zinc-500">
            Includes {recommendedVaultFolders.length} recommended folders. Existing folders are skipped.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
