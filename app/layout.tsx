import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Watershed | External Intelligence",
  description: "Evidence-led supply chain and opportunity intelligence for Watershed Foods.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
