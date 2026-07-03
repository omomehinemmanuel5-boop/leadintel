import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "leadintel — compliant executive outreach pipeline",
  description:
    "A production-shaped, keyless pipeline for finding and verifying B2B executive contacts across AU, DE, US and CA, with consent and suppression gates built in.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
