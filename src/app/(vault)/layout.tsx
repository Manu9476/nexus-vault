import type { ReactNode } from "react";

import { Sidebar } from "@/components/Sidebar";
import { MobileNav } from "@/components/MobileNav";

export default function VaultLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-nexus-bg text-nexus-text">
      <div className="flex">
        <Sidebar />
        <main className="min-w-0 flex-1 px-4 pb-24 pt-6 md:px-10 md:pb-10 md:pt-10">
          {children}
        </main>
      </div>
      <MobileNav />
    </div>
  );
}

