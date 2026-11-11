import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { CURRENT_STUDENT_ID, formatSlot } from "@/lib/campusbite";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/me
 * Returns wallet and last 5 orders for CURRENT_STUDENT_ID.
 */
export async function GET() {
  try {
    const supabase = getSupabase();

    const [walletRes, ordersRes] = await Promise.all([
      supabase
        .from("wallets")
        .select("student_id, name, balance")
        .eq("student_id", CURRENT_STUDENT_ID)
        .single(),
      supabase
        .from("orders")
        .select(`
          id,
          status,
          total,
          created_at,
          pickup_slots (slot_time),
          order_items (
            quantity,
            price,
            menu_items (name)
          )
        `)
        .eq("student_id", CURRENT_STUDENT_ID)
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

    if (walletRes.error) {
      console.error("[api/me] wallet error:", walletRes.error.message);
      return NextResponse.json({ error: walletRes.error.message }, { status: 500 });
    }

    if (ordersRes.error) {
      console.error("[api/me] orders error:", ordersRes.error.message);
      return NextResponse.json({ error: ordersRes.error.message }, { status: 500 });
    }

    const orders = (ordersRes.data || []).map((o: any) => {
      const slotTime = Array.isArray(o.pickup_slots)
        ? o.pickup_slots[0]?.slot_time
        : o.pickup_slots?.slot_time;

      const items = (o.order_items || [])
        .map((oi: any) => {
          const menuName = Array.isArray(oi.menu_items)
            ? oi.menu_items[0]?.name
            : oi.menu_items?.name;
          return `${oi.quantity}x ${menuName || "Item"}`;
        })
        .join(", ");

      return {
        id: o.id,
        status: o.status,
        total: o.total,
        created_at: o.created_at,
        pickup_time: formatSlot(slotTime || ""),
        items: items || "No items",
      };
    });

    return NextResponse.json({
      wallet: walletRes.data,
      orders,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to load student info";
    console.error("[api/me]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

