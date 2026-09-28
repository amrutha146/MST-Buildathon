"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useWallet } from "@/context/WalletContext";
import {
  ShieldCheck,
  UserCheck,
  Wallet,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Lock,
} from "lucide-react";

export default function PatientLoginPage() {
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

  useEffect(() => {
    if (isAuthenticated && role === "patient" && account) {
      setIsSuccess(true);
    }
  }, [isAuthenticated, role, account]);

  const handleConnect = async () => {
    clearError();
    const success = await connectWallet("patient");
    if (success) {
      setIsSuccess(true);
    }
  };

  const handleContinue = () => {
    router.push("/patient");
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between font-sans selection:bg-indigo-600 selection:text-white">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-md px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Role Selection</span>
          </Link>

          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-indigo-600" />
            <span className="font-extrabold text-sm tracking-tight text-slate-900">
              MEDICHAIN
            </span>
          </div>
        </div>
      </header>

      {/* Main Login Card */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-3xl p-8 shadow-xl shadow-slate-200/60 backdrop-blur-xl">
          {/* Role Header */}
          <div className="text-center mb-8">
            <div className="w-14 h-14 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
              <UserCheck className="w-7 h-7" />
            </div>
            <h1 className="text-2xl font-black text-slate-950 tracking-tight">
              Patient Login
            </h1>
            <p className="mt-2 text-xs text-slate-500 leading-relaxed">
              Connect your BridgeKey sovereign wallet to securely access and govern your encrypted health records on MST Blockchain.
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Connection Status & Action */}
          <div className="space-y-4">
            {isSuccess && account ? (
              <div className="space-y-4">
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                  <div className="text-left overflow-hidden">
                    <p className="text-xs font-semibold text-emerald-800">
                      BridgeKey Wallet Authenticated
                    </p>
                    <p className="text-[11px] font-mono text-emerald-900 font-medium truncate">
                      {account}
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleContinue}
                  className="w-full py-3.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 group"
                >
                  <span>Continue to Patient Vault</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <button
                  onClick={handleConnect}
                  disabled={isConnecting}
                  className="w-full py-3.5 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold rounded-xl text-xs transition shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2"
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
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                  <span>No passwords stored. Cryptographic wallet authentication.</span>
                </div>
              </div>
            )}
          </div>

          {/* Security & Protocol Notice */}
          <div className="mt-8 pt-6 border-t border-slate-100 text-center">
            <p className="text-[11px] text-slate-500 font-medium">
              MST Blockchain Network &bull; Chain ID 91562037
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-slate-500">
        MediChain &bull; Patient Sovereign Portal
      </footer>
    </div>
  );
}
