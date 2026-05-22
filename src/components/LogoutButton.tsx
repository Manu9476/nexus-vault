"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { createSupabaseBrowser } from "@/lib/supabase";
import { Button } from "@/components/ui/button";

export function LogoutButton() {
  const router = useRouter();

  async function onLogout() {
    const supabase = createSupabaseBrowser();
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Logout failed. Please try again.");
      return;
    }
    router.push("/login");
    router.refresh();
    toast.success("Logged out.");
  }

  return (
    <Button variant="ghost" className="w-full justify-start" onClick={onLogout}>
      Logout
    </Button>
  );
}

