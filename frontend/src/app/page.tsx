"use client";

import React, { useState, useEffect } from "react";
import { connectBridgeKey, getContractAddress, getMedicalConsentContract } from "@/lib/mst";
import {
  ShieldCheck,
  FolderHeart,
  Inbox,
  Stethoscope,
  Activity,
  Upload,
  Lock,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  FileText,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Shield,
  Loader2,
  FileDown,
  RefreshCw,
} from "lucide-react";

export default function MediChainApp() {
  const [account, setAccount] = useState<string | null>(null);
  const [signer, setSigner] = useState<any | null>(null);
  const [activePage, setActivePage] = useState<"patient" | "requests" | "provider" | "audit">("patient");
  const [contractAddress, setContractAddress] = useState<string>("");
  const [bannerNotice, setBannerNotice] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Patient Dashboard state
  const [records, setRecords] = useState<any[]>([]);
  const [uploadTitle, setUploadTitle] = useState("Annual Comprehensive Blood Panel");
  const [uploadLoading, setUploadLoading] = useState(false);

  // Access Requests state
  const [incomingRequests, setIncomingRequests] = useState<any[]>([]);
  const [requestActionLoading, setRequestActionLoading] = useState<number | null>(null);

  // Provider View state
  const [selectedRecordId, setSelectedRecordId] = useState("");
  const [requestPurpose, setRequestPurpose] = useState("Cardiology Inpatient Clinical Review");
  const [requestDurationHours, setRequestDurationHours] = useState("24");
  const [providerLoading, setProviderLoading] = useState(false);
  const [decryptedFileContent, setDecryptedFileContent] = useState<string | null>(null);
  const [aiClinicalSummary, setAiClinicalSummary] = useState<any | null>(null);
  const [accessStatus, setAccessStatus] = useState<string | null>(null);

  // On-Chain Audit Timeline
  const [timelineEvents, setTimelineEvents] = useState<any[]>([]);

  useEffect(() => {
    setContractAddress(getContractAddress());
  }, []);

  const handleConnectWallet = async () => {
    setErrorMessage(null);
    try {
      const { address, signer: sig } = await connectBridgeKey();
      setAccount(address);
      setSigner(sig);
      setBannerNotice(`BridgeKey Connected: ${address.slice(0, 6)}...${address.slice(-4)}`);
      setTimeout(() => setBannerNotice(null), 5000);
    } catch (e: any) {
      setErrorMessage(e.message || "Failed to connect BridgeKey wallet.");
    }
  };

  const addTimelineEvent = (txHash: string, title: string) => {
    setTimelineEvents((prev) => [
      {
        id: txHash + "_" + Date.now(),
        txHash,
        title,
        timestamp: new Date().toLocaleTimeString(),
      },
      ...prev,
    ]);
    setBannerNotice(`Confirmed on MST Testnet: ${title}`);
    setTimeout(() => setBannerNotice(null), 6000);
  };

  // Fetch patient records and requests from backend & blockchain
  const refreshData = async () => {
    if (!account) return;
    try {
      // 1. Fetch records
      const res = await fetch(`/api/records/list?address=${account}`);
      const data = await res.json();
      if (data.records) setRecords(data.records);

      // 2. Fetch on-chain requests
      if (signer) {
        const contract = getMedicalConsentContract(signer);
        const totalReqs = Number(await contract.requestCounter());
        const loaded: any[] = [];
        for (let i = 1; i <= totalReqs; i++) {
          const req = await contract.accessRequests(i);
          const rec = await contract.getRecord(req.recordId);
          if (rec.patient.toLowerCase() === account.toLowerCase()) {
            loaded.push({
              id: i,
              recordId: req.recordId,
              provider: req.provider,
              purpose: req.purpose,
              durationHours: Number(req.durationSeconds) / 3600,
              requestedAt: new Date(Number(req.requestedAt) * 1000).toLocaleString(),
              status: Number(req.status), // 0: Pending, 1: Granted, 2: Denied
            });
          }
        }
        setIncomingRequests(loaded.reverse());
      }
    } catch (err) {
      console.warn("Refresh error:", err);
    }
  };

  useEffect(() => {
    refreshData();
  }, [account, signer, activePage]);

  // Page 2: Patient Upload Record (AES-256 + MST on-chain hash)
  const handleUploadRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!account || !signer) {
      await handleConnectWallet();
      return;
    }
    setUploadLoading(true);
    setErrorMessage(null);

    try {
      const dummyContent = `================================================================================
METROPOLITAN CLINICAL LABORATORIES - REPORT OF MEDICAL EXAMINATION
PATIENT IDENTIFIER (ON-CHAIN ADDRESS): ${account}
EXAMINATION DATE: ${new Date().toLocaleDateString()}
ORDERING PHYSICIAN: Dr. S. Rao, MD (Cardiology)
================================================================================
COMPREHENSIVE METABOLIC PANEL:
- Fasting Blood Glucose:    98 mg/dL    (Reference: 70 - 99 mg/dL)    NORMAL
- Blood Urea Nitrogen:      14 mg/dL    (Reference: 7 - 20 mg/dL)     NORMAL
- Serum Creatinine:         0.92 mg/dL  (Reference: 0.60 - 1.20 mg/dL)NORMAL

LIPID PANEL:
- Total Cholesterol:        218 mg/dL   (Reference: < 200 mg/dL)      ELEVATED
- Triglycerides:            148 mg/dL   (Reference: < 150 mg/dL)      NORMAL
- HDL Cholesterol:          52 mg/dL    (Reference: > 40 mg/dL)       NORMAL
- LDL Cholesterol (Calc):   142 mg/dL   (Reference: < 100 mg/dL)      BORDERLINE HIGH

CLINICAL IMPRESSION:
Patient exhibits mild hyperlipidemia. Renal and electrolyte markers stable.
Advised: Dietary adjustment, aerobic exercise, and re-evaluation in 90 days.
================================================================================
CONFIDENTIAL: PROTECTED BY MST BLOCKCHAIN PATIENT CONSENT GOVERNANCE
================================================================================`;

      const blob = new Blob([dummyContent], { type: "text/plain" });
      const file = new File([blob], "annual_blood_panel.txt", { type: "text/plain" });

      const formData = new FormData();
      formData.append("file", file);
      formData.append("patientAddress", account);
      formData.append("title", uploadTitle);

      const res = await fetch("/api/records/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // On-chain registration on MST Testnet
      const contract = getMedicalConsentContract(signer);
      const tx = await contract.registerRecord(data.recordId, data.fileHash, data.storagePointer);
      addTimelineEvent(tx.hash, `Record Registered: ${uploadTitle}`);
      await tx.wait();

      setSelectedRecordId(data.recordId);
      await refreshData();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to register record.");
    } finally {
      setUploadLoading(false);
    }
  };

  // Page 3: Grant Access on-chain
  const handleGrantAccess = async (requestId: number) => {
    if (!signer) return;
    setRequestActionLoading(requestId);
    setErrorMessage(null);
    try {
      const contract = getMedicalConsentContract(signer);
      const tx = await contract.grantAccess(requestId);
      addTimelineEvent(tx.hash, `Consent Granted (Request #${requestId})`);
      await tx.wait();
      await refreshData();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to grant consent.");
    } finally {
      setRequestActionLoading(null);
    }
  };

  // Page 3: Deny Access on-chain
  const handleDenyAccess = async (requestId: number) => {
    if (!signer) return;
    setRequestActionLoading(requestId);
    setErrorMessage(null);
    try {
      const contract = getMedicalConsentContract(signer);
      const tx = await contract.denyAccess(requestId);
      addTimelineEvent(tx.hash, `Consent Denied (Request #${requestId})`);
      await tx.wait();
      await refreshData();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to deny access.");
    } finally {
      setRequestActionLoading(null);
    }
  };

  // Page 4: Provider Request Access on-chain
  const handleProviderRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signer || !selectedRecordId) return;
    setProviderLoading(true);
    setErrorMessage(null);
    try {
      const cleanId = selectedRecordId.trim().replace(/\.enc$/i, "");
      const durationSeconds = Number(requestDurationHours) * 3600;
      const contract = getMedicalConsentContract(signer);
      const tx = await contract.requestAccess(cleanId, requestPurpose, durationSeconds);
      addTimelineEvent(tx.hash, `Access Requested: ${requestPurpose}`);
      await tx.wait();
      setBannerNotice("Access request submitted to patient on MST Blockchain.");
      await refreshData();
    } catch (err: any) {
      setErrorMessage(err.message || "Request failed.");
    } finally {
      setProviderLoading(false);
    }
  };

  // Page 4: Provider View/Decrypt Record
  const handleProviderDecrypt = async () => {
    if (!account || !signer || !selectedRecordId) return;
    setProviderLoading(true);
    setErrorMessage(null);
    try {
      const cleanId = selectedRecordId.trim().replace(/\.enc$/i, "");

      // 1. Check on-chain access state
      const contract = getMedicalConsentContract(signer);
      const hasAccess = await contract.hasAccess(cleanId, account);
      if (!hasAccess) {
        setAccessStatus("DENIED_OR_EXPIRED");
        throw new Error("Access Denied: No active or unexpired consent grant on MST Blockchain.");
      }

      setAccessStatus("ACTIVE");

      // 2. Fetch decrypted data from backend
      const res = await fetch(`/api/records/${cleanId}/access`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ providerAddress: account }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setDecryptedFileContent(atob(data.dataBase64));

      // 3. Emit on-chain audit log
      const logTx = await contract.logAccess(cleanId);
      addTimelineEvent(logTx.hash, `Access Audited on MSTScan (Record ${cleanId.slice(0, 8)}...)`);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to decrypt record.");
      setDecryptedFileContent(null);
    } finally {
      setProviderLoading(false);
    }
  };

  // Page 4: Gated AI Clinical Summary
  const handleProviderAISummary = async () => {
    if (!account || !selectedRecordId) return;
    setProviderLoading(true);
    setErrorMessage(null);
    try {
      const cleanId = selectedRecordId.trim().replace(/\.enc$/i, "");
      const res = await fetch(`/api/records/${cleanId}/summary`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ providerAddress: account }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setAiClinicalSummary(data.summary);
    } catch (err: any) {
      setErrorMessage(err.message || "AI access blocked. Consent not active on MST.");
    } finally {
      setProviderLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Top Application Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-sm shadow-indigo-100">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base text-slate-900 tracking-tight">
                  MediChain
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700">
                  MST Testnet
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Patient Consent & Access-Audit Layer
              </p>
            </div>
          </div>

          {/* 5-Page Navigation Bar as per Specification */}
          <nav className="flex bg-slate-100 p-1 rounded-xl gap-1 text-xs font-semibold">
            <button
              onClick={() => setActivePage("patient")}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition ${
                activePage === "patient"
                  ? "bg-white text-indigo-700 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <FolderHeart className="w-3.5 h-3.5" />
              <span>Patient Dashboard</span>
            </button>

            <button
              onClick={() => setActivePage("requests")}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition relative ${
                activePage === "requests"
                  ? "bg-white text-indigo-700 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Inbox className="w-3.5 h-3.5" />
              <span>Consent Requests</span>
              {incomingRequests.filter((r) => r.status === 0).length > 0 && (
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              )}
            </button>

            <button
              onClick={() => setActivePage("provider")}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition ${
                activePage === "provider"
                  ? "bg-white text-indigo-700 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Stethoscope className="w-3.5 h-3.5" />
              <span>Provider View</span>
            </button>

            <button
              onClick={() => setActivePage("audit")}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition ${
                activePage === "audit"
                  ? "bg-white text-indigo-700 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Audit Timeline</span>
            </button>
          </nav>

          {/* Wallet Connect (BridgeKey) */}
          <div>
            {account ? (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-700">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>{account.slice(0, 6)}...{account.slice(-4)}</span>
              </div>
            ) : (
              <button
                onClick={handleConnectWallet}
                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
              >
                Connect BridgeKey
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Banner / Error Alerts */}
      {bannerNotice && (
        <div className="bg-emerald-600 text-white text-xs px-4 py-2 text-center font-medium shadow-sm flex items-center justify-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{bannerNotice}</span>
        </div>
      )}

      {errorMessage && (
        <div className="bg-rose-600 text-white text-xs px-4 py-2 text-center font-medium shadow-sm flex items-center justify-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMessage}</span>
          <button onClick={() => setErrorMessage(null)} className="underline ml-2">
            Dismiss
          </button>
        </div>
      )}

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-8 space-y-8">
        {/* ========================================================================= */}
        {/* PAGE 1 & 2: PATIENT DASHBOARD (Upload Records + My Records List) */}
        {/* ========================================================================= */}
        {activePage === "patient" && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-indigo-900 to-slate-900 text-white p-6 rounded-3xl shadow-sm flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold flex items-center gap-2">
                  <FolderHeart className="w-5 h-5 text-indigo-400" />
                  <span>Patient Medical Records Vault</span>
                </h2>
                <p className="text-xs text-slate-300 mt-1">
                  Upload and encrypt your clinical records with AES-256-GCM. Hashes and access rules are registered on MST Blockchain.
                </p>
              </div>
              <div className="px-3 py-1 bg-white/10 rounded-xl text-[11px] font-mono border border-white/15">
                Zero PII On-Chain
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Upload Card */}
              <div className="md:col-span-1 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                  <Lock className="w-4 h-4 text-indigo-600" />
                  <h3 className="font-bold text-sm text-slate-900">Encrypt & Register</h3>
                </div>

                <form onSubmit={handleUploadRecord} className="space-y-3 text-xs">
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
                    📄 Using pre-loaded synthetic clinical blood panel for testing.
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
                        <Upload className="w-3.5 h-3.5" />
                        <span>Sign & Register on MST</span>
                      </>
                    )}
                  </button>
                </form>
              </div>

              {/* My Registered Records List */}
              <div className="md:col-span-2 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-indigo-600" />
                    <h3 className="font-bold text-sm text-slate-900">
                      My Registered Records ({records.length})
                    </h3>
                  </div>
                  <button
                    onClick={refreshData}
                    className="text-[11px] text-indigo-600 hover:underline flex items-center gap-1 font-semibold"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Refresh</span>
                  </button>
                </div>

                {records.length === 0 ? (
                  <p className="text-xs text-slate-500 py-12 text-center">
                    No records found. Use the panel on the left to encrypt and register your first record on MST Blockchain.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {records.map((r) => (
                      <div
                        key={r.recordId}
                        className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/60 space-y-1.5 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900 text-sm">
                            {r.title}
                          </span>
                          <span className="text-[10px] font-mono bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-bold">
                            AES-256 Encrypted
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-slate-500 font-mono text-[11px]">
                          <div>
                            <strong>Record ID:</strong> {r.recordId.slice(0, 16)}...
                          </div>
                          <div>
                            <strong>SHA-256 Hash:</strong> {r.fileHash.slice(0, 16)}...
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-1">
                          <span className="text-[11px] text-slate-400">
                            Storage: {r.storagePointer}
                          </span>
                          <button
                            onClick={() => {
                              setSelectedRecordId(r.recordId);
                              setActivePage("provider");
                              setBannerNotice("Switched to Provider View with Record ID pre-filled!");
                            }}
                            className="text-xs text-indigo-600 hover:underline font-bold flex items-center gap-1"
                          >
                            <span>Open in Provider View</span>
                            <ChevronRight className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* PAGE 3: ACCESS REQUESTS (Incoming Requests + Grant / Deny Buttons) */}
        {/* ========================================================================= */}
        {activePage === "requests" && (
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Inbox className="w-5 h-5 text-amber-500" />
                  <span>Incoming Provider Consent Requests</span>
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Healthcare providers requesting permission to view your encrypted medical data.
                </p>
              </div>
              <button
                onClick={refreshData}
                className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1 border border-slate-200"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Refresh On-Chain</span>
              </button>
            </div>

            {incomingRequests.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500 space-y-2">
                <p>No access requests pending for your records.</p>
                <p className="text-[11px] text-slate-400">
                  Switch to the <strong>Provider View</strong> tab to submit a clinical access request.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {incomingRequests.map((req) => (
                  <div
                    key={req.id}
                    className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">
                          Request #{req.id}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            req.status === 0
                              ? "bg-amber-50 text-amber-800 border border-amber-200"
                              : req.status === 1
                              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                              : "bg-rose-50 text-rose-800 border border-rose-200"
                          }`}
                        >
                          {req.status === 0
                            ? "Pending Decision"
                            : req.status === 1
                            ? "Consent Granted"
                            : "Consent Denied"}
                        </span>
                      </div>
                      <p className="text-slate-700">
                        <strong>Clinical Purpose:</strong> {req.purpose}
                      </p>
                      <p className="text-slate-500 font-mono text-[11px]">
                        Doctor Wallet: {req.provider} • Validity: {req.durationHours} Hours
                      </p>
                    </div>

                    {req.status === 0 && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleGrantAccess(req.id)}
                          disabled={requestActionLoading !== null}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs transition shadow-sm disabled:opacity-50"
                        >
                          {requestActionLoading === req.id ? "Confirming..." : "Grant Consent"}
                        </button>
                        <button
                          onClick={() => handleDenyAccess(req.id)}
                          disabled={requestActionLoading !== null}
                          className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs transition shadow-sm disabled:opacity-50"
                        >
                          Deny
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* PAGE 4: PROVIDER VIEW (Request Access + Decrypt + AI Summary) */}
        {/* ========================================================================= */}
        {activePage === "provider" && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white p-6 rounded-3xl shadow-sm">
              <h2 className="text-base font-bold flex items-center gap-2">
                <Stethoscope className="w-5 h-5 text-indigo-400" />
                <span>Healthcare Provider Workstation</span>
              </h2>
              <p className="text-xs text-slate-300 mt-1">
                Submit an on-chain request to the patient. Once approved on MST Blockchain, decrypt the document and review the clinical brief.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Form 1: Request Access */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <h3 className="font-bold text-sm text-slate-900 border-b border-slate-100 pb-3">
                  Step 1: Request Access from Patient
                </h3>

                <form onSubmit={handleProviderRequest} className="space-y-3 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Select Patient Record
                    </label>
                    {records.length > 0 ? (
                      <select
                        value={selectedRecordId}
                        onChange={(e) => setSelectedRecordId(e.target.value)}
                        className="w-full px-3 py-2 bg-indigo-50/60 border border-indigo-200 rounded-xl text-xs font-semibold text-indigo-900 focus:outline-none"
                      >
                        <option value="">-- Choose registered record --</option>
                        {records.map((r) => (
                          <option key={r.recordId} value={r.recordId}>
                            📄 {r.title} ({r.recordId.slice(0, 8)}...{r.recordId.slice(-6)})
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={selectedRecordId}
                        onChange={(e) => setSelectedRecordId(e.target.value.trim().replace(/\.enc$/i, ""))}
                        placeholder="0x..."
                        required
                        className="w-full font-mono px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      />
                    )}
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Clinical Purpose / Justification
                    </label>
                    <input
                      type="text"
                      value={requestPurpose}
                      onChange={(e) => setRequestPurpose(e.target.value)}
                      required
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Access Validity Window
                    </label>
                    <select
                      value={requestDurationHours}
                      onChange={(e) => setRequestDurationHours(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    >
                      <option value="1">1 Hour (Outpatient Consult)</option>
                      <option value="24">24 Hours (Standard Review)</option>
                      <option value="72">72 Hours (Inpatient Ward)</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    disabled={providerLoading || !selectedRecordId}
                    className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold transition shadow-sm disabled:opacity-50"
                  >
                    {providerLoading ? "Submitting on MST..." : "Send Request to Patient"}
                  </button>
                </form>
              </div>

              {/* Form 2: Decrypt & View (Gated) */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="font-bold text-sm text-slate-900">
                    Step 2: Decrypt & AI Review (Gated)
                  </h3>
                  {accessStatus === "ACTIVE" && (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-mono">
                      Consent Active
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-500">
                  The backend queries the MST smart contract. Decryption and AI analysis are cryptographically forbidden unless valid consent exists.
                </p>

                <div className="flex gap-2">
                  <button
                    onClick={handleProviderDecrypt}
                    disabled={providerLoading || !selectedRecordId}
                    className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    <FileDown className="w-3.5 h-3.5" />
                    <span>Verify & Decrypt</span>
                  </button>

                  <button
                    onClick={handleProviderAISummary}
                    disabled={providerLoading || !selectedRecordId}
                    className="px-4 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:opacity-90 text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>AI Brief</span>
                  </button>
                </div>

                {decryptedFileContent && (
                  <div className="space-y-2 pt-2">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-900">
                      <span>Decrypted Clinical Document</span>
                      <span className="text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full font-mono">
                        Verified On-Chain
                      </span>
                    </div>
                    <pre className="p-3 bg-slate-900 text-emerald-400 font-mono text-[11px] rounded-xl overflow-x-auto whitespace-pre-wrap max-h-48">
                      {decryptedFileContent}
                    </pre>
                  </div>
                )}

                {aiClinicalSummary && (
                  <div className="p-4 bg-violet-50 rounded-xl border border-violet-200 space-y-2 text-xs">
                    <div className="flex items-center gap-1.5 font-bold text-violet-900">
                      <Sparkles className="w-4 h-4 text-violet-600" />
                      <span>{aiClinicalSummary.summaryType}</span>
                    </div>
                    <ul className="list-disc list-inside space-y-1 text-slate-700">
                      {aiClinicalSummary.highlights.map((h: string, i: number) => (
                        <li key={i}>{h}</li>
                      ))}
                    </ul>
                    <div className="text-[10px] text-violet-700 font-mono pt-1">
                      {aiClinicalSummary.complianceNote}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* PAGE 5: ON-CHAIN ACTIVITY TIMELINE (Links to MSTScan) */}
        {/* ========================================================================= */}
        {activePage === "audit" && (
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="font-bold text-base text-slate-900 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-indigo-600" />
                  <span>On-Chain Activity Timeline</span>
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Every consent decision, access request, and audit log confirmed on the MST Blockchain Testnet.
                </p>
              </div>
              {contractAddress && (
                <a
                  href={`https://mstscan.com/address/${contractAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-mono text-slate-700 flex items-center gap-1.5 transition"
                >
                  <span>Contract: {contractAddress.slice(0, 8)}...{contractAddress.slice(-6)}</span>
                  <ExternalLink className="w-3 h-3 text-slate-400" />
                </a>
              )}
            </div>

            {timelineEvents.length === 0 ? (
              <p className="text-xs text-slate-500 py-12 text-center">
                No transactions recorded in this session yet. Upload a record or grant consent to see live MSTScan links appear here!
              </p>
            ) : (
              <div className="space-y-3">
                {timelineEvents.map((evt) => (
                  <div
                    key={evt.id}
                    className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/60 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-bold text-slate-900">{evt.title}</div>
                      <div className="font-mono text-[11px] text-slate-500">Tx: {evt.txHash}</div>
                    </div>
                    <a
                      href={`https://mstscan.com/tx/${evt.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-lg transition flex items-center gap-1"
                    >
                      <span>View on MSTScan</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500">
        MediChain Protocol • MST Blockchain Buildathon (Chain ID: 91562037)
      </footer>
    </div>
  );
}
