"use client";

import React, { useState, useEffect } from "react";
import { connectBridgeKey, getContractAddress, getMedicalConsentContract } from "@/lib/mst";
import {
  User,
  Stethoscope,
  ShieldCheck,
  Lock,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Sparkles,
  FileText,
  Activity,
  ExternalLink,
  ChevronRight,
  Shield,
  Loader2,
} from "lucide-react";

export default function App() {
  const [account, setAccount] = useState<string | null>(null);
  const [signer, setSigner] = useState<any | null>(null);
  const [role, setRole] = useState<"patient" | "doctor" | "audit">("patient");
  const [contractAddress, setContractAddress] = useState<string>("");
  const [bannerNotice, setBannerNotice] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Patient states
  const [patientRecords, setPatientRecords] = useState<any[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<any[]>([]);
  const [uploadLoading, setUploadLoading] = useState(false);

  // Doctor states
  const [targetRecordId, setTargetRecordId] = useState("");
  const [doctorPurpose, setDoctorPurpose] = useState("Cardiology Outpatient Review");
  const [doctorDuration, setDoctorDuration] = useState("24");
  const [doctorLoading, setDoctorLoading] = useState(false);
  const [decryptedReport, setDecryptedReport] = useState<string | null>(null);
  const [aiSummary, setAiSummary] = useState<any | null>(null);

  // Audit timeline events
  const [auditEvents, setAuditEvents] = useState<any[]>([]);

  useEffect(() => {
    setContractAddress(getContractAddress());
  }, []);

  const handleConnect = async () => {
    try {
      const { address, signer: sig } = await connectBridgeKey();
      setAccount(address);
      setSigner(sig);
      setBannerNotice(`BridgeKey Connected: ${address.slice(0, 6)}...${address.slice(-4)}`);
      setTimeout(() => setBannerNotice(null), 5000);
    } catch (e: any) {
      setErrorMessage(e.message || "Failed to connect BridgeKey.");
    }
  };

  const addAuditLog = (txHash: string, title: string) => {
    setAuditEvents((prev) => [
      {
        id: txHash + "_" + Date.now(),
        txHash,
        title,
        timestamp: new Date().toLocaleTimeString(),
      },
      ...prev,
    ]);
    setBannerNotice(`On-Chain Event: ${title}`);
    setTimeout(() => setBannerNotice(null), 6000);
  };

  // --- PATIENT ACTIONS ---

  // Fetch patient records and pending requests
  const loadPatientData = async () => {
    if (!account) return;
    try {
      // 1. Fetch encrypted records from storage
      const res = await fetch(`/api/records/list?address=${account}`);
      const data = await res.json();
      if (data.records) setPatientRecords(data.records);

      // 2. Fetch on-chain access requests
      if (signer) {
        const contract = getMedicalConsentContract(signer);
        const total = Number(await contract.requestCounter());
        const reqs: any[] = [];
        for (let i = 1; i <= total; i++) {
          const r = await contract.accessRequests(i);
          const rec = await contract.getRecord(r.recordId);
          if (rec.patient.toLowerCase() === account.toLowerCase()) {
            reqs.push({
              id: i,
              recordId: r.recordId,
              provider: r.provider,
              purpose: r.purpose,
              durationHours: Number(r.durationSeconds) / 3600,
              status: Number(r.status), // 0: Pending, 1: Granted, 2: Denied
            });
          }
        }
        setIncomingRequests(reqs.reverse());
      }
    } catch (e) {
      console.warn("Could not refresh patient data:", e);
    }
  };

  useEffect(() => {
    loadPatientData();
  }, [account, signer, role]);

  const handlePatientUpload = async () => {
    if (!account || !signer) {
      await handleConnect();
      return;
    }
    setUploadLoading(true);
    setErrorMessage(null);
    try {
      const dummyBlob = new Blob(
        [
          `METROPOLITAN CLINICAL LABORATORIES - COMPREHENSIVE LAB PANEL\nPATIENT WALLET: ${account}\nTOTAL CHOLESTEROL: 218 mg/dL (BORDERLINE HIGH)\nFASTING BLOOD GLUCOSE: 98 mg/dL (NORMAL)\nSTATUS: CLINICALLY STABLE - DIETARY MODIFICATION RECOMMENDED`,
        ],
        { type: "text/plain" }
      );
      const file = new File([dummyBlob], "annual_blood_panel.txt", { type: "text/plain" });

      const formData = new FormData();
      formData.append("file", file);
      formData.append("patientAddress", account);
      formData.append("title", "Annual Metabolic & Blood Panel");

      const res = await fetch("/api/records/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // Register on MST Testnet
      const contract = getMedicalConsentContract(signer);
      const tx = await contract.registerRecord(data.recordId, data.fileHash, data.storagePointer);
      addAuditLog(tx.hash, "Patient Registered Encrypted Record");
      await tx.wait();

      setTargetRecordId(data.recordId);
      await loadPatientData();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to register record.");
    } finally {
      setUploadLoading(false);
    }
  };

  const handlePatientGrant = async (requestId: number) => {
    if (!signer) return;
    try {
      const contract = getMedicalConsentContract(signer);
      const tx = await contract.grantAccess(requestId);
      addAuditLog(tx.hash, `Patient Approved Doctor Access (Request #${requestId})`);
      await tx.wait();
      await loadPatientData();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to grant consent.");
    }
  };

  const handlePatientDeny = async (requestId: number) => {
    if (!signer) return;
    try {
      const contract = getMedicalConsentContract(signer);
      const tx = await contract.denyAccess(requestId);
      addAuditLog(tx.hash, `Patient Denied Access (Request #${requestId})`);
      await tx.wait();
      await loadPatientData();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to deny access.");
    }
  };

  // --- DOCTOR ACTIONS ---

  const handleDoctorRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signer || !targetRecordId) return;
    setDoctorLoading(true);
    setErrorMessage(null);
    try {
      const cleanId = targetRecordId.trim().replace(/\.enc$/i, "");
      const contract = getMedicalConsentContract(signer);
      const tx = await contract.requestAccess(
        cleanId,
        doctorPurpose,
        Number(doctorDuration) * 3600
      );
      addAuditLog(tx.hash, "Doctor Submitted Access Request to Patient");
      await tx.wait();
      setBannerNotice("Request sent to patient. Patient must grant access in their portal.");
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to submit request.");
    } finally {
      setDoctorLoading(false);
    }
  };

  const handleDoctorDecrypt = async () => {
    if (!account || !signer || !targetRecordId) return;
    setDoctorLoading(true);
    setErrorMessage(null);
    try {
      const cleanId = targetRecordId.trim().replace(/\.enc$/i, "");
      const res = await fetch(`/api/records/${cleanId}/access`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ providerAddress: account }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setDecryptedReport(atob(data.dataBase64));

      // Trigger on-chain audit log
      const contract = getMedicalConsentContract(signer);
      const logTx = await contract.logAccess(cleanId);
      addAuditLog(logTx.hash, "Doctor Decrypted File (Audit Logged to MST)");
    } catch (err: any) {
      setErrorMessage(err.message || "Access denied. Patient has not granted consent yet.");
    } finally {
      setDoctorLoading(false);
    }
  };

  const handleDoctorAISummary = async () => {
    if (!account || !targetRecordId) return;
    setDoctorLoading(true);
    setErrorMessage(null);
    try {
      const cleanId = targetRecordId.trim().replace(/\.enc$/i, "");
      const res = await fetch(`/api/records/${cleanId}/summary`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ providerAddress: account }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setAiSummary(data.summary);
    } catch (err: any) {
      setErrorMessage(err.message || "AI access blocked. No active consent on MST.");
    } finally {
      setDoctorLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Universal Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
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
                Patient-Controlled Consent & Audit Layer
              </p>
            </div>
          </div>

          {/* Persona Switcher */}
          <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
            <button
              onClick={() => setRole("patient")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                role === "patient"
                  ? "bg-white text-indigo-700 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>I am a Patient</span>
            </button>
            <button
              onClick={() => setRole("doctor")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                role === "doctor"
                  ? "bg-white text-indigo-700 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Stethoscope className="w-3.5 h-3.5" />
              <span>I am a Doctor</span>
            </button>
            <button
              onClick={() => setRole("audit")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                role === "audit"
                  ? "bg-white text-indigo-700 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Audit Log</span>
            </button>
          </div>

          {/* Wallet Status */}
          <div>
            {account ? (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-700">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>{account.slice(0, 6)}...{account.slice(-4)}</span>
              </div>
            ) : (
              <button
                onClick={handleConnect}
                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
              >
                Connect BridgeKey
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Notifications */}
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

      {/* Main Persona Workspaces */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-8 space-y-8">
        {/* ========================================================= */}
        {/* PERSONA 1: PATIENT PORTAL */}
        {/* ========================================================= */}
        {role === "patient" && (
          <div className="space-y-6">
            {/* Patient Header */}
            <div className="bg-gradient-to-r from-indigo-900 to-slate-900 text-white p-6 rounded-3xl shadow-sm space-y-2">
              <div className="flex items-center gap-2">
                <User className="w-5 h-5 text-indigo-400" />
                <h2 className="text-base font-bold">Patient Sovereign Vault</h2>
              </div>
              <p className="text-xs text-slate-300 max-w-xl">
                You own your medical records. They are encrypted with <strong>AES-256</strong>. Doctors cannot see anything without your signed permission on the <strong>MST Blockchain</strong>.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Card 1: My Records */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-indigo-600" />
                    <h3 className="font-bold text-sm text-slate-900">
                      My Medical Records ({patientRecords.length})
                    </h3>
                  </div>
                  <button
                    onClick={handlePatientUpload}
                    disabled={uploadLoading}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                  >
                    {uploadLoading ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span>Encrypting...</span>
                      </>
                    ) : (
                      <>
                        <span>+ Add New Record</span>
                      </>
                    )}
                  </button>
                </div>

                {patientRecords.length === 0 ? (
                  <p className="text-xs text-slate-500 py-8 text-center">
                    No records registered yet. Click <strong>+ Add New Record</strong> to encrypt and register a sample blood report on MST.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {patientRecords.map((r) => (
                      <div
                        key={r.recordId}
                        className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/60 space-y-1.5 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900">
                            {r.title}
                          </span>
                          <span className="text-[10px] font-mono bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-semibold">
                            AES-256 Encrypted
                          </span>
                        </div>
                        <div className="text-[11px] font-mono text-slate-500 truncate">
                          ID: {r.recordId}
                        </div>
                        <button
                          onClick={() => {
                            setTargetRecordId(r.recordId);
                            setRole("doctor");
                            setBannerNotice("Switched to Doctor Portal with Record ID auto-filled!");
                          }}
                          className="text-[11px] text-indigo-600 hover:underline font-semibold flex items-center gap-1 pt-1"
                        >
                          <span>Test as Doctor with this record</span>
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Card 2: Incoming Requests */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-500" />
                    <h3 className="font-bold text-sm text-slate-900">
                      Doctor Access Requests ({incomingRequests.filter((x) => x.status === 0).length})
                    </h3>
                  </div>
                  <button
                    onClick={loadPatientData}
                    className="text-[11px] text-indigo-600 hover:underline"
                  >
                    Refresh
                  </button>
                </div>

                {incomingRequests.length === 0 ? (
                  <p className="text-xs text-slate-500 py-8 text-center">
                    No doctors have requested access yet. Switch to the <strong>Doctor Portal</strong> above to send a request!
                  </p>
                ) : (
                  <div className="space-y-3">
                    {incomingRequests.map((req) => (
                      <div
                        key={req.id}
                        className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/60 space-y-2 text-xs"
                      >
                        <div className="flex items-center justify-between">
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
                              ? "Granted"
                              : "Denied"}
                          </span>
                        </div>
                        <p className="text-slate-600">
                          <strong>Purpose:</strong> {req.purpose} ({req.durationHours} hours)
                        </p>

                        {req.status === 0 && (
                          <div className="flex gap-2 pt-1">
                            <button
                              onClick={() => handlePatientGrant(req.id)}
                              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition"
                            >
                              Approve Access
                            </button>
                            <button
                              onClick={() => handlePatientDeny(req.id)}
                              className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition"
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
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* PERSONA 2: DOCTOR / CLINIC PORTAL */}
        {/* ========================================================= */}
        {role === "doctor" && (
          <div className="space-y-6">
            {/* Doctor Header */}
            <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white p-6 rounded-3xl shadow-sm space-y-2">
              <div className="flex items-center gap-2">
                <Stethoscope className="w-5 h-5 text-indigo-400" />
                <h2 className="text-base font-bold">Doctor Clinical Terminal</h2>
              </div>
              <p className="text-xs text-slate-300 max-w-xl">
                Request time-bound clinical consent from a patient. The MST Blockchain checks if the patient approved your request before allowing file decryption.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Request Form */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <h3 className="font-bold text-sm text-slate-900 border-b border-slate-100 pb-3">
                  Step 1: Request Access from Patient
                </h3>

                <form onSubmit={handleDoctorRequest} className="space-y-3 text-xs">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-semibold text-slate-700">
                        Patient Record ID
                      </label>
                      {patientRecords.length > 0 && (
                        <span className="text-[11px] text-indigo-600 font-semibold">
                          {patientRecords.length} record(s) available
                        </span>
                      )}
                    </div>

                    {patientRecords.length > 0 && (
                      <select
                        onChange={(e) => {
                          if (e.target.value) setTargetRecordId(e.target.value);
                        }}
                        className="w-full mb-2 px-3 py-2 bg-indigo-50/50 border border-indigo-200 rounded-xl text-xs font-semibold text-indigo-900 focus:outline-none"
                      >
                        <option value="">-- Click here to select a record --</option>
                        {patientRecords.map((r) => (
                          <option key={r.recordId} value={r.recordId}>
                            📄 {r.title} ({r.recordId.slice(0, 8)}...{r.recordId.slice(-6)})
                          </option>
                        ))}
                      </select>
                    )}

                    <input
                      type="text"
                      value={targetRecordId}
                      onChange={(e) => setTargetRecordId(e.target.value.trim().replace(/\.enc$/i, ""))}
                      placeholder="0x..."
                      required
                      className="w-full font-mono px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Clinical Purpose
                    </label>
                    <input
                      type="text"
                      value={doctorPurpose}
                      onChange={(e) => setDoctorPurpose(e.target.value)}
                      required
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Access Validity Window
                    </label>
                    <select
                      value={doctorDuration}
                      onChange={(e) => setDoctorDuration(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    >
                      <option value="1">1 Hour</option>
                      <option value="24">24 Hours (Standard Review)</option>
                      <option value="72">72 Hours</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    disabled={doctorLoading}
                    className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold transition shadow-sm disabled:opacity-50"
                  >
                    {doctorLoading ? "Submitting on MST..." : "Send Request to Patient"}
                  </button>
                </form>
              </div>

              {/* Decrypt Terminal */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <h3 className="font-bold text-sm text-slate-900 border-b border-slate-100 pb-3">
                  Step 2: Decrypt & View (Gated by On-Chain Consent)
                </h3>

                <p className="text-xs text-slate-500">
                  If the patient approved your request on MST Blockchain, click below to decrypt the report.
                </p>

                <div className="flex gap-2">
                  <button
                    onClick={handleDoctorDecrypt}
                    disabled={doctorLoading || !targetRecordId}
                    className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-sm disabled:opacity-50"
                  >
                    {doctorLoading ? "Verifying MST..." : "Verify Consent & Decrypt"}
                  </button>

                  <button
                    onClick={handleDoctorAISummary}
                    disabled={doctorLoading || !targetRecordId}
                    className="px-4 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:opacity-90 text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>AI Brief</span>
                  </button>
                </div>

                {decryptedReport && (
                  <div className="space-y-2 pt-2">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-900">
                      <span>Decrypted Clinical Document</span>
                      <span className="text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full font-mono">
                        Consent Verified
                      </span>
                    </div>
                    <pre className="p-3 bg-slate-900 text-emerald-400 font-mono text-[11px] rounded-xl overflow-x-auto whitespace-pre-wrap max-h-48">
                      {decryptedReport}
                    </pre>
                  </div>
                )}

                {aiSummary && (
                  <div className="p-4 bg-violet-50 rounded-xl border border-violet-200 space-y-2 text-xs">
                    <div className="flex items-center gap-1.5 font-bold text-violet-900">
                      <Sparkles className="w-4 h-4 text-violet-600" />
                      <span>{aiSummary.summaryType}</span>
                    </div>
                    <ul className="list-disc list-inside space-y-1 text-slate-700">
                      {aiSummary.highlights.map((h: string, i: number) => (
                        <li key={i}>{h}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* PERSONA 3: AUDIT TIMELINE (FOR JUDGES & AUDITORS) */}
        {/* ========================================================= */}
        {role === "audit" && (
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="font-bold text-base text-slate-900">
                  Immutable MST Blockchain Audit Log
                </h2>
                <p className="text-xs text-slate-500">
                  Every consent grant, access check, and decryption event generates a permanent signature on MST Testnet.
                </p>
              </div>
              {contractAddress && (
                <a
                  href={`https://mstscan.com/address/${contractAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-mono text-slate-700 flex items-center gap-1.5 transition"
                >
                  <span>Contract: {contractAddress.slice(0, 8)}...</span>
                  <ExternalLink className="w-3 h-3 text-slate-400" />
                </a>
              )}
            </div>

            {auditEvents.length === 0 ? (
              <p className="text-xs text-slate-500 py-12 text-center">
                No transactions executed in this session yet. Upload a record or grant access to see live transactions appear here!
              </p>
            ) : (
              <div className="space-y-3">
                {auditEvents.map((evt) => (
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
