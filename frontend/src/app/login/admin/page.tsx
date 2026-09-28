"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useWallet } from "@/context/WalletContext";
import {
  ShieldAlert,
  ShieldCheck,
  KeyRound,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  Info,
  CheckCircle2,
} from "lucide-react";

export default function AdminLoginPage() {
  const router = useRouter();
  const { role, isAuthenticated, loginAdmin, error, clearError } = useWallet();

  const [passkey, setPasskey] = useState("MEDICHAIN-ADMIN-2026");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (isAuthenticated && role === "admin") {
      setSuccess(true);
    }
  }, [isAuthenticated, role]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setLoading(true);
    const ok = await loginAdmin(passkey);
    setLoading(false);
    if (ok) {
      setSuccess(true);
      router.push("/admin");
    }
  };

  const handleContinue = () => {
    router.push("/admin");
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between font-sans selection:bg-amber-500 selection:text-white">
      {/* Header */}
      <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs text-slate-400 hover:text-white transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Role Selection</span>
          </Link>

          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-amber-400" />
            <span className="font-bold text-sm tracking-tight text-white">
              MEDICHAIN
            </span>
          </div>
        </div>
      </header>

      {/* Main Login Card */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900/90 border border-slate-800 rounded-3xl p-8 shadow-2xl shadow-amber-950/30 backdrop-blur-xl">
          {/* Role Header */}
          <div className="text-center mb-8">
            <div className="w-14 h-14 bg-amber-600/20 text-amber-400 border border-amber-500/30 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-amber-600/10">
              <ShieldAlert className="w-7 h-7" />
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">
              Administrator Login
            </h1>
            <p className="mt-2 text-xs text-slate-400 leading-relaxed">
              Governance &amp; protocol monitoring console. Manage authorized healthcare providers and inspect immutable on-chain audit logs.
            </p>
          </div>

          {/* Hackathon Demo Notice */}
          <div className="mb-6 p-3 bg-amber-950/40 border border-amber-800/50 rounded-xl text-amber-300 text-xs flex items-start gap-2.5">
            <Info className="w-4 h-4 mt-0.5 shrink-0 text-amber-400" />
            <div className="text-[11px] leading-relaxed">
              <span className="font-bold">Hackathon Demo Mode:</span> This demo authentication provides administrative visibility for evaluation purposes. In production, this is gated by multi-signature threshold cryptography (Gnosis Safe / Timelock).
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-3.5 bg-rose-950/60 border border-rose-800/60 rounded-xl text-rose-300 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success ? (
            <div className="space-y-4">
              <div className="p-4 bg-emerald-950/40 border border-emerald-800/60 rounded-2xl flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
                <div className="text-left">
                  <p className="text-xs font-semibold text-emerald-300">
                    Administrator Session Active
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Governance privileges confirmed.
                  </p>
                </div>
              </div>

              <button
                onClick={handleContinue}
                className="w-full py-3.5 px-4 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl text-xs transition shadow-lg shadow-amber-600/25 flex items-center justify-center gap-2 group"
              >
                <span>Continue to Admin Console</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Admin Passkey (Demo)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={passkey}
                    onChange={(e) => setPasskey(e.target.value)}
                    placeholder="Enter passkey..."
                    className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition font-mono"
                    required
                  />
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  Default Demo Key: <code className="text-amber-400 font-mono">MEDICHAIN-ADMIN-2026</code>
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-4 bg-amber-600 hover:bg-amber-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold rounded-xl text-xs transition shadow-lg shadow-amber-600/25 flex items-center justify-center gap-2"
              >
                <span>Authenticate Administrator</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* Privacy & Protocol Guarantee */}
          <div className="mt-8 pt-6 border-t border-slate-800/80 text-center">
            <p className="text-[11px] text-slate-500">
              Zero-PII Access Policy: Admin cannot read patient medical files.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-slate-600">
        MediChain &bull; Protocol Governance Console
      </footer>
    </div>
  );
}
