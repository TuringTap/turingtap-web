"use client";

/**
 * Blocking, versioned Terms of Service acceptance gate.
 *
 * Wrap authed page content: `<TosGate>{children}</TosGate>`. On mount (once
 * a Firebase user is present) it calls `GET /tos/status`; if `required`, it
 * renders a full-viewport modal with the TOS + Privacy inline, a checkbox,
 * and a disabled-until-checked "Agree and continue" button that calls
 * `POST /tos/accept {version}`. It also intercepts any `TosRequiredError`
 * thrown by child API calls (via `setTosGateTrip`) and pops the same modal.
 */

import {
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import { useAuth } from "./AuthProvider";
import { api, TosRequiredError, type TosStatus } from "@/lib/api";

/**
 * Global trip-wire so any `catch` block can pop the modal without prop
 * drilling. `<TosGate>` registers the setter on mount.
 */
let _trip: ((e: TosRequiredError) => void) | null = null;
export function setTosGateTrip(e: unknown): boolean {
  if (e instanceof TosRequiredError && _trip) {
    _trip(e);
    return true;
  }
  return false;
}

export function TosGate({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const [status, setStatus] = useState<TosStatus | null>(null);
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setStatus(await api.tos.status());
    } catch {
      // /tos/status failing (network, 401) shouldn't hard-block the page —
      // the underlying API calls will fail on their own and surface errors.
      setStatus({ required: false, current: "", privacy: "", accepted: null, url: "" });
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    void refresh();
  }, [user, refresh]);

  // Register the trip-wire so child API error handlers can pop the modal.
  useEffect(() => {
    _trip = () => void refresh();
    return () => {
      _trip = null;
    };
  }, [refresh]);

  async function accept() {
    if (!status) return;
    setBusy(true);
    setErr(null);
    try {
      await api.tos.accept(status.current);
      setStatus({ ...status, required: false, accepted: status.current });
    } catch (e) {
      // 409 tos_stale: version rolled while modal was open — refetch.
      setErr(e instanceof Error ? e.message : String(e));
      void refresh();
    } finally {
      setBusy(false);
    }
  }

  // Not authed / still resolving auth: render children unguarded (the page
  // itself handles the sign-in redirect).
  if (loading || !user) return <>{children}</>;

  // Waiting on /tos/status.
  if (status === null) {
    return <p className="text-sm text-slate-500">Loading…</p>;
  }

  if (!status.required) return <>{children}</>;

  const isUpdate = status.accepted !== null;

  return (
    <>
      {/* Render children dimmed underneath so context is preserved. */}
      <div aria-hidden className="pointer-events-none select-none opacity-30">
        {children}
      </div>

      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="tos-title"
          className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-lg bg-white shadow-xl"
        >
          <div className="border-b border-slate-200 px-6 py-4">
            <h2 id="tos-title" className="text-xl font-semibold">
              {isUpdate
                ? "We've updated our Terms of Service"
                : "Terms of Service & Privacy Policy"}
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Version {status.current} · Please review and accept to continue
              using TuringTap.{" "}
              <Link href="/legal/tos" target="_blank" className="underline">
                Open in new tab
              </Link>
            </p>
          </div>

          <div className="flex-1 overflow-y-auto bg-slate-50">
            <iframe
              src="/legal/tos"
              title="Terms of Service"
              className="h-[50vh] w-full border-0 bg-white"
            />
            <div className="border-t border-slate-200 px-6 py-3 text-xs text-slate-600">
              This acceptance also covers our{" "}
              <Link
                href="/legal/privacy"
                target="_blank"
                className="underline"
              >
                Privacy Policy
              </Link>{" "}
              (version {status.privacy}).
            </div>
          </div>

          <div className="border-t border-slate-200 px-6 py-4">
            <label className="flex cursor-pointer items-start gap-3 text-sm">
              <input
                type="checkbox"
                checked={checked}
                onChange={(e) => setChecked(e.target.checked)}
                className="mt-0.5 h-4 w-4"
              />
              <span>
                I have read and agree to the{" "}
                <Link href="/legal/tos" target="_blank" className="underline">
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link
                  href="/legal/privacy"
                  target="_blank"
                  className="underline"
                >
                  Privacy Policy
                </Link>
                .
              </span>
            </label>

            {err && (
              <div className="mt-3 rounded border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-900">
                {err}
              </div>
            )}

            <button
              onClick={accept}
              disabled={!checked || busy}
              className="mt-4 w-full rounded bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? "Recording acceptance…" : "Agree and continue"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
