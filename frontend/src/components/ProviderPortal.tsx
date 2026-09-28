"use client";

import React, { useState } from "react";
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
} from "lucide-react";
import { getMedicalConsentContract } from "@/lib/mst";

interface ProviderPortalProps {
  account: string | null;
  signer: any;
  onTxSuccess: (txHash: string, title: string) => void;
}

export function ProviderPortal({ account, signer, onTxSuccess }: ProviderPortalProps) {
  const [targetRecordId, setTargetRecordId] = useState("");
  const [purpose, setPurpose] = useState("Cardiology Outpatient Consultation");
  const [durationHours, setDurationHours] = useState("24");

  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Decrypted record view state
  const [decryptedRecord, setDecryptedRecord] = useState<any | null>(null);
  const [aiSummary, setAiSummary] = useState<any | null>(null);

  // Request Access on-chain
  const handleRequestAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!account || !signer) {
      setErrorMessage("Please connect BridgeKey wallet first.");
      return;
    }
    setErrorMessage(null);
    setStatusMessage(null);
    setLoading(true);

    try {
      const cleanRecordId = targetRecordId.trim().replace(/\.enc$/i, "");
      const contract = getMedicalConsentContract(signer);
      const durationSeconds = Number(durationHours) * 3600;

      const tx = await contract.requestAccess(
        cleanRecordId,
        purpose,
        durationSeconds
      );

      onTxSuccess(tx.hash, "Access Request Submitted to MST Blockchain");
      await tx.wait();

      setStatusMessage(
        "Access request successfully recorded on-chain. Waiting for patient authorization."
      );
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to submit on-chain access request.");
    } finally {
      setLoading(false);
    }
  };

  // Check on-chain consent and decrypt record
  const handleDecryptAndAccess = async () => {
    if (!account || !signer || !targetRecordId) {
      setErrorMessage("Please enter a valid Record ID and connect wallet.");
      return;
    }
    setErrorMessage(null);
    setStatusMessage(null);
    setActionLoading("decrypt");

    try {
      // 1. Verify on-chain access state
      const contract = getMedicalConsentContract(signer);
      const hasAccess = await contract.hasAccess(targetRecordId, account);

      if (!hasAccess) {
        throw new Error(
          "On-chain access check failed: You do not have active or unexpired consent from the patient."
        );
      }

      // 2. Request backend decryption
      const res = await fetch(`/api/records/${targetRecordId}/access`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ providerAddress: account }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to decrypt record");

      // Decode base64 plaintext
      const decodedContent = atob(data.dataBase64);
      setDecryptedRecord({
        ...data,
        plaintext: decodedContent,
      });

      // 3. Trigger on-chain audit log (logAccess)
      try {
        const auditTx = await contract.logAccess(targetRecordId);
        onTxSuccess(auditTx.hash, "Tamper-Evident Access Logged on MST");
      } catch (logErr) {
        console.warn("Audit logging non-fatal error:", logErr);
      }

      setStatusMessage("Record decrypted and verified against on-chain consent!");
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to access record.");
      setDecryptedRecord(null);
    } finally {
      setActionLoading(null);
    }
  };

  // Request Gated AI Clinical Summary
  const handleGenerateSummary = async () => {
    if (!account || !targetRecordId) return;
    setActionLoading("ai");
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/records/${targetRecordId}/summary`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ providerAddress: account }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate AI summary.");

      setAiSummary(data.summary);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to generate clinical brief.");
    } finally {
      setActionLoading(null);
    }
  };

  // Trigger Break-Glass Emergency Access
  const handleEmergencyAccess = async () => {
    if (!account || !signer || !targetRecordId) {
      setErrorMessage("Enter target Record ID first.");
      return;
    }
    const confirmed = confirm(
      "BREAK-GLASS PROTOCOL: This will trigger an irreversible, high-priority emergency audit event on MST Blockchain. Proceed?"
    );
    if (!confirmed) return;

    setActionLoading("emergency");
    setErrorMessage(null);

    try {
      const contract = getMedicalConsentContract(signer);
      const tx = await contract.emergencyAccess(
        targetRecordId,
        "Emergency ER Critical Intervention"
      );

      onTxSuccess(tx.hash, "EMERGENCY ACCESS Triggered on MST");
      await tx.wait();

      setStatusMessage("Emergency access granted (4-hour window) and logged on-chain.");
    } catch (err: any) {
      setErrorMessage(err.message || "Emergency access failed.");
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-8">
      {errorMessage && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs px-4 py-3 rounded-xl flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {statusMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs px-4 py-3 rounded-xl flex items-center gap-2">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Top Banner */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold">
            <Stethoscope className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-semibold text-sm text-slate-900">
              Healthcare Provider Access Terminal
            </h2>
            <p className="text-xs text-slate-500">
              Request cryptographic access or decrypt records gated by patient on-chain consent.
            </p>
          </div>
        </div>
        <button
          onClick={handleEmergencyAccess}
          disabled={actionLoading !== null || !targetRecordId}
          className="inline-flex items-center gap-2 px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-semibold transition shadow-sm disabled:opacity-50"
        >
          <ShieldAlert className="w-4 h-4" />
          <span>Break-Glass Emergency Access</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Access Request Form */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <KeyRound className="w-4 h-4 text-indigo-600" />
            <h3 className="font-semibold text-sm text-slate-900">
              Request Record Consent
            </h3>
          </div>

          <form onSubmit={handleRequestAccess} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Target Record ID (bytes32 format)
              </label>
              <input
                type="text"
                value={targetRecordId}
                onChange={(e) =>
                  setTargetRecordId(
                    e.target.value.trim().replace(/\.enc$/i, "")
                  )
                }
                required
                className="w-full text-xs font-mono px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="0x..."
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Clinical Purpose / Justification
              </label>
              <input
                type="text"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                required
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Requested Access Duration
              </label>
              <select
                value={durationHours}
                onChange={(e) => setDurationHours(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="1">1 Hour (Quick Consultation)</option>
                <option value="24">24 Hours (Standard Inpatient Review)</option>
                <option value="72">72 Hours (Surgical Follow-up)</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={loading || !account}
              className="w-full inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold py-2.5 px-4 rounded-xl transition shadow-sm disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Submitting Request on MST...</span>
                </>
              ) : (
                <>
                  <Clock className="w-3.5 h-3.5" />
                  <span>Sign Access Request with BridgeKey</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Gated Decrypt & Review */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <FileCheck2 className="w-4 h-4 text-emerald-600" />
              <h3 className="font-semibold text-sm text-slate-900">
                Gated Decryption Terminal
              </h3>
            </div>
            <span className="text-[10px] font-mono bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full">
              MST-Protected
            </span>
          </div>

          <p className="text-xs text-slate-500">
            The server checks <code>hasAccess()</code> directly on the MST Blockchain before releasing the AES-256 decryption key.
          </p>

          <div className="flex gap-2">
            <button
              onClick={handleDecryptAndAccess}
              disabled={actionLoading !== null || !targetRecordId}
              className="flex-1 inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold py-2.5 px-4 rounded-xl transition shadow-sm disabled:opacity-50"
            >
              {actionLoading === "decrypt" ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Verifying On-Chain Consent...</span>
                </>
              ) : (
                <>
                  <FileDown className="w-3.5 h-3.5" />
                  <span>Verify Consent & Decrypt</span>
                </>
              )}
            </button>

            <button
              onClick={handleGenerateSummary}
              disabled={actionLoading !== null || !targetRecordId}
              className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white text-xs font-semibold py-2.5 px-4 rounded-xl transition shadow-sm disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI Summary</span>
            </button>
          </div>

          {/* AI Clinical Summary Display */}
          {aiSummary && (
            <div className="p-4 rounded-xl bg-violet-50/70 border border-violet-100 space-y-2 text-xs">
              <div className="flex items-center gap-1.5 text-violet-800 font-semibold">
                <Sparkles className="w-4 h-4 text-violet-600" />
                <span>{aiSummary.summaryType}</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-slate-700">
                {aiSummary.highlights.map((h: string, idx: number) => (
                  <li key={idx}>{h}</li>
                ))}
              </ul>
              <div className="pt-2 text-[10px] text-violet-600 font-mono">
                {aiSummary.complianceNote}
              </div>
            </div>
          )}

          {/* Decrypted Document Preview */}
          {decryptedRecord && (
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-900">
                  {decryptedRecord.title}
                </span>
                <span className="text-[11px] text-emerald-600 font-medium">
                  Verified On-Chain
                </span>
              </div>
              <pre className="p-3 bg-slate-900 text-emerald-400 font-mono text-[11px] rounded-xl overflow-x-auto max-h-64 whitespace-pre-wrap">
                {decryptedRecord.plaintext}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
