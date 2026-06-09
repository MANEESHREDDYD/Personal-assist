"use client";

import { Menu, Search } from "lucide-react";
import { NotificationBell } from "./NotificationBell";

export function MobileNav({ onToggleMenu }: { onToggleMenu: () => void }) {
  const handleSearch = () => {
    // Dispatch custom event to open Command Palette
    window.dispatchEvent(new KeyboardEvent("keydown", {
      key: "k",
      metaKey: true, // for Mac
      ctrlKey: true, // for Windows/Linux
      bubbles: true
    }));
    
    // Alternatively, a custom event is safer if the standard listener ignores synthetic events.
    window.dispatchEvent(new CustomEvent("open-command-palette"));
  };

  return (
    <div className="md:hidden flex items-center justify-between p-4 border-b border-white/10 bg-black/50 backdrop-blur-md sticky top-0 z-30">
      <div className="flex items-center gap-3">
        <button 
          onClick={onToggleMenu}
          className="p-2 -ml-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
          aria-label="Toggle Menu"
        >
          <Menu size={24} />
        </button>
        <h1 className="text-lg font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
          Personal Assist
        </h1>
      </div>
      
      <div className="flex items-center gap-2">
        <button
          onClick={handleSearch}
          className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
          aria-label="Search"
        >
          <Search size={20} />
        </button>
        <NotificationBell />
      </div>
    </div>
  );
}
