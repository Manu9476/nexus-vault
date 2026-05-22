"use client";

import { useState } from "react";
import { Search as SearchIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const quickSearches = [
  "birth-certificate",
  "national-id",
  "driving-license",
  "kcse-certificate",
  "year:1 results",
  "year:2 notes",
  "semester:1",
  "course:CSC101",
] as const;

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
        Find files by name, tag, course code, year, semester, or record type.
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

      <div className="flex max-w-2xl flex-wrap justify-center gap-2">
        {quickSearches.map((item) => (
          <Link key={item} href={`/files?q=${encodeURIComponent(item)}`}>
            <Badge className="transition-colors hover:border-amber-300/70 hover:text-amber-200">
              {item}
            </Badge>
          </Link>
        ))}
      </div>
    </div>
  );
}
