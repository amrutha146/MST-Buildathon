# Patient-Controlled Consent & Access-Audit Layer (MST Blockchain)

> A decentralized, patient-governed medical records access and audit protocol built for the **MST Blockchain Buildathon (AI & Web3 Builders Track)**.

---

## 🌟 Executive Summary

Modern health record systems either lock patient data into proprietary hospital silos or expose it to centralized leaks. 

This protocol implements an **on-chain consent, access delegation, and immutable audit layer** on the **MST Blockchain**:
* **Zero PII On-Chain:** No sensitive patient health information ever touches the blockchain. Only cryptographic SHA-256 hashes, access permissions, time-bound expiries, and access event signatures are recorded.
* **Patient-Controlled Time-Decay Grants:** Patients explicitly approve or reject access requests from healthcare providers with custom validity windows (e.g., 1 hour, 24 hours). Expiry is mathematically enforced by `block.timestamp`.
* **Tamper-Evident Access Audit:** Every time a health record is decrypted or accessed by an authorized provider, an immutable on-chain event (`AccessLogged`) is emitted.
* **Gated AI Clinical Assistant:** An integrated clinical summary agent is cryptographically restricted from analyzing records unless an active on-chain consent grant is verified.

---

## 🔗 MST Blockchain Network Details

* **Network Name:** MST Testnet
* **Chain ID:** `4545` (`0x11C1`)
* **RPC Endpoint:** `https://testnetrpc.mstblockchain.com`
* **Currency Symbol:** `MSTC`
* **Block Explorer:** [https://mstscan.com](https://mstscan.com)
* **Official Faucet:** [https://faucet.masterstroke.academy](https://faucet.masterstroke.academy)
* **Official Wallet:** [BridgeKey Chrome Extension](https://chromewebstore.google.com/detail/bridgekey/bfjojdcfenehemjgjlepdjomkpginlkg)

---

## 🏗️ Architecture

```
┌────────────────┐           ┌───────────────────┐           ┌───────────────────┐
│ Patient Wallet │           │ Healthcare Doctor │           │   MST Blockchain  │
│  (BridgeKey)   │           │   (BridgeKey)     │           │   (Chain ID 4545) │
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
│   ├── contracts/           # Solidity smart contracts (MedicalConsent.sol)
│   ├── scripts/             # Deployment and verification scripts
│   ├── test/                # Automated contract unit tests
│   └── hardhat.config.js    # MST Testnet network configuration
├── frontend/                # Next.js 14 + Tailwind CSS + Ethers.js app
│   ├── src/
│   │   ├── app/             # App router pages & backend API routes
│   │   ├── components/      # UI components (BridgeKey Connect, Dashboards)
│   │   └── lib/             # AES-256 encryption, MST SDK client, SIWE auth
│   └── package.json
└── README.md
```

---

## 📋 Hackathon Roadmap & Phases

- [x] **Phase 0:** Requirements analysis, MST Testnet parameters verification, and project scaffolding.
- [ ] **Phase 1:** Smart contract (`MedicalConsent.sol`), comprehensive test suite, and deployment to MST Testnet.
- [ ] **Phase 2:** BridgeKey wallet connection, patient record upload (AES-256), and on-chain registration.
- [ ] **Phase 3:** Provider access request and patient grant/deny/revoke workflows.
- [ ] **Phase 4:** Gated backend decryption, on-chain `logAccess` audit trail, and MSTScan explorer links.
- [ ] **Phase 5:** Gated AI clinical summarization and emergency delegate access.
- [ ] **Phase 6:** End-to-end demo rehearsal, testnet verification links, and submission readiness.
