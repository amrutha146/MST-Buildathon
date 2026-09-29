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
  Loader2,
  CheckCircle,
  ShieldX,
  LogOut,
  Send,
  Eye,
} from "lucide-react";

export default function HospitalDashboard() {
  const router = useRouter();
  const {
    account,
    displayName,
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

  const [availableRecords, setAvailableRecords] = useState<any[]>([]);

  // Load available patient records on mount
  useEffect(() => {
    async function loadRecords() {
      try {
        const res = await fetch("/api/records/list");
        if (res.ok) {
          const data = await res.json();
          if (data.records && data.records.length > 0) {
            setAvailableRecords(data.records);
            setRecordId((prev) => (prev ? prev : data.records[0].recordId));
          }
        }
      } catch (e) {
        console.warn("Failed to load records list:", e);
      }
    }
    loadRecords();
  }, []);

  // Route protection
  useEffect(() => {
    if (isInitialized && (!isAuthenticated || role !== "hospital")) {
      router.push("/login/hospital");
    }
  }, [isInitialized, isAuthenticated, role, router]);

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!account || !signer) {
      setError("Hospital terminal session expired. Please log in again.");
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
          "🛑 403 Access Denied: The patient has not granted consent for this record yet (or the time-decay duration has expired). Please switch to the Patient Portal to approve this pending request."
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

      const rawText = await res.text();
      let data: any = {};
      try {
        data = JSON.parse(rawText);
      } catch {
        throw new Error(rawText || `Server returned error (${res.status})`);
      }

      if (!res.ok) throw new Error(data.error || "Decryption failed.");

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

      const rawText = await res.text();
      let data: any = {};
      try {
        data = JSON.parse(rawText);
      } catch {
        throw new Error(rawText || `Server returned error (${res.status})`);
      }

      if (!res.ok) throw new Error(data.error || "AI summary blocked.");

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
      <div className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center">
        <div className="flex items-center gap-3 text-sm text-slate-500">
          <Loader2 className="w-5 h-5 animate-spin text-cyan-600" />
          <span>Verifying hospital institutional session...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-cyan-600 selection:text-white">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-600 text-white flex items-center justify-center font-bold shadow-md shadow-cyan-600/20">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-base text-slate-900">
                Hospital / Healthcare Provider Terminal
              </span>
              <span className="ml-2 text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-cyan-50 text-cyan-700 border border-cyan-200">
                Hospital Node
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Connected Account Pill */}
            {displayName ? (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-cyan-50 rounded-xl text-xs font-semibold text-cyan-950 border border-cyan-200">
                <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
                <span>{displayName}</span>
              </div>
            ) : account ? (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-cyan-50 rounded-xl text-xs font-mono text-cyan-900 border border-cyan-200 font-semibold">
                <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
                <span>
                  Dr. {account.slice(0, 6)}...{account.slice(-4)}
                </span>
              </div>
            ) : null}

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="text-xs text-slate-600 hover:text-rose-600 font-semibold flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-rose-50 border border-slate-200 transition"
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
        <div className="bg-emerald-600 text-white text-xs px-4 py-2.5 text-center font-medium shadow-sm flex items-center justify-center gap-2">
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span>{notice}</span>
        </div>
      )}
      {error && (
        <div className="bg-rose-600 text-white text-xs px-4 py-2.5 text-center font-medium shadow-sm flex items-center justify-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-4 py-8 w-full flex-1 space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* STEP 1: REQUEST PATIENT CONSENT */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-cyan-700 mb-2">
                <Send className="w-5 h-5" />
                <h2 className="text-base font-bold text-slate-900">
                  Step 1: Request Patient Consent
                </h2>
              </div>
              <p className="text-xs text-slate-500 mb-6 leading-relaxed">
                Submit an on-chain access request specifying your clinical purpose and requested validity window.
              </p>

              <form onSubmit={handleRequest} className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-700">
                      Patient Record ID (e.g. 0x167e...)
                    </label>
                    {availableRecords.length > 0 && (
                      <span className="text-[11px] text-cyan-700 font-semibold">
                        {availableRecords.length} records available on MST
                      </span>
                    )}
                  </div>

                  {availableRecords.length > 0 && (
                    <select
                      value={recordId}
                      onChange={(e) => setRecordId(e.target.value)}
                      className="w-full mb-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-cyan-500 font-medium"
                    >
                      <option value="">-- Quick Select from Available Patient Vaults --</option>
                      {availableRecords.map((rec) => (
                        <option key={rec.recordId} value={rec.recordId}>
                          {rec.title} ({rec.recordId.slice(0, 10)}...{rec.recordId.slice(-6)})
                        </option>
                      ))}
                    </select>
                  )}

                  <input
                    type="text"
                    value={recordId}
                    onChange={(e) => setRecordId(e.target.value)}
                    placeholder="Enter Record ID from patient..."
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-cyan-500 focus:bg-white font-mono"
                    required
                  />

                  {/* Quick Pill Selection for recent records */}
                  {availableRecords.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {availableRecords.slice(0, 3).map((rec) => (
                        <button
                          key={rec.recordId}
                          type="button"
                          onClick={() => setRecordId(rec.recordId)}
                          className={`text-[10px] px-2 py-1 rounded-lg border font-mono transition ${
                            recordId === rec.recordId
                              ? "bg-cyan-50 border-cyan-400 text-cyan-800 font-bold"
                              : "bg-white border-slate-200 text-slate-600 hover:border-cyan-300"
                          }`}
                          title={rec.title}
                        >
                          {rec.title.length > 20 ? rec.title.slice(0, 20) + "..." : rec.title}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Clinical Purpose
                  </label>
                  <input
                    type="text"
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-cyan-500 focus:bg-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Requested Duration (Hours)
                  </label>
                  <select
                    value={durationHours}
                    onChange={(e) => setDurationHours(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-cyan-500 focus:bg-white font-medium"
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
                  className="w-full py-3 px-4 bg-cyan-600 hover:bg-cyan-700 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-md shadow-cyan-600/20"
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

            <div className="mt-6 pt-4 border-t border-slate-100 text-[11px] text-slate-500 flex items-center gap-2 font-medium">
              <Clock className="w-3.5 h-3.5 text-cyan-600" />
              <span>Consent enforces time-decay expiry automatically on MST Testnet.</span>
            </div>
          </div>

          {/* STEP 2: VERIFY CONSENT & DECRYPT */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-cyan-700 mb-2">
                <KeyRound className="w-5 h-5" />
                <h2 className="text-base font-bold text-slate-900">
                  Step 2: Verify Consent &amp; Decrypt
                </h2>
              </div>
              <p className="text-xs text-slate-500 mb-6 leading-relaxed">
                Smart contract verifies real-time patient consent before releasing the decryption key and generating AI insights.
              </p>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 mb-6">
                <button
                  onClick={handleDecrypt}
                  disabled={actionLoading === "decrypt" || !recordId}
                  className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20"
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
                  className="py-3 px-4 bg-violet-600 hover:bg-violet-700 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-md shadow-violet-600/20"
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
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs flex items-start gap-3 mb-4">
                  <ShieldX className="w-5 h-5 mt-0.5 text-rose-600 shrink-0" />
                  <div className="space-y-1">
                    <p className="font-bold text-rose-900">Consent Gated Access Control</p>
                    <p className="leading-relaxed text-[11px] text-rose-700">{accessDeniedNotice}</p>
                  </div>
                </div>
              )}

              {/* Decrypted Clinical File Display */}
              {decryptedData && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-600">
                    <span className="font-bold text-emerald-700 flex items-center gap-1.5">
                      <FileCheck2 className="w-4 h-4" />
                      <span>Decrypted Clinical Data (Plaintext)</span>
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      Logged to MST Testnet
                    </span>
                  </div>
                  <pre className="p-4 bg-slate-900 rounded-2xl border border-slate-800 text-[11px] font-mono text-emerald-300 whitespace-pre-wrap max-h-48 overflow-y-auto shadow-inner">
                    {decryptedData}
                  </pre>
                </div>
              )}

              {/* AI Clinical Brief Display */}
              {aiSummary && (
                <div className="mt-4 p-4 bg-violet-50 border border-violet-200 rounded-2xl space-y-2">
                  <div className="flex items-center gap-2 text-violet-800 text-xs font-bold">
                    <Sparkles className="w-4 h-4 text-violet-600" />
                    <span>AI Clinical Intelligence Summary</span>
                  </div>
                  <p className="text-xs text-violet-900 leading-relaxed">
                    {aiSummary.summary || JSON.stringify(aiSummary)}
                  </p>
                </div>
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 text-[11px] text-slate-500 flex items-center gap-2 font-medium">
              <Eye className="w-3.5 h-3.5 text-cyan-600" />
              <span>Decryption events trigger immutable on-chain access logs.</span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500">
        MediChain &bull; Hospital &amp; Healthcare Provider Terminal &bull; MST Testnet ({MST_TESTNET_CONFIG.chainIdDecimal})
      </footer>
    </div>
  );
}
