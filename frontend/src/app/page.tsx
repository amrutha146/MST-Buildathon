"use client";

import React from "react";
import Link from "next/link";
import {
  ShieldCheck,
  UserCheck,
  Building2,
  ShieldAlert,
  ArrowRight,
  Lock,
  Cpu,
  FileCheck2,
  Activity,
  ExternalLink,
  Sparkles,
} from "lucide-react";
import { getContractAddress, MST_TESTNET_CONFIG } from "@/lib/mst";

export default function LandingPage() {
  const contractAddress = getContractAddress();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-indigo-600 selection:text-white">
      {/* Background Subtle Gradient Blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-200/40 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-1/3 -right-40 w-96 h-96 bg-cyan-200/35 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-violet-200/35 rounded-full blur-3xl" />
      </div>

      {/* Top Navbar */}
      <header className="relative z-10 border-b border-slate-200 bg-white/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center text-white shadow-md shadow-indigo-600/20">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <span className="font-extrabold text-xl tracking-tight text-slate-900">
                MEDICHAIN
              </span>
              <span className="ml-2.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/80">
                MST Blockchain
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <a
              href={`https://mstscan.com/address/${contractAddress}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-slate-600 hover:text-indigo-600 font-mono flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 shadow-sm transition hover:shadow"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>
                Contract: {contractAddress.slice(0, 6)}...{contractAddress.slice(-4)}
              </span>
              <ExternalLink className="w-3 h-3 text-slate-400" />
            </a>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-16 text-center max-w-5xl mx-auto">
        {/* Track Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-slate-200 text-xs font-semibold text-slate-700 mb-6 shadow-sm">
          <span className="w-2 h-2 rounded-full bg-cyan-500 animate-ping" />
          <span>MST Buildathon 2026 &bull; AI &amp; Web3 Builders Track</span>
        </div>

        {/* Main Heading */}
        <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-slate-950 max-w-3xl leading-tight">
          Decentralized Patient Consent &amp;{" "}
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 via-cyan-600 to-teal-500">
            Audit Layer
          </span>
        </h1>

        {/* Required Tagline */}
        <p className="mt-5 text-base sm:text-lg text-slate-600 max-w-2xl font-normal leading-relaxed">
          Patient-controlled medical records with blockchain-based consent and auditable access.
        </p>

        {/* Cryptographic Guarantees Pill Bar */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3 text-xs text-slate-600">
          <div className="flex items-center gap-1.5 px-3.5 py-1.5 bg-white rounded-full border border-slate-200 shadow-sm">
            <Lock className="w-3.5 h-3.5 text-indigo-600" />
            <span className="font-medium">Off-Chain AES-256-GCM Encryption</span>
          </div>
          <div className="flex items-center gap-1.5 px-3.5 py-1.5 bg-white rounded-full border border-slate-200 shadow-sm">
            <FileCheck2 className="w-3.5 h-3.5 text-cyan-600" />
            <span className="font-medium">SHA-256 Integrity Hashes</span>
          </div>
          <div className="flex items-center gap-1.5 px-3.5 py-1.5 bg-white rounded-full border border-slate-200 shadow-sm">
            <Cpu className="w-3.5 h-3.5 text-emerald-600" />
            <span className="font-medium">Time-Decay Expiry State Machine</span>
          </div>
        </div>

        {/* EVALUATOR & JUDGE QUICK WALKTHROUGH */}
        <div className="w-full mt-10 p-6 bg-white border border-indigo-100 rounded-3xl shadow-lg shadow-indigo-100/40 text-left">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-5 h-5 text-indigo-600 shrink-0" />
            <h2 className="text-base font-bold text-slate-900">
              Evaluator &amp; Judge Navigation Guide (Self-Paced Demo in 90 Seconds)
            </h2>
          </div>
          <p className="text-xs text-slate-600 mb-5 leading-relaxed">
            Follow this 3-step sequence to verify genuine MST Testnet smart contract consent, encryption, and audit trail:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-indigo-50/70 border border-indigo-100 rounded-2xl flex flex-col justify-between">
              <div>
                <div className="text-xs font-bold text-indigo-900 mb-1 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px]">1</span>
                  <span>Patient Sovereign Vault</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed mb-3">
                  Click <strong>Patient Login</strong> (auto-fills Rahul Sharma). View encrypted health records or upload a new record with real-time SHA-256 integrity hash on MST Blockchain.
                </p>
              </div>
              <Link
                href="/login/patient"
                className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 hover:underline inline-flex items-center gap-1"
              >
                <span>Launch Patient Vault &rarr;</span>
              </Link>
            </div>

            <div className="p-4 bg-cyan-50/70 border border-cyan-100 rounded-2xl flex flex-col justify-between">
              <div>
                <div className="text-xs font-bold text-cyan-950 mb-1 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-cyan-600 text-white flex items-center justify-center text-[10px]">2</span>
                  <span>Hospital Clinical Terminal</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed mb-3">
                  Click <strong>Hospital Login</strong>. Select any patient record from the dropdown. Request consent, or instantly decrypt plaintext &amp; AI insights once consent is verified on-chain.
                </p>
              </div>
              <Link
                href="/login/hospital"
                className="text-[11px] font-bold text-cyan-700 hover:text-cyan-900 hover:underline inline-flex items-center gap-1"
              >
                <span>Launch Hospital Terminal &rarr;</span>
              </Link>
            </div>

            <div className="p-4 bg-amber-50/70 border border-amber-100 rounded-2xl flex flex-col justify-between">
              <div>
                <div className="text-xs font-bold text-amber-950 mb-1 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-amber-600 text-white flex items-center justify-center text-[10px]">3</span>
                  <span>Governance &amp; Audit Trail</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed mb-3">
                  Click <strong>Admin Login</strong> (Passkey: <code className="bg-amber-100 px-1 py-0.5 rounded font-mono font-bold text-amber-900">MST2026</code>). Inspect live immutable smart contract event logs and authorized provider nodes.
                </p>
              </div>
              <Link
                href="/login/admin"
                className="text-[11px] font-bold text-amber-700 hover:text-amber-900 hover:underline inline-flex items-center gap-1"
              >
                <span>Launch Admin Dashboard &rarr;</span>
              </Link>
            </div>
          </div>
        </div>

        {/* 3 ROLE CARDS */}
        <div className="mt-12 w-full grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
          {/* Card 1: Patient */}
          <div className="relative group bg-white border border-slate-200/90 hover:border-indigo-500/50 rounded-3xl p-7 transition-all duration-300 shadow-sm hover:shadow-xl hover:shadow-indigo-500/10 flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center mb-5 group-hover:scale-105 transition shadow-sm">
                <UserCheck className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Patient</h3>
              <p className="text-xs text-slate-500 leading-relaxed mb-6">
                Manage your sovereign health vault. Encrypt records, authorize healthcare providers, grant time-bound access, or revoke permissions on MST blockchain.
              </p>
            </div>

            <Link
              href="/login/patient"
              className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-md shadow-indigo-600/20"
            >
              <span>Patient Login</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          {/* Card 2: Hospital / Healthcare Provider */}
          <div className="relative group bg-white border border-slate-200/90 hover:border-cyan-500/50 rounded-3xl p-7 transition-all duration-300 shadow-sm hover:shadow-xl hover:shadow-cyan-500/10 flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-cyan-50 text-cyan-600 border border-cyan-100 flex items-center justify-center mb-5 group-hover:scale-105 transition shadow-sm">
                <Building2 className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">
                Hospital / Healthcare Provider
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed mb-6">
                Clinical terminal for registered medical institutions. Request patient consent with specific clinical purpose, verify permission on-chain, and access AI briefs.
              </p>
            </div>

            <Link
              href="/login/hospital"
              className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-xs font-bold transition shadow-md shadow-cyan-600/20"
            >
              <span>Hospital Login</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          {/* Card 3: Administrator */}
          <div className="relative group bg-white border border-slate-200/90 hover:border-amber-500/50 rounded-3xl p-7 transition-all duration-300 shadow-sm hover:shadow-xl hover:shadow-amber-500/10 flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center mb-5 group-hover:scale-105 transition shadow-sm">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Administrator</h3>
              <p className="text-xs text-slate-500 leading-relaxed mb-6">
                Governance, provider authorization, and tamper-evident audit inspection. Zero access to patient medical data; strictly monitors protocol health and on-chain events.
              </p>
            </div>

            <Link
              href="/login/admin"
              className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition shadow-md shadow-amber-600/20"
            >
              <span>Administrator Login</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>

        {/* Live Network Details Footer Bar */}
        <div className="mt-16 w-full max-w-3xl bg-white border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-600 shadow-sm">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-500" />
            <span className="font-semibold text-slate-700">MST Testnet RPC:</span>
            <span className="font-mono text-slate-800 font-bold">
              https://testnetrpc.mstblockchain.com
            </span>
          </div>
          <div className="flex items-center gap-4">
            <div>
              Chain ID:{" "}
              <span className="font-mono text-indigo-600 font-bold">
                {MST_TESTNET_CONFIG.chainIdDecimal}
              </span>
            </div>
            <div>
              Explorer:{" "}
              <a
                href={MST_TESTNET_CONFIG.blockExplorerUrls[0]}
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-600 font-semibold hover:underline"
              >
                mstscan.com
              </a>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
        MediChain &bull; Patient Sovereign Consent Layer on MST Blockchain &bull; Built for MST Buildathon
      </footer>
    </div>
  );
}
