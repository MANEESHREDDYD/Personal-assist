"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, FileText, Mail, Calendar, Settings, Bell, Database, Zap } from "lucide-react";

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const router = useRouter();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === "Escape") {
        setOpen(false);
      }
    };
    
    const handleCustomOpen = () => {
      setOpen(true);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("open-command-palette", handleCustomOpen);
    
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("open-command-palette", handleCustomOpen);
    };
  }, []);

  if (!open) return null;

  const navigate = (path: string) => {
    setOpen(false);
    setQuery("");
    router.push(path);
  };

  const actions = [
    { name: "Search All Local Data", path: "/search", icon: Search },
    { name: "Add Manual Item", path: "/add", icon: Database },
    { name: "Upload Document", path: "/documents", icon: FileText },
    { name: "Import Email (.eml)", path: "/inbox", icon: Mail },
    { name: "Import Calendar (.ics)", path: "/calendar", icon: Calendar },
    { name: "Create Email Draft", path: "/drafts", icon: Mail },
    { name: "Create Reminder", path: "/reminders", icon: Bell },
    { name: "Add Stock to Watchlist", path: "/stocks", icon: Zap },
    { name: "Generate Daily Brief", path: "/", icon: Zap },
    { name: "Run Automations", path: "/automations", icon: Zap },
    { name: "Open Guided Demo", path: "/demo", icon: Zap },
    { name: "Open Roadmap", path: "/roadmap", icon: Settings },
    { name: "Open Settings", path: "/settings", icon: Settings },
  ];

  const filtered = actions.filter((a) => a.name.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-xl bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="p-4 border-b border-white/5 flex items-center gap-3">
          <Search className="text-zinc-500" />
          <input
            autoFocus
            type="text"
            placeholder="Type a command or search..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent border-none outline-none text-white placeholder-zinc-500"
          />
          <button onClick={() => setOpen(false)} className="text-xs text-zinc-500 px-2 py-1 bg-white/5 rounded">ESC</button>
        </div>
        <div className="max-h-96 overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <div className="p-4 text-center text-zinc-500">No matching commands.</div>
          ) : (
            filtered.map((action) => (
              <button
                key={action.name}
                onClick={() => navigate(action.path)}
                className="w-full flex items-center gap-3 p-3 hover:bg-white/5 rounded-xl transition-colors text-left"
              >
                <div className="w-8 h-8 bg-white/5 rounded-lg flex items-center justify-center text-zinc-400">
                  <action.icon size={16} />
                </div>
                <span className="text-zinc-200 font-medium">{action.name}</span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
