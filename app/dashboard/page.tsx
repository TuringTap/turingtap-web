"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function DashboardRedirect() {
  const router = useRouter();
  useEffect(() => {
    // Preserve ?welcome=1 etc. Query must precede the fragment.
    router.replace("/account" + window.location.search + "#overview");
  }, [router]);
  return <p className="text-sm text-slate-500">Redirecting…</p>;
}
