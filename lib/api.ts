/**
 * Typed fetch wrapper for the TuringTap `api` Cloud Run service.
 * All calls attach the current Firebase ID token as a Bearer.
 */
import { getIdToken } from "./firebase";
import type { TierId } from "./tiers";

const BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://api.turingtap.ai";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * Thrown when the backend refuses with 403 `{error:"tos_required"}` — the
 * caller hasn't accepted the current Terms of Service. `<TosGate>` catches
 * this and pops the blocking accept modal.
 */
export class TosRequiredError extends Error {
  constructor(
    public current: string,
    public url: string,
  ) {
    super(`Terms of Service acceptance required (version ${current})`);
    this.name = "TosRequiredError";
  }
}

async function req<T>(
  method: "GET" | "POST" | "DELETE" | "PATCH",
  path: string,
  body?: unknown,
): Promise<T> {
  const token = await getIdToken();
  const headers: Record<string, string> = { Accept: "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers["Content-Type"] = "application/json";

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    // FastAPI wraps HTTPException detail in {"detail": ...}. Detect the
    // structured tos_required error and throw a typed exception so
    // <TosGate> can react without string-matching.
    if (res.status === 403) {
      try {
        const detail = JSON.parse(text)?.detail;
        if (detail?.error === "tos_required") {
          throw new TosRequiredError(detail.current, detail.url);
        }
      } catch (e) {
        if (e instanceof TosRequiredError) throw e;
        // fall through to generic ApiError
      }
    }
    throw new ApiError(res.status, text || res.statusText);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

// ---- resource types -------------------------------------------------------

export interface LanSetting {
  /** Tier includes the LAN tunnel (Pro+). */
  allowed: boolean;
  /** Per-user opt-in — off by default even on eligible tiers. */
  enabled: boolean;
}

export interface Me {
  uid: string;
  email: string | null;
  tier: TierId;
  agentOnline: boolean;
  stripeCustomerId: string | null;
  lan: LanSetting;
}

/**
 * One proxy session, as returned by GET /sessions — disclosed fields only
 * (privacy §3: start time, bytes proxied, expiry). Nothing derived from
 * traffic (hosts, credentials) is stored server-side or returned here;
 * rotate reminders are delivered transiently by the desktop agent toast,
 * the mobile card, and at session close.
 */
export interface Session {
  session_id: string;
  /** Unix epoch seconds. */
  started: number;
  bytes: number;
  /** Unix epoch seconds when the session document TTL-expires (1 h). */
  ttl: number;
}

export interface ApiKey {
  id: string;
  prefix: string; // "ttk_live_xxxx…"
  created: string;
  lastUsed: string | null;
  revoked: boolean;
}

export interface CreatedApiKey extends ApiKey {
  /** Full key, only returned once at creation. */
  key: string;
}

export interface PairInfo {
  qrPayload: string;
  expiresAt: string;
}

export interface Handoff {
  handoff_id: string;
  uid: string;
  session_id: string;
  reason: string;
  state: "pending" | "active" | "user_stopped" | "dismissed" | string;
  message: string | null;
  /** Unix epoch seconds. */
  created: number;
}

export interface TosStatus {
  required: boolean;
  current: string;
  privacy: string;
  accepted: string | null;
  url: string;
}

// ---- endpoints ------------------------------------------------------------

export const api = {
  me: () => req<Me>("GET", "/me"),

  tos: {
    status: () => req<TosStatus>("GET", "/tos/status"),
    accept: (version: string) =>
      req<{ ok: boolean; version: string }>("POST", "/tos/accept", { version }),
  },

  sessions: {
    list: () => req<Session[]>("GET", "/sessions"),
    close: (id: string) => req<void>("DELETE", `/sessions/${id}`),
  },

  keys: {
    list: () => req<ApiKey[]>("GET", "/keys"),
    create: (label?: string) => req<CreatedApiKey>("POST", "/keys", { label }),
    revoke: (id: string) => req<void>("DELETE", `/keys/${id}`),
  },

  pair: () => req<PairInfo>("POST", "/pair"),

  settings: {
    /** LAN tunnel opt-in (Pro+; 403 tier_required otherwise). */
    lan: (enabled: boolean) =>
      req<LanSetting>("PATCH", "/settings/lan", { enabled }),
  },

  handoffs: {
    /** Pending handoffs for the dashboard card (newest first). */
    pending: () => req<Handoff[]>("GET", "/handoffs?state=pending"),
    get: (hid: string) => req<Handoff>("GET", `/handoffs/${hid}`),
  },

  billing: {
    /** Returns Stripe Customer Portal URL (api service creates the session). */
    portal: () => req<{ url: string }>("POST", "/billing/portal"),
    checkout: (tier: TierId) =>
      req<{ url: string }>("POST", "/billing/checkout", { tier }),
  },
};
