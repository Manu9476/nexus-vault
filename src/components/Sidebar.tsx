"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutGrid,
  Image as ImageIcon,
  FileText,
  Folder,
  Search,
  Settings,
  Home,
  Archive,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { LogoutButton } from "@/components/LogoutButton";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/organizer", label: "Organizer", icon: Archive },
  { href: "/files", label: "All Files", icon: LayoutGrid },
  { href: "/photos", label: "Photos", icon: ImageIcon },
  { href: "/documents", label: "Documents", icon: FileText },
  { href: "/folders", label: "Folders", icon: Folder },
  { href: "/search", label: "Search", icon: Search },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-72 flex-col border-r border-zinc-800 bg-zinc-950/50 p-5 md:flex">
      <div className="mb-6 flex items-center gap-3 px-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-400 text-slate-950 font-bold text-lg">
          N
        </div>
        <div className="leading-tight">
          <div className="font-display text-xl tracking-wide">Nexus</div>
          <div className="text-xs text-zinc-400">Private vault</div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname.startsWith(item.href + "/");

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-zinc-900 text-zinc-50"
                  : "text-zinc-300 hover:bg-zinc-900/60 hover:text-zinc-50"
              )}
            >
              <Icon className={cn("h-4 w-4", active ? "text-amber-300" : "text-zinc-400")} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-4 px-2">
        <LogoutButton />
      </div>
    </aside>
  );
}

