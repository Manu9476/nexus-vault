import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-admin";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createSupabaseServer();
    const { data: userData, error: authError } = await supabase.auth.getUser();

    if (authError || !userData?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, tags } = body;

    const { error: updateError } = await supabase
      .from("files")
      .update({
        name,
        description,
        tags,
        updated_at: new Date().toISOString(),
      })
      .eq("id", params.id)
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
