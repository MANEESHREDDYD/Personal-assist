"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addWalletCard } from "../actions/wallet";
import { PlusCircle, Loader2 } from "lucide-react";

export default function ManualAddPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [type, setType] = useState("task");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const title = formData.get("title") as string;
    const category = formData.get("category") as string;
    const status = formData.get("status") as string;
    const amountStr = formData.get("amount") as string;
    const dateStr = formData.get("date") as string;
    const notes = formData.get("notes") as string;

    if (title.length < 3) {
      setError("Title must be at least 3 characters.");
      setLoading(false);
      return;
    }

    const res = await addWalletCard({
      type,
      title,
      category,
      status: status || "Pending",
      amount: amountStr ? parseFloat(amountStr) : undefined,
      date: dateStr ? new Date(dateStr) : undefined,
      notes,
    });

    if (res.success) {
      router.push("/wallet");
    } else {
      setError(res.error || "Something went wrong.");
      setLoading(false);
    }
  }

  return (
    <div className="p-8 max-w-2xl mx-auto w-full space-y-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-2">
          <PlusCircle className="text-purple-400" />
          Manual Add
        </h1>
        <p className="text-zinc-400">Add a new item to your Life Wallet.</p>
      </div>

      <form onSubmit={onSubmit} className="glass-card rounded-2xl p-6 sm:p-8 space-y-6">
        {error && <div className="p-4 rounded-xl bg-red-500/10 text-red-400 text-sm border border-red-500/20 font-medium">{error}</div>}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Type</label>
            <select 
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-shadow appearance-none"
            >
              <option value="task">Task / To-Do</option>
              <option value="payment">Payment / Bill</option>
              <option value="travel">Travel Itinerary</option>
              <option value="ticket">Event Ticket</option>
              <option value="order">Online Order</option>
              <option value="stock">Stock Ticker</option>
              <option value="reminder">Reminder</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Category</label>
            <input name="category" required placeholder="e.g. Finance, Personal" className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-shadow placeholder:text-zinc-600" />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Title</label>
          <input name="title" required placeholder="e.g. Rent Payment, Flight to NY" className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-shadow placeholder:text-zinc-600" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Status</label>
            <input name="status" placeholder="Pending" defaultValue="Pending" className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-shadow placeholder:text-zinc-600" />
          </div>

          <div className={`space-y-2 ${type !== 'payment' && type !== 'order' ? 'opacity-50' : ''}`}>
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Amount ($)</label>
            <input name="amount" type="number" step="0.01" placeholder="0.00" className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-shadow placeholder:text-zinc-600" />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">
              {type === 'stock' ? 'Earnings Date' : 'Date/Time'}
            </label>
            <input name="date" type={type === 'stock' ? "date" : "datetime-local"} className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-shadow text-sm" />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Notes / Metadata</label>
          <textarea name="notes" rows={3} placeholder="Optional details..." className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-shadow placeholder:text-zinc-600 resize-none" />
        </div>

        <button disabled={loading} type="submit" className="w-full py-4 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-bold rounded-xl hover:opacity-90 disabled:opacity-50 transition-opacity flex justify-center items-center gap-2 shadow-lg">
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Add to Wallet"}
        </button>
      </form>
    </div>
  );
}
