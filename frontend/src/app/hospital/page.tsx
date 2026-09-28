"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@/context/WalletContext";
import { getMedicalConsentContract, MST_TESTNET_CONFIG } from "@/lib/mst";
import {
  Building2,
  KeyRound,
  FileCheck2,
  Sparkles,
  AlertTriangle,
  Clock,
  ShieldAlert,
  Loader2,
  CheckCircle,
  FileDown,
  ExternalLink,
  ShieldX,
  LogOut,
  Send,
  Eye,
} from "lucide-react";

export default function HospitalDashboard() {
  const router = useRouter();
  const {
    account,
    signer,
    role,
    isAuthenticated,
    isInitialized,
    logout,
  } = useWallet();

  const [recordId, setRecordId] = useState("");
  const [purpose, setPurpose] = useState("Cardiology Inpatient Clinical Review");
  const [durationHours, setDurationHours] = useState("24");

  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [decryptedData, setDecryptedData] = useState<string | null>(null);
  const [aiSummary, setAiSummary] = useState<any | null>(null);
  const [accessDeniedNotice, setAccessDeniedNotice] = useState<string | null>(null);

  // Route protection
  useEffect(() => {
    if (isInitialized && (!isAuthenticated || role !== "hospital")) {
      router.push("/login/hospital");
    }
  }, [isInitialized, isAuthenticated, role, router]);

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!account || !signer) {
      setError("Please ensure your hospital node wallet is connected.");
      return;
    }
    setLoading(true);
    setError(null);
    setNotice(null);
    setAccessDeniedNotice(null);

    try {
      const cleanId = recordId.trim().replace(/\.enc$/i, "");
      const contract = getMedicalConsentContract(signer);
      const durationSeconds = Number(durationHours) * 3600;

      const tx = await contract.requestAccess(cleanId, purpose, durationSeconds);
      setNotice(`Confirmed on MST! Request sent to patient. Tx: ${tx.hash.slice(0, 10)}...`);
      await tx.wait();
    } catch (err: any) {
      setError(err.message || "Failed to request access on MST Blockchain.");
    } finally {
      setLoading(false);
    }
  };

  const handleDecrypt = async () => {
    if (!account || !signer || !recordId) return;
    setActionLoading("decrypt");
    setError(null);
    setAccessDeniedNotice(null);

    try {
      const cleanId = recordId.trim().replace(/\.enc$/i, "");

      // Check on-chain access
      const contract = getMedicalConsentContract(signer);
      const hasAccess = await contract.hasAccess(cleanId, account);

      if (!hasAccess) {
        setAccessDeniedNotice(
          "🛑 403 Access Denied: The patient has not granted consent for this record yet (or the time-decay duration has expired). Patient must grant consent from their Patient Portal."
        );
        setDecryptedData(null);
        return;
      }

      // Backend decryption with on-chain verification
      const res = await fetch(`/api/records/${cleanId}/access`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ providerAddress: account }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setDecryptedData(atob(data.dataBase64));
      setNotice("Access verified on MST Blockchain! Report successfully decrypted.");

      // Audit log on-chain
      await contract.logAccess(cleanId);
    } catch (err: any) {
      setError(err.message || "Decryption failed.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleAISummary = async () => {
    if (!account || !recordId) return;
    setActionLoading("ai");
    setError(null);

    try {
      const cleanId = recordId.trim().replace(/\.enc$/i, "");
      const res = await fetch(`/api/records/${cleanId}/summary`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ providerAddress: account }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setAiSummary(data.summary);
    } catch (err: any) {
      setError(err.message || "AI summary blocked. Active on-chain consent is required.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  if (!isInitialized || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <div className="flex items-center gap-3 text-sm text-slate-400">
          <Loader2 className="w-5 h-5 animate-spin text-cyan-400" />
          <span>Verifying hospital institutional session...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-white">
      {/* Header */}
      <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-600 text-white flex items-center justify-center font-bold shadow-md shadow-cyan-600/20">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-base text-white">
                Hospital / Healthcare Provider Terminal
              </span>
              <span className="ml-2 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800">
                Hospital Node
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Connected Account Pill */}
            {account && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 rounded-xl text-xs font-mono text-cyan-300 border border-slate-700">
                <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                <span>
                  Dr. {account.slice(0, 6)}...{account.slice(-4)}
                </span>
              </div>
            )}

            {/* Logout Button */}
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

      {/* Notifications */}
      {notice && (
        <div className="bg-emerald-600 text-white text-xs px-4 py-2 text-center font-medium shadow-sm flex items-center justify-center gap-2">
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span>{notice}</span>
        </div>
      )}
      {error && (
        <div className="bg-rose-600 text-white text-xs px-4 py-2 text-center font-medium shadow-sm flex items-center justify-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-4 py-8 w-full flex-1 space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* STEP 1: REQUEST PATIENT CONSENT */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-cyan-400 mb-2">
                <Send className="w-5 h-5" />
                <h2 className="text-base font-bold text-white">
                  Step 1: Request Patient Consent
                </h2>
              </div>
              <p className="text-xs text-slate-400 mb-6 leading-relaxed">
                Submit an on-chain access request specifying your clinical purpose and requested validity window.
              </p>

              <form onSubmit={handleRequest} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Patient Record ID (e.g. 0x167e...)
                  </label>
                  <input
                    type="text"
                    value={recordId}
                    onChange={(e) => setRecordId(e.target.value)}
                    placeholder="Enter Record ID from patient..."
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
                    required
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Genesis Demo Record ID:{" "}
                    <button
                      type="button"
                      onClick={() =>
                        setRecordId(
                          "0x167ec4c6ae92e1069818b2c453b3dfa32ba0b3ecde441d017a5996bdfdb8a939"
                        )
                      }
                      className="text-cyan-400 hover:underline font-mono"
                    >
                      0x167e...a939
                    </button>
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Clinical Purpose
                  </label>
                  <input
                    type="text"
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Requested Duration (Hours)
                  </label>
                  <select
                    value={durationHours}
                    onChange={(e) => setDurationHours(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="1">1 Hour (Stat Consult)</option>
                    <option value="6">6 Hours (Emergency Review)</option>
                    <option value="24">24 Hours (Inpatient Ward)</option>
                    <option value="72">72 Hours (Specialist Referral)</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-4 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-md shadow-cyan-600/20"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Submitting to MST Blockchain...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Send Request to Patient</span>
                    </>
                  )}
                </button>
              </form>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800/80 text-[11px] text-slate-500 flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              <span>Consent enforces time-decay expiry automatically on MST Testnet.</span>
            </div>
          </div>

          {/* STEP 2: VERIFY CONSENT & DECRYPT */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-cyan-400 mb-2">
                <KeyRound className="w-5 h-5" />
                <h2 className="text-base font-bold text-white">
                  Step 2: Verify Consent &amp; Decrypt
                </h2>
              </div>
              <p className="text-xs text-slate-400 mb-6 leading-relaxed">
                Smart contract verifies real-time patient consent before releasing the decryption key and generating AI insights.
              </p>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 mb-6">
                <button
                  onClick={handleDecrypt}
                  disabled={actionLoading === "decrypt" || !recordId}
                  className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20"
                >
                  {actionLoading === "decrypt" ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Verifying on MST...</span>
                    </>
                  ) : (
                    <>
                      <FileCheck2 className="w-4 h-4" />
                      <span>Verify Consent &amp; Decrypt</span>
                    </>
                  )}
                </button>

                <button
                  onClick={handleAISummary}
                  disabled={actionLoading === "ai" || !recordId}
                  className="py-3 px-4 bg-violet-600 hover:bg-violet-500 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-md shadow-violet-600/20"
                >
                  {actionLoading === "ai" ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                  <span>AI Brief</span>
                </button>
              </div>

              {/* 403 Access Denied Notice */}
              {accessDeniedNotice && (
                <div className="p-4 bg-rose-950/60 border border-rose-800/80 rounded-2xl text-rose-300 text-xs flex items-start gap-3 mb-4">
                  <ShieldX className="w-5 h-5 mt-0.5 text-rose-400 shrink-0" />
                  <div className="space-y-1">
                    <p className="font-bold text-rose-200">Consent Gated Access Control</p>
                    <p className="leading-relaxed text-[11px]">{accessDeniedNotice}</p>
                  </div>
                </div>
              )}

              {/* Decrypted Clinical File Display */}
              {decryptedData && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                      <FileCheck2 className="w-4 h-4" />
                      <span>Decrypted Clinical Data (Plaintext)</span>
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      Logged to MST Testnet
                    </span>
                  </div>
                  <pre className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-[11px] font-mono text-emerald-300 whitespace-pre-wrap max-h-48 overflow-y-auto">
                    {decryptedData}
                  </pre>
                </div>
              )}

              {/* AI Clinical Brief Display */}
              {aiSummary && (
                <div className="mt-4 p-4 bg-violet-950/40 border border-violet-800/50 rounded-2xl space-y-2">
                  <div className="flex items-center gap-2 text-violet-300 text-xs font-bold">
                    <Sparkles className="w-4 h-4 text-violet-400" />
                    <span>AI Clinical Intelligence Summary</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {aiSummary.summary || JSON.stringify(aiSummary)}
                  </p>
                </div>
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800/80 text-[11px] text-slate-500 flex items-center gap-2">
              <Eye className="w-3.5 h-3.5 text-cyan-400" />
              <span>Decryption events trigger immutable on-chain access logs.</span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 py-4 text-center text-xs text-slate-600">
        MediChain &bull; Hospital &amp; Healthcare Provider Terminal &bull; MST Testnet ({MST_TESTNET_CONFIG.chainIdDecimal})
      </footer>
    </div>
  );
}
