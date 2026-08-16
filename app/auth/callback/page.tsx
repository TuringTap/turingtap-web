"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { completeSignInLink } from "@/lib/firebase";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const res = await completeSignInLink();
        if (cancel) return;
        if (res) {
          router.replace(res.isNewUser ? "/account?welcome=1" : "/account");
        } else {
          setErr("This link is invalid or has expired.");
        }
      } catch (e) {
        if (!cancel) setErr(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => {
      cancel = true;
    };
  }, [router]);

  if (err) {
    return (
      <div className="mx-auto max-w-sm text-center">
        <h1 className="text-2xl font-bold">Sign-in failed</h1>
        <p className="mt-3 text-sm text-slate-600">{err}</p>
        <Link
          href="/login"
          className="mt-6 inline-block rounded bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark"
        >
          Try again
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-sm text-center">
      <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-brand" />
      <p className="mt-4 text-sm text-slate-600">Signing you in…</p>
    </div>
  );
}
