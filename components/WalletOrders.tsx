"use client";

import { useEffect, useState } from "react";

type Order = {
  id: number;
  status: "placed" | "preparing" | "ready" | "collected" | "cancelled";
  total: number;
  pickup_time: string;
  items: string;
};

type Wallet = {
  student_id: string;
  name: string;
  balance: number;
};

export default function WalletOrders({ refreshKey }: { refreshKey: number }) {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState("");

  async function loadData() {
    try {
      const res = await fetch("/api/me");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not load student data");
      setWallet(data.wallet);
      setOrders(data.orders ?? []);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    }
  }

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, [refreshKey]);

  function statusBadge(status: Order["status"]) {
    switch (status) {
      case "placed":
        return <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">Placed</span>;
      case "preparing":
        return <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">Preparing</span>;
      case "ready":
        return <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800">Ready</span>;
      case "collected":
        return <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">Collected</span>;
      case "cancelled":
        return <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-medium text-rose-800">Cancelled</span>;
      default:
        return <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">{status}</span>;
    }
  }

  return (
    <div className="space-y-3">
      {/* Dark Wallet Card */}
      <div className="rounded-xl bg-slate-900 p-4 text-white shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-slate-400">Campus Wallet</p>
            <h2 className="text-base font-semibold">{wallet ? wallet.name : "Loading..."}</h2>
            <p className="font-mono text-xs text-slate-400">{wallet?.student_id ?? "S001"}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-400">Balance</p>
            <p className="text-2xl font-bold text-emerald-400">
              Rs {wallet ? wallet.balance : "..."}
            </p>
          </div>
        </div>
      </div>

      {/* Orders Today Card */}
      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-4 py-2.5">
          <h3 className="text-sm font-semibold text-slate-900">My Orders Today</h3>
          <p className="text-xs text-slate-500">Live updates from kitchen</p>
        </div>

        {error && <p className="p-3 text-xs text-red-600">{error}</p>}

        <div className="max-h-56 divide-y divide-slate-100 overflow-y-auto">
          {!error && orders.length === 0 && (
            <p className="p-4 text-center text-xs text-slate-500">No orders placed today.</p>
          )}

          {orders.map((o) => (
            <div key={o.id} className="flex items-center justify-between p-3 text-xs">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-slate-900">Order #{o.id}</span>
                  {o.pickup_time && (
                    <span className="text-slate-500">· Pickup: {o.pickup_time}</span>
                  )}
                </div>
                <p className="text-slate-600">{o.items}</p>
              </div>
              <div className="text-right">
                <div className="mb-1">{statusBadge(o.status)}</div>
                <p className="font-semibold text-slate-900">Rs {o.total}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
