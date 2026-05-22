"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutGrid,
  Home,
  Image as ImageIcon,
  Archive,
  Folder,
  Search,
  Settings,
  Images,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/organizer", label: "Organizer", icon: Archive },
  { href: "/gallery", label: "Gallery", icon: Images },
  { href: "/files", label: "Files", icon: LayoutGrid },
  { href: "/photos", label: "Photos", icon: ImageIcon },
  { href: "/folders", label: "Folders", icon: Folder },
  { href: "/search", label: "Search", icon: Search },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-nexus-border bg-nexus-bg md:hidden">
      <div className="flex items-center justify-around px-2 py-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 rounded-xl border-l-[3px] px-2 py-2 text-[11px] transition-colors",
                active
                  ? "border-nexus-orange bg-nexus-surface text-nexus-orange"
                  : "border-transparent text-nexus-muted hover:text-nexus-text"
              )}
            >
              <Icon className={cn("h-5 w-5", active ? "stroke-nexus-orange" : "")} />
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

