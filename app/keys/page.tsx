"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function KeysRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/account#keys");
  }, [router]);
  return <p className="text-sm text-slate-500">Redirecting…</p>;
}
