"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { TosGate, setTosGateTrip } from "@/components/TosGate";
import {
  api,
  type Handoff,
  type Me,
  type Session,
  type PairInfo,
  type ApiKey,
} from "@/lib/api";
import { openBillingPortal, startCheckout } from "@/lib/stripe";
import { TIERS } from "@/lib/tiers";
import { track } from "@/lib/analytics";

const WELCOMED_KEY = "tt_welcomed";

const SECTIONS = [
  { id: "overview", label: "Overview" },
  { id: "keys", label: "API keys" },
  { id: "billing", label: "Billing" },
  { id: "settings", label: "Settings" },
];

export default function AccountPage() {
  const router = useRouter();
  const { user, loading, signOut } = useAuth();

  const [me, setMe] = useState<Me | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [pair, setPair] = useState<PairInfo | null>(null);
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [pending, setPending] = useState<Handoff[]>([]);
  const [freshKey, setFreshKey] = useState<string | null>(null);
  const [keyBusy, setKeyBusy] = useState(false);
  const [lanBusy, setLanBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [showWelcome, setShowWelcome] = useState(false);
  const handoffListTracked = useRef(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (
      params.get("welcome") === "1" &&
      window.localStorage.getItem(WELCOMED_KEY) !== "1"
    ) {
      setShowWelcome(true);
    }
  }, []);

  function dismissWelcome() {
    window.localStorage.setItem(WELCOMED_KEY, "1");
    setShowWelcome(false);
    router.replace("/account");
  }

  useEffect(() => {
    if (!user) return;
    let cancel = false;
    (async () => {
      try {
        const [m, s, p, k] = await Promise.all([
          api.me(),
          api.sessions.list(),
          api.pair(),
          api.keys.list(),
        ]);
        if (cancel) return;
        setMe(m);
        setSessions(s);
        setPair(p);
        setKeys(k);
        if (p) track("pair_qr_shown");
      } catch (e) {
        if (setTosGateTrip(e)) return;
        if (!cancel) setErr(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => {
      cancel = true;
    };
  }, [user]);

  // Poll pending handoffs every 15 s while the page is visible.
  useEffect(() => {
    if (!user) return;
    let stop = false;
    const load = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const hs = await api.handoffs.pending();
        if (!stop) {
          setPending(hs);
          if (hs.length > 0 && !handoffListTracked.current) {
            handoffListTracked.current = true;
            track("handoff_list_opened");
          }
        }
      } catch {
        // transient — keep the last known list
      }
    };
    load();
    const iv = setInterval(load, 15_000);
    document.addEventListener("visibilitychange", load);
    return () => {
      stop = true;
      clearInterval(iv);
      document.removeEventListener("visibilitychange", load);
    };
  }, [user]);

  async function createKey() {
    setKeyBusy(true);
    setErr(null);
    try {
      const k = await api.keys.create();
      setFreshKey(k.key);
      setKeys((xs) => [k, ...xs]);
      track("api_key_created");
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setKeyBusy(false);
    }
  }

  async function toggleLan(enabled: boolean) {
    setLanBusy(true);
    setErr(null);
    try {
      const lan = await api.settings.lan(enabled);
      setMe((m) => (m ? { ...m, lan } : m));
      track("lan_toggle", { enabled });
    } catch (e) {
      if (!setTosGateTrip(e)) {
        setErr(e instanceof Error ? e.message : String(e));
      }
    } finally {
      setLanBusy(false);
    }
  }

  async function revokeKey(id: string) {
    await api.keys.revoke(id);
    setKeys((xs) => xs.map((k) => (k.id === id ? { ...k, revoked: true } : k)));
    track("api_key_revoked");
  }

  if (loading) return <p className="text-slate-500">Loading…</p>;
  if (!user)
    return (
      <div className="mx-auto max-w-sm text-center">
        <h1 className="text-2xl font-bold">Your account</h1>
        <p className="mt-3 text-slate-600">
          View sessions, manage API keys, billing, and settings.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-block rounded bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark"
        >
          Sign in or create your account
        </Link>
      </div>
    );

  const currentTier = me?.tier ?? "free";

  return (
    <TosGate>
    <div className="space-y-16">
      {/* Sticky sub-nav */}
      <nav className="sticky top-0 z-10 -mx-6 flex gap-6 border-b border-slate-200 bg-white/90 px-6 py-3 text-sm backdrop-blur">
        {SECTIONS.map((s) => (
          <a
            key={s.id}
            href={`#${s.id}`}
            className="text-slate-600 hover:text-slate-900"
          >
            {s.label}
          </a>
        ))}
        <span className="ml-auto text-slate-500">
          Tier:{" "}
          <span className="font-medium text-slate-900">{me?.tier ?? "…"}</span>
        </span>
      </nav>

      {err && (
        <div className="rounded border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Couldn&apos;t reach the API: {err}
        </div>
      )}

      {/* ───────── Overview ───────── */}
      <section id="overview" className="scroll-mt-24 space-y-10">
        {showWelcome && (
          <div className="relative rounded-lg border border-brand/30 bg-brand/5 p-6">
            <button
              onClick={dismissWelcome}
              aria-label="Dismiss"
              className="absolute right-3 top-3 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            >
              ✕
            </button>
            <h2 className="text-xl font-semibold">Welcome to TuringTap</h2>
            <p className="mt-1 text-sm text-slate-600">
              Three steps to your first session:
            </p>
            <ol className="mt-4 space-y-3 text-sm">
              <li className="flex gap-3">
                <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-brand text-xs font-medium text-white">
                  1
                </span>
                <span>
                  <Link href="/download" className="font-medium underline">
                    Download the desktop agent
                  </Link>{" "}
                  and run it on your machine.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-brand text-xs font-medium text-white">
                  2
                </span>
                <span>
                  <a href="#keys" className="font-medium underline">
                    Create an API key
                  </a>{" "}
                  for your MCP client.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-brand text-xs font-medium text-white">
                  3
                </span>
                <span>
                  <Link href="/docs" className="font-medium underline">
                    Add the MCP server
                  </Link>{" "}
                  to your AI client.
                </span>
              </li>
            </ol>
          </div>
        )}

        <h1 className="text-3xl font-bold">Overview</h1>

        <div className="grid gap-6 md:grid-cols-3">
          <div className="rounded-lg border border-slate-200 p-5">
            <h2 className="text-sm font-medium text-slate-500">Agent</h2>
            <div className="mt-2 flex items-center gap-2">
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  me?.agentOnline ? "bg-emerald-500" : "bg-slate-300"
                }`}
              />
              <span className="font-medium">
                {me?.agentOnline ? "Online" : "Offline"}
              </span>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Run <code>turingtap-agent</code> on your machine to enable{" "}
              <code>goto()</code>, <code>act()</code>, and LAN tunneling.
            </p>
          </div>

          <div className="rounded-lg border border-slate-200 p-5 md:col-span-2">
            <h2 className="text-sm font-medium text-slate-500">
              Pair your phone
            </h2>
            <div className="mt-3 flex items-center gap-5">
              <div className="flex h-32 w-32 items-center justify-center rounded border border-slate-300 bg-slate-50 text-[10px] text-slate-400">
                {pair ? "QR: " + pair.qrPayload.slice(0, 12) + "…" : "…"}
              </div>
              <p className="text-sm text-slate-600">
                Scan with the TuringTap Companion app to receive{" "}
                <code>ask_human()</code> handoffs. Code expires{" "}
                {pair ? new Date(pair.expiresAt).toLocaleTimeString() : "—"}.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 p-5">
          <h2 className="text-sm font-medium text-slate-500">
            Pending handoffs
          </h2>
          {pending.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">
              None right now. When your AI calls <code>ask_human()</code>, the
              handoff shows up here — solve it in this browser, no phone
              needed.
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-slate-200">
              {pending.map((h) => (
                <li
                  key={h.handoff_id}
                  className="flex items-center gap-4 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">
                      {h.reason}
                    </div>
                    <div className="text-xs text-slate-500">
                      {new Date(h.created * 1000).toLocaleTimeString()} ·{" "}
                      <span className="font-mono">{h.handoff_id}</span>
                    </div>
                  </div>
                  <Link
                    href={`/solve?hid=${h.handoff_id}`}
                    className="flex-none rounded bg-brand px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-dark"
                  >
                    Solve
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <h2 className="text-xl font-semibold">Live &amp; recent sessions</h2>
          {sessions.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">
              No sessions yet. Connect your MCP client to start one.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {/* Disclosed fields only (start, bytes, expiry) — nothing
                  derived from traffic is stored or shown here. Credential
                  hygiene is static guidance (/docs/rotate): rotate anything
                  sensitive after a session. */}
              {sessions.map((s) => {
                const active = s.ttl * 1000 > Date.now();
                return (
                  <li
                    key={s.session_id}
                    className="rounded-lg border border-slate-200 p-5"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-mono text-sm">{s.session_id}</div>
                        <div className="text-xs text-slate-500">
                          Started {new Date(s.started * 1000).toLocaleString()}{" "}
                          · {(s.bytes / 1e6).toFixed(1)} MB ·{" "}
                          {active ? (
                            <span className="text-emerald-600">active</span>
                          ) : (
                            "expired"
                          )}
                        </div>
                      </div>
                      {active && (
                        <button
                          onClick={() =>
                            api.sessions.close(s.session_id).then(() =>
                              setSessions((xs) =>
                                xs.filter(
                                  (x) => x.session_id !== s.session_id,
                                ),
                              ),
                            )
                          }
                          className="rounded border border-slate-300 px-3 py-1 text-xs hover:bg-slate-50"
                        >
                          Close
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>

      {/* ───────── API keys ───────── */}
      <section id="keys" className="scroll-mt-24 space-y-8">
        <header className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">MCP API keys</h1>
          <button
            onClick={createKey}
            disabled={keyBusy}
            className="rounded bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-50"
          >
            {keyBusy ? "Creating…" : "New key"}
          </button>
        </header>

        <p className="text-sm text-slate-600">
          Use a key as <code>Authorization: Bearer ttk_live_…</code> when
          connecting your MCP client to{" "}
          <code>https://mcp.turingtap.ai/sse</code>, or paste it into{" "}
          <code>~/.turingtap/agent.toml</code>.
        </p>

        {freshKey && (
          <div className="rounded border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm">
            <div className="font-medium text-emerald-900">
              Copy your key now — it won&apos;t be shown again.
            </div>
            <code className="mt-1 block break-all font-mono text-emerald-900">
              {freshKey}
            </code>
          </div>
        )}

        <table className="w-full text-sm">
          <thead className="text-left text-slate-500">
            <tr>
              <th className="py-2">Key</th>
              <th>Created</th>
              <th>Last used</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {keys.map((k) => (
              <tr key={k.id} className="border-t border-slate-200">
                <td className="py-3 font-mono">
                  {k.prefix}
                  {k.revoked && (
                    <span className="ml-2 rounded bg-slate-200 px-1.5 py-0.5 text-xs text-slate-600">
                      revoked
                    </span>
                  )}
                </td>
                <td>{new Date(k.created).toLocaleDateString()}</td>
                <td>
                  {k.lastUsed ? new Date(k.lastUsed).toLocaleDateString() : "—"}
                </td>
                <td className="text-right">
                  {!k.revoked && (
                    <button
                      onClick={() => revokeKey(k.id)}
                      className="text-xs text-red-600 hover:underline"
                    >
                      Revoke
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {keys.length === 0 && (
              <tr>
                <td colSpan={4} className="py-6 text-center text-slate-400">
                  No keys yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      {/* ───────── Billing ───────── */}
      <section id="billing" className="scroll-mt-24 space-y-10">
        <header>
          <h1 className="text-3xl font-bold">Billing</h1>
          <p className="mt-2 text-slate-600">
            Current plan:{" "}
            <span className="font-medium text-slate-900">{currentTier}</span>
          </p>
        </header>

        <div>
          <button
            onClick={() => openBillingPortal()}
            className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
          >
            Open Stripe customer portal
          </button>
          <p className="mt-2 text-xs text-slate-500">
            Manage payment method, invoices, and cancellation.
          </p>
        </div>

        <div>
          <h2 className="mb-4 text-xl font-semibold">Change plan</h2>
          <div className="grid gap-4 md:grid-cols-4">
            {TIERS.map((t) => (
              <div
                key={t.id}
                className={`rounded-lg border p-5 ${
                  t.id === currentTier ? "border-brand" : "border-slate-200"
                }`}
              >
                <div className="text-lg font-semibold">{t.name}</div>
                <div className="text-2xl font-bold">${t.priceMo}/mo</div>
                <div className="mt-1 text-xs text-slate-500">
                  {t.proxyGb} GB ·{" "}
                  {t.handoffsMo === "inf" ? "∞" : t.handoffsMo} handoffs
                </div>
                {t.id === currentTier ? (
                  <div className="mt-4 text-xs font-medium text-brand">
                    Current plan
                  </div>
                ) : t.id === "free" ? (
                  <div className="mt-4 text-xs text-slate-400">
                    Downgrade via portal
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      track("plan_upgrade_click", { tier: t.id });
                      startCheckout(t.id);
                    }}
                    className="mt-4 w-full rounded bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-dark"
                  >
                    Switch
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───────── Settings ───────── */}
      <section id="settings" className="scroll-mt-24 space-y-8">
        <h1 className="text-3xl font-bold">Settings</h1>

        <div className="rounded-lg border border-slate-200 p-6">
          <h2 className="text-lg font-semibold">Account</h2>
          <dl className="mt-3 space-y-1 text-sm">
            <div className="flex gap-3">
              <dt className="w-24 text-slate-500">Email</dt>
              <dd>{user.email}</dd>
            </div>
            <div className="flex gap-3">
              <dt className="w-24 text-slate-500">UID</dt>
              <dd className="font-mono">{user.uid}</dd>
            </div>
            <div className="flex gap-3">
              <dt className="w-24 text-slate-500">Tier</dt>
              <dd>{me?.tier ?? "…"}</dd>
            </div>
          </dl>
          <button
            onClick={() => signOut()}
            className="mt-5 rounded border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"
          >
            Sign out
          </button>
        </div>

        <div className="rounded-lg border border-slate-200 p-6">
          <h2 className="text-lg font-semibold">LAN tunnel</h2>
          <p className="mt-1 text-sm text-slate-600">
            Lets the cloud proxy reach hosts on your local network (RFC1918,{" "}
            <code>.local</code>, localhost) through your desktop agent.
            Off by default — enable it only if your AI needs to reach
            internal hosts.
          </p>
          {me?.lan?.allowed ? (
            <label className="mt-4 flex items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={me?.lan?.enabled ?? false}
                disabled={lanBusy || !me}
                onChange={(e) => toggleLan(e.target.checked)}
                className="h-4 w-4 accent-brand"
              />
              <span className="font-medium">
                {me?.lan?.enabled ? "Enabled" : "Disabled"}
                {lanBusy && (
                  <span className="ml-2 font-normal text-slate-400">
                    saving…
                  </span>
                )}
              </span>
            </label>
          ) : (
            <div className="mt-4 flex items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={false}
                disabled
                className="h-4 w-4"
              />
              <span className="text-slate-500">
                Pro feature —{" "}
                <a href="#billing" className="font-medium text-brand underline">
                  upgrade
                </a>{" "}
                to unlock.
              </span>
            </div>
          )}
        </div>
      </section>
    </div>
    </TosGate>
  );
}
