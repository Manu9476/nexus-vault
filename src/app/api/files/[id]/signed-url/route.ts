import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { DEFAULT_STORAGE_BUCKET } from "@/lib/fileHelpers";

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  const supabase = await createSupabaseServer();
  if (!supabase) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch the file record through RLS (prevents users seeing other users' files).
  const { data: file, error: fileErr } = await supabase
    .from("files")
    .select(
      "id,user_id,storage_path,file_type,mime_type,size_bytes,name,created_at,folder_id,description,tags,category,document_type,custom_type_label,document_date,academic_year,semester,course_code,course_title,institution,favorite,archived,folders(name)"
    )
    .eq("id", id)
    .maybeSingle();

  if (fileErr || !file) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  const admin = createSupabaseAdmin();
  const expiresInSeconds = 60 * 5; // 5 minutes (enough for preview/lightbox)

  const { data: signed } = await admin.storage
    .from(DEFAULT_STORAGE_BUCKET)
    .createSignedUrl(file.storage_path, expiresInSeconds);

  return NextResponse.json({
    signedUrl: signed?.signedUrl ?? null,
    file: {
      id: file.id,
      name: file.name,
      file_type: file.file_type,
      mime_type: file.mime_type,
      size_bytes: file.size_bytes,
      created_at: file.created_at,
      folder_id: file.folder_id,
      description: file.description,
      tags: file.tags,
      category: file.category,
      document_type: file.document_type,
      custom_type_label: file.custom_type_label,
      document_date: file.document_date,
      academic_year: file.academic_year,
      semester: file.semester,
      course_code: file.course_code,
      course_title: file.course_title,
      institution: file.institution,
      favorite: file.favorite,
      archived: file.archived,
      folders: file.folders,
    },
  });
}

