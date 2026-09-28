import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "HealthConsent - MST Blockchain Medical Access & Audit Layer",
  description: "Patient-controlled consent and tamper-evident audit layer on MST Blockchain",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen">{children}</body>
    </html>
  );
}
