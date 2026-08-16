import Link from "next/link";
import { TIERS } from "@/lib/tiers";

const fmt = (v: number | "inf") => (v === "inf" ? "∞" : String(v));

export function PricingTable() {
  return (
    <div className="grid gap-6 md:grid-cols-4">
      {TIERS.map((t) => (
        <div
          key={t.id}
          className="flex flex-col rounded-xl border border-slate-200 p-6"
        >
          <h3 className="text-lg font-semibold">{t.name}</h3>
          <div className="mt-1 text-3xl font-bold">
            ${t.priceMo}
            <span className="text-base font-normal text-slate-500">/mo</span>
          </div>
          <ul className="mt-4 flex-1 space-y-1.5 text-sm text-slate-600">
            <li>{t.proxyGb} GB proxy / mo</li>
            <li>
              {t.overagePerGb === null
                ? "Hard cap"
                : `$${t.overagePerGb.toFixed(2)}/GB overage`}
            </li>
            <li>
              {t.sessionCapMin === null
                ? "Unlimited session length"
                : `${t.sessionCapMin}-min session cap`}
            </li>
            <li>{t.bufferMb} MB traffic buffer</li>
            <li>{fmt(t.concurrent)} concurrent sessions</li>
            <li>{fmt(t.handoffsMo)} mobile handoffs / mo</li>
            <li>{t.agentBrowser ? "✅" : "❌"} goto / act browser control</li>
            <li>
              {t.lanTunnel ? "✅" : "❌"} LAN tunnel
              {t.lanTunnel && (
                <span className="text-xs text-slate-400"> (off by default)</span>
              )}
            </li>
          </ul>
          <Link
            href="/billing"
            className="mt-5 rounded bg-slate-900 px-3 py-2 text-center text-sm font-medium text-white hover:bg-slate-700"
          >
            {t.id === "free" ? "Get started" : "Choose"}
          </Link>
        </div>
      ))}
    </div>
  );
}
