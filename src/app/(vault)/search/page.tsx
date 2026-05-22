"use client";

import { useState } from "react";
import { Search as SearchIcon } from "lucide-react";
import { useRouter } from "next/navigation";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const router = useRouter();

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;

    router.push(`/files?q=${encodeURIComponent(query.trim())}`);
  }

  return (
    <div className="space-y-6 flex flex-col items-center justify-center pt-24">
      <h1 className="font-display text-4xl tracking-wide mb-2">Search Vault</h1>
      <p className="text-zinc-400 mb-8 max-w-md text-center">
        Quickly find documents, photos, or other files using names or tags.
      </p>

      <form onSubmit={handleSearch} className="flex w-full max-w-xl gap-2">
        <Input 
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search entire vault..." 
          className="flex-1 text-lg py-6"
          autoFocus
        />
        <Button type="submit" size="lg" className="px-8 h-auto">
          <SearchIcon className="h-5 w-5" />
        </Button>
      </form>
    </div>
  );
}
