"use client";

import React, { useState, useEffect } from "react";
import { connectBridgeKey, getContractAddress, getMedicalConsentContract } from "@/lib/mst";
import {
  FolderHeart,
  Stethoscope,
  ShieldCheck,
  Lock,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Copy,
  ExternalLink,
  Loader2,
  RefreshCw,
  FileDown,
  Sparkles,
  ShieldX,
  Split,
} from "lucide-react";
import Link from "next/link";

export default function SplitScreenDemo() {
  const [account, setAccount] = useState<string | null>(null);
  const [signer, setSigner] = useState<any | null>(null);
  const [contractAddress, setContractAddress] = useState<string>("");
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Patient states
  const [records, setRecords] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [uploadTitle, setUploadTitle] = useState("Annual Comprehensive Blood Panel");
  const [uploadLoading, setUploadLoading] = useState(false);
  const [grantLoading, setGrantLoading] = useState<number | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Doctor states
  const [selectedRecordId, setSelectedRecordId] = useState("");
  const [purpose, setPurpose] = useState("Cardiology Outpatient Consultation");
  const [doctorLoading, setDoctorLoading] = useState(false);
  const [decryptedText, setDecryptedText] = useState<string | null>(null);
  const [aiSummary, setAiSummary] = useState<any | null>(null);
  const [accessBlockedNotice, setAccessBlockedNotice] = useState<string | null>(null);

  useEffect(() => {
    setContractAddress(getContractAddress());
  }, []);

  const handleConnect = async () => {
    try {
      const { address, signer: sig } = await connectBridgeKey();
      setAccount(address);
      setSigner(sig);
      setNotice(`BridgeKey Connected: ${address.slice(0, 6)}...${address.slice(-4)}`);
      setTimeout(() => setNotice(null), 5000);
    } catch (e: any) {
      setError(e.message || "Failed to connect wallet.");
    }
  };

  const loadData = async () => {
    if (!account) return;
    try {
      const res = await fetch(`/api/records/list?address=${account}`);
      const data = await res.json();
      if (data.records) {
        setRecords(data.records);
        if (data.records.length > 0 && !selectedRecordId) {
          setSelectedRecordId(data.records[0].recordId);
        }
      }

      if (signer) {
        const contract = getMedicalConsentContract(signer);
        const total = Number(await contract.requestCounter());
        const list: any[] = [];
        for (let i = 1; i <= total; i++) {
          const req = await contract.accessRequests(i);
          const rec = await contract.getRecord(req.recordId);
          if (rec.patient.toLowerCase() === account.toLowerCase()) {
            list.push({
              id: i,
              recordId: req.recordId,
              provider: req.provider,
              purpose: req.purpose,
              durationHours: Number(req.durationSeconds) / 3600,
              status: Number(req.status), // 0: Pending, 1: Granted, 2: Denied
            });
          }
        }
        setRequests(list.reverse());
      }
    } catch (err) {
      console.warn(err);
    }
  };

  useEffect(() => {
    loadData();
  }, [account, signer]);

  // Patient: Upload & Register
  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!account || !signer) {
      await handleConnect();
      return;
    }
    setUploadLoading(true);
    setError(null);
    try {
      const dummyContent = `METROPOLITAN CLINICAL LABORATORIES - REPORT OF MEDICAL EXAMINATION
PATIENT ON-CHAIN IDENTIFIER: ${account}
EXAMINATION DATE: ${new Date().toLocaleDateString()}
- Fasting Blood Glucose: 98 mg/dL (NORMAL)
- Total Cholesterol: 218 mg/dL (BORDERLINE HIGH)
- LDL: 142 mg/dL (ELEVATED)
- HDL: 52 mg/dL (NORMAL)
STATUS: STABLE CLINICAL CONDITION`;

      const blob = new Blob([dummyContent], { type: "text/plain" });
      const file = new File([blob], "blood_panel.txt", { type: "text/plain" });

      const formData = new FormData();
      formData.append("file", file);
      formData.append("patientAddress", account);
      formData.append("title", uploadTitle);

      const res = await fetch("/api/records/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // Register on MST Testnet
      const contract = getMedicalConsentContract(signer);
      const tx = await contract.registerRecord(data.recordId, data.fileHash, data.storagePointer);
      setNotice(`Confirmed on MST: Record Registered! Tx: ${tx.hash.slice(0, 10)}...`);
      await tx.wait();

      setSelectedRecordId(data.recordId);
      await loadData();
    } catch (err: any) {
      setError(err.message || "Upload failed.");
    } finally {
      setUploadLoading(false);
    }
  };

  // Patient: Grant Access
  const handleGrant = async (requestId: number) => {
    if (!signer) return;
    setGrantLoading(requestId);
    setError(null);
    try {
      const contract = getMedicalConsentContract(signer);
      const tx = await contract.grantAccess(requestId);
      setNotice(`Confirmed on MST: Consent Granted for Request #${requestId}!`);
      await tx.wait();
      await loadData();
    } catch (err: any) {
      setError(err.message || "Granting consent failed.");
    } finally {
      setGrantLoading(null);
    }
  };

  // Doctor: Request Access
  const handleDoctorRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signer || !selectedRecordId) return;
    setDoctorLoading(true);
    setError(null);
    setAccessBlockedNotice(null);
    try {
      const cleanId = selectedRecordId.trim().replace(/\.enc$/i, "");
      const contract = getMedicalConsentContract(signer);
      const tx = await contract.requestAccess(cleanId, purpose, 86400); // 24h
      setNotice(`Confirmed on MST: Doctor Access Requested! Tx: ${tx.hash.slice(0, 10)}...`);
      await tx.wait();
      await loadData();
    } catch (err: any) {
      setError(err.message || "Request failed.");
    } finally {
      setDoctorLoading(false);
    }
  };

  // Doctor: Verify & Decrypt
  const handleDoctorDecrypt = async () => {
    if (!account || !signer || !selectedRecordId) return;
    setDoctorLoading(true);
    setError(null);
    setAccessBlockedNotice(null);

    try {
      const cleanId = selectedRecordId.trim().replace(/\.enc$/i, "");

      // Check on-chain consent
      const contract = getMedicalConsentContract(signer);
      const hasAccess = await contract.hasAccess(cleanId, account);

      if (!hasAccess) {
        setAccessBlockedNotice(
          "🛑 403 Forbidden: Access Denied on MST Blockchain. The patient has not granted consent yet! Click 'Grant Consent' on the Patient side to unlock."
        );
        setDecryptedText(null);
        return;
      }

      // Backend Decrypt
      const res = await fetch(`/api/records/${cleanId}/access`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ providerAddress: account }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setDecryptedText(atob(data.dataBase64));
      setNotice("Access verified on MST! File decrypted.");

      // On-chain audit
      await contract.logAccess(cleanId);
    } catch (err: any) {
      setError(err.message || "Decryption failed.");
    } finally {
      setDoctorLoading(false);
    }
  };

  // Doctor: AI Clinical Brief
  const handleDoctorAI = async () => {
    if (!account || !selectedRecordId) return;
    setDoctorLoading(true);
    setError(null);
    try {
      const cleanId = selectedRecordId.trim().replace(/\.enc$/i, "");
      const res = await fetch(`/api/records/${cleanId}/summary`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ providerAddress: account }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setAiSummary(data.summary);
    } catch (err: any) {
      setError(err.message || "AI summary blocked.");
    } finally {
      setDoctorLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      {/* Top Universal Bar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base text-slate-900">
                  MediChain Dual Live Demo
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700">
                  Side-by-Side
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Patient Sovereign Vault (Left) & Healthcare Doctor Terminal (Right) in Real-Time
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/patient"
              target="_blank"
              className="text-xs text-indigo-600 hover:bg-indigo-50 px-3 py-1.5 rounded-xl border border-indigo-200 font-semibold flex items-center gap-1 transition"
            >
              <span>Patient Window</span>
              <ExternalLink className="w-3 h-3" />
            </Link>

            <Link
              href="/provider"
              target="_blank"
              className="text-xs text-slate-700 hover:bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-300 font-semibold flex items-center gap-1 transition"
            >
              <span>Doctor Window</span>
              <ExternalLink className="w-3 h-3" />
            </Link>

            {account ? (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-xl text-xs font-mono text-slate-700">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>{account.slice(0, 6)}...{account.slice(-4)}</span>
              </div>
            ) : (
              <button
                onClick={handleConnect}
                className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 shadow-sm"
              >
                Connect BridgeKey
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Notifications */}
      {notice && (
        <div className="bg-emerald-600 text-white text-xs px-4 py-2 text-center font-medium shadow-sm flex items-center justify-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{notice}</span>
        </div>
      )}

      {error && (
        <div className="bg-rose-600 text-white text-xs px-4 py-2 text-center font-medium shadow-sm flex items-center justify-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="underline ml-2">
            Dismiss
          </button>
        </div>
      )}

      {/* DUAL SIDE-BY-SIDE SPLIT SCREEN */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* ========================================================================= */}
        {/* LEFT PANEL: PATIENT SOVEREIGN VAULT */}
        {/* ========================================================================= */}
        <section className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 flex flex-col space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2 text-indigo-700 font-bold text-sm">
              <FolderHeart className="w-5 h-5" />
              <span>1. Patient Sovereign Vault (Private Data Owner)</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Owns the encrypted records. Has complete cryptographic authority to grant or revoke doctor access.
            </p>
          </div>

          {/* Action 1: Upload */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
            <h3 className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-indigo-600" />
              <span>Step 1: Patient Uploads & Encrypts Record</span>
            </h3>
            <form onSubmit={handleUpload} className="space-y-2 text-xs">
              <input
                type="text"
                value={uploadTitle}
                onChange={(e) => setUploadTitle(e.target.value)}
                required
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl focus:outline-none"
              />
              <button
                type="submit"
                disabled={uploadLoading}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {uploadLoading ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>Confirming on MST...</span>
                  </>
                ) : (
                  <span>Sign & Register Record on MST</span>
                )}
              </button>
            </form>
          </div>

          {/* Action 2: Incoming Requests & Grant Consent */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3 flex-1">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-500" />
                <span>Step 3: Patient Grants Consent to Doctor</span>
              </h3>
              <button onClick={loadData} className="text-[11px] text-indigo-600 hover:underline">
                Refresh
              </button>
            </div>

            {requests.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">
                No doctor requests pending. (Click "Request Patient Consent" on the right side $\rightarrow$)
              </p>
            ) : (
              <div className="space-y-2.5">
                {requests.map((req) => (
                  <div
                    key={req.id}
                    className="p-3 bg-white rounded-xl border border-slate-200 text-xs flex items-center justify-between"
                  >
                    <div>
                      <div className="font-bold text-slate-900">
                        Request #{req.id}: {req.purpose}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        Valid: {req.durationHours}h • Status:{" "}
                        <span className={req.status === 1 ? "text-emerald-600 font-bold" : "text-amber-600 font-bold"}>
                          {req.status === 1 ? "GRANTED" : "PENDING"}
                        </span>
                      </div>
                    </div>

                    {req.status === 0 && (
                      <button
                        onClick={() => handleGrant(req.id)}
                        disabled={grantLoading !== null}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs transition shadow-sm disabled:opacity-50"
                      >
                        {grantLoading === req.id ? "Confirming..." : "Grant Consent"}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ========================================================================= */}
        {/* RIGHT PANEL: HEALTHCARE DOCTOR TERMINAL */}
        {/* ========================================================================= */}
        <section className="bg-slate-900 text-slate-100 rounded-3xl border border-slate-800 shadow-sm p-6 flex flex-col space-y-6">
          <div className="border-b border-slate-800 pb-4">
            <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm">
              <Stethoscope className="w-5 h-5" />
              <span>2. Healthcare Provider Terminal (Hospital Node)</span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Must obtain on-chain permission before viewing patient documents. Cryptographically enforced.
            </p>
          </div>

          {/* Action 1: Doctor Requests Access */}
          <div className="p-4 bg-slate-800/80 rounded-2xl border border-slate-700 space-y-3">
            <h3 className="font-bold text-xs text-white flex items-center gap-1.5">
              <span>Step 2: Doctor Requests Patient Consent</span>
            </h3>

            <form onSubmit={handleDoctorRequest} className="space-y-2 text-xs">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">
                  Select Patient Record
                </label>
                {records.length > 0 ? (
                  <select
                    value={selectedRecordId}
                    onChange={(e) => setSelectedRecordId(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-cyan-300 font-mono"
                  >
                    {records.map((r) => (
                      <option key={r.recordId} value={r.recordId}>
                        {r.title} ({r.recordId.slice(0, 8)}...)
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={selectedRecordId}
                    onChange={(e) => setSelectedRecordId(e.target.value.trim().replace(/\.enc$/i, ""))}
                    placeholder="0x..."
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-xl font-mono text-xs text-white"
                  />
                )}
              </div>

              <button
                type="submit"
                disabled={doctorLoading || !selectedRecordId}
                className="w-full py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-bold transition shadow-sm disabled:opacity-50"
              >
                {doctorLoading ? "Submitting on MST..." : "Send Request to Patient (on MST Blockchain)"}
              </button>
            </form>
          </div>

          {/* Action 2: Decrypt & View (Gated) */}
          <div className="p-4 bg-slate-800/80 rounded-2xl border border-slate-700 space-y-3 flex-1 flex flex-col">
            <h3 className="font-bold text-xs text-white flex items-center gap-1.5">
              <FileDown className="w-3.5 h-3.5 text-emerald-400" />
              <span>Step 4: Decrypt & Review (Gated by On-Chain Consent)</span>
            </h3>

            <div className="flex gap-2">
              <button
                onClick={handleDoctorDecrypt}
                disabled={doctorLoading || !selectedRecordId}
                className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs transition shadow-sm disabled:opacity-50"
              >
                {doctorLoading ? "Verifying MST..." : "Verify Consent & Decrypt"}
              </button>

              <button
                onClick={handleDoctorAI}
                disabled={doctorLoading || !selectedRecordId}
                className="px-3 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl font-bold text-xs transition shadow-sm flex items-center gap-1 disabled:opacity-50"
              >
                <Sparkles className="w-3 h-3" />
                <span>AI Brief</span>
              </button>
            </div>

            {/* Blocked Alert */}
            {accessBlockedNotice && (
              <div className="p-3 bg-rose-950/70 border border-rose-800 rounded-xl text-xs text-rose-300">
                {accessBlockedNotice}
              </div>
            )}

            {/* Decrypted Content */}
            {decryptedText && (
              <div className="space-y-1.5 pt-1">
                <span className="text-[11px] font-bold text-emerald-400">
                  ✓ Decrypted Clinical Document (Consent Active):
                </span>
                <pre className="p-2.5 bg-slate-950 text-emerald-300 font-mono text-[10px] rounded-xl overflow-x-auto whitespace-pre-wrap max-h-36 border border-slate-700">
                  {decryptedText}
                </pre>
              </div>
            )}

            {/* AI Summary */}
            {aiSummary && (
              <div className="p-3 bg-slate-950 border border-violet-800/60 rounded-xl text-xs text-slate-300 space-y-1">
                <span className="font-bold text-violet-400 text-[11px]">
                  Sparkles AI Clinical Digest:
                </span>
                <ul className="list-disc list-inside text-[11px] text-slate-300">
                  {aiSummary.highlights.map((h: string, i: number) => (
                    <li key={i}>{h}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
