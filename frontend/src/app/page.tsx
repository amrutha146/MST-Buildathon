"use client";

import React, { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { PatientDashboard } from "@/components/PatientDashboard";
import { ProviderPortal } from "@/components/ProviderPortal";
import { AuditTimeline, AuditEventItem } from "@/components/AuditTimeline";
import { connectBridgeKey, getContractAddress, getMedicalConsentContract } from "@/lib/mst";
import {
  ShieldCheck,
  Zap,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  FileText,
  UserCheck,
  Lock,
  Sparkles,
  ExternalLink,
} from "lucide-react";

export default function App() {
  const [account, setAccount] = useState<string | null>(null);
  const [signer, setSigner] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<"guided" | "patient" | "provider" | "audit">("guided");
  const [events, setEvents] = useState<AuditEventItem[]>([]);
  const [contractAddress, setContractAddress] = useState<string>("");
  const [bannerNotice, setBannerNotice] = useState<string | null>(null);

  // Guided 1-Click State
  const [activeRecordId, setActiveRecordId] = useState<string>("");
  const [stepLoading, setStepLoading] = useState<number | null>(null);
  const [stepSuccess, setStepSuccess] = useState<number>(0); // 0: None, 1: Reg, 2: Req, 3: Grant, 4: Decrypt
  const [decryptedText, setDecryptedText] = useState<string | null>(null);
  const [aiSummary, setAiSummary] = useState<any | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setContractAddress(getContractAddress());
  }, []);

  const handleConnect = async () => {
    try {
      const { address, signer: sig } = await connectBridgeKey();
      setAccount(address);
      setSigner(sig);
      setBannerNotice(`Connected: ${address.slice(0, 6)}...${address.slice(-4)}`);
      setTimeout(() => setBannerNotice(null), 5000);
    } catch (e: any) {
      setErrorMessage(e.message || "Could not connect to wallet.");
    }
  };

  const logTx = (txHash: string, title: string) => {
    const newEvent: AuditEventItem = {
      id: txHash + "_" + Date.now(),
      type: "TRANSACTION",
      txHash,
      title,
      timestamp: new Date().toLocaleTimeString(),
    };
    setEvents((prev) => [newEvent, ...prev]);
    setBannerNotice(`Confirmed on MST Testnet: ${title}`);
    setTimeout(() => setBannerNotice(null), 6000);
  };

  // --- 1-CLICK GUIDED DEMO STEPS ---

  // Step 1: Encrypt & Register
  const executeStep1Register = async () => {
    if (!account || !signer) {
      await handleConnect();
      return;
    }
    setStepLoading(1);
    setErrorMessage(null);
    try {
      const dummyBlob = new Blob(
        [
          `METROPOLITAN CLINICAL LABORATORIES - BLOOD REPORT\nPATIENT WALLET: ${account}\nTOTAL CHOLESTEROL: 218 mg/dL (BORDERLINE HIGH)\nFASTING GLUCOSE: 98 mg/dL (NORMAL)\nSTATUS: STABLE CLINICAL CONDITION`,
        ],
        { type: "text/plain" }
      );
      const fileToUpload = new File([dummyBlob], "blood_report.txt", { type: "text/plain" });

      const formData = new FormData();
      formData.append("file", fileToUpload);
      formData.append("patientAddress", account);
      formData.append("title", "Comprehensive Blood & Lipid Panel");

      const res = await fetch("/api/records/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Encryption failed");

      setActiveRecordId(data.recordId);

      const contract = getMedicalConsentContract(signer);
      const tx = await contract.registerRecord(data.recordId, data.fileHash, data.storagePointer);
      logTx(tx.hash, "Step 1: Patient Registered Record on MST");
      await tx.wait();

      setStepSuccess(1);
    } catch (err: any) {
      setErrorMessage(err.message || "Step 1 failed.");
    } finally {
      setStepLoading(null);
    }
  };

  // Step 2: Request Access
  const executeStep2Request = async () => {
    if (!signer || !activeRecordId) return;
    setStepLoading(2);
    setErrorMessage(null);
    try {
      const contract = getMedicalConsentContract(signer);
      const tx = await contract.requestAccess(
        activeRecordId,
        "Cardiology Clinical Review (Buildathon Demo)",
        86400 // 24 hours
      );
      logTx(tx.hash, "Step 2: Doctor Requested Consent on MST");
      await tx.wait();

      setStepSuccess(2);
    } catch (err: any) {
      setErrorMessage(err.message || "Step 2 failed.");
    } finally {
      setStepLoading(null);
    }
  };

  // Step 3: Grant Access
  const executeStep3Grant = async () => {
    if (!signer) return;
    setStepLoading(3);
    setErrorMessage(null);
    try {
      const contract = getMedicalConsentContract(signer);
      const reqCount = await contract.requestCounter();
      const currentReqId = Number(reqCount);

      const tx = await contract.grantAccess(currentReqId);
      logTx(tx.hash, `Step 3: Patient Granted 24h Access (Req #${currentReqId})`);
      await tx.wait();

      setStepSuccess(3);
    } catch (err: any) {
      setErrorMessage(err.message || "Step 3 failed.");
    } finally {
      setStepLoading(null);
    }
  };

  // Step 4: Gated Decrypt & AI Summary
  const executeStep4DecryptAndAI = async () => {
    if (!signer || !activeRecordId || !account) return;
    setStepLoading(4);
    setErrorMessage(null);
    try {
      // 1. Verify and decrypt
      const res = await fetch(`/api/records/${activeRecordId}/access`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ providerAddress: account }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gated decryption failed");

      setDecryptedText(atob(data.dataBase64));

      // 2. Fetch AI Summary
      const sumRes = await fetch(`/api/records/${activeRecordId}/summary`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ providerAddress: account }),
      });
      const sumData = await sumRes.json();
      if (sumData.summary) setAiSummary(sumData.summary);

      // 3. Log access on-chain
      const contract = getMedicalConsentContract(signer);
      const logTxRes = await contract.logAccess(activeRecordId);
      logTx(logTxRes.hash, "Step 4: On-Chain Access Logged to MSTScan");

      setStepSuccess(4);
    } catch (err: any) {
      setErrorMessage(err.message || "Step 4 failed.");
    } finally {
      setStepLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Navbar
        account={account}
        onConnect={handleConnect}
        activeTab={activeTab as any}
        setActiveTab={setActiveTab as any}
      />

      {/* Confirmation notice toast */}
      {bannerNotice && (
        <div className="bg-emerald-600 text-white text-xs px-4 py-2.5 text-center font-medium shadow-sm flex items-center justify-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{bannerNotice}</span>
        </div>
      )}

      {/* Error notice */}
      {errorMessage && (
        <div className="bg-rose-600 text-white text-xs px-4 py-2.5 text-center font-medium shadow-sm flex items-center justify-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMessage}</span>
          <button onClick={() => setErrorMessage(null)} className="underline ml-2">
            Dismiss
          </button>
        </div>
      )}

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Navigation Selector */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              MediChain Protocol
            </h1>
            <p className="text-xs text-slate-500">
              Patient Consent & Access-Audit Layer on MST Blockchain Testnet
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab("guided")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
                activeTab === "guided"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>1-Click Guided Demo</span>
            </button>
            <button
              onClick={() => setActiveTab("patient")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                activeTab === "patient"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              Patient Tab
            </button>
            <button
              onClick={() => setActiveTab("provider")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                activeTab === "provider"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              Doctor Tab
            </button>
            <button
              onClick={() => setActiveTab("audit")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                activeTab === "audit"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              Audit Timeline
            </button>
          </div>
        </div>

        {/* GUIDED 1-CLICK DEMO (ZERO TEDIOUS COPY-PASTE) */}
        {activeTab === "guided" && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-indigo-900 to-slate-900 rounded-3xl p-6 text-white shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-amber-400" />
                  <h2 className="font-bold text-base">
                    Quick 1-Click Interactive Judge Demo
                  </h2>
                </div>
                <p className="text-xs text-slate-300 mt-1">
                  Experience the entire on-chain medical consent lifecycle in 4 clear, sequential clicks with zero manual copying.
                </p>
              </div>
              {!account ? (
                <button
                  onClick={handleConnect}
                  className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl text-xs font-bold transition shadow-sm"
                >
                  Connect BridgeKey First
                </button>
              ) : (
                <div className="px-3 py-1.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-mono">
                  Wallet: {account.slice(0, 6)}...{account.slice(-4)}
                </div>
              )}
            </div>

            {/* 4 Interactive Demo Steps */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Step 1 */}
              <div
                className={`p-5 rounded-2xl border transition-all ${
                  stepSuccess >= 1
                    ? "bg-emerald-50/60 border-emerald-200"
                    : "bg-white border-slate-200 shadow-sm"
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center">
                    1
                  </span>
                  {stepSuccess >= 1 ? (
                    <span className="text-[10px] font-bold text-emerald-600 uppercase">
                      Registered
                    </span>
                  ) : (
                    <Lock className="w-4 h-4 text-slate-400" />
                  )}
                </div>
                <h3 className="font-bold text-sm text-slate-900 mb-1">
                  Encrypt & Register
                </h3>
                <p className="text-xs text-slate-500 mb-4">
                  Patient encrypts medical report (AES-256) and stores hash on MST.
                </p>
                <button
                  onClick={executeStep1Register}
                  disabled={stepLoading !== null}
                  className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition ${
                    stepSuccess >= 1
                      ? "bg-emerald-600 text-white"
                      : "bg-indigo-600 hover:bg-indigo-700 text-white"
                  }`}
                >
                  {stepLoading === 1 ? "Confirming..." : stepSuccess >= 1 ? "✓ Record Registered" : "1. Click to Register"}
                </button>
              </div>

              {/* Step 2 */}
              <div
                className={`p-5 rounded-2xl border transition-all ${
                  stepSuccess >= 2
                    ? "bg-emerald-50/60 border-emerald-200"
                    : "bg-white border-slate-200 shadow-sm"
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center">
                    2
                  </span>
                  {stepSuccess >= 2 ? (
                    <span className="text-[10px] font-bold text-emerald-600 uppercase">
                      Requested
                    </span>
                  ) : (
                    <FileText className="w-4 h-4 text-slate-400" />
                  )}
                </div>
                <h3 className="font-bold text-sm text-slate-900 mb-1">
                  Doctor Requests
                </h3>
                <p className="text-xs text-slate-500 mb-4">
                  Healthcare provider requests 24h access for clinical evaluation.
                </p>
                <button
                  onClick={executeStep2Request}
                  disabled={stepLoading !== null || stepSuccess < 1}
                  className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition disabled:opacity-40 ${
                    stepSuccess >= 2
                      ? "bg-emerald-600 text-white"
                      : "bg-slate-900 hover:bg-slate-800 text-white"
                  }`}
                >
                  {stepLoading === 2 ? "Confirming..." : stepSuccess >= 2 ? "✓ Consent Requested" : "2. Click to Request"}
                </button>
              </div>

              {/* Step 3 */}
              <div
                className={`p-5 rounded-2xl border transition-all ${
                  stepSuccess >= 3
                    ? "bg-emerald-50/60 border-emerald-200"
                    : "bg-white border-slate-200 shadow-sm"
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center">
                    3
                  </span>
                  {stepSuccess >= 3 ? (
                    <span className="text-[10px] font-bold text-emerald-600 uppercase">
                      Granted
                    </span>
                  ) : (
                    <UserCheck className="w-4 h-4 text-slate-400" />
                  )}
                </div>
                <h3 className="font-bold text-sm text-slate-900 mb-1">
                  Patient Grants
                </h3>
                <p className="text-xs text-slate-500 mb-4">
                  Patient signs on-chain time-decay consent grant on MST.
                </p>
                <button
                  onClick={executeStep3Grant}
                  disabled={stepLoading !== null || stepSuccess < 2}
                  className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition disabled:opacity-40 ${
                    stepSuccess >= 3
                      ? "bg-emerald-600 text-white"
                      : "bg-indigo-600 hover:bg-indigo-700 text-white"
                  }`}
                >
                  {stepLoading === 3 ? "Confirming..." : stepSuccess >= 3 ? "✓ Consent Granted" : "3. Click to Grant"}
                </button>
              </div>

              {/* Step 4 */}
              <div
                className={`p-5 rounded-2xl border transition-all ${
                  stepSuccess >= 4
                    ? "bg-emerald-50/60 border-emerald-200"
                    : "bg-white border-slate-200 shadow-sm"
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center">
                    4
                  </span>
                  {stepSuccess >= 4 ? (
                    <span className="text-[10px] font-bold text-emerald-600 uppercase">
                      Verified
                    </span>
                  ) : (
                    <Sparkles className="w-4 h-4 text-slate-400" />
                  )}
                </div>
                <h3 className="font-bold text-sm text-slate-900 mb-1">
                  Decrypt & AI Digest
                </h3>
                <p className="text-xs text-slate-500 mb-4">
                  Checks hasAccess(), releases report, and generates clinical summary.
                </p>
                <button
                  onClick={executeStep4DecryptAndAI}
                  disabled={stepLoading !== null || stepSuccess < 3}
                  className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition disabled:opacity-40 ${
                    stepSuccess >= 4
                      ? "bg-emerald-600 text-white"
                      : "bg-gradient-to-r from-violet-600 to-indigo-600 hover:opacity-90 text-white"
                  }`}
                >
                  {stepLoading === 4 ? "Decrypting..." : stepSuccess >= 4 ? "✓ Access Verified" : "4. Verify & Decrypt"}
                </button>
              </div>
            </div>

            {/* Results Area */}
            {activeRecordId && (
              <div className="p-4 rounded-2xl bg-slate-100 border border-slate-200 text-xs flex items-center justify-between">
                <div className="font-mono text-slate-700 truncate mr-2">
                  <strong>Active Record ID:</strong> {activeRecordId}
                </div>
                <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-semibold text-[11px] flex-shrink-0">
                  {stepSuccess === 0 ? "Ready" : stepSuccess === 1 ? "Registered" : stepSuccess === 2 ? "Access Requested" : stepSuccess === 3 ? "Consent Granted" : "Access Active & Verified"}
                </span>
              </div>
            )}

            {/* Decrypted Report & AI Assistant Output */}
            {decryptedText && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-slate-900">
                      Decrypted Clinical Document
                    </span>
                    <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full">
                      AES-256 Decrypted
                    </span>
                  </div>
                  <pre className="p-3 bg-slate-900 text-emerald-400 font-mono text-[11px] rounded-xl overflow-x-auto whitespace-pre-wrap max-h-56">
                    {decryptedText}
                  </pre>
                </div>

                {aiSummary && (
                  <div className="bg-violet-50/70 p-5 rounded-2xl border border-violet-200 shadow-sm space-y-3">
                    <div className="flex items-center gap-2 text-violet-900 font-bold text-sm">
                      <Sparkles className="w-4 h-4 text-violet-600" />
                      <span>{aiSummary.summaryType}</span>
                    </div>
                    <ul className="list-disc list-inside space-y-1.5 text-xs text-slate-700">
                      {aiSummary.highlights.map((h: string, idx: number) => (
                        <li key={idx}>{h}</li>
                      ))}
                    </ul>
                    <div className="text-[11px] text-violet-700 font-mono pt-1">
                      {aiSummary.complianceNote}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Regular Tabs */}
        {activeTab === "patient" && (
          <PatientDashboard
            account={account}
            signer={signer}
            onTxSuccess={logTx}
          />
        )}

        {activeTab === "provider" && (
          <ProviderPortal
            account={account}
            signer={signer}
            onTxSuccess={logTx}
          />
        )}

        {activeTab === "audit" && (
          <AuditTimeline
            events={events}
            contractAddress={contractAddress}
          />
        )}
      </main>

      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
        <p>
          MediChain Protocol • Deployed on <strong>MST Blockchain Testnet</strong> (Contract: {contractAddress ? `${contractAddress.slice(0, 8)}...` : "Live"})
        </p>
      </footer>
    </div>
  );
}
