"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "./AuthProvider";

function NavLink({
  href,
  label,
  active,
  onClick,
}: {
  href: string;
  label: string;
  active: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={
        active
          ? "font-medium text-brand"
          : "text-slate-600 hover:text-slate-900"
      }
    >
      {label}
    </Link>
  );
}

export function Nav() {
  const pathname = usePathname();
  const { user, loading } = useAuth();
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  const links = (
    <>
      <NavLink
        href="/docs"
        label="Docs"
        active={pathname.startsWith("/docs")}
        onClick={close}
      />
      <NavLink
        href="/download"
        label="Download"
        active={pathname.startsWith("/download")}
        onClick={close}
      />

      {loading ? (
        <span className="text-slate-400">…</span>
      ) : user ? (
        <Link
          href="/account"
          onClick={close}
          className="rounded bg-brand px-3 py-1.5 font-medium text-white hover:bg-brand-dark"
        >
          Account
        </Link>
      ) : (
        <>
          <Link
            href="/login"
            onClick={close}
            className="text-slate-600 hover:text-slate-900"
          >
            Sign in
          </Link>
          <Link
            href="/login"
            onClick={close}
            className="rounded bg-brand px-3 py-1.5 font-medium text-white hover:bg-brand-dark"
          >
            Get started
          </Link>
        </>
      )}
    </>
  );

  return (
    <header className="border-b border-slate-200">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="text-lg font-bold tracking-tight">
          TuringTap
        </Link>

        {/* Desktop */}
        <nav className="hidden items-center gap-5 text-sm sm:flex">{links}</nav>

        {/* Mobile toggle */}
        <button
          type="button"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen(!open)}
          className="flex h-9 w-9 items-center justify-center rounded text-slate-700 hover:bg-slate-100 sm:hidden"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            {open ? (
              <>
                <line x1="4" y1="4" x2="16" y2="16" />
                <line x1="16" y1="4" x2="4" y2="16" />
              </>
            ) : (
              <>
                <line x1="3" y1="5.5" x2="17" y2="5.5" />
                <line x1="3" y1="10" x2="17" y2="10" />
                <line x1="3" y1="14.5" x2="17" y2="14.5" />
              </>
            )}
          </svg>
        </button>
      </div>

      {/* Mobile panel */}
      {open && (
        <nav className="flex flex-col gap-4 border-t border-slate-200 px-6 py-4 text-sm sm:hidden">
          {links}
        </nav>
      )}
    </header>
  );
}
