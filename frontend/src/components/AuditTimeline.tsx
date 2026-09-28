"use client";

import React from "react";
import { Activity, ExternalLink, CheckCircle2, ShieldCheck } from "lucide-react";
import { MST_TESTNET_CONFIG } from "@/lib/mst";

export interface AuditEventItem {
  id: string;
  type: string;
  txHash: string;
  title: string;
  timestamp: string;
  details?: string;
}

interface AuditTimelineProps {
  events: AuditEventItem[];
  contractAddress: string;
}

export function AuditTimeline({ events, contractAddress }: AuditTimelineProps) {
  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-indigo-600" />
            <h2 className="font-semibold text-base text-slate-900">
              Immutable On-Chain Audit Timeline
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Every consent decision, access release, and break-glass event creates a cryptographic signature on MST Blockchain.
          </p>
        </div>

        {contractAddress && (
          <a
            href={`${MST_TESTNET_CONFIG.blockExplorerUrls[0]}/address/${contractAddress}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-mono text-slate-700 transition"
          >
            <ShieldCheck className="w-4 h-4 text-indigo-600" />
            <span>Contract: {contractAddress.slice(0, 8)}...{contractAddress.slice(-6)}</span>
            <ExternalLink className="w-3 h-3 text-slate-400" />
          </a>
        )}
      </div>

      {/* Events List */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-4">
          Session Verified Transactions ({events.length})
        </h3>

        {events.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-500">
            No on-chain transactions executed in this session yet. Upload a record or request access to see live MST transactions appear here.
          </div>
        ) : (
          <div className="space-y-4">
            {events.map((evt) => (
              <div
                key={evt.id}
                className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900">
                      {evt.title}
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                      Tx: {evt.txHash}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-center">
                  <span className="text-[11px] text-slate-400">
                    {evt.timestamp}
                  </span>
                  <a
                    href={`${MST_TESTNET_CONFIG.blockExplorerUrls[0]}/tx/${evt.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold rounded-lg text-xs transition"
                  >
                    <span>View on MSTScan</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
