import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { Mail, Phone, Building, Calendar, ArrowLeft } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function ContactDetailPage({ params }: { params: { id: string } }) {
  const contact = await prisma.contact.findUnique({
    where: { id: params.id }
  });

  if (!contact) return notFound();

  // Fetch related follow-ups or drafts if we have their IDs, or just show placeholders for now.
  const followups = await prisma.followUp.findMany({
    where: { relatedContactId: contact.id }
  });

  return (
    <div className="p-8 max-w-4xl mx-auto w-full space-y-8">
      <Link href="/contacts" className="inline-flex items-center gap-2 text-zinc-400 hover:text-white transition-colors text-sm font-medium">
        <ArrowLeft className="w-4 h-4" /> Back to Directory
      </Link>

      <div className="glass-card rounded-2xl p-8 flex flex-col md:flex-row gap-8 items-start">
        <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shrink-0">
          <span className="text-3xl font-bold text-white">{contact.name.charAt(0).toUpperCase()}</span>
        </div>

        <div className="flex-1 space-y-4">
          <div>
            <h1 className="text-3xl font-bold text-white mb-1">{contact.name}</h1>
            {contact.role && <p className="text-zinc-400 font-medium">{contact.role}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {contact.email && (
              <div className="flex items-center gap-3 text-zinc-300">
                <Mail className="w-4 h-4 text-zinc-500" />
                <span>{contact.email}</span>
              </div>
            )}
            {contact.phone && (
              <div className="flex items-center gap-3 text-zinc-300">
                <Phone className="w-4 h-4 text-zinc-500" />
                <span>{contact.phone}</span>
              </div>
            )}
            {contact.company && (
              <div className="flex items-center gap-3 text-zinc-300">
                <Building className="w-4 h-4 text-zinc-500" />
                <span>{contact.company}</span>
              </div>
            )}
            {contact.source && (
              <div className="flex items-center gap-3 text-zinc-300">
                <Calendar className="w-4 h-4 text-zinc-500" />
                <span className="text-sm">Source: {contact.source}</span>
              </div>
            )}
          </div>
          
          <div className="pt-4 border-t border-white/10 flex gap-3">
             <Link href={`/drafts?to=${contact.email}&type=new_email`} className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm font-medium transition-colors">
               Draft Email
             </Link>
             <Link href={`/followups`} className="px-4 py-2 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 rounded-lg text-sm font-medium transition-colors">
               Create Follow-Up
             </Link>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <h2 className="text-xl font-bold text-white">Related Follow-Ups</h2>
        {followups.length === 0 ? (
          <p className="text-zinc-500 text-sm">No follow-ups recorded for this contact.</p>
        ) : (
          <div className="space-y-3">
            {followups.map(f => (
              <div key={f.id} className="p-4 bg-white/5 border border-white/10 rounded-xl flex justify-between items-center">
                <div>
                  <h4 className="font-bold text-white">{f.title}</h4>
                  <p className="text-sm text-zinc-400">Status: {f.status}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
