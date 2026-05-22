import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase";
import { normalizeTag } from "@/lib/vaultTaxonomy";

function buildUpdatedSearchText(input: {
  name: string;
  description: string | null;
  tags: string[] | null;
  category: string | null;
  document_type: string | null;
  custom_type_label: string | null;
  academic_year: string | null;
  semester: string | null;
  course_code: string | null;
  course_title: string | null;
  institution: string | null;
}) {
  return [
    input.name,
    input.description ?? "",
    input.category ?? "",
    input.document_type ?? "",
    input.custom_type_label ?? "",
    input.academic_year ? `year ${input.academic_year}` : "",
    input.semester ? `semester ${input.semester}` : "",
    input.course_code ?? "",
    input.course_title ?? "",
    input.institution ?? "",
    ...(input.tags ?? []),
    ...(input.tags ?? []).map(normalizeTag),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const supabase = await createSupabaseServer();
    if (!supabase) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: userData, error: authError } = await supabase.auth.getUser();

    if (authError || !userData?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      description,
      tags,
      folder_id,
      category,
      document_type,
      custom_type_label,
      document_date,
      academic_year,
      semester,
      course_code,
      course_title,
      institution,
      favorite,
      archived,
    } = body;

    const nextSearchText = buildUpdatedSearchText({
      name,
      description: description ?? null,
      tags: tags ?? null,
      category: category ?? null,
      document_type: document_type ?? null,
      custom_type_label: custom_type_label ?? null,
      academic_year: academic_year ?? null,
      semester: semester ?? null,
      course_code: course_code ?? null,
      course_title: course_title ?? null,
      institution: institution ?? null,
    });

    const { error: updateError } = await supabase
      .from("files")
      .update({
        name,
        description,
        tags,
        folder_id: folder_id || null,
        category: category || null,
        document_type: document_type || null,
        custom_type_label: custom_type_label || null,
        document_date: document_date || null,
        academic_year: academic_year || null,
        semester: semester || null,
        course_code: course_code || null,
        course_title: course_title || null,
        institution: institution || null,
        favorite: Boolean(favorite),
        archived: Boolean(archived),
        search_text: nextSearchText,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("user_id", userData.user.id);

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message ?? "Internal error" },
      { status: 500 }
    );
  }
}
