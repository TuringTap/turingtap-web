"use client";

/**
 * Plausible analytics (cookieless, no consent banner required).
 *
 * Scope rules (hard):
 * - Loads on marketing pages and the dashboard.
 * - NEVER loads or records on /solve (live proxied-browser screencast).
 *   Two layers enforce this:
 *     1. <Analytics> skips/removes the script tag while pathname is /solve.
 *     2. The script is the `.exclusions.` variant with data-exclude="/solve",
 *        so even a client-side navigation onto /solve (script already loaded,
 *        SPA history hook still attached) records nothing.
 * - No event carries traffic-derived payloads: event names plus our own
 *   enums (tier ids, booleans) only.
 *
 * Everything is gated on NEXT_PUBLIC_PLAUSIBLE_DOMAIN; unset = fully off.
 */

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const DOMAIN = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;
const SCRIPT_ID = "plausible-analytics";
const SCRIPT_SRC = "https://plausible.io/js/script.tagged-events.exclusions.js";

type Props = Record<string, string | number | boolean>;

declare global {
  interface Window {
    plausible?: (event: string, opts?: { props?: Props }) => void;
  }
}

function onSolve(pathname: string | null): boolean {
  return pathname === "/solve" || (pathname?.startsWith("/solve/") ?? false);
}

/** Fire a custom event. No-op when analytics is disabled, the script hasn't
 *  loaded, or the current page is /solve. Props must be our own enums
 *  (tier names, booleans) — never anything derived from proxied traffic. */
export function track(event: string, props?: Props): void {
  if (!DOMAIN || typeof window === "undefined") return;
  if (onSolve(window.location.pathname)) return;
  window.plausible?.(event, props ? { props } : undefined);
}

/** Mounts the Plausible script. Renders nothing. Skipped entirely on /solve;
 *  removes the tag if the user navigates there client-side. */
export function Analytics(): null {
  const pathname = usePathname();
  const excluded = onSolve(pathname);

  useEffect(() => {
    if (!DOMAIN) return;
    if (excluded) {
      document.getElementById(SCRIPT_ID)?.remove();
      delete window.plausible;
      return;
    }
    if (document.getElementById(SCRIPT_ID)) return;
    const s = document.createElement("script");
    s.id = SCRIPT_ID;
    s.defer = true;
    s.src = SCRIPT_SRC;
    s.setAttribute("data-domain", DOMAIN);
    s.setAttribute("data-exclude", "/solve, /solve/*");
    document.head.appendChild(s);
  }, [excluded]);

  return null;
}
