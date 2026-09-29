"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@/context/WalletContext";
import { getMedicalConsentContract, MST_TESTNET_CONFIG } from "@/lib/mst";
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
  LogOut,
  ShieldCheck,
  FileCheck2,
} from "lucide-react";

export default function PatientDashboard() {
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

  const [records, setRecords] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [uploadTitle, setUploadTitle] = useState("Comprehensive Metabolic & Lipid Panel");
  const [uploadLoading, setUploadLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"records" | "requests">("records");

  // Route protection
  useEffect(() => {
    if (isInitialized && (!isAuthenticated || role !== "patient")) {
      router.push("/login/patient");
    }
  }, [isInitialized, isAuthenticated, role, router]);

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
      console.warn("Failed to load patient records or requests:", e);
    }
  };

  useEffect(() => {
    if (account && signer) {
      loadData();
    }
  }, [account, signer]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!account || !signer) {
      setError("Session expired. Please log in again.");
      return;
    }
    setUploadLoading(true);
    setError(null);

    try {
      const clinicalReport = `METROPOLITAN CLINICAL LABORATORIES - BLOOD REPORT
PATIENT IDENTIFIER: ${account}
DATE: ${new Date().toLocaleDateString()}
PHYSICIAN: Dr. S. Rao, MD
- Fasting Glucose: 98 mg/dL (NORMAL)
- Total Cholesterol: 218 mg/dL (BORDERLINE HIGH)
- LDL: 142 mg/dL (ELEVATED)
- HDL: 52 mg/dL (NORMAL)
STATUS: STABLE - DIETARY MODIFICATION RECOMMENDED`;

      const blob = new Blob([clinicalReport], { type: "text/plain" });
      const file = new File([blob], "blood_panel.txt", { type: "text/plain" });

      const formData = new FormData();
      formData.append("file", file);
      formData.append("patientAddress", account);
      formData.append("title", uploadTitle);
      formData.append("patientName", displayName || "Rahul Sharma (ABHA #91-8273-1920)");

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

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  if (!isInitialized || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center">
        <div className="flex items-center gap-3 text-sm text-slate-500">
          <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
          <span>Verifying sovereign patient session...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-indigo-600 selection:text-white">
      {/* Top Navbar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-md shadow-indigo-600/20">
              <FolderHeart className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-base text-slate-900">
                Patient Sovereign Portal
              </span>
              <span className="ml-2 text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                MST Testnet
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Connected Account Pill */}
            {displayName ? (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-xl text-xs font-semibold text-slate-800 border border-slate-200">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>{displayName}</span>
              </div>
            ) : account ? (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-xl text-xs font-mono text-slate-700 border border-slate-200">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>
                  {account.slice(0, 6)}...{account.slice(-4)}
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
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{notice}</span>
        </div>
      )}
      {error && (
        <div className="bg-rose-600 text-white text-xs px-4 py-2.5 text-center font-medium shadow-sm flex items-center justify-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8 w-full flex-1 space-y-8">
        {/* Navigation Tabs */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab("records")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                activeTab === "records"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                  : "bg-white text-slate-600 hover:text-slate-900 border border-slate-200"
              }`}
            >
              <FileCheck2 className="w-4 h-4" />
              <span>My Registered Records ({records.length})</span>
            </button>

            <button
              onClick={() => setActiveTab("requests")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                activeTab === "requests"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                  : "bg-white text-slate-600 hover:text-slate-900 border border-slate-200"
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>Consent Requests ({requests.length})</span>
            </button>
          </div>

          <button
            onClick={loadData}
            className="text-xs text-slate-600 hover:text-indigo-600 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 shadow-sm transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Sync MST</span>
          </button>
        </div>

        {/* Tab 1: Records View */}
        {activeTab === "records" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Upload & Register Box */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-indigo-600 mb-3">
                  <Upload className="w-5 h-5" />
                  <h2 className="text-base font-bold text-slate-900">
                    Encrypt &amp; Register on MST
                  </h2>
                </div>
                <p className="text-xs text-slate-500 mb-6 leading-relaxed">
                  Off-chain AES-256-GCM encryption with SHA-256 integrity hash verification on MST Blockchain.
                </p>

                <form onSubmit={handleUpload} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Record Title / Description
                    </label>
                    <input
                      type="text"
                      value={uploadTitle}
                      onChange={(e) => setUploadTitle(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white"
                      required
                    />
                  </div>

                  <div className="p-3.5 bg-indigo-50/70 border border-indigo-100 rounded-xl text-[11px] text-indigo-950 space-y-1">
                    <div className="flex items-center gap-1.5 text-indigo-700 font-bold">
                      <Lock className="w-3.5 h-3.5" />
                      <span>Zero PII on Blockchain</span>
                    </div>
                    <p className="text-indigo-900/80">Raw clinical data is encrypted with AES-256-GCM off-chain. Only cryptographic hashes and consent proofs touch MST Testnet.</p>
                  </div>

                  <button
                    type="submit"
                    disabled={uploadLoading}
                    className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-md shadow-indigo-600/20"
                  >
                    {uploadLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Encrypting &amp; Submitting to MST...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        <span>Sign &amp; Register on MST</span>
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>

            {/* List of Registered Records */}
            <div className="lg:col-span-2 space-y-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-600" />
                <span>My Registered Records</span>
              </h3>

              {records.length === 0 ? (
                <div className="p-8 bg-white border border-slate-200 rounded-3xl text-center text-xs text-slate-500 shadow-sm">
                  No records uploaded yet. Click &quot;Sign &amp; Register on MST&quot; to create your first encrypted health record.
                </div>
              ) : (
                <div className="space-y-3">
                  {records.map((r, idx) => (
                    <div
                      key={idx}
                      className="p-5 bg-white border border-slate-200 rounded-2xl hover:border-indigo-400 transition space-y-3 shadow-sm hover:shadow"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="text-sm font-bold text-slate-900">
                            {r.title || "Clinical Medical Record"}
                          </h4>
                          <span className="text-[10px] text-slate-500 font-mono">
                            Timestamp: {new Date(r.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Active On-Chain
                        </span>
                      </div>

                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-[11px] font-mono space-y-1.5">
                        <div className="flex items-center justify-between text-slate-600">
                          <span className="text-slate-500">Record ID:</span>
                          <div className="flex items-center gap-2">
                            <span className="text-indigo-700 font-semibold">
                              {r.recordId.slice(0, 14)}...{r.recordId.slice(-8)}
                            </span>
                            <button
                              onClick={() => copyToClipboard(r.recordId)}
                              className="text-slate-400 hover:text-slate-700"
                              title="Copy full Record ID"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                            {copiedId === r.recordId && (
                              <span className="text-emerald-600 text-[10px] font-sans font-semibold">Copied!</span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-slate-600">
                          <span className="text-slate-500">SHA-256 Hash:</span>
                          <span className="text-slate-800 text-[10px]">
                            {r.fileHash ? `${r.fileHash.slice(0, 16)}...` : "Verified"}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-slate-600">
                          <span className="text-slate-500">Encrypted Pointer:</span>
                          <span className="text-slate-800 text-[10px]">
                            {r.storagePointer || "storage/offchain"}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Incoming Requests */}
        {activeTab === "requests" && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-600" />
              <span>Incoming Consent Requests from Healthcare Providers</span>
            </h3>

            {requests.length === 0 ? (
              <div className="p-8 bg-white border border-slate-200 rounded-3xl text-center text-xs text-slate-500 shadow-sm">
                No consent requests pending. When an authorized hospital requests access, it will appear here for your cryptographic approval.
              </div>
            ) : (
              <div className="space-y-4">
                {requests.map((req) => (
                  <div
                    key={req.id}
                    className="p-5 bg-white border border-slate-200 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm"
                  >
                    <div className="space-y-2 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900">
                          Request #{req.id}
                        </span>
                        {req.status === 0 && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                            Awaiting Patient Approval
                          </span>
                        )}
                        {req.status === 1 && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Consent Granted (Active)
                          </span>
                        )}
                        {req.status === 2 && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                            Access Denied
                          </span>
                        )}
                      </div>

                      <div className="text-slate-600 text-[11px] space-y-1">
                        <div>
                          <span className="text-slate-500">Provider Address:</span>{" "}
                          <span className="font-mono text-cyan-700 font-semibold">{req.provider}</span>
                        </div>
                        <div>
                          <span className="text-slate-500">Clinical Purpose:</span>{" "}
                          <span className="text-slate-900 font-semibold">{req.purpose}</span>
                        </div>
                        <div>
                          <span className="text-slate-500">Requested Validity:</span>{" "}
                          <span className="text-slate-700 font-medium">{req.durationHours} Hours</span>
                        </div>
                        <div>
                          <span className="text-slate-500">Target Record ID:</span>{" "}
                          <span className="font-mono text-indigo-700">
                            {req.recordId.slice(0, 14)}...
                          </span>
                        </div>
                      </div>
                    </div>

                    {req.status === 0 && (
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleGrant(req.id)}
                          disabled={actionLoading === req.id}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-emerald-600/20"
                        >
                          {actionLoading === req.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          )}
                          <span>Grant Consent</span>
                        </button>

                        <button
                          onClick={() => handleDeny(req.id)}
                          disabled={actionLoading === req.id}
                          className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:bg-slate-200 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-rose-600/20"
                        >
                          <AlertCircle className="w-3.5 h-3.5" />
                          <span>Deny</span>
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500">
        MediChain &bull; Patient Sovereign Vault &bull; MST Testnet ({MST_TESTNET_CONFIG.chainIdDecimal})
      </footer>
    </div>
  );
}
