import type { Metadata } from "next";
import "./globals.css";
import { Header, BottomNav } from "@/src/components";

export const metadata: Metadata = {
  title: "AI Organizer - Organize Your Tasks with AI",
  description: "Turn your errands into organized tasks using AI. Plan smarter, organize faster.",
  metadataBase: new URL("http://localhost:3000"),
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "http://localhost:3000",
    siteName: "AI Organizer",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark h-full antialiased scroll-smooth">
      <body className="min-h-screen flex flex-col bg-slate-950 text-white">
        <Header />
        <main className="flex-1 pt-16 pb-20 md:pb-0">{children}</main>
        <BottomNav />
      </body>
    </html>
  );
}
