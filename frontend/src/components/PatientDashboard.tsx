"use client";

import React, { useState, useEffect } from "react";
import {
  Upload,
  FileText,
  Lock,
  CheckCircle2,
  Clock,
  UserCheck,
  XCircle,
  AlertCircle,
  ExternalLink,
  Shield,
  Loader2,
} from "lucide-react";
import { getMedicalConsentContract } from "@/lib/mst";

interface PatientDashboardProps {
  account: string | null;
  signer: any;
  onTxSuccess: (txHash: string, title: string) => void;
}

export function PatientDashboard({ account, signer, onTxSuccess }: PatientDashboardProps) {
  const [records, setRecords] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [recordTitle, setRecordTitle] = useState("Comprehensive Metabolic & Lipid Panel");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Fetch local records
  const fetchRecords = async () => {
    if (!account) return;
    try {
      const res = await fetch(`/api/records/list?address=${account}`);
      const data = await res.json();
      if (data.records) setRecords(data.records);
    } catch (e: any) {
      console.error("Error fetching records:", e);
    }
  };

  // Fetch on-chain access requests for this patient
  const fetchOnChainRequests = async () => {
    if (!signer || !account) return;
    try {
      const contract = getMedicalConsentContract(signer);
      const totalRequests = await contract.requestCounter();
      const count = Number(totalRequests);
      const loaded: any[] = [];

      for (let i = 1; i <= count; i++) {
        const req = await contract.accessRequests(i);
        const record = await contract.getRecord(req.recordId);

        // Filter requests belonging to this patient's records
        if (record.patient.toLowerCase() === account.toLowerCase()) {
          loaded.push({
            id: i,
            recordId: req.recordId,
            provider: req.provider,
            purpose: req.purpose,
            durationSeconds: Number(req.durationSeconds),
            requestedAt: Number(req.requestedAt),
            status: Number(req.status), // 0: Pending, 1: Granted, 2: Denied
          });
        }
      }
      setRequests(loaded.reverse());
    } catch (e) {
      console.error("Could not fetch requests:", e);
    }
  };

  useEffect(() => {
    fetchRecords();
    fetchOnChainRequests();
  }, [account, signer]);

  // Handle Record Upload & AES-256 Encryption
  const handleUploadAndRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!account || !signer) {
      setError("Please ensure session is authenticated.");
      return;
    }
    setError(null);
    setLoading(true);

    try {
      // 1. Prepare sample or selected file
      let fileToUpload = selectedFile;
      if (!fileToUpload) {
        // Use dummy blood report if no file chosen
        const dummyBlob = new Blob(
          [
            `CLINICAL REPORT - PATIENT: ${account}\nDATE: ${new Date().toISOString()}\nCHOLESTEROL: 218 mg/dL\nGLUCOSE: 98 mg/dL\nSTATUS: STABLE`,
          ],
          { type: "text/plain" }
        );
        fileToUpload = new File([dummyBlob], "blood_panel_report.txt", {
          type: "text/plain",
        });
      }

      // 2. Off-chain AES-256 encryption via API
      const formData = new FormData();
      formData.append("file", fileToUpload);
      formData.append("patientAddress", account);
      formData.append("title", recordTitle);

      const res = await fetch("/api/records/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Encryption failed");

      // 3. Register on-chain on MST Blockchain
      const contract = getMedicalConsentContract(signer);
      const tx = await contract.registerRecord(
        data.recordId,
        data.fileHash,
        data.storagePointer
      );

      onTxSuccess(tx.hash, "Registered Record on MST Blockchain");
      await tx.wait();

      await fetchRecords();
      setSelectedFile(null);
    } catch (err: any) {
      setError(err.message || "Upload and on-chain registration failed.");
    } finally {
      setLoading(false);
    }
  };

  // Grant Access on-chain
  const handleGrant = async (requestId: number) => {
    if (!signer) return;
    setActionLoading(`grant-${requestId}`);
    try {
      const contract = getMedicalConsentContract(signer);
      const tx = await contract.grantAccess(requestId);
      onTxSuccess(tx.hash, `Granted Access for Request #${requestId}`);
      await tx.wait();
      await fetchOnChainRequests();
    } catch (err: any) {
      setError(err.message || "Granting access failed.");
    } finally {
      setActionLoading(null);
    }
  };

  // Deny Access on-chain
  const handleDeny = async (requestId: number) => {
    if (!signer) return;
    setActionLoading(`deny-${requestId}`);
    try {
      const contract = getMedicalConsentContract(signer);
      const tx = await contract.denyAccess(requestId);
      onTxSuccess(tx.hash, `Denied Access for Request #${requestId}`);
      await tx.wait();
      await fetchOnChainRequests();
    } catch (err: any) {
      setError(err.message || "Denying access failed.");
    } finally {
      setActionLoading(null);
    }
  };

  // Revoke Access on-chain
  const handleRevoke = async (recordId: string, provider: string) => {
    if (!signer) return;
    setActionLoading(`revoke-${recordId}`);
    try {
      const contract = getMedicalConsentContract(signer);
      const tx = await contract.revokeAccess(recordId, provider);
      onTxSuccess(tx.hash, "Revoked Provider Access on MST");
      await tx.wait();
      await fetchOnChainRequests();
    } catch (err: any) {
      setError(err.message || "Revoking access failed.");
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-8">
      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs px-4 py-3 rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Top Banner: Security Architecture Guarantee */}
      <div className="bg-gradient-to-r from-indigo-900 to-slate-900 rounded-2xl p-6 text-white shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-indigo-400" />
            <h2 className="font-semibold text-base tracking-tight">
              Patient Sovereign Vault
            </h2>
          </div>
          <p className="text-xs text-slate-300 max-w-xl">
            Files are client/server-encrypted with <strong>AES-256-GCM</strong>. Only the cryptographic SHA-256 hash and your permission rules are written to <strong>MST Blockchain</strong>.
          </p>
        </div>
        <div className="px-3 py-1.5 bg-white/10 rounded-xl text-[11px] font-mono border border-white/15">
          Zero PII On-Chain Guarantee
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Upload & Register Card */}
        <div className="lg:col-span-1 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Lock className="w-4 h-4 text-indigo-600" />
            <h3 className="font-semibold text-sm text-slate-900">
              Encrypt & Register Record
            </h3>
          </div>

          <form onSubmit={handleUploadAndRegister} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Record Title
              </label>
              <input
                type="text"
                value={recordTitle}
                onChange={(e) => setRecordTitle(e.target.value)}
                required
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="e.g. Annual Blood Panel"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Clinical File (or uses synthetic demo report)
              </label>
              <input
                type="file"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                className="w-full text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !account}
              className="w-full inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold py-2.5 px-4 rounded-xl transition shadow-sm disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Encrypting & Registering on MST...</span>
                </>
              ) : (
                <>
                  <Upload className="w-3.5 h-3.5" />
                  <span>Sign & Register on MST Blockchain</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Records & Requests Section */}
        <div className="lg:col-span-2 space-y-6">
          {/* Pending Access Requests */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-500" />
                <h3 className="font-semibold text-sm text-slate-900">
                  Incoming Access Requests ({requests.filter((r) => r.status === 0).length})
                </h3>
              </div>
              <button
                onClick={fetchOnChainRequests}
                className="text-[11px] text-indigo-600 hover:underline"
              >
                Refresh On-Chain
              </button>
            </div>

            {requests.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">
                No access requests yet. Healthcare providers can request access via the Provider Portal.
              </p>
            ) : (
              <div className="divide-y divide-slate-100">
                {requests.map((req) => (
                  <div
                    key={req.id}
                    className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900">
                          Request #{req.id}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            req.status === 0
                              ? "bg-amber-50 text-amber-700"
                              : req.status === 1
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-rose-50 text-rose-700"
                          }`}
                        >
                          {req.status === 0
                            ? "Pending Decision"
                            : req.status === 1
                            ? "Granted"
                            : "Denied"}
                        </span>
                      </div>
                      <p className="text-slate-600">
                        <strong>Purpose:</strong> {req.purpose}
                      </p>
                      <p className="text-slate-400 font-mono text-[11px]">
                        Provider: {req.provider} | Validity: {req.durationSeconds / 3600} hrs
                      </p>
                    </div>

                    {req.status === 0 ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleGrant(req.id)}
                          disabled={actionLoading !== null}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium text-xs transition"
                        >
                          Grant Access
                        </button>
                        <button
                          onClick={() => handleDeny(req.id)}
                          disabled={actionLoading !== null}
                          className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-medium text-xs transition"
                        >
                          Deny
                        </button>
                      </div>
                    ) : req.status === 1 ? (
                      <button
                        onClick={() => handleRevoke(req.recordId, req.provider)}
                        disabled={actionLoading !== null}
                        className="px-3 py-1.5 border border-rose-300 text-rose-700 hover:bg-rose-50 rounded-lg font-medium text-xs transition"
                      >
                        Revoke Access
                      </button>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Registered Patient Records */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-600" />
                <h3 className="font-semibold text-sm text-slate-900">
                  My Registered Records ({records.length})
                </h3>
              </div>
            </div>

            {records.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">
                You have not registered any encrypted records yet. Use the upload panel to register your first record.
              </p>
            ) : (
              <div className="space-y-3">
                {records.map((rec) => (
                  <div
                    key={rec.recordId}
                    className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-900 text-sm">
                        {rec.title}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-mono text-[10px]">
                        AES-256 Encrypted
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-slate-500 font-mono text-[11px]">
                      <div>
                        <strong>Record ID:</strong> {rec.recordId.slice(0, 16)}...
                      </div>
                      <div>
                        <strong>SHA-256 Hash:</strong> {rec.fileHash.slice(0, 16)}...
                      </div>
                    </div>

                    <div className="text-[11px] text-slate-400">
                      Storage Pointer: <code>{rec.storagePointer}</code>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
