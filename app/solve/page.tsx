"use client";

/**
 * Browser-in-browser handoff solver.
 *
 * Static-export page: the handoff id comes from `?hid=` (no dynamic route).
 * Connects to the relay WS `${NEXT_PUBLIC_RELAY_URL}/handoff/{hid}` and
 * authenticates by sending the Firebase ID token as the FIRST frame
 * `{ auth: <idToken> }` — never in the URL, where query strings would be
 * retained by access/proxy logs (retention audit 2026-08). It then speaks
 * the same thin JSON envelope as the mobile solver
 * (turingtap-mobile/lib/services/relay_ws.dart):
 *
 *   -> { auth: "<firebase-id-token>" }
 *   <- { method: "Page.screencastFrame",
 *        params: { data: "<base64 jpeg>", sessionId, metadata: {deviceWidth, deviceHeight} } }
 *   -> { method: "Page.screencastFrameAck", params: { sessionId } }
 *   -> { method: "Input.dispatchMouseEvent" | "Input.dispatchKeyEvent", params: {...} }
 *   <- { method: "TuringTap.dismiss", params: { message } }
 *   -> { method: "TuringTap.done", params: { state: "user_stopped" } }   (Done button)
 *
 * The agent accepts Input.dispatchMouseEvent / TouchEvent / KeyEvent
 * (turingtap-agent internal/browser/browser.go DispatchInput); a desktop
 * browser sends mouse + key events.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { api, type Handoff } from "@/lib/api";
import { getIdToken } from "@/lib/firebase";

const RELAY_URL =
  process.env.NEXT_PUBLIC_RELAY_URL ?? "wss://relay.turingtap.ai";

type Status = "connecting" | "live" | "ended" | "error";

/** Special (non-printable) keys forwarded as keyDown/keyUp. */
const SPECIAL_KEYS: Record<
  string,
  { code: string; vk: number; text?: string }
> = {
  Enter: { code: "Enter", vk: 13, text: "\r" },
  Backspace: { code: "Backspace", vk: 8 },
  Tab: { code: "Tab", vk: 9 },
  Escape: { code: "Escape", vk: 27 },
  ArrowLeft: { code: "ArrowLeft", vk: 37 },
  ArrowUp: { code: "ArrowUp", vk: 38 },
  ArrowRight: { code: "ArrowRight", vk: 39 },
  ArrowDown: { code: "ArrowDown", vk: 40 },
  Delete: { code: "Delete", vk: 46 },
  Home: { code: "Home", vk: 36 },
  End: { code: "End", vk: 35 },
};

