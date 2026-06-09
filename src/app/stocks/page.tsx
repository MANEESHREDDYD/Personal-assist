import { prisma } from "@/lib/prisma";
import { LineChart, AlertTriangle } from "lucide-react";
import { StockForm, BriefGenerator } from "./StockClientComponents";

export const dynamic = "force-dynamic";

export default async function StocksPage() {
  const stocks = await prisma.walletCard.findMany({
    where: { type: "stock" },
    orderBy: { createdAt: "desc" },
  });

  const briefs = await prisma.brief.findMany({
    where: { type: { in: ["stock_start", "stock_end"] } },
    orderBy: { createdAt: "desc" },
    take: 2,
  });

  return (
    <div className="p-8 max-w-7xl mx-auto w-full">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-2">
          <LineChart className="text-teal-400" />
          Stock Market Intelligence
        </h1>
        <div className="flex items-start gap-2 bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 p-4 rounded-xl mt-4">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <p className="text-sm">
            <strong>INFORMATIONAL ONLY.</strong> Personal Assist does not provide buy, sell, or hold recommendations, nor does it execute trades or connect to brokerage accounts. All data is mock/informational for Phase 1 MVP.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-8">
          <StockForm />
          
          <div className="glass-card rounded-2xl p-6">
            <h2 className="text-xl font-bold text-white mb-4">Brief Generator</h2>
            <div className="space-y-3">
              <BriefGenerator type="stock_start" label="Generate Start-of-Day Brief" />
              <BriefGenerator type="stock_end" label="Generate End-of-Day Brief" />
            </div>
          </div>

          <div className="glass-card rounded-2xl p-6">
            <h2 className="text-xl font-bold text-white mb-4">Market Open Snapshot</h2>
            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/20">
                <p className="text-xs text-green-400 font-bold uppercase tracking-wider mb-1">Top Gainer (Mock)</p>
                <p className="text-white font-bold">NVDA <span className="text-green-400 ml-2">+4.2%</span></p>
              </div>
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                <p className="text-xs text-red-400 font-bold uppercase tracking-wider mb-1">Top Loser (Mock)</p>
                <p className="text-white font-bold">TSLA <span className="text-red-400 ml-2">-2.1%</span></p>
              </div>
              <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
                <p className="text-xs text-blue-400 font-bold uppercase tracking-wider mb-1">Earnings Today (Mock)</p>
                <p className="text-white font-bold">AAPL, MSFT</p>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-8">
          <div>
            <h2 className="text-xl font-bold text-white mb-4">Latest Market Briefs</h2>
            {briefs.length === 0 ? (
              <p className="text-zinc-400">No briefs generated yet.</p>
            ) : (
              <div className="space-y-4">
                {briefs.map((brief) => {
                  const content = JSON.parse(brief.content);
                  return (
                    <div key={brief.id} className="glass-card rounded-2xl p-6 border-l-4 border-l-teal-500">
                      <h3 className="font-bold text-white mb-4">
                        {brief.type === "stock_start" ? "Start-of-Day Market Brief" : "End-of-Day Market Brief"}
                        <span className="text-sm font-normal text-zinc-500 ml-4">{new Date(brief.createdAt).toLocaleString()}</span>
                      </h3>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        {Object.entries(content).map(([key, value]) => (
                          <div key={key}>
                            <p className="text-zinc-500 uppercase text-[10px] tracking-wider">{key.replace(/([A-Z])/g, ' $1').trim()}</p>
                            <p className="text-zinc-300">{value as string}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <h2 className="text-xl font-bold text-white mb-4">Watchlist</h2>
            {stocks.length === 0 ? (
              <p className="text-zinc-400">No stocks in your watchlist.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {stocks.map((stock) => {
                  const meta = stock.metadata ? JSON.parse(stock.metadata) : {};
                  return (
                    <div key={stock.id} className="glass-card rounded-xl p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="text-2xl font-bold text-white tracking-widest">{stock.title}</h3>
                        <span className="px-2 py-1 bg-white/5 border border-white/10 rounded text-xs text-zinc-300">
                          {stock.status}
                        </span>
                      </div>
                      {meta.reason && <p className="text-sm text-zinc-400 mb-1"><strong>Reason:</strong> {meta.reason}</p>}
                      {meta.notes && <p className="text-sm text-zinc-500 line-clamp-2">{meta.notes}</p>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
