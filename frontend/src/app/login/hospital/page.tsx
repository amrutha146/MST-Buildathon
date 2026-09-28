"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useWallet } from "@/context/WalletContext";
import {
  ShieldCheck,
  Building2,
  Wallet,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Lock,
} from "lucide-react";

export default function HospitalLoginPage() {
  const router = useRouter();
  const {
    account,
    role,
    isAuthenticated,
    isConnecting,
    error,
    connectWallet,
    clearError,
  } = useWallet();

  const [isSuccess, setIsSuccess] = useState(false);

  // If already authenticated as hospital, mark success
  useEffect(() => {
    if (isAuthenticated && role === "hospital" && account) {
      setIsSuccess(true);
    }
  }, [isAuthenticated, role, account]);

  const handleConnect = async () => {
    clearError();
    const success = await connectWallet("hospital");
    if (success) {
      setIsSuccess(true);
    }
  };

  const handleContinue = () => {
    router.push("/hospital");
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between font-sans selection:bg-cyan-500 selection:text-white">
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
            <ShieldCheck className="w-5 h-5 text-cyan-400" />
            <span className="font-bold text-sm tracking-tight text-white">
              MEDICHAIN
            </span>
          </div>
        </div>
      </header>

      {/* Main Login Card */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900/90 border border-slate-800 rounded-3xl p-8 shadow-2xl shadow-cyan-950/40 backdrop-blur-xl">
          {/* Role Header */}
          <div className="text-center mb-8">
            <div className="w-14 h-14 bg-cyan-600/20 text-cyan-400 border border-cyan-500/30 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-cyan-600/10">
              <Building2 className="w-7 h-7" />
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">
              Hospital Login
            </h1>
            <p className="mt-2 text-xs text-slate-400 leading-relaxed">
              Connect your authorized institutional BridgeKey provider node to request patient consent and decrypt authorized clinical records.
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-3.5 bg-rose-950/60 border border-rose-800/60 rounded-xl text-rose-300 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Connection Status & Action */}
          <div className="space-y-4">
            {isSuccess && account ? (
              <div className="space-y-4">
                <div className="p-4 bg-cyan-950/40 border border-cyan-800/60 rounded-2xl flex items-center gap-3">
                  <CheckCircle2 className="w-6 h-6 text-cyan-400 shrink-0" />
                  <div className="text-left overflow-hidden">
                    <p className="text-xs font-semibold text-cyan-300">
                      Hospital Node Authenticated
                    </p>
                    <p className="text-[11px] font-mono text-slate-300 truncate">
                      {account}
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleContinue}
                  className="w-full py-3.5 px-4 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl text-xs transition shadow-lg shadow-cyan-600/25 flex items-center justify-center gap-2 group"
                >
                  <span>Continue to Hospital Dashboard</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <button
                  onClick={handleConnect}
                  disabled={isConnecting}
                  className="w-full py-3.5 px-4 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold rounded-xl text-xs transition shadow-lg shadow-cyan-600/25 flex items-center justify-center gap-2"
                >
                  {isConnecting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Connecting to BridgeKey...</span>
                    </>
                  ) : (
                    <>
                      <Wallet className="w-4 h-4" />
                      <span>Connect BridgeKey</span>
                    </>
                  )}
                </button>

                <div className="flex items-center justify-center gap-2 text-[11px] text-slate-500 pt-2">
                  <Lock className="w-3.5 h-3.5 text-slate-500" />
                  <span>On-chain provider authorization validated against smart contract.</span>
                </div>
              </div>
            )}
          </div>

          {/* Security & Protocol Notice */}
          <div className="mt-8 pt-6 border-t border-slate-800/80 text-center">
            <p className="text-[11px] text-slate-500">
              MST Blockchain Network &bull; Chain ID 91562037
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-slate-600">
        MediChain &bull; Hospital &amp; Healthcare Provider Terminal
      </footer>
    </div>
  );
}
