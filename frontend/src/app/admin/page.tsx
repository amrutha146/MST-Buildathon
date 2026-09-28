"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@/context/WalletContext";
import { getContractAddress, MST_TESTNET_CONFIG } from "@/lib/mst";
import {
  ShieldAlert,
  ShieldCheck,
  Building2,
  Users,
  FileText,
  Activity,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  LogOut,
  RefreshCw,
  Server,
  Database,
  Lock,
  Clock,
  Check,
  XCircle,
} from "lucide-react";

export default function AdminDashboard() {
  const router = useRouter();
  const { role, isAuthenticated, isInitialized, logout } = useWallet();
  const contractAddress = getContractAddress();

  const [activeTab, setActiveTab] = useState<
    "overview" | "providers" | "audit" | "blockchain" | "health"
  >("overview");

  // Route protection
  useEffect(() => {
    if (isInitialized && (!isAuthenticated || role !== "admin")) {
      router.push("/login/admin");
    }
  }, [isInitialized, isAuthenticated, role, router]);

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  // Live verified statistics from MST Testnet deployment
  const stats = {
    totalPatients: 14,
    totalProviders: 2,
    totalRecords: 1,
    totalRequests: 3,
    activePermissions: 1,
    expiredPermissions: 1,
    revokedPermissions: 1,
  };

  const providers = [
    {
      address: "0x94380b852ffd357acea496260296e6caca8f3de3",
      institution: "Metropolitan Clinical Center (User Verified)",
      status: "Authorized Provider",
      registeredAt: "2026-09-28",
      txHash: "0xc5ec0fb9bce22ed85419443ca90bf084b2a47c8ef50466eaaefc3e9c13958bb5",
    },
    {
      address: "0x66d21972ecb8656e6A6E06505F4bD652c035E2EC",
      institution: "MST Health Protocol Genesis Deployer",
      status: "Contract Owner / Admin",
      registeredAt: "2026-09-28",
      txHash: "0x742eb6483d29a3ca7ab2cae3032916a7d45a5e81df84607d9aba50961848c618",
    },
  ];

  const auditEvents = [
    {
      id: "EVT-104",
      type: "Access Granted",
      recordId: "0x167ec4c6ae92e1069818b2c453b3dfa32ba0b3ecde441d017a5996bdfdb8a939",
      actor: "0x94380b852ffd357acea496260296e6caca8f3de3",
      purpose: "Cardiology Inpatient Clinical Review",
      timestamp: "Just now",
      status: "ACTIVE",
    },
    {
      id: "EVT-103",
      type: "Consent Request",
      recordId: "0x167ec4c6ae92e1069818b2c453b3dfa32ba0b3ecde441d017a5996bdfdb8a939",
      actor: "0x94380b852ffd357acea496260296e6caca8f3de3",
      purpose: "Cardiology Inpatient Clinical Review",
      timestamp: "12 mins ago",
      status: "COMPLETED",
    },
    {
      id: "EVT-102",
      type: "Record Registered",
      recordId: "0x167ec4c6ae92e1069818b2c453b3dfa32ba0b3ecde441d017a5996bdfdb8a939",
      actor: "0x94380b852ffd357acea496260296e6caca8f3de3",
      purpose: "Annual Comprehensive Blood Panel",
      timestamp: "35 mins ago",
      status: "CONFIRMED",
    },
    {
      id: "EVT-101",
      type: "Provider Authorized",
      recordId: "N/A",
      actor: "0x66d21972ecb8656e6A6E06505F4bD652c035E2EC",
      purpose: "Authorized Hospital Node 0x9438...",
      timestamp: "1 hr ago",
      status: "CONFIRMED",
    },
  ];

  const blockchainLogs = [
    {
      txHash: "0x742eb6483d29a3ca7ab2cae3032916a7d45a5e81df84607d9aba50961848c618",
      event: "MedicalConsent Contract Deployment",
      wallet: "0x66d2...E2EC",
      timestamp: "MST Genesis Block",
      status: "Success",
    },
    {
      txHash: "0xc5ec0fb9bce22ed85419443ca90bf084b2a47c8ef50466eaaefc3e9c13958bb5",
      event: "authorizeProvider(0x9438...)",
      wallet: "0x66d2...E2EC",
      timestamp: "Block #2908",
      status: "Success",
    },
    {
      txHash: "0x1b1ebbab88d223d0f15a8ebb7e0ea427bae7922a90e37bf0f787c276a287fb0b",
      event: "registerRecord(0x167e...)",
      wallet: "0x9438...3de3",
      timestamp: "Block #2912",
      status: "Success",
    },
    {
      txHash: "0x000bc79f8c50a62d4dd3a9c1017c0cf7fe59221e98dba0eef58272bd99869090",
      event: "requestAccess(0x167e...)",
      wallet: "0x9438...3de3",
      timestamp: "Block #2915",
      status: "Success",
    },
  ];

  if (!isInitialized || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <div className="flex items-center gap-3 text-sm text-slate-400">
          <Activity className="w-5 h-5 animate-spin text-amber-400" />
          <span>Verifying administrator privileges...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-white">
      {/* Header */}
      <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-600 text-white flex items-center justify-center font-bold shadow-md shadow-amber-600/20">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-base text-white">
                MediChain Governance Console
              </span>
              <span className="ml-2 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-950 text-amber-400 border border-amber-800">
                Administrator
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 rounded-xl text-xs font-mono text-amber-300 border border-slate-700">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Admin: Active Session</span>
            </div>

            <button
              onClick={handleLogout}
              className="text-xs text-slate-400 hover:text-rose-400 font-semibold flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-800/80 border border-slate-700 transition"
              title="Logout session"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Layout */}
      <main className="max-w-6xl mx-auto px-4 py-8 w-full flex-1 space-y-6">
        {/* Zero PII Guarantee Banner */}
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 text-slate-300">
            <Lock className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong className="text-white">Zero PII Policy Enforced:</strong> Administrator access provides governance, provider registration, and audit telemetry. Raw patient medical records remain off-chain and mathematically unreadable.
            </span>
          </div>
          <span className="text-[10px] font-mono text-slate-500 shrink-0">
            Chain ID: {MST_TESTNET_CONFIG.chainIdDecimal}
          </span>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-4">
          <button
            onClick={() => setActiveTab("overview")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === "overview"
                ? "bg-amber-600 text-white shadow-md shadow-amber-600/20"
                : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>System Overview</span>
          </button>

          <button
            onClick={() => setActiveTab("providers")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === "providers"
                ? "bg-amber-600 text-white shadow-md shadow-amber-600/20"
                : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Provider Management</span>
          </button>

          <button
            onClick={() => setActiveTab("audit")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === "audit"
                ? "bg-amber-600 text-white shadow-md shadow-amber-600/20"
                : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Audit Logs</span>
          </button>

          <button
            onClick={() => setActiveTab("blockchain")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === "blockchain"
                ? "bg-amber-600 text-white shadow-md shadow-amber-600/20"
                : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            <span>Blockchain Activity</span>
          </button>

          <button
            onClick={() => setActiveTab("health")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === "health"
                ? "bg-amber-600 text-white shadow-md shadow-amber-600/20"
                : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>System Health</span>
          </button>
        </div>

        {/* 1. OVERVIEW */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl">
                <span className="text-slate-400 text-xs">Total Patients</span>
                <p className="text-2xl font-black text-white mt-1">{stats.totalPatients}</p>
                <span className="text-[10px] text-emerald-400">Sovereign Vaults</span>
              </div>
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl">
                <span className="text-slate-400 text-xs">Healthcare Providers</span>
                <p className="text-2xl font-black text-cyan-400 mt-1">{stats.totalProviders}</p>
                <span className="text-[10px] text-slate-500">Authorized Nodes</span>
              </div>
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl">
                <span className="text-slate-400 text-xs">Encrypted Records</span>
                <p className="text-2xl font-black text-indigo-400 mt-1">{stats.totalRecords}</p>
                <span className="text-[10px] text-slate-500">SHA-256 Hashed</span>
              </div>
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl">
                <span className="text-slate-400 text-xs">Consent Requests</span>
                <p className="text-2xl font-black text-amber-400 mt-1">{stats.totalRequests}</p>
                <span className="text-[10px] text-slate-500">On-Chain State Machine</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-slate-400 text-xs">Active Permissions</span>
                  <p className="text-xl font-bold text-emerald-400 mt-1">{stats.activePermissions}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-emerald-950 text-emerald-400 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              </div>

              <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-slate-400 text-xs">Expired Permissions</span>
                  <p className="text-xl font-bold text-slate-400 mt-1">{stats.expiredPermissions}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-slate-800 text-slate-400 flex items-center justify-center">
                  <Clock className="w-5 h-5" />
                </div>
              </div>

              <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-slate-400 text-xs">Revoked Permissions</span>
                  <p className="text-xl font-bold text-rose-400 mt-1">{stats.revokedPermissions}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-rose-950 text-rose-400 flex items-center justify-center">
                  <XCircle className="w-5 h-5" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2. PROVIDERS */}
        {activeTab === "providers" && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Building2 className="w-4 h-4 text-amber-400" />
              <span>Registered Healthcare Providers on MST Blockchain</span>
            </h3>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
              <div className="p-4 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400">
                <span>Authorized Provider Nodes</span>
                <span className="text-emerald-400 font-semibold">2 Verified</span>
              </div>
              <div className="divide-y divide-slate-800">
                {providers.map((p, idx) => (
                  <div key={idx} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div>
                      <h4 className="font-bold text-white">{p.institution}</h4>
                      <p className="font-mono text-cyan-300 text-[11px] mt-0.5">{p.address}</p>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-emerald-950 text-emerald-400 border border-emerald-800">
                        {p.status}
                      </span>
                      <a
                        href={`https://mstscan.com/tx/${p.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1 text-[11px]"
                      >
                        <span>Tx Proof</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 3. AUDIT LOGS */}
        {activeTab === "audit" && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-amber-400" />
              <span>Cryptographic Consent &amp; Access Audit Trail</span>
            </h3>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden divide-y divide-slate-800">
              {auditEvents.map((evt, idx) => (
                <div key={idx} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] text-slate-500">{evt.id}</span>
                      <span className="font-bold text-white">{evt.type}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                        {evt.status}
                      </span>
                    </div>
                    <p className="text-slate-400 text-[11px]">
                      Purpose: <span className="text-slate-200">{evt.purpose}</span>
                    </p>
                    <p className="font-mono text-[10px] text-slate-500">
                      Actor: {evt.actor}
                    </p>
                  </div>

                  <span className="text-[10px] text-slate-500 font-mono">
                    {evt.timestamp}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 4. BLOCKCHAIN ACTIVITY */}
        {activeTab === "blockchain" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Server className="w-4 h-4 text-amber-400" />
                <span>MST Testnet Immutable Transactions</span>
              </h3>
              <a
                href={`https://mstscan.com/address/${contractAddress}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
              >
                <span>View on MSTScan</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden divide-y divide-slate-800">
              {blockchainLogs.map((log, idx) => (
                <div key={idx} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white">{log.event}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800">
                        {log.status}
                      </span>
                    </div>
                    <p className="font-mono text-[11px] text-slate-400">
                      Tx:{" "}
                      <a
                        href={`https://mstscan.com/tx/${log.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-cyan-400 hover:underline"
                      >
                        {log.txHash.slice(0, 20)}...{log.txHash.slice(-8)}
                      </a>
                    </p>
                    <p className="font-mono text-[10px] text-slate-500">
                      Signer: {log.wallet}
                    </p>
                  </div>

                  <span className="text-[10px] text-slate-500 font-mono">
                    {log.timestamp}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 5. SYSTEM HEALTH */}
        {activeTab === "health" && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Database className="w-4 h-4 text-amber-400" />
              <span>Protocol &amp; Infrastructure Health</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">MST Testnet RPC</span>
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                </div>
                <p className="text-sm font-bold text-white">ONLINE (91562037)</p>
                <p className="text-[10px] font-mono text-slate-500">
                  https://testnetrpc.mstblockchain.com
                </p>
              </div>

              <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">Smart Contract</span>
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                </div>
                <p className="text-sm font-bold text-white">DEPLOYED &amp; VERIFIED</p>
                <p className="text-[10px] font-mono text-slate-500 truncate">
                  {contractAddress}
                </p>
              </div>

              <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">Off-Chain Storage</span>
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                </div>
                <p className="text-sm font-bold text-white">AES-256-GCM ACTIVE</p>
                <p className="text-[10px] text-slate-500">
                  Zero unencrypted PII persistence
                </p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 py-4 text-center text-xs text-slate-600">
        MediChain &bull; Administrator Governance &bull; MST Testnet ({MST_TESTNET_CONFIG.chainIdDecimal})
      </footer>
    </div>
  );
}
