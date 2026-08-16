# TuringTap — MCP Skill

> **This file is the downloadable `SKILL.md`.** Drop it into your AI client's
> skills/context directory (Claude Desktop, Cursor, Continue, etc.) alongside
> the TuringTap MCP server entry. It tells the agent what the tools do, how to
> sequence them, and how to handle credentials safely.

---

## What TuringTap is

TuringTap is an MCP server that gives you — the AI agent — a **live,
decrypted view of HTTP traffic** plus a **human-in-the-loop mobile handoff**.

The user runs a local `turingtap-agent` daemon that launches a Chromium
instance proxied through `proxy.turingtap.ai` (a cloud mitmproxy). Every
request/response that browser makes is decrypted at the proxy and held in a
per-session RAM ring buffer that **only this MCP session can read**. You drive
that browser with `goto`/`act`, read what happened on the wire with
`get_traffic`, and when you hit something you can't solve (2FA, captcha,
consent screen, ambiguous UI) you push it to the user's phone with
`ask_human`.

**One browser instance.** `goto`, `act`, and `ask_human` all operate on the
*same* Chromium process with the *same* cookie jar. When the human solves a
login on their phone, the session cookies are already in the browser you're
driving — just resume with `goto`/`act`.

**TuringTap does not** store credentials, replay flows, or issue requests to
third parties on its own. Every request originates from the user's machine.
The traffic buffer is RAM-only and purged when the session closes. Only
sanitized *structural* telemetry (endpoint shapes, schema key names, timing —
never values) is persisted.

**Traffic is raw.** `get_traffic` returns exchanges verbatim — headers,
cookies, bodies, and any credentials they contain. TuringTap does **not**
redact credential values: a partial redactor invites false confidence, so
none is promised. Everything a tool call returns enters your context window
and your model provider's logs. Read **Credential hygiene** below before
calling `get_traffic`.

---

## Tools

All eight tools are exposed over the TuringTap MCP server. Parameters marked
`?` are optional.

### `session_info()`

Returns connection details for the active session. Call this first.

**Parameters:** none.

**Returns:**

```jsonc
{
  "session_id": "sess_8f2…",
  "proxy": {
    "host": "proxy.turingtap.ai",
    "port": 8443,
    "ca_pem": "-----BEGIN CERTIFICATE-----\n…"   // MITM root CA
  },
  "agent": {
    "online": true,          // turingtap-agent daemon reachable
    "lan_cidrs": ["10.0.0.0/8", "192.168.0.0/16"],  // hosts reachable via the reverse tunnel
    "lan": {
      "allowed": true,       // tier includes the LAN tunnel (Pro and above)
      "enabled": false       // per-user opt-in — OFF by default
    }
  }
}
```

If `agent.online` is `false`, `goto`/`act`/`ask_human` will fail — tell the
user to start `turingtap-agent` on their machine.

If `agent.lan.allowed` or `agent.lan.enabled` is `false`, requests to LAN /
private hosts (RFC1918, `.local`, `localhost`) are refused: "LAN tunnel
requires Pro and must be enabled in Settings". Tell the user to upgrade to
Pro (if `allowed` is false) and/or flip the LAN tunnel toggle at
`turingtap.ai/account#settings` (if `enabled` is false). Public-internet
targets are unaffected.

---

### `get_traffic(cursor?, host?)`

Read decrypted HTTP exchanges from the proxy's in-memory ring buffer.
Exchanges are returned **raw and unfiltered** — see **Credential hygiene**.

| Param    | Type    | Default | Notes |
|----------|---------|---------|-------|
| `cursor` | string  | —       | Opaque; pass `next_cursor` from the previous call to get only new exchanges. Omit for the full buffer. |
| `host`   | string  | —       | Filter to a single hostname (`api.example.com`). |

**Returns:**

```jsonc
{
  "exchanges": [
    {
      "id": "ex_001",
      "ts": "2026-07-03T22:14:08Z",
      "request": {
        "method": "POST",
        "url": "https://api.example.com/v2/login",
        "headers": { "authorization": "Bearer eyJhbGciOi…", … },
        "body": "{\"password\":\"hunter2\",…}"
      },
      "response": {
        "status": 200,
        "headers": { "set-cookie": "sessionid=8f2ab…; HttpOnly", … },
        "body": "…"
      },
      "timing_ms": 142
    }
  ],
  "next_cursor": "cur_9a1…",
  "human_active": false             // true while an ask_human handoff is in progress
}
```

There is no redaction option: what transited the wire is what you get,
credentials included. Scope your reads (`host` filter, incremental `cursor`)
to pull the minimum you need, and prefer `analyze` when structural
information suffices.

---

### `analyze(host?)`

