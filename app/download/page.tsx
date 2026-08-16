import Link from "next/link";

const AGENT_RELEASES =
  "https://github.com/turingtap/turingtap-agent/releases/latest";
const MOBILE_RELEASES =
  "https://github.com/turingtap/turingtap-mobile/releases/latest";

export default function DownloadPage() {
  return (
    <div className="space-y-14">
      <header>
        <h1 className="text-3xl font-bold">Download</h1>
        <p className="mt-2 text-slate-600">
          Grab the mobile companion so handoffs reach you anywhere, and add
          the desktop agent when you want your AI driving a real browser.
          <strong> Observe-only needs no install at all</strong> — your AI can
          point any HTTP client at the proxy and read the wire; see{" "}
          <a href="/docs/mcp-setup" className="text-brand hover:underline">
            the no-install path
          </a>
          .
        </p>
      </header>

      {/* ───────── Mobile companion ───────── */}
      <section>
        <div className="flex items-baseline gap-3">
          <h2 className="text-xl font-semibold">Mobile companion</h2>
        </div>
        <p className="mt-1 text-sm text-slate-600">
          Receives <code>ask_human()</code> handoffs on your phone — solve a
          captcha or 2FA from wherever you are. After installing, open your{" "}
          <Link href="/account#overview" className="text-brand underline">
            account
          </Link>{" "}
          and scan the QR code to pair.
        </p>

        <div className="mt-5 grid gap-6 md:grid-cols-2">
          <div className="rounded-lg border border-slate-200 p-5">
            <div className="font-medium">Android</div>
            <a
              href="#"
              className="mt-3 inline-block rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
            >
              Get it on Google Play
            </a>
            <div className="mt-3 text-xs text-slate-500">
              or{" "}
              <a href={MOBILE_RELEASES} className="underline">
                sideload the APK
              </a>{" "}
              — enable &ldquo;Install unknown apps&rdquo; for your browser
              first.
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 p-5">
            <div className="font-medium">iOS</div>
            <a
              href="https://testflight.apple.com/join/QB5vvARj"
              className="mt-3 inline-block rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
            >
              Join the TestFlight beta
            </a>
            <div className="mt-3 text-xs text-slate-500">
              Public beta. App Store submission pending.
            </div>
          </div>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          No app handy? Handoffs are also solvable in any browser from your{" "}
          <Link href="/account#overview" className="underline">
            dashboard
          </Link>
          .
        </p>
      </section>

      {/* ───────── Desktop agent ───────── */}
      <section>
        <div className="flex items-baseline gap-3">
          <h2 className="text-xl font-semibold">Desktop agent</h2>
          <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[11px] font-medium uppercase tracking-wide text-slate-600">
            optional
          </span>
        </div>
        <p className="mt-1 text-sm text-slate-600">
          Needed for <code>goto()</code>/<code>act()</code> (your AI driving a
          real browser), screencast handoffs, and LAN targets (Pro) — it keeps
          every request originating from your machine. Runs as a system
          service with a tray icon; outbound connections only, no listening
          ports.
        </p>

        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <a
            href={AGENT_RELEASES}
            className="rounded-lg border border-slate-200 p-5 hover:border-slate-400"
          >
            <div className="font-medium">macOS</div>
            <div className="mt-1 text-xs text-slate-500">
              Apple Silicon &amp; Intel · <code>.pkg</code>
            </div>
          </a>
          <a
            href={AGENT_RELEASES}
            className="rounded-lg border border-slate-200 p-5 hover:border-slate-400"
          >
            <div className="font-medium">Windows</div>
            <div className="mt-1 text-xs text-slate-500">
              x64 · <code>.msi</code>
            </div>
          </a>
          <a
            href={AGENT_RELEASES}
            className="rounded-lg border border-slate-200 p-5 hover:border-slate-400"
          >
            <div className="font-medium">Linux</div>
            <div className="mt-1 text-xs text-slate-500">
              <code>.deb</code> · <code>.rpm</code>
            </div>
          </a>
        </div>

        <div className="mt-6">
          <div className="text-sm font-medium">Or install from a shell:</div>
          <pre className="mt-2 overflow-x-auto rounded-lg bg-slate-900 px-4 py-3 text-sm text-slate-100">
            <code>curl -fsSL https://turingtap.ai/install.sh | sh</code>
          </pre>
          <p className="mt-1 text-xs text-slate-500">
            Detects your OS and architecture, verifies the checksum, and
            installs the latest release.
          </p>
        </div>
      </section>

      <p className="text-xs text-slate-500">
        All binaries are built from the source at{" "}
        <a href="https://github.com/turingtap" className="underline">
          github.com/turingtap
        </a>{" "}
        by GitHub Actions; verify checksums on the release page.
      </p>
    </div>
  );
}
