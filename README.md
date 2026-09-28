# MediChain: Patient Consent & Access-Audit Layer (MST Blockchain)

> A decentralized, patient-governed medical records access and audit protocol built for the **MST Blockchain Buildathon (AI & Web3 Builders Track)**.

---

## 🏆 Verified MST Testnet Deployment

* **Contract Address:** [`0xD86D80641E43a3055BFABC7A0435023E870cF651`](https://mstscan.com/address/0xD86D80641E43a3055BFABC7A0435023E870cF651)
* **Contract Deployment Tx Hash:** [`0x742eb6483d29a3ca7ab2cae3032916a7d45a5e81df84607d9aba50961848c618`](https://mstscan.com/tx/0x742eb6483d29a3ca7ab2cae3032916a7d45a5e81df84607d9aba50961848c618)
* **First On-Chain Functional Tx (`registerRecord`):** [`0x1b1ebbab88d223d0f15a8ebb7e0ea427bae7922a90e37bf0f787c276a287fb0b`](https://mstscan.com/tx/0x1b1ebbab88d223d0f15a8ebb7e0ea427bae7922a90e37bf0f787c276a287fb0b)
* **Network Name:** MST Testnet
* **Chain ID:** `91562037` (`0x5752c35`)
* **RPC Endpoint:** `https://testnetrpc.mstblockchain.com`
* **Explorer:** [https://mstscan.com](https://mstscan.com)
* **Native Token:** `MSTC`

---

## 🌟 Problem & Architectural Solution

Modern health record systems either lock patient data into proprietary hospital silos or expose it to centralized leaks. 

**MediChain** establishes an **on-chain consent, access delegation, and immutable audit layer** on the **MST Blockchain**:
* **Zero PII On-Chain:** No sensitive patient health information ever touches the blockchain. Only cryptographic SHA-256 hashes, access permissions, time-bound expiries, and access event signatures are recorded.
* **Patient-Controlled Time-Decay Grants:** Patients explicitly approve or reject access requests from healthcare providers with custom validity windows (e.g., 1 hour, 24 hours). Expiry is mathematically enforced on-chain via `block.timestamp < expiryTimestamp`.
* **Tamper-Evident Access Audit:** Every time a health record is decrypted or accessed by an authorized provider, an immutable on-chain event (`AccessLogged`) is emitted.
* **Gated AI Clinical Assistant:** An integrated clinical summary agent is cryptographically restricted from analyzing records unless an active on-chain consent grant is verified (`hasAccess() == true`).
* **Break-Glass Emergency Protocol:** Emergency ER physicians can trigger break-glass access with an irreversible, high-priority on-chain audit event and a strict 4-hour validity limit.

---

## 🏗️ Architecture & Interaction Flow

```
┌────────────────┐           ┌───────────────────┐           ┌───────────────────┐
│ Patient Wallet │           │ Healthcare Doctor │           │   MST Blockchain  │
│  (BridgeKey)   │           │   (BridgeKey)     │           │ (Chain 91562037)  │
└───────┬────────┘           └─────────┬─────────┘           └─────────┬─────────┘
        │                              │                               │
        │ 1. AES-256 Encrypt & Hash    │                               │
        │─────────────────────────────┼──────────────────────────────►│ registerRecord()
        │                              │                               │
        │                              │ 2. Request Access (Duration)  │
        │                              │──────────────────────────────►│ requestAccess()
        │                              │                               │
        │ 3. Review & Grant Permission │                               │
        │─────────────────────────────┼──────────────────────────────►│ grantAccess()
        │                              │                               │
        │                              │ 4. Verify on-chain access     │
        │                              │◄──────────────────────────────│ hasAccess() == true
        │                              │                               │
        │                              │ 5. Gated Decrypt & View       │
        │                              │──────────────────────────────►│ logAccess() [Audit]
        │                              │                               │
```

---

## 📁 Repository Structure

```
.
├── contracts/               # Hardhat EVM development environment
│   ├── contracts/           # MedicalConsent.sol
│   ├── scripts/             # deploy.js & test-interact.js
│   ├── test/                # 16 automated unit tests
│   └── hardhat.config.js    # MST Testnet network configuration
├── frontend/                # Next.js 14 + Tailwind CSS + Ethers.js app
│   ├── src/
│   │   ├── app/             # Next.js App router & API routes
│   │   │   ├── api/records/upload/     # AES-256 encryption & storage
│   │   │   ├── api/records/[id]/access # Gated decryption via MST hasAccess()
│   │   │   └── api/records/[id]/summary# Gated AI clinical summary
│   │   ├── components/      # Navbar, PatientDashboard, ProviderPortal, AuditTimeline
│   │   └── lib/             # crypto.ts, mst.ts, contractAddress.json, ABI
│   └── package.json
├── sample-data/             # Synthetic clinical test records (sample_blood_report.txt)
└── README.md
```

---

## 🚀 Running the Project Locally

### 1. Smart Contracts
```bash
cd contracts
# Run all 16 automated unit tests
npx hardhat test

# Deploy to MST Testnet
npx hardhat run scripts/deploy.js --network mstTestnet
```

### 2. Frontend & Backend Application
```bash
cd frontend
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🛡️ Security Boundaries & Honest Engineering Disclosures

* **Off-Chain Copying:** Smart contracts govern cryptographic access and consent; they cannot prevent an authorized physician from taking an off-chain screenshot or copying text.
* **Access Enforcement:** True data secrecy is enforced by the backend key-release layer, which queries the MST smart contract before releasing AES-256 decryption keys.
* **Time Expiry:** Calculated dynamically via EVM `block.timestamp` without requiring expensive or vulnerable recurring cron jobs.
* **Privacy:** All on-chain records identify parties solely by their public wallet addresses. No HIPAA/GDPR-protected personal health data is ever stored on-chain.
