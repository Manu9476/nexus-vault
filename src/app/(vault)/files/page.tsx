"use client";

import { useEffect, useMemo, useState } from "react";

import { createSupabaseBrowser } from "@/lib/supabase";
import { matchesVaultSearch } from "@/lib/vaultTaxonomy";
import { getVaultPreferences, saveVaultPreferences } from "@/lib/vaultSettings";
import { FileUpload } from "@/components/FileUpload";
import { FileGrid } from "@/components/FileGrid";
import { FileViewer } from "@/components/FileViewer";
import type { FileCardModel } from "@/components/FileCard";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

type CategoryFilter =
	| "all"
	| "image"
	| "document"
	| "video"
	| "other-file"
	| "personal-documents"
	| "academic"
	| "finance"
	| "medical"
	| "legal"
	| "other";

export default function FilesPage() {
	const supabase = useMemo(() => createSupabaseBrowser(), []);
	const preferences = useMemo(() => getVaultPreferences(), []);

	const [files, setFiles] = useState<FileCardModel[]>([]);
	const [loading, setLoading] = useState(true);
	const [view, setView] = useState<"grid" | "list">(preferences.defaultFileView);
	const [uploadOpen, setUploadOpen] = useState(false);

	const [query, setQuery] = useState("");
	const [category, setCategory] = useState<CategoryFilter>("all");

	const [viewerOpen, setViewerOpen] = useState(false);
	const [viewerFileId, setViewerFileId] = useState<string | null>(null);

	useEffect(() => {
		const params = new URLSearchParams(window.location.search);
		setQuery(params.get("q") ?? "");
	}, []);

	function updateView(nextView: "grid" | "list") {
		setView(nextView);
		saveVaultPreferences({
			...getVaultPreferences(),
			defaultFileView: nextView,
		});
	}

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
				.select("id,name,file_type,mime_type,size_bytes,created_at,folder_id,tags,description,category,document_type,custom_type_label,search_text,academic_year,semester,course_code,course_title,institution,folders(name)");

			if (["image", "document", "video"].includes(category)) {
				q = q.eq("file_type", category);
			} else if (category === "other-file") {
				q = q.eq("file_type", "other");
			} else if (category !== "all") {
				q = q.eq("category", category);
			}

			const { data, error } = await q.order("created_at", { ascending: false }).limit(500);

			if (error) throw error;
			const nextFiles = ((data ?? []) as FileCardModel[]).filter((file) =>
				matchesVaultSearch(file, query)
			);
			setFiles(nextFiles);
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
					<h1 className="font-display text-3xl font-extrabold">All Files</h1>
					<p className="mt-1 text-sm text-nexus-muted">
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
						className="h-10 rounded-xl border border-nexus-border bg-nexus-surface px-3 text-sm text-nexus-text"
						value={category}
						onChange={(e) => setCategory(e.target.value as CategoryFilter)}
					>
						<option value="all">All categories</option>
						<option value="personal-documents">Personal Documents</option>
						<option value="academic">Academic</option>
						<option value="finance">Finance</option>
						<option value="medical">Medical</option>
						<option value="legal">Legal</option>
						<option value="image">Photos</option>
						<option value="document">Documents</option>
						<option value="video">Videos</option>
						<option value="other">Other Documents</option>
						<option value="other-file">Other Files</option>
					</select>

					<div className="flex items-center gap-2">
						<Button
							type="button"
							variant={uploadOpen ? "secondary" : "default"}
							size="sm"
							onClick={() => setUploadOpen((open) => !open)}
						>
							{uploadOpen ? "Close upload" : "Upload"}
						</Button>
						<Button
							variant={view === "grid" ? "secondary" : "outline"}
							size="sm"
							onClick={() => updateView("grid")}
						>
							Grid
						</Button>
						<Button
							variant={view === "list" ? "secondary" : "outline"}
							size="sm"
							onClick={() => updateView("list")}
						>
							List
						</Button>
					</div>
				</div>
			</header>

			{uploadOpen ? (
				<section className="space-y-3">
					<div className="flex items-center justify-between">
						<div>
							<h2 className="font-display text-xl font-bold">Upload panel</h2>
							<p className="mt-1 text-sm text-nexus-muted">
								Add files, then return to the file list below.
							</p>
						</div>
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={() => setUploadOpen(false)}
						>
							Close
						</Button>
					</div>
					<FileUpload
						onUploaded={() => {
							fetchFiles();
							setUploadOpen(false);
						}}
					/>
				</section>
			) : null}

			<section>
				<div className="mb-3 flex items-baseline justify-between">
					<div className="font-display text-xl font-bold">Your files</div>
					<div className="text-sm text-nexus-muted">
						{loading ? "Loading..." : `${files.length} result${files.length === 1 ? "" : "s"}`}
					</div>
				</div>

				{loading ? (
					<Card className="border-nexus-border bg-nexus-surface p-4">
						<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
							{Array.from({ length: 9 }).map((_, idx) => (
								<div key={idx} className="rounded-xl border border-nexus-border bg-nexus-surface p-3">
									<Skeleton className="h-32 w-full" />
									<Skeleton className="mt-3 h-4 w-3/4" />
								</div>
							))}
						</div>
					</Card>
				) : files.length === 0 ? (
					<div className="rounded-xl border border-nexus-border bg-nexus-surface p-8 text-center text-nexus-muted">
						No files found. Use the Upload button to add something to your vault.
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
