"use client";

import { useState, useMemo } from "react";
import { AuditLog } from "@prisma/client";
import { ShieldAlert, Search, Database, Clock, User } from "lucide-react";
import { parseMetadata } from "@/lib/metadata";

interface Props {
  initialLogs: AuditLog[];
}

export function AuditClient({ initialLogs }: Props) {
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [entityFilter, setEntityFilter] = useState("all");

  const actions = useMemo(() => Array.from(new Set(initialLogs.map(l => l.action))), [initialLogs]);
  const entities = useMemo(() => Array.from(new Set(initialLogs.map(l => l.entityType))), [initialLogs]);

  const filteredLogs = useMemo(() => {
    return initialLogs.filter(log => {
      const details = log.details || "";
      const matchesSearch = !search || 
        log.action.toLowerCase().includes(search.toLowerCase()) || 
        log.entityId.toLowerCase().includes(search.toLowerCase()) ||
        details.toLowerCase().includes(search.toLowerCase());
      
      const matchesAction = actionFilter === "all" || log.action === actionFilter;
      const matchesEntity = entityFilter === "all" || log.entityType === entityFilter;

      return matchesSearch && matchesAction && matchesEntity;
    });
  }, [initialLogs, search, actionFilter, entityFilter]);

  return (
    <div>
      <div className="glass-card rounded-2xl p-4 mb-8 flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:w-auto flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input 
            type="text" 
            placeholder="Search audit logs..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-black/20 border border-white/10 rounded-xl text-sm text-white focus:ring-2 focus:ring-purple-500 outline-none"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0">
          <select 
            value={actionFilter} 
            onChange={e => setActionFilter(e.target.value)}
            className="px-3 py-2 bg-black/20 border border-white/10 rounded-xl text-sm text-zinc-300 outline-none"
          >
            <option value="all">All Actions</option>
            {actions.map(a => <option key={a} value={a}>{a}</option>)}
          </select>

          <select 
            value={entityFilter} 
            onChange={e => setEntityFilter(e.target.value)}
            className="px-3 py-2 bg-black/20 border border-white/10 rounded-xl text-sm text-zinc-300 outline-none"
          >
            <option value="all">All Entities</option>
            {entities.map(e => <option key={e} value={e}>{e}</option>)}
          </select>
        </div>
      </div>

      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 bg-white/5 text-sm text-zinc-400">
                <th className="p-4 font-medium"><Clock className="w-4 h-4 inline mr-2"/>Timestamp</th>
                <th className="p-4 font-medium"><User className="w-4 h-4 inline mr-2"/>Actor</th>
                <th className="p-4 font-medium">Action</th>
                <th className="p-4 font-medium"><Database className="w-4 h-4 inline mr-2"/>Entity</th>
                <th className="p-4 font-medium">Details</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log) => {
                const meta = parseMetadata(log.details);
                const actor = meta.actor as string || "System";
                const description = meta.description as string || "-";
                
                return (
                  <tr key={log.id} className="border-b border-white/5 hover:bg-white/5 transition-colors text-sm">
                    <td className="p-4 text-zinc-400 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="p-4 text-zinc-300 font-medium">
                      {actor}
                    </td>
                    <td className="p-4">
                      <span className="px-2 py-1 rounded bg-white/10 text-white text-xs font-mono">
                        {log.action}
                      </span>
                    </td>
                    <td className="p-4 text-zinc-300">
                      <span className="text-xs uppercase tracking-wider text-purple-400 font-bold">{log.entityType}</span>
                      <br/>
                      <span className="text-zinc-500 text-[10px] font-mono">{log.entityId}</span>
                    </td>
                    <td className="p-4 text-zinc-400 max-w-xs truncate" title={description}>
                      {description}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filteredLogs.length === 0 && (
          <div className="p-8 text-center text-zinc-500">
            No audit logs found.
          </div>
        )}
      </div>
    </div>
  );
}
