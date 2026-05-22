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
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-zinc-800 bg-zinc-950/95 md:hidden">
      <div className="flex items-center justify-around px-2 py-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 rounded-lg px-2 py-2 text-[11px] transition-colors",
                active ? "text-amber-300" : "text-zinc-400 hover:text-zinc-50"
              )}
            >
              <Icon className={cn("h-5 w-5", active ? "stroke-amber-300" : "")} />
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

