import { NextResponse } from "next/server";

import { createSupabaseServer } from "@/lib/supabase";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { DEFAULT_STORAGE_BUCKET } from "@/lib/fileHelpers";

export async function POST(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  const supabase = await createSupabaseServer();
  if (!supabase) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: file, error: fileErr } = await supabase
    .from("files")
    .select("id,user_id,storage_path")
    .eq("id", id)
    .maybeSingle();

  if (fileErr || !file) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  const admin = createSupabaseAdmin();

  const { error: storageErr } = await admin.storage
    .from(DEFAULT_STORAGE_BUCKET)
    .remove([file.storage_path]);

  if (storageErr) {
    return NextResponse.json({ error: storageErr.message }, { status: 500 });
  }

  const { error: dbErr } = await supabase.from("files").delete().eq("id", id);
  if (dbErr) {
    return NextResponse.json({ error: dbErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

