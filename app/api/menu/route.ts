import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/menu
 * Returns all menu items (including sold out) grouped and ordered by category, then price.
 */
export async function GET() {
  try {
    const { data, error } = await getSupabase()
      .from("menu_items")
      .select("id, name, category, price, is_veg, stock, prep_minutes, description")
      .order("category")
      .order("price");

    if (error) {
      console.error("[api/menu]", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ items: data ?? [] });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to load menu";
    console.error("[api/menu]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

