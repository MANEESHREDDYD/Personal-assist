"use client";

import { WalletCard } from "@prisma/client";
import { useState, useMemo } from "react";
import { WalletCardItem } from "./WalletCardItem";
import { Search, Filter, ArrowUpDown } from "lucide-react";

interface Props {
  initialCards: WalletCard[];
  hideTypeFilter?: boolean;
}

export function WalletListClient({ initialCards, hideTypeFilter }: Props) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("created_desc");

  const types = useMemo(() => Array.from(new Set(initialCards.map(c => c.type))), [initialCards]);
  const statuses = useMemo(() => Array.from(new Set(initialCards.map(c => c.status))), [initialCards]);

  const filteredCards = useMemo(() => {
    let result = [...initialCards];

    // Search
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(c => 
        c.title.toLowerCase().includes(q) || 
        c.category.toLowerCase().includes(q) ||
        (c.source && c.source.toLowerCase().includes(q))
      );
    }

    // Type Filter
    if (typeFilter !== "all") {
      result = result.filter(c => c.type === typeFilter);
    }

    // Status Filter
    if (statusFilter !== "all") {
      result = result.filter(c => c.status === statusFilter);
    }

    // Sort
    result.sort((a, b) => {
      if (sortBy === "created_desc") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sortBy === "created_asc") return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (sortBy === "due_date") {
        if (!a.date) return 1;
        if (!b.date) return -1;
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      }
      return 0;
    });

    return result;
  }, [initialCards, search, typeFilter, statusFilter, sortBy]);

  return (
    <div>
      <div className="glass-card rounded-2xl p-4 mb-8 flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:w-auto flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input 
            type="text" 
            placeholder="Search by title, category, or source..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-black/20 border border-white/10 rounded-xl text-sm text-white focus:ring-2 focus:ring-purple-500 outline-none"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0">
          {!hideTypeFilter && (
            <select 
              value={typeFilter} 
              onChange={e => setTypeFilter(e.target.value)}
              className="px-3 py-2 bg-black/20 border border-white/10 rounded-xl text-sm text-zinc-300 outline-none"
            >
              <option value="all">All Types</option>
              {types.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          )}

          <select 
            value={statusFilter} 
            onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-black/20 border border-white/10 rounded-xl text-sm text-zinc-300 outline-none"
          >
            <option value="all">All Statuses</option>
            {statuses.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          <select 
            value={sortBy} 
            onChange={e => setSortBy(e.target.value)}
            className="px-3 py-2 bg-black/20 border border-white/10 rounded-xl text-sm text-zinc-300 outline-none"
          >
            <option value="created_desc">Newest First</option>
            <option value="created_asc">Oldest First</option>
            <option value="due_date">Due Date</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredCards.map((card) => (
          <WalletCardItem key={card.id} card={card} />
        ))}
      </div>
      
      {filteredCards.length === 0 && (
        <div className="text-center py-12 text-zinc-500">
          No items found matching your criteria.
        </div>
      )}
    </div>
  );
}
