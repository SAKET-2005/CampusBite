import "server-only";
import { z } from "zod";
import { defineTool, type AgentTool } from "./defineTool";
import { getSupabase } from "../supabase";
import { CURRENT_STUDENT_ID, formatSlot } from "../campusbite";

/*
 * CAMPUSBITE AGENT TOOLS
 * 4 read tools + 2 write tools.
 * Note: Never take student_id as an argument - it is always CURRENT_STUDENT_ID.
 * Money and stock modifications are handled exclusively via Supabase RPCs.
 */

const getMenu = defineTool({
  name: "getMenu",
  description:
    "Use this when the user asks what food or drinks are available, browses the canteen menu, or asks for recommendations. Only returns items currently in stock. Can filter by category, veg only, or maximum price.",
  schema: z.object({
    category: z
      .enum(["meal", "snack", "drink", "sweet"])
      .optional()
      .describe("Optional category to filter: meal, snack, drink, or sweet"),
    veg_only: z
      .boolean()
      .optional()
      .describe("Set to true to show only vegetarian food"),
    max_price: z
      .number()
      .int()
      .positive()
      .optional()
      .describe("Maximum price in whole rupees"),
  }),
  run: async ({ category, veg_only, max_price }) => {
    let query = getSupabase()
      .from("menu_items")
      .select("id, name, category, price, is_veg, stock, description")
      .gt("stock", 0)
      .order("category")
      .order("price");

    if (category) query = query.eq("category", category);
    if (veg_only) query = query.eq("is_veg", true);
    if (max_price) query = query.lte("price", max_price);

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data ?? [];
  },
});

const getWalletBalance = defineTool({
  name: "getWalletBalance",
  description:
    "Use this when the student asks about their wallet balance or available money, or to verify if they have enough balance before placing an order.",
  schema: z.object({}),
  run: async () => {
    const { data, error } = await getSupabase()
      .from("wallets")
      .select("name, balance")
      .eq("student_id", CURRENT_STUDENT_ID)
      .single();

    if (error) throw new Error(error.message);
    if (!data) throw new Error(`Wallet not found for student ${CURRENT_STUDENT_ID}`);
    return { name: data.name, balance: data.balance };
  },
});

const getPickupSlots = defineTool({
  name: "getPickupSlots",
  description:
    "Use this when the student asks about available pickup times today, or before placing an order to find an open slot with capacity.",
  schema: z.object({}),
  run: async () => {
    const { data, error } = await getSupabase()
      .from("pickup_slots")
      .select("id, slot_time, capacity, booked")
      .order("slot_time");

    if (error) throw new Error(error.message);

    return (data || [])
      .map((s) => ({
        slot_id: s.id,
        time: formatSlot(s.slot_time),
        free: s.capacity - s.booked,
      }))
      .filter((s) => s.free > 0);
  },
});

const getMyOrders = defineTool({
  name: "getMyOrders",
  description:
    "Use this when the student asks about their current or previous orders, pickup status, or when they want to cancel an order and you need to find the latest order id.",
  schema: z.object({}),
  run: async () => {
    const { data, error } = await getSupabase()
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
      .limit(10);

    if (error) throw new Error(error.message);

    return (data || []).map((o: any) => {
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
        pickup_time: formatSlot(slotTime || ""),
        items: items || "No items",
      };
    });
  },
});

const placeOrder = defineTool({
  name: "placeOrder",
  description:
    "Use this when the student confirms what they want to order and has chosen a pickup slot. Places the order, debits the wallet, reduces stock, and reserves the slot in the database.",
  writes: true,
  schema: z.object({
    slot_id: z.number().int().positive().describe("The id of the chosen pickup slot from getPickupSlots"),
    items: z
      .array(
        z.object({
          menu_item_id: z.number().int().positive().describe("The id of the menu item from getMenu"),
          quantity: z.number().int().min(1).max(5).describe("Quantity of this item (1 to 5)"),
        })
      )
      .min(1)
      .describe("Array of menu items with quantities (1 to 5) to order"),
  }),
  run: async ({ slot_id, items }) => {
    const { data, error } = await getSupabase().rpc("place_order", {
      p_student_id: CURRENT_STUDENT_ID,
      p_slot_id: slot_id,
      p_items: items,
    });

    if (error) throw new Error(error.message);
    return data;
  },
});

const cancelOrder = defineTool({
  name: "cancelOrder",
  description:
    "Use this when the student wants to cancel an order. Only orders with status 'placed' can be cancelled; if the kitchen has started preparing, it cannot be cancelled.",
  writes: true,
  schema: z.object({
    order_id: z.number().int().positive().describe("The id of the order to cancel from getMyOrders"),
  }),
  run: async ({ order_id }) => {
    const { data, error } = await getSupabase().rpc("cancel_order", {
      p_student_id: CURRENT_STUDENT_ID,
      p_order_id: order_id,
    });

    if (error) throw new Error(error.message);
    return data;
  },
});

/** Exactly 6 CampusBite canteen tools */
export const tools: AgentTool[] = [
  getMenu,
  getWalletBalance,
  getPickupSlots,
  getMyOrders,
  placeOrder,
  cancelOrder,
];
