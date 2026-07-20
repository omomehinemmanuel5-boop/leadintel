import type { Metadata, Viewport } from "next";
import "./globals.css";
import AppShell from "@/components/AppShell";
import { ToastProvider } from "@/components/toast";

export const metadata: Metadata = {
  title: "LeadIntel — AI-first B2B intelligence",
  description:
    "Company discovery, research, and consent-safe contact enrichment across AU, DE, US and CA — built entirely on public data sources.",
  applicationName: "LeadIntel",
  // Single-operator tool behind Basic Auth — nothing here should ever be indexed.
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#05070a",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">
        <ToastProvider>
          <AppShell>{children}</AppShell>
        </ToastProvider>
      </body>
    </html>
  );
}
