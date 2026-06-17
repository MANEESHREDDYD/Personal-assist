"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Wallet,
  Inbox,
  FileText,
  CreditCard,
  Plane,
  Ticket,
  ShoppingBag,
  Calendar,
  LineChart,
  Bell,
  CheckSquare,
  PlusCircle,
  Settings,
  ShieldAlert,
  Users,
  Mail,
  ListTodo,
  Zap,
  Search,
  Terminal,
  Layers,
  Command,
  CalendarClock,
  CalendarRange,
  Clock,
  CalendarCheck,
  Bot,
  Wand2,
  ListChecks,
  FolderKanban
} from "lucide-react";

const NAV_ITEMS = [
  { name: "Home", href: "/", icon: LayoutDashboard },
  { name: "Roles", href: "/roles", icon: Layers },
  { name: "Command Center", href: "/command-center", icon: Command },
  { name: "Scheduling Secretary", href: "/assistant/scheduling", icon: Bot },
  { name: "Scheduling", href: "/scheduling", icon: CalendarClock },
  { name: "Availability", href: "/availability", icon: Clock },
  { name: "Booking", href: "/booking", icon: CalendarCheck },
  { name: "Smart Planner", href: "/planner", icon: CalendarRange },
  { name: "Tasks", href: "/tasks", icon: ListChecks },
  { name: "Projects", href: "/projects", icon: FolderKanban },
  { name: "Optimizer", href: "/optimizer", icon: Wand2 },
  { name: "Calendar Holds", href: "/calendar/planner", icon: Clock },
  { name: "Life Wallet", href: "/wallet", icon: Wallet },
  { name: "Unified Inbox", href: "/inbox", icon: Inbox },
  { name: "Documents", href: "/documents", icon: FileText },
  { name: "Drafts", href: "/drafts", icon: Mail },
  { name: "Follow-Ups", href: "/followups", icon: ListTodo },
  { name: "Contacts", href: "/contacts", icon: Users },
  { name: "Calendar", href: "/calendar", icon: Calendar },
  { name: "Payments", href: "/payments", icon: CreditCard },
  { name: "Travel", href: "/travel", icon: Plane },
  { name: "Orders", href: "/orders", icon: ShoppingBag },
  { name: "Stocks", href: "/stocks", icon: LineChart },
  { name: "Global Search", href: "/search", icon: Search },
  { name: "Reminders", href: "/reminders", icon: Bell },
  { name: "Approvals", href: "/approvals", icon: CheckSquare },
  { name: "Manual Add", href: "/add", icon: PlusCircle },
  { name: "Automations", href: "/automations", icon: Zap },
  { name: "Settings", href: "/settings", icon: Settings },
  { name: "Audit Log", href: "/audit", icon: ShieldAlert },
  { name: "Engineering Showcase", href: "/showcase", icon: Terminal },
];

import { NotificationBell } from "./NotificationBell";

export function Sidebar({ 
  isMobileMenuOpen = false, 
  onClose = () => {} 
}: { 
  isMobileMenuOpen?: boolean; 
  onClose?: () => void;
}) {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 md:hidden"
          onClick={onClose}
        />
      )}

      <aside className={`
        fixed md:relative
        w-64 flex-shrink-0 flex flex-col h-full bg-black border-r border-white/10 z-50
        transition-transform duration-300 ease-in-out
        ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
      `}>
        <div className="h-16 hidden md:flex items-center px-6 border-b border-white/10">
          <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            Personal Assist
          </h1>
        </div>
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={onClose}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all font-medium ${
                  isActive
                    ? "bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-white border border-white/10 shadow-sm"
                    : "text-zinc-400 hover:text-white hover:bg-white/5 border border-transparent"
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-white/10 hidden md:flex justify-between items-center">
          <div className="flex items-center gap-3 px-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500" />
            <div className="text-sm">
              <p className="text-white font-medium">User</p>
              <p className="text-zinc-400 text-xs">Local MVP</p>
            </div>
          </div>
          <NotificationBell />
        </div>
        <div className="p-4 border-t border-white/5">
          <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl">
            <div className="flex items-center gap-2 text-blue-400 mb-1">
              <Zap size={16} />
              <span className="font-bold text-sm">Local MVP</span>
            </div>
            <p className="text-xs text-blue-300/70 leading-tight">
              Operating in offline mode. No external data leaves this device.
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
