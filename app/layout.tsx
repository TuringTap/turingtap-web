import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";
import { Nav } from "@/components/Nav";
import { Analytics } from "@/lib/analytics";

export const metadata: Metadata = {
  title: "TuringTap",
  description:
    "MCP server giving AI agents a live MITM view of HTTP(S) traffic + human-in-the-loop handoff.",
  metadataBase: new URL("https://turingtap.ai"),
  icons: {
    icon: [
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "TuringTap",
    description:
      "Put your AI agent on the wire. Live HTTP(S) visibility + human handoff for 2FA and captchas.",
    url: "https://turingtap.ai",
    siteName: "TuringTap",
    images: [{ url: "/og.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "TuringTap",
    description:
      "Put your AI agent on the wire. Live HTTP(S) visibility + human handoff.",
    images: ["/og.png"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Analytics />
        <AuthProvider>
          <Nav />
          <main className="mx-auto max-w-6xl px-6 py-10">{children}</main>
          <footer className="mx-auto max-w-6xl px-6 py-10 text-xs text-slate-500">
            © {new Date().getFullYear()} TuringTap · turingtap.ai ·{" "}
            <a href="/legal/tos" className="hover:underline">
              Terms
            </a>{" "}
            ·{" "}
            <a href="/legal/privacy" className="hover:underline">
              Privacy
            </a>
          </footer>
        </AuthProvider>
      </body>
    </html>
  );
}
