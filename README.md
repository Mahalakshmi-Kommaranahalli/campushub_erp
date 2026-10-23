# CertiCrypt: Cryptographic "Proof of Skill" Verifier

> A purely software-based enterprise cryptographic portal to eliminate fake degrees, forged marks cards, and educational credential fraud.

---

## 📌 The Problem
Fake certificates, forged transcript grades, and resume fraud are rampant in the global educational and recruitment sectors. Colleges, employers, and background verification agencies waste weeks manually calling registrars or paying expensive intermediaries to verify documents.

## 💡 The Solution
**CertiCrypt** solves this with applied cybersecurity and mathematics:
1. **At Issuance (College Registrar):** When an accredited institution issues a certificate, the backend generates a canonical JSON representation, computes a cryptographic **SHA-256 hash**, signs it with the institution's **ECDSA P-256 private key**, embeds an encrypted QR code and cryptographic watermark, compiles an official PDF certificate, and anchors it into an immutable **Merkle Tree**.
2. **At Verification (Employer Portal):** An employer drops the certificate PDF into the portal. The system extracts and computes the SHA-256 hash and executes a **5-Stage Cryptographic Pipeline** to mathematically prove the document is 100% authentic, unmodified, and unrevoked.
3. **If Tampered:** Altering even a single letter, GPA score, or graduation date triggers the **Strict Avalanche Criterion (SAC)** of SHA-256—flipping ~50% of the bits and instantly breaking the digital signature.

---

## 🛡️ Core Cryptographic Primitives

| Primitive | Standard / Curve | Purpose in Project |
| :--- | :--- | :--- |
| **Document Hashing** | SHA-256 (FIPS 180-4) | Computes a collision-resistant 256-bit digest of the canonical document payload. |
| **Digital Signatures** | ECDSA (NIST P-256 / secp256r1) | Ensures non-repudiation and authenticates the issuing college using public key cryptography. |
| **Tamper Detection** | Strict Avalanche Criterion (SAC) | Visualizes Hamming distance across 256 bits when malicious alterations occur. |
| **Ledger Anchor** | Merkle Tree (Binary Hash Tree) | Enables $O(\log n)$ cryptographic inclusion proofs and tamper-evident root computation. |
| **Document Security** | `pdf-lib` + `qrcode` | Generates official PDF credentials with embedded cryptographic metadata and scan codes. |

---

## 🚀 Key Features

### 1. 🔍 Employer "Drop & Verify" Portal
- **Drag & Drop PDF Zone**: Drop any issued certificate PDF (or enter Certificate ID / Hash).
- **5-Stage Animated Verification Stepper**:
  1. *Document Hashing:* SHA-256 hex digest computation.
  2. *Registry Lookup:* Institutional database state check.
  3. *Digital Signature:* Mathematical verification on elliptic curve P-256 using the college's public key.
  4. *Merkle Ledger:* Validation of leaf hash inclusion up to the Merkle root.
  5. *Tamper Verdict:* Immediate verification badge (**100% AUTHENTIC**, **CRITICAL FRAUD ALERT**, or **REVOKED**).
- **1-Click Presets for Demonstrations**:
  - `Alex Rivera (Honors)`: Authentic MIT credential.
  - `Sarah Chen (Distinction)`: Authentic Blockchain degree.
  - `Tampered Forgery Attack`: Tests forged GPA alteration.
  - `Michael Vance (Revoked)`: Tests institutional credential revocation.

### 2. ⚡ Interactive Tamper Lab & Avalanche Effect Simulator
- Select any certificate and alter any field (Student Name, GPA / Grade, Course).
- Computes both SHA-256 hashes side by side.
- **256-Bit Interactive Visualizer**: Visual grid displaying every single bit; flipped bits glow bright red.
- Demonstrates why credential forgery is mathematically impossible without the institution's private key.

### 3. 🎓 College Registrar Admin
- Form to issue verifiable digital certificates.
- Generates downloadable official PDF credentials with golden seals, student details, QR codes, and cryptographic audit footers.
- Certificate Revocation module to cancel certificates in cases of academic dishonesty.

