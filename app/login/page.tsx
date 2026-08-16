"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import type { SignInResult } from "@/lib/firebase";
import { track } from "@/lib/analytics";

export default function LoginPage() {
  const router = useRouter();
  const { user, sendSignInLink, signInWithGoogle, signInWithApple } = useAuth();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (user) router.replace("/account");
  }, [user, router]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    track("sign_in_start", { method: "email" });
    try {
      await sendSignInLink(email.trim());
      setSent(true);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function oauth(
    method: "google" | "apple",
    fn: () => Promise<SignInResult>,
  ) {
    setErr(null);
    setBusy(true);
    track("sign_in_start", { method });
    try {
      const { isNewUser } = await fn();
      router.replace(isNewUser ? "/account?welcome=1" : "/account");
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-sm">
      <h1 className="text-3xl font-bold">Sign in or create your account</h1>
      <p className="mt-2 text-sm text-slate-600">
        New here? Same form — we&apos;ll create your account on first sign-in.
      </p>

      {sent ? (
        <div className="mt-8 rounded-lg border border-slate-200 bg-slate-50 p-6 text-center">
          <p className="font-medium">Check your email</p>
          <p className="mt-2 text-sm text-slate-600">
            Click the link we sent to <strong>{email}</strong> to finish. First
            time? That link creates your account.
          </p>
          <button
            onClick={() => setSent(false)}
            className="mt-4 text-xs text-slate-500 underline"
          >
            Use a different email
          </button>
        </div>
      ) : (
        <>
          <form onSubmit={onSubmit} className="mt-8 space-y-3">
            <input
              type="email"
              required
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded border border-slate-300 px-3 py-2 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            />
            <button
              type="submit"
              disabled={busy || !email}
              className="w-full rounded bg-brand px-3 py-2 font-medium text-white hover:bg-brand-dark disabled:opacity-50"
            >
              {busy ? "Sending…" : "Continue with email"}
            </button>
          </form>

          <div className="my-6 flex items-center gap-3 text-xs text-slate-400">
            <div className="h-px flex-1 bg-slate-200" />
            <span>or continue with</span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          <div className="space-y-2">
            <button
              onClick={() => oauth("google", signInWithGoogle)}
              disabled={busy}
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
            >
              Continue with Google
            </button>
            <button
              onClick={() => oauth("apple", signInWithApple)}
              disabled={busy}
              className="w-full rounded border border-slate-300 bg-black px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
            >
              Continue with Apple
            </button>
          </div>
        </>
      )}

      {err && (
        <div className="mt-6 rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-900">
          {err}
        </div>
      )}

      <p className="mt-8 text-center text-xs text-slate-500">
        By continuing you agree to the{" "}
        <Link href="/legal/tos" className="underline">
          Terms of Service
        </Link>{" "}
        and{" "}
        <Link href="/legal/privacy" className="underline">
          Privacy Policy
        </Link>
        .
      </p>
    </div>
  );
}
