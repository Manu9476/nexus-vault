"use client";

import { useEffect, useMemo, useState } from "react";

import { createSupabaseBrowser } from "@/lib/supabase";
import type { VaultFileType } from "@/types";
import { FileUpload } from "@/components/FileUpload";
import { FileGrid } from "@/components/FileGrid";
import { FileViewer } from "@/components/FileViewer";
import type { FileCardModel } from "@/components/FileCard";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

export default function FilesPage() {
	const supabase = useMemo(() => createSupabaseBrowser(), []);

	const [files, setFiles] = useState<FileCardModel[]>([]);
	const [loading, setLoading] = useState(true);
	const [view, setView] = useState<"grid" | "list">("grid");

	const [query, setQuery] = useState("");
	const [category, setCategory] = useState<"all" | VaultFileType>("all");

	const [viewerOpen, setViewerOpen] = useState(false);
	const [viewerFileId, setViewerFileId] = useState<string | null>(null);

	useEffect(() => {
		const params = new URLSearchParams(window.location.search);
		setQuery(params.get("q") ?? "");
	}, []);

	async function fetchFiles() {
		if (!supabase) {
			setFiles([]);
			setLoading(false);
			return;
		}

		setLoading(true);
		try {
			let q = supabase
				.from("files")
				.select("id,name,file_type,mime_type,size_bytes,created_at,folder_id,tags,description");

			if (category !== "all") {
				q = q.eq("file_type", category);
			}

			if (query.trim()) {
				const s = query.trim();
				q = q.or(`name.ilike.%${s}%,description.ilike.%${s}%`);
			}

			const { data, error } = await q.order("created_at", { ascending: false }).limit(50);

			if (error) throw error;
			setFiles((data ?? []) as any);
		} catch {
			setFiles([]);
		} finally {
			setLoading(false);
		}
	}

	useEffect(() => {
		fetchFiles();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [category, query, supabase]);

	return (
		<div className="space-y-6">
			<header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
				<div>
					<h1 className="font-display text-3xl tracking-wide">All Files</h1>
					<p className="mt-1 text-sm text-zinc-400">
						Search, upload, and open files from your private vault.
					</p>
				</div>

				<div className="flex flex-wrap items-center gap-3">
					<div className="w-64">
						<Input
							value={query}
							onChange={(e) => setQuery(e.target.value)}
							placeholder="Search name, description..."
						/>
					</div>

					<select
						className="h-10 rounded-md border border-zinc-800 bg-transparent px-3 text-sm text-zinc-50"
						value={category}
						onChange={(e) => setCategory(e.target.value as any)}
					>
						<option value="all">All categories</option>
						<option value="image">Photos</option>
						<option value="document">Documents</option>
						<option value="video">Videos</option>
						<option value="other">Other</option>
					</select>

					<div className="flex items-center gap-2">
						<Button
							variant={view === "grid" ? "secondary" : "outline"}
							size="sm"
							onClick={() => setView("grid")}
						>
							Grid
						</Button>
						<Button
							variant={view === "list" ? "secondary" : "outline"}
							size="sm"
							onClick={() => setView("list")}
						>
							List
						</Button>
					</div>
				</div>
			</header>

			<FileUpload onUploaded={fetchFiles} />

			<section>
				<div className="mb-3 flex items-baseline justify-between">
					<div className="font-display text-xl tracking-wide">Your files</div>
					<div className="text-sm text-zinc-400">
						{loading ? "Loading..." : `${files.length} result${files.length === 1 ? "" : "s"}`}
					</div>
				</div>

				{loading ? (
					<Card className="border-zinc-800 bg-zinc-950/30 p-4">
						<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
							{Array.from({ length: 9 }).map((_, idx) => (
								<div key={idx} className="rounded-xl border border-zinc-800 bg-zinc-950/30 p-3">
									<Skeleton className="h-32 w-full" />
									<Skeleton className="mt-3 h-4 w-3/4" />
								</div>
							))}
						</div>
					</Card>
				) : files.length === 0 ? (
					<div className="rounded-xl border border-zinc-800 bg-zinc-950/30 p-8 text-center text-zinc-400">
						No files found. Upload something above to start building your vault.
					</div>
				) : (
					<FileGrid
						files={files}
						view={view}
						onOpen={(id) => {
							setViewerFileId(id);
							setViewerOpen(true);
						}}
					/>
				)}
			</section>

			<FileViewer
				fileId={viewerFileId}
				open={viewerOpen}
				onOpenChange={setViewerOpen}
				onDeleted={fetchFiles}
			/>
		</div>
	);
}
