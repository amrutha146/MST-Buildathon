"use client";

import React, { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { PatientDashboard } from "@/components/PatientDashboard";
import { ProviderPortal } from "@/components/ProviderPortal";
import { AuditTimeline, AuditEventItem } from "@/components/AuditTimeline";
import { connectBridgeKey, getContractAddress, getBridgeKeyProvider } from "@/lib/mst";
import { AlertCircle, CheckCircle2, X } from "lucide-react";

export default function App() {
  const [account, setAccount] = useState<string | null>(null);
  const [signer, setSigner] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<"patient" | "provider" | "audit">("patient");
  const [events, setEvents] = useState<AuditEventItem[]>([]);
  const [contractAddress, setContractAddress] = useState<string>("");
  const [bannerNotice, setBannerNotice] = useState<string | null>(null);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    setContractAddress(getContractAddress());

    // Check if wallet is already connected
    const checkExistingConnection = async () => {
      const raw = getBridgeKeyProvider();
      if (raw && typeof raw.request === "function") {
        try {
          const accounts = await raw.request({ method: "eth_accounts" });
          if (accounts && accounts.length > 0) {
            handleConnect();
          }
        } catch (e) {
          // ignore
        }
      }
    };
    checkExistingConnection();
  }, []);

  const handleConnect = async () => {
    setIsConnecting(true);
    setConnectError(null);
    try {
      const { address, signer: sig } = await connectBridgeKey();
      setAccount(address);
      setSigner(sig);
      setBannerNotice(`Connected to BridgeKey wallet: ${address.slice(0, 6)}...${address.slice(-4)}`);
      setTimeout(() => setBannerNotice(null), 5000);
    } catch (e: any) {
      console.error("Wallet connect error:", e);
      setConnectError(e.message || "Could not connect to wallet. Make sure BridgeKey is unlocked.");
    } finally {
      setIsConnecting(false);
    }
  };

  const handleTxSuccess = (txHash: string, title: string) => {
    const newEvent: AuditEventItem = {
      id: txHash + "_" + Date.now(),
      type: "TRANSACTION",
      txHash,
      title,
      timestamp: new Date().toLocaleTimeString(),
    };
    setEvents((prev) => [newEvent, ...prev]);

    setBannerNotice(`Transaction confirmed on MST Testnet: ${title}`);
    setTimeout(() => setBannerNotice(null), 7000);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Navbar
        account={account}
        onConnect={handleConnect}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* Real-time on-chain confirmation toast */}
      {bannerNotice && (
        <div className="bg-emerald-600 text-white text-xs px-4 py-2.5 text-center font-medium shadow-sm flex items-center justify-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{bannerNotice}</span>
        </div>
      )}

      {/* Connection error toast */}
      {connectError && (
        <div className="bg-rose-600 text-white text-xs px-4 py-2.5 text-center font-medium shadow-sm flex items-center justify-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{connectError}</span>
          <button onClick={() => setConnectError(null)} className="ml-2 hover:opacity-75">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!account && (
          <div className="mb-6 p-4 rounded-2xl bg-indigo-50/80 border border-indigo-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-indigo-900">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-indigo-600 flex-shrink-0" />
              <span>
                To sign transactions and manage consent, please connect your <strong>BridgeKey wallet</strong> (MST Testnet).
              </span>
            </div>
            <button
              onClick={handleConnect}
              disabled={isConnecting}
              className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition shadow-sm disabled:opacity-50"
            >
              {isConnecting ? "Connecting..." : "Connect BridgeKey"}
            </button>
          </div>
        )}

        {activeTab === "patient" && (
          <PatientDashboard
            account={account}
            signer={signer}
            onTxSuccess={handleTxSuccess}
          />
        )}

        {activeTab === "provider" && (
          <ProviderPortal
            account={account}
            signer={signer}
            onTxSuccess={handleTxSuccess}
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
          MediConsent Protocol • Built on <strong>MST Blockchain Testnet</strong> for the MST Buildathon
        </p>
      </footer>
    </div>
  );
}
