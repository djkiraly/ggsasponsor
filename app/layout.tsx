import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

async function getSiteSettings() {
  try {
    const { requireDb } = await import("@/lib/db");
    const { settings } = await import("@/db/schema");
    const db = requireDb();
    const rows = await db.select().from(settings);
    const map: Record<string, string> = {};
    for (const row of rows) map[row.key] = row.value;
    return map;
  } catch {
    return {};
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSiteSettings();
  return {
    title: s.site_title || "Gering Girls Softball Association",
    description: s.site_description || "GGSA Sponsorship Portal",
    icons: s.favicon_url ? { icon: s.favicon_url } : undefined,
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
