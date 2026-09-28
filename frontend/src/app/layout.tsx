import "./globals.css";
import type { Metadata } from "next";
import { WalletProvider } from "@/context/WalletContext";

export const metadata: Metadata = {
  title: "MediChain - MST Blockchain Medical Access & Audit Layer",
  description: "Patient-controlled medical records with blockchain-based consent and auditable access on MST Blockchain",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen bg-slate-900 text-slate-100">
        <WalletProvider>{children}</WalletProvider>
      </body>
    </html>
  );
}
