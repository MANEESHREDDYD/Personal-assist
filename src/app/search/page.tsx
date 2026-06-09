"use client";

import { useState } from "react";
import { Search as SearchIcon, FileText, Mail, Database, Users } from "lucide-react";
import { globalSearch } from "../actions/search";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{cards: any[], docs: any[], inbox: any[], contacts: any[]} | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (query.length < 2) return;
    setLoading(true);
    const res = await globalSearch(query);
    setResults(res);
    setLoading(false);
  };

  return (
    <div className="p-8 max-w-5xl mx-auto w-full">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-2">
          <SearchIcon className="text-blue-400" />
          Global Search
        </h1>
        <p className="text-zinc-400">Search across your entire local SQLite database.</p>
      </div>

      <form onSubmit={handleSearch} className="mb-8 flex gap-4">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search documents, emails, wallet cards..."
          className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition-colors"
        />
        <button
          type="submit"
          disabled={loading || query.length < 2}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl disabled:opacity-50 transition-colors"
        >
          {loading ? "Searching..." : "Search"}
        </button>
      </form>

      {!results && !loading && (
        <div className="glass-card rounded-2xl p-12 text-center">
          <SearchIcon className="text-zinc-600 w-16 h-16 mx-auto mb-4" />
          <p className="text-zinc-400">Enter a query above to begin searching.</p>
        </div>
      )}

      {results && (
        <div className="space-y-8">
          {results.cards.length > 0 && (
            <div>
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Database className="text-purple-400" size={20} />
                Wallet Cards ({results.cards.length})
              </h2>
              <div className="grid gap-3">
                {results.cards.map((card) => (
                  <div key={card.id} className="p-4 bg-white/5 border border-white/10 rounded-xl">
                    <div className="font-semibold text-white">{card.title}</div>
                    <div className="text-sm text-zinc-400">{card.category} • {card.status}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {results.docs.length > 0 && (
            <div>
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <FileText className="text-blue-400" size={20} />
                Documents ({results.docs.length})
              </h2>
              <div className="grid gap-3">
                {results.docs.map((doc) => (
                  <div key={doc.id} className="p-4 bg-white/5 border border-white/10 rounded-xl">
                    <div className="font-semibold text-white">{doc.originalName}</div>
                    <div className="text-sm text-zinc-400 line-clamp-1">{doc.aiSummary}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {results.inbox.length > 0 && (
            <div>
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Mail className="text-green-400" size={20} />
                Inbox Items ({results.inbox.length})
              </h2>
              <div className="grid gap-3">
                {results.inbox.map((item) => (
                  <div key={item.id} className="p-4 bg-white/5 border border-white/10 rounded-xl">
                    <div className="font-semibold text-white">{item.subject}</div>
                    <div className="text-sm text-zinc-400">{item.sender}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {results.contacts.length > 0 && (
            <div>
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Users className="text-orange-400" size={20} />
                Contacts ({results.contacts.length})
              </h2>
              <div className="grid gap-3">
                {results.contacts.map((contact) => (
                  <div key={contact.id} className="p-4 bg-white/5 border border-white/10 rounded-xl">
                    <div className="font-semibold text-white">{contact.name}</div>
                    <div className="text-sm text-zinc-400">{contact.email} • {contact.company}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {Object.values(results).every(arr => arr.length === 0) && (
            <div className="glass-card rounded-2xl p-12 text-center">
              <p className="text-zinc-400">No results found for "{query}".</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