### 4. 🏛️ Merkle Ledger & Institutional Key Vault
- Inspect the institution's ECDSA P-256 Public Key (PEM format & SHA-256 Key Fingerprint).
- Visual Merkle Tree showing root hash, leaf nodes, and inclusion proof paths.
- Real-time audit log of all verification attempts across employers worldwide.

---

## 📂 Project Architecture

```
cryptography/
├── client/                      # React 19 + Vite Frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx           # Header & cryptographic status pills
│   │   │   ├── VerifierPortal.jsx   # Drag & Drop 5-stage verification UI
│   │   │   ├── TamperPlayground.jsx # 256-bit Avalanche effect visualizer
│   │   │   ├── IssuerAdmin.jsx      # Certificate issuance & registry
│   │   │   └── LedgerVault.jsx      # Merkle tree & Public Key vault
│   │   ├── App.jsx                  # Root state & telemetry ribbon
│   │   ├── index.css                # Dark cybersecurity design system
│   │   └── main.jsx
│   ├── index.html
│   └── package.json
├── server/                      # Express.js Cryptographic Backend
│   ├── data/                    # SQLite database (WAL mode)
│   ├── keys/                    # ECDSA NIST P-256 Keypair (.pem)
│   ├── routes/
│   │   └── api.js               # REST API endpoints
│   ├── storage/certificates/    # Generated official PDF certificates
│   ├── crypto-engine.js         # SHA-256, ECDSA, Merkle Tree, & SAC
│   ├── database.js              # SQLite schema & query layer
│   ├── pdf-generator.js         # PDF compilation & QR generation
│   └── index.js                 # Server entry point & auto-seeder
├── package.json
└── README.md
```

---

## 🛠️ Installation & Running Locally

### Prerequisites
- **Node.js**: v18+ (v24 tested)
- **npm**: v9+

### 1. Start the Unified Server
```bash
# From the root folder
npm start
```
The server will automatically:
- Generate institutional ECDSA P-256 keys (if not present).
- Seed 3 sample certificates (2 authentic, 1 revoked).
- Compile real PDF documents with embedded QR codes.
- Serve the API and frontend at: **`http://localhost:5000`**

### 2. (Optional) Run in Development Mode with Hot Reloading
If you wish to edit the frontend with instant hot module replacement:
```bash
# Terminal 1: Backend
npm run dev:backend

# Terminal 2: Frontend (Vite)
npm run dev:client
```
Frontend dev server runs at: **`http://localhost:5173`** (proxied to port 5000).

---

## 📡 REST API Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/stats` | Real-time counts of issued, active, revoked certs, and Merkle root. |
| `GET` | `/api/institution/keys` | Institutional ECDSA P-256 public key and SHA-256 fingerprint. |
| `GET` | `/api/certificates` | List all issued certificates (supports `?q=` search). |
| `GET` | `/api/certificates/:id` | Full certificate record with Merkle inclusion proof. |
| `GET` | `/api/certificates/:id/download` | Download the official verifiable PDF certificate. |
| `POST` | `/api/certificates/issue` | Issue new certificate (hashes payload, signs ECDSA, generates PDF). |
| `POST` | `/api/certificates/verify` | Verify uploaded PDF file or certificate ID through the 5-stage pipeline. |
| `POST` | `/api/certificates/:id/revoke` | Revoke a certificate with an official reason. |
| `POST` | `/api/certificates/tamper-test` | Test simulated document tampering and compute Strict Avalanche Criterion. |
| `GET` | `/api/ledger/merkle` | Retrieve Merkle Tree layers and leaf hashes. |
| `GET` | `/api/verification-logs` | Retrieve recent verification audit attempts. |

---

## 🔒 Security Design Highlights
1. **Non-Repudiation**: Because the private key is held exclusively by the university, only accredited institutions can issue certificates.
2. **Avalanche Effect (SAC)**: SHA-256 ensures any 1-bit alteration completely randomizes the digest.
3. **Zero-Knowledge Privacy**: Employers can verify credentials by computing hashes client-side without transmitting raw student personal data.
4. **Append-Only Merkle Anchor**: Certificates are organized in a Merkle tree preventing retroactive alterations or deletion.
