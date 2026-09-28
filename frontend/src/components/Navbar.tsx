"use client";

import React from "react";
import { ShieldCheck, Wallet, ExternalLink, Activity } from "lucide-react";
import { MST_TESTNET_CONFIG } from "@/lib/mst";

interface NavbarProps {
  account: string | null;
  onConnect: () => void;
  activeTab: "patient" | "provider" | "audit";
  setActiveTab: (tab: "patient" | "provider" | "audit") => void;
}

export function Navbar({ account, onConnect, activeTab, setActiveTab }: NavbarProps) {
  const shortAddress = account
    ? `${account.slice(0, 6)}...${account.slice(-4)}`
    : null;

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-md shadow-indigo-100">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg text-slate-900 tracking-tight">
                MediConsent
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                MST Testnet
              </span>
            </div>
            <p className="text-xs text-slate-500 hidden sm:block">
              Patient Access Governance & Audit Protocol
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab("patient")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === "patient"
                ? "bg-white text-indigo-700 shadow-sm font-semibold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Patient Dashboard
          </button>
          <button
            onClick={() => setActiveTab("provider")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === "provider"
                ? "bg-white text-indigo-700 shadow-sm font-semibold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Provider Portal
          </button>
          <button
            onClick={() => setActiveTab("audit")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
              activeTab === "audit"
                ? "bg-white text-indigo-700 shadow-sm font-semibold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            Audit Timeline
          </button>
        </nav>

        {/* Wallet Connect (BridgeKey) */}
        <div className="flex items-center gap-3">
          <a
            href={MST_TESTNET_CONFIG.blockExplorerUrls[0]}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden md:inline-flex items-center gap-1 text-xs text-slate-500 hover:text-indigo-600 transition"
          >
            <span>mstscan.com</span>
            <ExternalLink className="w-3 h-3" />
          </a>

          {account ? (
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-mono text-xs font-medium text-slate-700">
                {shortAddress}
              </span>
            </div>
          ) : (
            <button
              onClick={onConnect}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition shadow-sm hover:shadow"
            >
              <Wallet className="w-4 h-4" />
              <span>Connect BridgeKey</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
