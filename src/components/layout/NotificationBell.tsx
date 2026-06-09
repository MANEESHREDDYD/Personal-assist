"use client";

import { useState, useEffect } from "react";
import { getUnreadNotifications, markNotificationRead } from "@/app/actions/notifications";
import { Bell, Check, Info, AlertTriangle, ShieldAlert } from "lucide-react";

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    async function fetchNotifs() {
      const notifs = await getUnreadNotifications();
      setNotifications(notifs);
    }
    fetchNotifs();
  }, [open]); // Refresh when opened

  async function handleMarkRead(id: string) {
    await markNotificationRead(id);
    setNotifications(prev => prev.filter(n => n.id !== id));
  }

  const unreadCount = notifications.length;

  return (
    <div className="relative">
      <button 
        onClick={() => setOpen(!open)}
        className="relative p-2 text-zinc-400 hover:text-white transition-colors"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-[#121212]" />
        )}
      </button>

      {open && (
        <div className="absolute top-12 left-0 mt-2 w-80 bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden">
          <div className="p-4 border-b border-white/10 bg-black/50">
            <h3 className="font-bold text-white">Notifications</h3>
          </div>
          
          <div className="max-h-96 overflow-y-auto">
            {unreadCount === 0 ? (
              <div className="p-8 text-center text-zinc-500 text-sm">
                You're all caught up!
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {notifications.map(n => (
                  <div key={n.id} className="p-4 hover:bg-white/5 transition-colors group flex gap-3">
                    <div className="shrink-0 mt-0.5">
                      {n.severity === 'warning' ? <AlertTriangle className="w-4 h-4 text-yellow-500" /> :
                       n.severity === 'error' ? <ShieldAlert className="w-4 h-4 text-red-500" /> :
                       <Info className="w-4 h-4 text-blue-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-white mb-0.5 truncate">{n.title}</p>
                      <p className="text-xs text-zinc-400 line-clamp-2">{n.message}</p>
                    </div>
                    <button 
                      onClick={() => handleMarkRead(n.id)}
                      className="shrink-0 opacity-0 group-hover:opacity-100 p-1.5 hover:bg-white/10 rounded-lg text-zinc-400 hover:text-green-400 transition-all"
                      title="Mark as read"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