Server-side summary of the traffic buffer — inferred endpoint list. Cheaper
than pulling every exchange into your context, and returns **no raw values**
(path templates, statuses, and schema key names only).

| Param  | Type   | Default | Notes |
|--------|--------|---------|-------|
| `host` | string | —       | Restrict analysis to one hostname. Omit for all hosts seen this session. |

**Returns:**

```jsonc
{
  "endpoints": [
    { "method": "POST", "path_tmpl": "/v2/login",           "statuses": [200, 401], "req_schema": {…}, "resp_schema": {…} },
    { "method": "GET",  "path_tmpl": "/v2/classes/{id}",    "statuses": [200],      … }
  ]
}
```

---

### `goto(url)` *(Personal tier and above)*

Navigate the agent's Chromium instance.

| Param | Type   | Notes |
|-------|--------|-------|
| `url` | string | Absolute URL. RFC1918 / `.local` / `localhost` hosts are reachable only if inside `agent.lan_cidrs` **and** `agent.lan.allowed && agent.lan.enabled` (Pro+, off-by-default Settings toggle). |

**Returns:**

```jsonc
{ "current_url": "https://example.com/login", "title": "Sign in", "screenshot_b64": "iVBORw0…" }
```

On the Free tier this returns an upsell error — fall back to `ask_human` and
let the user drive.

---

### `act(action, selector, value?)` *(Personal tier and above)*

Interact with the current page in the agent's Chromium instance.

| Param      | Type   | Notes |
|------------|--------|-------|
| `action`   | enum   | `"click"` \| `"fill"` \| `"press"` |
| `selector` | string | CSS selector for `click`/`fill`; key name (e.g. `"Enter"`) for `press`. |
| `value`    | string | Required for `fill`; ignored otherwise. |

**Returns:**

```jsonc
{ "ok": true, "screenshot_b64": "iVBORw0…" }
```

---

### `ask_human(prompt, open_url?)`

Hand the browser to the user. **Non-blocking** — returns immediately with a
`handoff_id`. The agent's Chromium flips to headed mode with a banner showing
`prompt`; the user's phone gets a push and can drive the same browser via a
live screencast.

| Param      | Type   | Notes |
|------------|--------|-------|
| `prompt`   | string | One sentence telling the user exactly what to do. Be specific: *"Enter the 6-digit code from your authenticator app, then press Done."* |
| `open_url` | string | Optional. Navigate the shared browser here before handing off. |

**Returns:**

```jsonc
{ "handoff_id": "ho_4c7…" }
```

While the handoff is live, poll `get_traffic(cursor=…)` — `human_active`
stays `true` and you'll see the exchanges the user's actions generate in real
time. The handoff ends when the user taps **Done** on their phone *or* you
call `dismiss_human`.

Free tier: **2 handoffs/month**. Don't burn one on something you could solve
with `act`.

---

### `dismiss_human(handoff_id, message?)`

End a handoff you started.

| Param        | Type   | Notes |
|--------------|--------|-------|
| `handoff_id` | string | From `ask_human`. |
| `message`    | string | Optional thank-you shown on the phone and desktop banner for ~3 s. |

**Returns:** `{ "ok": true }`

Call this as soon as `get_traffic` shows you have what you needed (e.g. the
`Set-Cookie` landed) — don't make the user guess when they're finished.

---

### `notify(title, body)`

Push a plain notification to the user's phone. No browser, no screencast, no
handoff quota consumed. Use for progress updates or a final summary.

| Param   | Type   |
|---------|--------|
| `title` | string |
| `body`  | string |

**Returns:** `{ "ok": true }`

---

## Worked pattern 1 — mid-flow handoff

**Goal:** the user asks you to "figure out how my gym's booking API works and
book me into tomorrow's 6 pm class." You can drive the browser, but login is
behind SMS 2FA.

```text
1.  session_info()
      → agent.online = true ✔

2.  goto("https://gym.example.com/login")
3.  act("fill",  "#email",    "<user gave you this>")
4.  act("fill",  "#password", "<user gave you this>")
5.  act("click", "button[type=submit]")

6.  get_traffic(host="gym.example.com")
      → response 302 → /mfa, no session cookie yet. Wall.

7.  ask_human(
      prompt   = "Enter the 6-digit SMS code, then tap Done.",
      open_url = "https://gym.example.com/mfa"
    ) → { handoff_id: "ho_4c7" }

8.  loop:
      get_traffic(cursor=<prev>, host="gym.example.com")
        → human_active = true, keep polling …
        → exchange: POST /mfa/verify → 200, Set-Cookie: sessionid=…
      break — you have the authenticated session (the cookie is in the shared
      browser's jar; do NOT repeat its value into the chat).

9.  dismiss_human("ho_4c7", "Got it — booking your class now.")

10. goto("https://gym.example.com/schedule")
11. act("click", "[data-class-id='…'][data-time='18:00']")

12. get_traffic(cursor=<prev>)
      → POST /api/v2/classes/{id}/book → 201

13. analyze("gym.example.com")
      → endpoints[]

14. notify("Booked", "6 pm class confirmed.")

15. Tell the user (in chat):
      - what you found (endpoint list)
      - a rotate reminder — see Credential hygiene
```

