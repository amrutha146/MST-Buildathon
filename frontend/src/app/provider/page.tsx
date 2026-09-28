"use client";

import React, { useState } from "react";
import { connectBridgeKey, getMedicalConsentContract } from "@/lib/mst";
import {
  Stethoscope,
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
} from "lucide-react";
import Link from "next/link";

export default function ProviderPage() {
  const [account, setAccount] = useState<string | null>(null);
  const [signer, setSigner] = useState<any | null>(null);
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

  const handleConnect = async () => {
    setError(null);
    try {
      const { address, signer: sig } = await connectBridgeKey();
      setAccount(address);
      setSigner(sig);
      setNotice(`Doctor Connected: ${address.slice(0, 6)}...${address.slice(-4)}`);
      setTimeout(() => setNotice(null), 5000);
    } catch (e: any) {
      setError(e.message || "Failed to connect wallet.");
    }
  };

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!account || !signer) {
      await handleConnect();
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
      setError(err.message || "Failed to request access.");
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
          "🛑 403 Access Denied: The patient has not approved this request yet (or the grant has expired). Check your Patient Portal tab!"
        );
        setDecryptedData(null);
        return;
      }

      // Backend decryption
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
      setError(err.message || "AI summary blocked. No active consent on MST.");
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
      {/* Header */}
      <header className="bg-slate-950 border-b border-slate-800 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-600 text-white flex items-center justify-center font-bold">
              <Stethoscope className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-base text-white">
                Healthcare Provider Terminal
              </span>
              <span className="ml-2 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800">
                Hospital Node
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/patient"
              target="_blank"
              className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1 bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700"
            >
              <span>Open Patient Vault in New Window</span>
              <ExternalLink className="w-3 h-3" />
            </Link>

            {account ? (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 rounded-xl text-xs font-mono text-cyan-300 border border-slate-700">
                <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                <span>Dr. {account.slice(0, 6)}...{account.slice(-4)}</span>
              </div>
            ) : (
              <button
                onClick={handleConnect}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold transition shadow-sm"
              >
                Connect BridgeKey
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Notifications */}
      {notice && (
        <div className="bg-cyan-900 border-b border-cyan-700 text-cyan-200 text-xs px-4 py-2 text-center font-medium shadow-sm flex items-center justify-center gap-2">
          <CheckCircle className="w-4 h-4" />
          <span>{notice}</span>
        </div>
      )}

      {error && (
        <div className="bg-rose-950 border-b border-rose-800 text-rose-200 text-xs px-4 py-2 text-center font-medium shadow-sm flex items-center justify-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="underline ml-2">
            Dismiss
          </button>
        </div>
      )}

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-8 space-y-6">
        <div className="bg-slate-800/80 border border-slate-700 p-6 rounded-3xl shadow-sm space-y-1">
          <h1 className="text-lg font-bold text-white">Clinical Data Ingestion & Consent Verification</h1>
          <p className="text-xs text-slate-400">
            Hospitals cannot access medical records directly. You must submit an on-chain request, which the patient verifies on the <strong>MST Blockchain</strong>.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Step 1: Request Access */}
          <div className="bg-slate-800 border border-slate-700 p-6 rounded-2xl shadow-sm space-y-4">
            <h2 className="font-bold text-sm text-white border-b border-slate-700 pb-3 flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-cyan-400" />
              <span>Step 1: Request Patient Consent</span>
            </h2>

            <form onSubmit={handleRequest} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Patient Record ID (bytes32 hex)
                </label>
                <input
                  type="text"
                  value={recordId}
                  onChange={(e) => setRecordId(e.target.value.trim().replace(/\.enc$/i, ""))}
                  placeholder="0x..."
                  required
                  className="w-full font-mono px-3 py-2 bg-slate-900 border border-slate-700 text-white rounded-xl focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Clinical Purpose
                </label>
                <input
                  type="text"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 text-white rounded-xl focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Requested Validity Duration
                </label>
                <select
                  value={durationHours}
                  onChange={(e) => setDurationHours(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 text-white rounded-xl focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                >
                  <option value="1">1 Hour (Quick Consultation)</option>
                  <option value="24">24 Hours (Standard Review)</option>
                  <option value="72">72 Hours (Inpatient Ward)</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-bold transition shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Transacting on MST...</span>
                  </>
                ) : (
                  <span>Send Request to Patient</span>
                )}
              </button>
            </form>
          </div>

          {/* Step 2: Decrypt & Review */}
          <div className="bg-slate-800 border border-slate-700 p-6 rounded-2xl shadow-sm space-y-4">
            <h2 className="font-bold text-sm text-white border-b border-slate-700 pb-3 flex items-center gap-2">
              <FileCheck2 className="w-4 h-4 text-emerald-400" />
              <span>Step 2: Decrypt Record (Gated by On-Chain Consent)</span>
            </h2>

            <p className="text-xs text-slate-400">
              The backend queries the MST smart contract. If the patient has not granted consent, decryption is cryptographically blocked.
            </p>

            <div className="flex gap-2">
              <button
                onClick={handleDecrypt}
                disabled={actionLoading !== null || !recordId}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs transition shadow-sm flex items-center justify-center gap-1.5 disabled:opacity-40"
              >
                <FileDown className="w-3.5 h-3.5" />
                <span>Verify Consent & Decrypt</span>
              </button>

              <button
                onClick={handleAISummary}
                disabled={actionLoading !== null || !recordId}
                className="px-4 py-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl font-bold text-xs transition shadow-sm flex items-center gap-1.5 disabled:opacity-40"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>AI Brief</span>
              </button>
            </div>

            {/* Access Denied Warning */}
            {accessDeniedNotice && (
              <div className="p-4 bg-rose-950/70 border border-rose-800 rounded-xl text-xs text-rose-300 space-y-1">
                <div className="flex items-center gap-2 font-bold text-rose-200">
                  <ShieldX className="w-4 h-4" />
                  <span>Access Blocked on MST Blockchain</span>
                </div>
                <p>{accessDeniedNotice}</p>
              </div>
            )}

            {/* Decrypted Document */}
            {decryptedData && (
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between text-xs font-bold text-emerald-400">
                  <span>Decrypted Clinical Examination</span>
                  <span className="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded-full font-mono">
                    Consent Active
                  </span>
                </div>
                <pre className="p-3 bg-slate-950 text-emerald-300 font-mono text-[11px] rounded-xl overflow-x-auto whitespace-pre-wrap max-h-52 border border-slate-700">
                  {decryptedData}
                </pre>
              </div>
            )}

            {/* AI Summary */}
            {aiSummary && (
              <div className="p-4 bg-slate-950 rounded-xl border border-violet-800/60 space-y-2 text-xs">
                <div className="flex items-center gap-1.5 font-bold text-violet-300">
                  <Sparkles className="w-4 h-4 text-violet-400" />
                  <span>{aiSummary.summaryType}</span>
                </div>
                <ul className="list-disc list-inside space-y-1 text-slate-300">
                  {aiSummary.highlights.map((h: string, i: number) => (
                    <li key={i}>{h}</li>
                  ))}
                </ul>
                <div className="text-[10px] font-mono text-violet-400 pt-1">
                  {aiSummary.complianceNote}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
