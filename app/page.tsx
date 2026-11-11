"use client";

import { useState } from "react";
import Link from "next/link";
import AgentChat from "@/components/AgentChat";
import WalletOrders from "@/components/WalletOrders";
import MenuPanel from "@/components/MenuPanel";

/*
 * CAMPUSBITE HOME PAGE
 * Left: AI ordering agent chat.
 * Right: Student's wallet, active orders, and live canteen menu.
 */
export default function HomePage() {
  const [refreshKey, setRefreshKey] = useState(0);

  async function logout() {
    await fetch("/api/logout", { method: "POST" });
    window.location.href = "/login";
  }

  return (
    <main className="mx-auto max-w-6xl p-4 md:p-6">
      <header className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">CampusBite · SRM canteen ordering agent</h1>
          <p className="text-xs text-slate-500">Order food in plain English with your student wallet</p>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/kitchen"
            target="_blank"
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-xs hover:bg-slate-50"
          >
            Open kitchen screen &rarr;
          </Link>
          <button onClick={logout} className="text-xs text-slate-500 hover:text-slate-900">
            Log out
          </button>
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-5">
        <section className="md:col-span-3">
          <AgentChat onDataChanged={() => setRefreshKey((k) => k + 1)} />
        </section>
        <section className="space-y-4 md:col-span-2">
          <WalletOrders refreshKey={refreshKey} />
          <MenuPanel refreshKey={refreshKey} />
        </section>
      </div>
    </main>
  );
}
