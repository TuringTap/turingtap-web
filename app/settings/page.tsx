"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SettingsRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/account#settings");
  }, [router]);
  return <p className="text-sm text-slate-500">Redirecting…</p>;
}