export default function SolvePage() {
  const { user, loading } = useAuth();

  const [hid, setHid] = useState<string | null>(null);
  const [handoff, setHandoff] = useState<Handoff | null>(null);
  const [status, setStatus] = useState<Status>("connecting");
  const [dismissMsg, setDismissMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const keyInputRef = useRef<HTMLInputElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  /** Remote viewport size from the last frame's metadata (for coord scaling). */
  const remoteRef = useRef<{ w: number; h: number }>({ w: 0, h: 0 });
  const draggingRef = useRef(false);

  useEffect(() => {
    setHid(new URLSearchParams(window.location.search).get("hid"));
  }, []);

  const send = useCallback((method: string, params: Record<string, unknown>) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ method, params }));
    }
  }, []);

  // Fetch the handoff (prompt banner) + open the relay WS.
  useEffect(() => {
    if (!user || !hid) return;
    let cancel = false;
    let ws: WebSocket | null = null;
    let closeTimer: ReturnType<typeof setTimeout> | null = null;

    (async () => {
      try {
        const h = await api.handoffs.get(hid);
        if (cancel) return;
        setHandoff(h);
      } catch (e) {
        if (!cancel) {
          setErr(e instanceof Error ? e.message : String(e));
          setStatus("error");
        }
        return;
      }

      const token = await getIdToken();
      if (cancel || !token) return;
      ws = new WebSocket(`${RELAY_URL}/handoff/${hid}`);
      ws.binaryType = "arraybuffer";
      wsRef.current = ws;

      ws.onopen = () => {
        // Auth rides in the first WS frame — never the URL.
        ws?.send(JSON.stringify({ auth: token }));
        if (!cancel) setStatus("live");
      };

      ws.onmessage = async (ev: MessageEvent) => {
        const text =
          typeof ev.data === "string"
            ? ev.data
            : new TextDecoder().decode(ev.data as ArrayBuffer);
        let msg: { method?: string; params?: Record<string, unknown> };
        try {
          msg = JSON.parse(text);
        } catch {
          return; // not a complete JSON envelope — skip (mobile does the same)
        }
        const params = (msg.params ?? {}) as Record<string, unknown>;

        switch (msg.method) {
          case "Page.screencastFrame": {
            const data = params.data as string | undefined;
            if (!data) return;
            const meta = (params.metadata ?? {}) as Record<string, unknown>;
            const img = new Image();
            img.onload = () => {
              remoteRef.current = {
                w: (meta.deviceWidth as number) || img.width,
                h: (meta.deviceHeight as number) || img.height,
              };
              const canvas = canvasRef.current;
              if (!canvas) return;
              if (canvas.width !== img.width || canvas.height !== img.height) {
                canvas.width = img.width;
                canvas.height = img.height;
              }
              canvas.getContext("2d")?.drawImage(img, 0, 0);
            };
            img.src = `data:image/jpeg;base64,${data}`;
            // Ack so Chromium keeps sending.
            send("Page.screencastFrameAck", { sessionId: params.sessionId });
            break;
          }
          case "TuringTap.dismiss": {
            setDismissMsg((params.message as string) || "All done — thanks!");
            closeTimer = setTimeout(() => {
              ws?.close();
              setStatus("ended");
            }, 3000);
            break;
          }
        }
      };

      ws.onclose = () => {
        if (!cancel) setStatus((s) => (s === "error" ? s : "ended"));
        wsRef.current = null;
      };
      ws.onerror = () => {
        if (!cancel) {
          setErr("Relay connection failed — is the agent online?");
          setStatus("error");
        }
      };
    })();

    return () => {
      cancel = true;
      if (closeTimer) clearTimeout(closeTimer);
      ws?.close();
      wsRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, hid]);

  // ---- input mapping --------------------------------------------------------

  const toRemote = useCallback((e: React.PointerEvent | React.WheelEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const { w, h } = remoteRef.current;
    const rw = w || canvas.width;
    const rh = h || canvas.height;
    return {
      x: Math.round(((e.clientX - rect.left) / rect.width) * rw),
      y: Math.round(((e.clientY - rect.top) / rect.height) * rh),
    };
  }, []);

  const mouse = useCallback(
    (
      type: "mousePressed" | "mouseReleased" | "mouseMoved",
      e: React.PointerEvent,
    ) => {
      const { x, y } = toRemote(e);
      send("Input.dispatchMouseEvent", {
        type,
        x,
        y,
        button: type === "mouseMoved" && !draggingRef.current ? "none" : "left",
        clickCount: type === "mouseMoved" ? 0 : 1,
      });
    },
    [send, toRemote],
  );

  function onPointerDown(e: React.PointerEvent) {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    draggingRef.current = true;
    mouse("mousePressed", e);
    keyInputRef.current?.focus(); // route keystrokes to the remote page
  }
  function onPointerMove(e: React.PointerEvent) {
    mouse("mouseMoved", e);
  }
  function onPointerUp(e: React.PointerEvent) {
    mouse("mouseReleased", e);
    draggingRef.current = false;
  }
  function onWheel(e: React.WheelEvent) {
    const { x, y } = toRemote(e);
    send("Input.dispatchMouseEvent", {
      type: "mouseWheel",
      x,
      y,
      deltaX: e.deltaX,
      deltaY: e.deltaY,
    });
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.metaKey || e.ctrlKey || e.altKey) return; // keep browser shortcuts local
    const special = SPECIAL_KEYS[e.key];
    if (special) {
      e.preventDefault();
      send("Input.dispatchKeyEvent", {
        type: "keyDown",
        key: e.key,
        code: special.code,
        windowsVirtualKeyCode: special.vk,
        nativeVirtualKeyCode: special.vk,
        ...(special.text
          ? { text: special.text, unmodifiedText: special.text }
          : {}),
      });
      send("Input.dispatchKeyEvent", {
        type: "keyUp",
        key: e.key,
        code: special.code,
        windowsVirtualKeyCode: special.vk,
        nativeVirtualKeyCode: special.vk,
      });
    } else if (e.key.length === 1) {
      e.preventDefault();
      send("Input.dispatchKeyEvent", {
        type: "char",
        text: e.key,
        unmodifiedText: e.key,
        key: e.key,
      });
    }
  }

  function done() {
    // Same as the mobile Done button: TuringTap.done then close — the relay
    // marks the handoff user_stopped when the bridge tears down.
    send("TuringTap.done", { state: "user_stopped" });
    wsRef.current?.close();
    setStatus("ended");
  }

  // ---- render ---------------------------------------------------------------

  if (loading) return <p className="text-slate-500">Loading…</p>;
  if (!user)
    return (
      <div className="mx-auto max-w-sm text-center">
        <h1 className="text-2xl font-bold">Solve a handoff</h1>
        <p className="mt-3 text-slate-600">
          Sign in to take over the browser session your AI handed off.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-block rounded bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark"
        >
          Sign in
        </Link>
      </div>
    );
  if (!hid)
    return (
      <div className="mx-auto max-w-md text-center">
        <h1 className="text-2xl font-bold">No handoff selected</h1>
        <p className="mt-3 text-slate-600">
          Open a handoff from your{" "}
          <Link href="/account" className="underline">
            account overview
          </Link>{" "}
          or use the <code>solve_url</code> your AI gave you.
        </p>
      </div>
    );

  const banner = dismissMsg ?? handoff?.reason ?? "…";

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      {/* Prompt banner */}
      <div
        className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-sm ${
          dismissMsg
            ? "border-emerald-300 bg-emerald-50 text-emerald-900"
            : "border-slate-800 bg-slate-900 text-white"
        }`}
      >
        {!dismissMsg && status === "live" && (
          <span className="flex-none font-semibold text-red-400">● REC</span>
        )}
        <span className="min-w-0 flex-1">{banner}</span>
        {status === "live" && !dismissMsg && (
          <button
            onClick={done}
            className="flex-none rounded bg-brand px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-dark"
          >
            Done
          </button>
        )}
      </div>

      {err && (
        <div className="rounded border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {err}
        </div>
      )}

      {status === "ended" ? (
        <div className="rounded-lg border border-slate-200 p-10 text-center">
          <p className="font-medium">Handoff ended.</p>
          <p className="mt-1 text-sm text-slate-500">
            {dismissMsg ?? "Control returned to your AI."}
          </p>
          <Link
            href="/account"
            className="mt-5 inline-block rounded border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50"
          >
            Back to account
          </Link>
        </div>
      ) : (
        <div className="relative overflow-hidden rounded-lg border border-slate-300 bg-slate-950">
          <canvas
            ref={canvasRef}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onWheel={onWheel}
            onContextMenu={(e) => e.preventDefault()}
            className="block w-full cursor-crosshair touch-none select-none"
          />
          {status === "connecting" && (
            <div className="absolute inset-0 flex items-center justify-center p-10 text-sm text-slate-400">
              Connecting to your agent&apos;s browser…
            </div>
          )}
          {/* Hidden input: keeps focus so keystrokes reach the remote page. */}
          <input
            ref={keyInputRef}
            onKeyDown={onKeyDown}
            aria-label="Remote keyboard input"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            className="absolute h-px w-px opacity-0"
            style={{ left: -9999 }}
          />
        </div>
      )}

      <p className="text-xs text-slate-500">
        Click the page to interact — mouse, scroll, and typing are forwarded to
        the browser running on your machine. Nothing is recorded.
      </p>
    </div>
  );
}
