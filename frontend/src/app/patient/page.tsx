"use client";

import React, { useState, useEffect } from "react";
import { connectBridgeKey, getMedicalConsentContract } from "@/lib/mst";
import {
  FolderHeart,
  Upload,
  Lock,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Copy,
  ExternalLink,
  Loader2,
  RefreshCw,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";

export default function PatientPage() {
  const [account, setAccount] = useState<string | null>(null);
  const [signer, setSigner] = useState<any | null>(null);
  const [records, setRecords] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [uploadTitle, setUploadTitle] = useState("Comprehensive Metabolic & Lipid Panel");
  const [uploadLoading, setUploadLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleConnect = async () => {
    setError(null);
    try {
      const { address, signer: sig } = await connectBridgeKey();
      setAccount(address);
      setSigner(sig);
      setNotice(`Connected: ${address.slice(0, 6)}...${address.slice(-4)}`);
      setTimeout(() => setNotice(null), 5000);
    } catch (err: any) {
      setError(err.message || "Could not connect BridgeKey.");
    }
  };

  const loadData = async () => {
    if (!account) return;
    try {
      const res = await fetch(`/api/records/list?address=${account}`);
      const data = await res.json();
      if (data.records) setRecords(data.records);

      if (signer) {
        const contract = getMedicalConsentContract(signer);
        const totalReqs = Number(await contract.requestCounter());
        const list: any[] = [];
        for (let i = 1; i <= totalReqs; i++) {
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
    } catch (e) {
      console.warn(e);
    }
  };

  useEffect(() => {
    loadData();
  }, [account, signer]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!account || !signer) {
      await handleConnect();
      return;
    }
    setUploadLoading(true);
    setError(null);

    try {
      const dummyReport = `METROPOLITAN CLINICAL LABORATORIES - BLOOD REPORT
PATIENT IDENTIFIER: ${account}
DATE: ${new Date().toLocaleDateString()}
PHYSICIAN: Dr. S. Rao, MD
- Fasting Glucose: 98 mg/dL (NORMAL)
- Total Cholesterol: 218 mg/dL (BORDERLINE HIGH)
- LDL: 142 mg/dL (ELEVATED)
- HDL: 52 mg/dL (NORMAL)
STATUS: STABLE - DIETARY MODIFICATION RECOMMENDED`;

      const blob = new Blob([dummyReport], { type: "text/plain" });
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

      await loadData();
    } catch (err: any) {
      setError(err.message || "Failed to register record on MST.");
    } finally {
      setUploadLoading(false);
    }
  };

  const handleGrant = async (requestId: number) => {
    if (!signer) return;
    setActionLoading(requestId);
    setError(null);
    try {
      const contract = getMedicalConsentContract(signer);
      const tx = await contract.grantAccess(requestId);
      setNotice(`Confirmed on MST: Granted Consent for Request #${requestId}!`);
      await tx.wait();
      await loadData();
    } catch (err: any) {
      setError(err.message || "Failed to grant consent.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeny = async (requestId: number) => {
    if (!signer) return;
    setActionLoading(requestId);
    setError(null);
    try {
      const contract = getMedicalConsentContract(signer);
      const tx = await contract.denyAccess(requestId);
      setNotice(`Confirmed on MST: Denied Request #${requestId}.`);
      await tx.wait();
      await loadData();
    } catch (err: any) {
      setError(err.message || "Failed to deny request.");
    } finally {
      setActionLoading(null);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(text);
    setTimeout(() => setCopiedId(null), 2500);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Top Navbar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold">
              <FolderHeart className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-base text-slate-900">
                Patient Sovereign Portal
              </span>
              <span className="ml-2 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700">
                MST Testnet
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/provider"
              target="_blank"
              className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 bg-indigo-50 px-3 py-1.5 rounded-xl border border-indigo-100"
            >
              <span>Open Doctor Terminal in New Window</span>
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

      {/* Main Content */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-8 space-y-8">
        {/* Banner */}
        <div className="bg-gradient-to-r from-indigo-900 to-slate-900 text-white p-6 rounded-3xl shadow-sm space-y-1">
          <h1 className="text-lg font-bold">Your Personal Medical Data Vault</h1>
          <p className="text-xs text-slate-300">
            Files are encrypted with <strong>AES-256-GCM</strong>. Only you can authorize doctors to view them via <strong>MST Blockchain smart contracts</strong>.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Upload Card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h2 className="font-bold text-sm text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
              <Upload className="w-4 h-4 text-indigo-600" />
              <span>Upload & Encrypt Record</span>
            </h2>

            <form onSubmit={handleUpload} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Record Title
                </label>
                <input
                  type="text"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-[11px] text-slate-500">
                📄 Using pre-loaded synthetic clinical blood panel for demo testing.
              </div>

              <button
                type="submit"
                disabled={uploadLoading}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {uploadLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Confirming on MST...</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-3.5 h-3.5" />
                    <span>Encrypt & Register on MST</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Records & Requests List */}
          <div className="md:col-span-2 space-y-6">
            {/* Incoming Requests */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-500" />
                  <h2 className="font-bold text-sm text-slate-900">
                    Incoming Doctor Requests ({requests.filter((r) => r.status === 0).length})
                  </h2>
                </div>
                <button
                  onClick={loadData}
                  className="text-xs text-indigo-600 hover:underline flex items-center gap-1 font-semibold"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Refresh</span>
                </button>
              </div>

              {requests.length === 0 ? (
                <p className="text-xs text-slate-500 py-6 text-center">
                  No pending doctor requests. Open the Doctor Terminal to request access.
                </p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {requests.map((req) => (
                    <div
                      key={req.id}
                      className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">
                            Request #{req.id}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              req.status === 0
                                ? "bg-amber-100 text-amber-800"
                                : req.status === 1
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-rose-100 text-rose-800"
                            }`}
                          >
                            {req.status === 0
                              ? "Awaiting Your Decision"
                              : req.status === 1
                              ? "Consent Granted"
                              : "Denied"}
                          </span>
                        </div>
                        <p className="text-slate-700">
                          <strong>Purpose:</strong> {req.purpose} ({req.durationHours} Hours)
                        </p>
                        <p className="text-[11px] font-mono text-slate-400">
                          Doctor: {req.provider}
                        </p>
                      </div>

                      {req.status === 0 && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleGrant(req.id)}
                            disabled={actionLoading !== null}
                            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition shadow-sm disabled:opacity-50"
                          >
                            {actionLoading === req.id ? "Confirming..." : "Grant Consent"}
                          </button>
                          <button
                            onClick={() => handleDeny(req.id)}
                            disabled={actionLoading !== null}
                            className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold transition shadow-sm disabled:opacity-50"
                          >
                            Decline
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* My Registered Records */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-600" />
                  <h2 className="font-bold text-sm text-slate-900">
                    My Registered Records ({records.length})
                  </h2>
                </div>
              </div>

              {records.length === 0 ? (
                <p className="text-xs text-slate-500 py-6 text-center">
                  No records registered yet.
                </p>
              ) : (
                <div className="space-y-3">
                  {records.map((r) => (
                    <div
                      key={r.recordId}
                      className="p-4 rounded-xl border border-slate-100 bg-slate-50/60 space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 text-sm">
                          {r.title}
                        </span>
                        <span className="text-[10px] font-mono bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                          AES-256 Encrypted
                        </span>
                      </div>

                      <div className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-slate-200 font-mono text-[11px] text-slate-600">
                        <span className="truncate mr-2">
                          <strong>Record ID:</strong> {r.recordId}
                        </span>
                        <button
                          onClick={() => copyToClipboard(r.recordId)}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700 font-sans font-bold flex items-center gap-1 flex-shrink-0"
                        >
                          <Copy className="w-3 h-3" />
                          <span>{copiedId === r.recordId ? "Copied!" : "Copy ID"}</span>
                        </button>
                      </div>

                      <div className="text-[11px] text-slate-400 font-mono truncate">
                        SHA-256 Hash: {r.fileHash}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
