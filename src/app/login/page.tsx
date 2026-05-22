"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { createSupabaseBrowser } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  const router = useRouter();

  const supabase = useMemo(() => createSupabaseBrowser(), []);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (!supabase) {
        toast.error("Supabase is not configured yet (missing env vars).");
        return;
      }
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      toast.success("Welcome back.");
      router.push("/dashboard");
      router.refresh();
    } catch (err: any) {
      toast.error(err?.message ?? "Login failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <Card className="w-full max-w-md border-zinc-800 bg-zinc-950/40">
        <CardHeader>
          <CardTitle className="font-display text-2xl">Login to Nexus</CardTitle>
          <p className="mt-1 text-sm text-zinc-400">
            Your personal digital vault. Protected by Supabase Auth.
          </p>
        </CardHeader>
        <CardContent>
          {!supabase ? (
            <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
              Supabase env vars are missing. Add NEXT_PUBLIC_SUPABASE_URL and
              NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local, then restart npm run dev.
            </div>
          ) : null}

          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="space-y-2">
              <label className="text-sm text-zinc-300" htmlFor="email">
                Email
              </label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm text-zinc-300" htmlFor="password">
                Password
              </label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>

            <Button className="w-full" type="submit" disabled={submitting || !supabase}>
              {submitting ? "Signing in..." : !supabase ? "Configure Supabase first" : "Sign in"}
            </Button>
          </form>

          <p className="mt-5 text-xs text-zinc-500">
            If this is your first setup, you need to configure your Supabase project and
            RLS/storage policies.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

