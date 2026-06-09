import { prisma } from "@/lib/prisma";
import { Users, Search } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function ContactsPage() {
  const contacts = await prisma.contact.findMany({
    orderBy: { name: 'asc' }
  });

  return (
    <div className="p-8 max-w-6xl mx-auto w-full space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-2">
            <Users className="text-blue-400" />
            Contacts Directory
          </h1>
          <p className="text-zinc-400">View your local offline contacts.</p>
        </div>
        
        <Link href="/add?type=contact" className="px-4 py-2 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 rounded-xl font-medium transition-colors">
          Add Contact
        </Link>
      </div>

      <div className="glass-card rounded-2xl p-6">
        {contacts.length === 0 ? (
          <p className="text-zinc-500 py-8 text-center">No contacts found.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {contacts.map(c => (
              <Link key={c.id} href={`/contacts/${c.id}`} className="block p-5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                <h3 className="font-bold text-white mb-1">{c.name}</h3>
                {c.email && <p className="text-sm text-zinc-400 mb-1">{c.email}</p>}
                {c.company && <p className="text-xs text-zinc-500">🏢 {c.company}</p>}
                {c.source && (
                  <span className="inline-block mt-3 text-[10px] font-bold uppercase tracking-wider bg-black/30 px-2 py-1 rounded text-zinc-500">
                    Source: {c.source}
                  </span>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
