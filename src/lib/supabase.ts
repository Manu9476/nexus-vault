import { createBrowserClient, createServerClient } from "@supabase/auth-helpers-nextjs";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function createSupabaseBrowser() {
  if (!supabaseUrl || !supabaseAnonKey) return null as any;
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}

export async function createSupabaseServer() {
  if (!supabaseUrl || !supabaseAnonKey) return null as any;
  // `next/headers` is server-only; load it lazily so this file can be imported by
  // client components safely (e.g. `/login`).
  const { cookies } = await import("next/headers");
  const cookieStore = cookies();

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll: () => cookieStore.getAll().map((c) => ({ name: c.name, value: c.value })),
      setAll: (cookiesToSet) => {
        // Route handlers can set cookies; server components generally cannot.
        for (const cookie of cookiesToSet) {
          cookieStore.set(cookie.name, cookie.value, cookie.options);
        }
      },
    },
  });
}

