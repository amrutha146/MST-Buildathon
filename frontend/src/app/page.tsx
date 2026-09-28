export default function HomePage() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-8 text-center">
      <div className="max-w-2xl bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-semibold rounded-full mb-4">
          MST Blockchain Testnet (Chain ID 4545)
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-3">
          Patient Consent & Audit Layer
        </h1>
        <p className="text-slate-600 mb-6 text-sm">
          Decentralized, time-bound medical access governance with tamper-evident audit logs on MST Blockchain.
        </p>
        <p className="text-xs text-slate-400">
          Scaffolding Phase 0 Complete. Ready for Phase 1 Smart Contract.
        </p>
      </div>
    </main>
  );
}
