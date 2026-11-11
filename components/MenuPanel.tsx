"use client";

import { useEffect, useState } from "react";

type MenuItem = {
  id: number;
  name: string;
  category: "meal" | "snack" | "drink" | "sweet";
  price: number;
  is_veg: boolean;
  stock: number;
  prep_minutes: number;
  description: string;
};

const CATEGORIES: { key: MenuItem["category"]; label: string }[] = [
  { key: "meal", label: "Meals" },
  { key: "snack", label: "Snacks" },
  { key: "sweet", label: "Sweets" },
  { key: "drink", label: "Drinks" },
];

export default function MenuPanel({ refreshKey }: { refreshKey: number }) {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [error, setError] = useState("");

  async function loadMenu() {
    try {
      const res = await fetch("/api/menu");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not load menu");
      setItems(data.items ?? []);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load menu");
    }
  }

  useEffect(() => {
    loadMenu();
    const interval = setInterval(loadMenu, 5000);
    return () => clearInterval(interval);
  }, [refreshKey]);

  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-4 py-2.5">
        <h3 className="text-sm font-semibold text-slate-900">Today's Canteen Menu</h3>
        <p className="text-xs text-slate-500">Live prices & inventory</p>
      </div>

      {error && <p className="p-3 text-xs text-red-600">{error}</p>}

      <div className="max-h-72 divide-y divide-slate-100 overflow-y-auto">
        {CATEGORIES.map((cat) => {
          const group = items.filter((i) => i.category === cat.key);
          if (group.length === 0) return null;

          return (
            <div key={cat.key} className="p-3">
              <h4 className="mb-1.5 text-xs font-bold uppercase tracking-wider text-slate-400">
                {cat.label}
              </h4>
              <ul className="space-y-1.5">
                {group.map((item) => (
                  <li key={item.id} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-block h-2 w-2 rounded-full ${
                          item.is_veg ? "bg-emerald-500" : "bg-red-500"
                        }`}
                        title={item.is_veg ? "Vegetarian" : "Non-Veg"}
                      />
                      <span className={item.stock === 0 ? "text-slate-400 line-through" : "text-slate-800"}>
                        {item.name}
                      </span>
                      {item.stock === 0 ? (
                        <span className="rounded bg-rose-50 px-1.5 py-0.5 text-[10px] font-medium text-rose-700">
                          Sold out
                        </span>
                      ) : item.stock <= 3 ? (
                        <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                          Only {item.stock} left
                        </span>
                      ) : null}
                    </div>
                    <span className="font-medium text-slate-700">Rs {item.price}</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
