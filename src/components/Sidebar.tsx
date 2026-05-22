"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutGrid,
  Upload,
  Image as ImageIcon,
  FileText,
  Folder,
  Search,
  Settings,
  Home,
  Archive,
  Images,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { LogoutButton } from "@/components/LogoutButton";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/organizer", label: "Organizer", icon: Archive },
  { href: "/upload", label: "Upload", icon: Upload },
  { href: "/gallery", label: "Gallery", icon: Images },
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
    <aside className="hidden w-72 flex-col border-r border-nexus-border bg-nexus-bg p-5 md:flex">
      <div className="mb-6 flex items-center gap-3 px-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-nexus-orange text-lg font-extrabold text-white">
          N
        </div>
        <div className="leading-tight">
          <div className="font-display text-xl font-extrabold text-nexus-text">Nexus</div>
          <div className="text-xs text-nexus-muted">Private vault</div>
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
                "flex items-center gap-3 rounded-r-xl border-l-[3px] px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "border-nexus-orange bg-nexus-surface text-nexus-orange"
                  : "border-transparent text-nexus-muted hover:bg-nexus-surface hover:text-nexus-text"
              )}
            >
              <Icon className={cn("h-4 w-4", active ? "text-nexus-orange" : "text-nexus-muted")} />
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

