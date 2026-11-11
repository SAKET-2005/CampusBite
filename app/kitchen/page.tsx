"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type KitchenItem = {
  name: string;
  quantity: number;
  price: number;
};

type KitchenOrder = {
  id: number;
  student_id: string;
  student_name: string;
  status: "placed" | "preparing" | "ready";
  total: number;
  created_at: string;
  pickup_time: string;
  items: KitchenItem[];
};

export default function KitchenPage() {
  const [orders, setOrders] = useState<KitchenOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionError, setActionError] = useState("");

  async function loadKitchen() {
    try {
      const res = await fetch("/api/kitchen");
      const data = await res.json();
      if (res.ok) {
        setOrders(data.orders ?? []);
      }
    } catch (err) {
      console.error("Failed to poll kitchen:", err);
    }
  }

  useEffect(() => {
    loadKitchen();
    const interval = setInterval(loadKitchen, 3000);
    return () => clearInterval(interval);
  }, []);

  async function advanceStatus(orderId: number, nextStatus: "preparing" | "ready" | "collected") {
    setLoading(true);
    setActionError("");
    try {
      const res = await fetch("/api/kitchen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_id: orderId, status: nextStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to advance order");
      await loadKitchen();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Error updating order");
    } finally {
      setLoading(false);
    }
  }

  const placedOrders = orders.filter((o) => o.status === "placed");
  const preparingOrders = orders.filter((o) => o.status === "preparing");
  const readyOrders = orders.filter((o) => o.status === "ready");

  return (
    <div className="min-h-screen bg-slate-950 p-4 text-slate-100 md:p-6">
      {/* Header */}
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-3 w-3 items-center justify-center">
            <span className="relative flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500"></span>
            </span>
          </div>
          <h1 className="text-xl font-bold tracking-tight">CampusBite Kitchen Display</h1>
          <span className="rounded-md bg-emerald-950/80 px-2 py-0.5 text-xs font-semibold text-emerald-400 border border-emerald-800">
            LIVE
          </span>
        </div>

        <div className="flex items-center gap-4 text-xs text-slate-400">
          <span>{orders.length} active orders</span>
          <Link href="/" className="text-slate-400 hover:text-white transition-colors">
            &larr; Back to Student Chat
          </Link>
        </div>
      </header>

      {actionError && (
        <div className="mb-4 rounded-lg bg-rose-950/80 border border-rose-800 p-3 text-xs text-rose-300">
          {actionError}
        </div>
      )}

      {/* 3-Column Kanban Board */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {/* Column 1: New Orders */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <div className="mb-3 flex items-center justify-between border-b border-slate-800 pb-2">
            <h2 className="font-semibold text-amber-400">1. New Orders</h2>
            <span className="rounded-full bg-amber-950/60 border border-amber-800 px-2 py-0.5 text-xs font-bold text-amber-400">
              {placedOrders.length}
            </span>
          </div>

          <div className="space-y-3">
            {placedOrders.length === 0 && (
              <p className="py-8 text-center text-xs text-slate-600">No new orders waiting.</p>
            )}
            {placedOrders.map((o) => (
              <div key={o.id} className="rounded-lg border border-slate-800 bg-slate-900 p-3.5 shadow-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-mono text-sm font-bold text-white">#{o.id}</span>
                    <p className="text-xs text-slate-400">{o.student_name} ({o.student_id})</p>
                  </div>
                  <span className="rounded bg-slate-800 px-2 py-0.5 font-mono text-xs font-medium text-amber-300">
                    Pickup: {o.pickup_time}
                  </span>
                </div>

                <div className="my-2.5 space-y-1 border-y border-slate-800/80 py-2 text-xs">
                  {o.items.map((it, idx) => (
                    <div key={idx} className="flex justify-between text-slate-300">
                      <span>{it.quantity}x {it.name}</span>
                      <span className="text-slate-500">Rs {it.price * it.quantity}</span>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="font-bold text-sm text-white">Rs {o.total}</span>
                  <button
                    disabled={loading}
                    onClick={() => advanceStatus(o.id, "preparing")}
                    className="rounded-md bg-amber-500 hover:bg-amber-400 text-slate-950 px-3 py-1.5 text-xs font-bold transition-colors disabled:opacity-50"
                  >
                    Start preparing &rarr;
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Column 2: Preparing */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <div className="mb-3 flex items-center justify-between border-b border-slate-800 pb-2">
            <h2 className="font-semibold text-blue-400">2. Preparing</h2>
            <span className="rounded-full bg-blue-950/60 border border-blue-800 px-2 py-0.5 text-xs font-bold text-blue-400">
              {preparingOrders.length}
            </span>
          </div>

          <div className="space-y-3">
            {preparingOrders.length === 0 && (
              <p className="py-8 text-center text-xs text-slate-600">Nothing currently cooking.</p>
            )}
            {preparingOrders.map((o) => (
              <div key={o.id} className="rounded-lg border border-blue-950/60 bg-slate-900 p-3.5 shadow-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-mono text-sm font-bold text-white">#{o.id}</span>
                    <p className="text-xs text-slate-400">{o.student_name} ({o.student_id})</p>
                  </div>
                  <span className="rounded bg-blue-950/80 border border-blue-900 px-2 py-0.5 font-mono text-xs font-medium text-blue-300">
                    Pickup: {o.pickup_time}
                  </span>
                </div>

                <div className="my-2.5 space-y-1 border-y border-slate-800/80 py-2 text-xs">
                  {o.items.map((it, idx) => (
                    <div key={idx} className="flex justify-between text-slate-300">
                      <span>{it.quantity}x {it.name}</span>
                      <span className="text-slate-500">Rs {it.price * it.quantity}</span>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="font-bold text-sm text-white">Rs {o.total}</span>
                  <button
                    disabled={loading}
                    onClick={() => advanceStatus(o.id, "ready")}
                    className="rounded-md bg-blue-500 hover:bg-blue-400 text-white px-3 py-1.5 text-xs font-bold transition-colors disabled:opacity-50"
                  >
                    Mark ready &rarr;
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Column 3: Ready for pickup */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <div className="mb-3 flex items-center justify-between border-b border-slate-800 pb-2">
            <h2 className="font-semibold text-emerald-400">3. Ready for Pickup</h2>
            <span className="rounded-full bg-emerald-950/60 border border-emerald-800 px-2 py-0.5 text-xs font-bold text-emerald-400">
              {readyOrders.length}
            </span>
          </div>

          <div className="space-y-3">
            {readyOrders.length === 0 && (
              <p className="py-8 text-center text-xs text-slate-600">No orders waiting for pickup.</p>
            )}
            {readyOrders.map((o) => (
              <div key={o.id} className="rounded-lg border border-emerald-950/60 bg-slate-900 p-3.5 shadow-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-mono text-sm font-bold text-white">#{o.id}</span>
                    <p className="text-xs text-slate-400">{o.student_name} ({o.student_id})</p>
                  </div>
                  <span className="rounded bg-emerald-950/80 border border-emerald-900 px-2 py-0.5 font-mono text-xs font-medium text-emerald-300">
                    Pickup: {o.pickup_time}
                  </span>
                </div>

                <div className="my-2.5 space-y-1 border-y border-slate-800/80 py-2 text-xs">
                  {o.items.map((it, idx) => (
                    <div key={idx} className="flex justify-between text-slate-300">
                      <span>{it.quantity}x {it.name}</span>
                      <span className="text-slate-500">Rs {it.price * it.quantity}</span>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="font-bold text-sm text-white">Rs {o.total}</span>
                  <button
                    disabled={loading}
                    onClick={() => advanceStatus(o.id, "collected")}
                    className="rounded-md bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 text-xs font-bold transition-colors disabled:opacity-50"
                  >
                    Collected &#10003;
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
