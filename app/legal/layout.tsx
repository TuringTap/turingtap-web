import type { ReactNode } from "react";

export default function LegalLayout({ children }: { children: ReactNode }) {
  return <article className="mx-auto max-w-3xl">{children}</article>;
}
