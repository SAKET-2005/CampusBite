import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabase } from "@/lib/supabase";
import { formatSlot } from "@/lib/campusbite";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const updateStatusSchema = z.object({
  order_id: z.number().int().positive(),
  status: z.enum(["preparing", "ready", "collected"]),
});

const ALLOWED_NEXT_STEP: Record<string, string> = {
  placed: "preparing",
  preparing: "ready",
  ready: "collected",
};

/**
 * GET /api/kitchen
 * Active kitchen queue: orders with status 'placed', 'preparing', or 'ready', oldest first.
 */
export async function GET() {
  try {
    const { data, error } = await getSupabase()
      .from("orders")
      .select(`
        id,
        student_id,
        status,
        total,
        created_at,
        wallets (name),
        pickup_slots (slot_time),
        order_items (
          quantity,
          price,
          menu_items (name)
        )
      `)
      .in("status", ["placed", "preparing", "ready"])
      .order("created_at", { ascending: true });

    if (error) {
      console.error("[api/kitchen GET]", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const orders = (data || []).map((o: any) => {
      const studentName = Array.isArray(o.wallets)
        ? o.wallets[0]?.name
        : o.wallets?.name;

      const slotTime = Array.isArray(o.pickup_slots)
        ? o.pickup_slots[0]?.slot_time
        : o.pickup_slots?.slot_time;

      const items = (o.order_items || []).map((oi: any) => {
        const menuName = Array.isArray(oi.menu_items)
          ? oi.menu_items[0]?.name
          : oi.menu_items?.name;
        return {
          name: menuName || "Item",
          quantity: oi.quantity,
          price: oi.price,
        };
      });

      return {
        id: o.id,
        student_id: o.student_id,
        student_name: studentName || o.student_id,
        status: o.status,
        total: o.total,
        created_at: o.created_at,
        pickup_time: formatSlot(slotTime || ""),
        items,
      };
    });

    return NextResponse.json({ orders });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to load kitchen queue";
    console.error("[api/kitchen GET]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/**
 * POST /api/kitchen { order_id, status }
 * Advances order status strictly: placed -> preparing -> ready -> collected.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const parsed = updateStatusSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid body", details: parsed.error.issues }, { status: 400 });
    }

    const { order_id, status: targetStatus } = parsed.data;
    const supabase = getSupabase();

    // Check current order status
    const { data: currentOrder, error: fetchError } = await supabase
      .from("orders")
      .select("id, status")
      .eq("id", order_id)
      .single();

    if (fetchError || !currentOrder) {
      return NextResponse.json({ error: `Order ${order_id} not found` }, { status: 404 });
    }

    const expectedNext = ALLOWED_NEXT_STEP[currentOrder.status];
    if (expectedNext !== targetStatus) {
      return NextResponse.json(
        {
          error: `Invalid status transition: cannot change from '${currentOrder.status}' to '${targetStatus}'. Expected '${expectedNext}'.`,
        },
        { status: 409 }
      );
    }

    const { data: updated, error: updateError } = await supabase
      .from("orders")
      .update({ status: targetStatus })
      .eq("id", order_id)
      .select("id, status")
      .single();

    if (updateError) {
      console.error("[api/kitchen POST update]", updateError.message);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ order: updated });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to update order status";
    console.error("[api/kitchen POST]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
