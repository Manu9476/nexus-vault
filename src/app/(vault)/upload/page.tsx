"use client";

import { FileUpload } from "@/components/FileUpload";

export default function UploadPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-extrabold">Upload</h1>
        <p className="mt-1 text-sm text-nexus-muted">
          Add documents into the right collection with structured details.
        </p>
      </header>

      <FileUpload />
    </div>
  );
}
