# turingtap-web

Marketing site + dashboard for [TuringTap](https://turingtap.ai) — the MCP
server that gives AI agents a live MITM view of HTTP traffic plus
human-in-the-loop mobile handoff.

Next.js 14 (App Router) · TypeScript · Tailwind · MDX · Firebase Auth.

## Pages

| Route | Purpose |
| --- | --- |
| `/` | Marketing, tool overview, pricing |
| `/download` | Agent installers + mobile store badges |
| `/dashboard` | Live sessions, agent status, QR pair, cred-rotate reminders |
| `/keys` | MCP API key management |
| `/billing` | Stripe Customer Portal + plan switch |
| `/settings` | Telemetry opt-out (paid tiers) |
| `/docs` | MDX docs — MCP setup, SKILL.md, own-browser proxy |
| `/docs/rotate` | Credential-hygiene explainer |

## Dev

```bash
cp .env.local.example .env.local   # fill in Firebase + API values
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Architecture notes

- **Auth**: client-side Firebase Auth only (`lib/firebase.ts`). ID tokens are
  attached as `Authorization: Bearer` to every call in `lib/api.ts`; the
  `api` Cloud Run service verifies them.
- **Stripe**: `lib/stripe.ts` is a thin stub — it asks the `api` service for
  a Customer Portal / Checkout URL and redirects. No secret key in this repo.
- **No server-side data fetching** against Firestore/Stripe here; all state
  comes from the `api` service so this app builds and runs offline with
  placeholder env.
- Deploy target: Firebase Hosting + Functions (config lives in
  `turingtap/infra/`, not this repo).
