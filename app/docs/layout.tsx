import Link from "next/link";
import type { ReactNode } from "react";

const nav = [
  { href: "/docs", label: "Overview" },
  { href: "/docs/mcp-setup", label: "MCP setup" },
  { href: "/docs/skill", label: "SKILL.md" },
  { href: "/docs/proxy-config", label: "Own-browser proxy" },
  { href: "/docs/rotate", label: "Credential hygiene" },
];

export default function DocsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid gap-10 md:grid-cols-[200px_1fr]">
      <aside className="text-sm">
        <div className="mb-3 font-semibold uppercase tracking-wide text-slate-400">
          Docs
        </div>
        <ul className="space-y-1">
          {nav.map((n) => (
            <li key={n.href}>
              <Link
                href={n.href}
                className="block rounded px-2 py-1 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              >
                {n.label}
              </Link>
            </li>
          ))}
        </ul>
      </aside>
      <article className="min-w-0 max-w-3xl">{children}</article>
    </div>
  );
}
