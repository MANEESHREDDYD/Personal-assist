import { prisma } from "@/lib/prisma";
import { WalletCardItem } from "@/components/wallet/WalletCardItem";
import { WalletListClient } from "@/components/wallet/WalletListClient";
import { Wallet } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function WalletPage() {
  const cards = await prisma.walletCard.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="p-8 max-w-7xl mx-auto w-full">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-2">
            <Wallet className="text-blue-400" />
            Life Wallet
          </h1>
          <p className="text-zinc-400">All your important life items in one place.</p>
        </div>
        <Link
          href="/add"
          className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors border border-white/10 font-medium"
        >
          + Add Item
        </Link>
      </div>

      {cards.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 text-center flex flex-col items-center justify-center">
          <Wallet className="w-16 h-16 text-zinc-600 mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">Your wallet is empty</h3>
          <p className="text-zinc-400 mb-6 max-w-md">
            Start organizing your life by adding your first payment, document, ticket, or reminder.
          </p>
          <Link
            href="/add"
            className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg font-medium hover:opacity-90 transition-opacity"
          >
            Add your first item
          </Link>
        </div>
      ) : (
        <WalletListClient initialCards={cards} />
      )}
    </div>
  );
}
