import Link from "next/link";
import { PricingTable } from "@/components/PricingTable";

export default function Home() {
  return (
    <div className="space-y-20">
      <section className="flex items-start gap-8 pt-8">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/hero-icon.png"
          alt="TuringTap"
          width={148}
          height={148}
          className="mt-1 hidden shrink-0 rounded-3xl shadow-xl shadow-slate-400/40 md:block"
        />
        <div>
        <h1 className="text-5xl font-bold tracking-tight">
          Put your AI agent on the wire.
        </h1>
        <p className="mt-5 max-w-2xl text-lg text-slate-600">
          TuringTap is an MCP server that lets AI agents watch and drive live
          HTTP(S) traffic to test any API, and hand off to your phone or any
          browser the instant they hit a login, 2FA, a captcha, or anything
          else that needs a human tap.
        </p>
        {/* Cred-handling / retention claims live in TOS §Credential Handling,
            not marketing copy. */}
        <div className="mt-8 flex gap-3">
          <Link
            href="/login"
            className="rounded bg-brand px-5 py-2.5 font-medium text-white hover:bg-brand-dark"
          >
            Get started free
          </Link>
          <Link
            href="/docs"
            className="rounded border border-slate-300 px-5 py-2.5 font-medium hover:bg-slate-50"
          >
            Read the docs
          </Link>
        </div>
        </div>
      </section>


      <section>
        <h2 className="text-2xl font-semibold">How it works</h2>
        <ol className="mt-4 grid gap-6 md:grid-cols-3">
          <li className="rounded-lg border border-slate-200 p-5">
            <div className="text-sm font-medium text-brand">1 · Connect</div>
            <p className="mt-2 text-sm text-slate-600">
              Grab an API key and add TuringTap to your AI client — one
              command. Install the{" "}
              <Link href="/download" className="text-brand hover:underline">
                desktop agent
              </Link>{" "}
              so your AI gets a real browser to drive (and LAN reach, on Pro).
            </p>
          </li>
          <li className="rounded-lg border border-slate-200 p-5">
            <div className="text-sm font-medium text-brand">2 · Prompt</div>
            <p className="mt-2 text-sm text-slate-600">
              Ask your AI to test, explore, or document any API. It drives the
              browser through our proxy and reads every decrypted request and
              response live off the wire.
            </p>
          </li>
          <li className="rounded-lg border border-slate-200 p-5">
            <div className="text-sm font-medium text-brand">3 · Solve when asked</div>
            <p className="mt-2 text-sm text-slate-600">
              When it hits 2FA, a captcha, or a login, your AI hands you the
              live session — on your phone or in any browser tab. You drive
              for a moment; it takes the same session back, cookies and all.
            </p>
          </li>
        </ol>
      </section>


      <section>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-lg border border-slate-200 p-5">
            <h3 className="font-semibold">Step away from the keyboard</h3>
            <p className="mt-2 text-sm text-slate-600">
              Scripted browsers stall the moment they need a human at the
              desk. With TuringTap your agent keeps working wherever it runs —
              and when it genuinely needs you, the live session comes to your
              phone. Ten seconds of your thumbs, and it&apos;s moving again.
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 p-5">
            <h3 className="font-semibold">Trust, but verify</h3>
            <p className="mt-2 text-sm text-slate-600">
              Session traffic lives in RAM and is gone when you disconnect —
              it never touches a disk, log, or database. And you don&apos;t
              have to take our word for it: every service and the Terraform
              behind it is published on{" "}
              <a
                href="https://github.com/turingtap"
                target="_blank"
                rel="noreferrer"
                className="font-medium text-brand hover:underline"
              >
                GitHub
              </a>
              , retention audit included. Verify the claims in the code that
              runs, not in this page.
            </p>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-semibold">Pricing</h2>
        <p className="mt-2 max-w-3xl text-slate-600">
          Less time and money than rolling your own.
        </p>
        <div className="mb-8" />
        <PricingTable />
      </section>
    </div>
  );
}