---

## Worked pattern 2 — freeform demo ("show me, then I'll analyze")

**Goal:** the user says "watch me use my company's internal admin tool and
write me API docs for it." You don't drive at all — the human demonstrates,
you observe.

```text
1.  session_info()
      → agent.online = true, lan_cidrs includes 10.0.0.0/8,
        agent.lan = { allowed: true, enabled: true } ✔
        (if lan.enabled were false: ask the user to flip the LAN tunnel
         toggle at turingtap.ai/account#settings before proceeding)

2.  ask_human(
      prompt   = "Click through every screen you want documented, then tap Done.",
      open_url = "http://admin.corp.internal/"
    ) → { handoff_id: "ho_9e2" }

3.  loop:
      get_traffic(cursor=<prev>)
        → human_active = true, exchanges accumulating …
        → human_active = false            // user tapped Done
      break

    (Alternatively: if you can see from the traffic that every screen has
     been covered, call dismiss_human("ho_9e2", "That's everything I need —
     thanks.") yourself instead of waiting.)

4.  analyze("admin.corp.internal")
      → endpoints[]

5.  Produce the API docs from `endpoints` + representative exchanges,
    with any credential values elided from what you write.

6.  Remind the user to rotate any credentials they consider sensitive that
    transited the session — the traffic passed through you and therefore
    through your model provider's servers.
```

---

## Credential hygiene — **read this before calling `get_traffic`**

Decrypted traffic frequently contains live credentials: session cookies,
bearer tokens, API keys, passwords in login POST bodies. `get_traffic`
returns them **raw** — TuringTap performs no redaction (a partial redactor
invites false confidence, so none is promised). Anything returned by a tool
call enters **your context window** and is transmitted to **your model
provider** (Anthropic, OpenAI, Google, etc.), where it may be logged or
retained per that provider's policy. TuringTap itself purges the buffer at
session close, but it cannot purge your provider's logs.

**Rules for the agent:**

1. **Never echo credential values into the chat.** Refer to a credential by
   host and kind ("the session cookie for `gym.example.com`", "the bearer
   token in the `Authorization` header"), never by value. Pasting it into
   the conversation doubles the exposure surface for zero benefit. The same
   applies to anything you author from traffic (docs, code samples, bug
   reports): elide the values.

2. **Pull the minimum traffic you need.** Use the `host` filter and
   incremental `cursor` paging; prefer `analyze()` (endpoint shapes only, no
   raw values) whenever structural information answers the question. The
   shared browser already holds the real cookie/token — you don't need the
   literal value to keep driving with `goto`/`act`.

3. **Always close with a rotate reminder.** At the end of any session where
   traffic that could contain credentials transited (logins, authenticated
   API calls, session cookies), tell the user, in plain language:
   - that the session's traffic — including any credentials in it — passed
     through their AI provider and may persist in that provider's logs,
   - that they should rotate any credentials they consider sensitive once
     they're finished with the task.

   Example closing message:

   > Done. This session's traffic — including your `gym.example.com` login
   > and session cookie — passed through me and therefore through
   > <provider>'s servers. When you're finished, rotate the password and log
   > out other sessions at `gym.example.com/account/security`.

4. **Don't store, cache, or write credentials anywhere.** No temp files, no
   "let me save this token for later." The value's lifetime is the tool-call
   response and no longer.

---

## Quick reference

| Tool            | Tier        | Blocking? | Touches browser? | Counts against quota      |
|-----------------|-------------|-----------|------------------|---------------------------|
| `session_info`  | Free+       | —         | no               | —                         |
| `get_traffic`   | Free+       | —         | no               | buffer MB (tier-capped)   |
| `analyze`       | Free+       | —         | no               | —                         |
| `goto`          | Personal+   | yes       | yes              | proxy GB                  |
| `act`           | Personal+   | yes       | yes              | proxy GB                  |
| `ask_human`     | Free+       | **no**    | yes              | handoffs/mo (Free: 2)     |
| `dismiss_human` | Free+       | —         | yes              | —                         |
| `notify`        | Free+       | —         | no               | —                         |

`goto`, `act`, and `ask_human` share **one** Chromium instance and cookie jar
for the lifetime of the MCP session.
