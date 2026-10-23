const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const cryptoEngine = require('./crypto-engine');
const db = require('./database');
const pdfGen = require('./pdf-generator');
const apiRoutes = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS and JSON parsing
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve certificate files if needed directly
app.use('/storage/certificates', express.static(pdfGen.STORAGE_DIR));

// API Routes
app.use('/api', apiRoutes);

// Serve built frontend if exists
const clientDistPath = path.join(__dirname, '..', 'client', 'dist');
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.use((req, res, next) => {
    // If request is for an API endpoint that was not handled, return 404 JSON
    if (req.path.startsWith('/api/')) {
      return res.status(404).json({ success: false, error: 'API route not found' });
    }
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

/**
 * Initialize Institution Keys and Seed Default Certificates for Demo
 */
async function initializeSystem() {
  console.log('[CertiCrypt] Initializing cryptographic environment...');

  // 1. Get or generate institutional ECDSA P-256 keys
  const { privateKey, publicKey } = cryptoEngine.getOrCreateInstitutionKeyPair();
  const fingerprint = cryptoEngine.computeKeyFingerprint(publicKey);

  const institution = db.getOrCreateInstitution({
    id: 'INST-MIT-CYBER',
    name: 'MIT Cybernetics & Applied Cryptography Consortium',
    code: 'MIT-CACC',
    public_key: publicKey,
    fingerprint: fingerprint
  });

  console.log(`[CertiCrypt] Institution Registered: ${institution.name}`);
  console.log(`[CertiCrypt] ECDSA Public Key Fingerprint: ${fingerprint}`);

  // 2. Check if certificates exist, seed sample credentials if empty
  const existingCerts = db.getAllCertificates();
  if (existingCerts.length === 0) {
    console.log('[CertiCrypt] Seeding standard sample verifiable certificates...');

    const sampleCredentials = [
      {
        id: 'CERT-2026-9A4F-8201',
        student_name: 'Alex Rivera',
        student_id: 'MIT-CS-2026-9042',
        course_name: 'Advanced Cryptography & Zero-Knowledge Proofs',
        grade: 'A+ (Honors - 98.6%)',
        issue_date: '2026-09-14',
        status: 'ACTIVE',
        revocation_reason: null
      },
      {
        id: 'CERT-2026-3B1E-7740',
        student_name: 'Sarah Chen',
        student_id: 'MIT-SEC-2026-1184',
        course_name: 'Applied Blockchain & Distributed Ledger Architecture',
        grade: 'A (Distinction - 94.2%)',
        issue_date: '2026-10-02',
        status: 'ACTIVE',
        revocation_reason: null
      },
      {
        id: 'CERT-2026-5F88-1293',
        student_name: 'Michael Vance',
        student_id: 'MIT-CYBER-2025-4402',
        course_name: 'Cybersecurity Penetration Testing & Network Defense',
        grade: 'B+ (87.5%)',
        issue_date: '2025-11-20',
        status: 'REVOKED',
        revocation_reason: 'Credential revoked due to fraudulent prerequisite transcripts reported by Academic Registrar.'
      }
    ];

    for (const certData of sampleCredentials) {
      certData.institution_id = institution.id;

      // Canonical payload & SHA-256
      const canonicalPayload = pdfGen.createCanonicalPayload(certData);
      const docHash = cryptoEngine.computeSHA256(canonicalPayload);
      certData.doc_hash = docHash;

      // Digital Signature
      certData.signature = cryptoEngine.signHash(docHash, privateKey);

      // Generate PDF
      const { filename } = await pdfGen.generateCertificatePDF(certData, institution);
      certData.pdf_filename = filename;

      db.insertCertificate(certData);
    }

    // Update Merkle Root across seeded certificates
    const allCerts = db.getAllCertificates();
    const hashes = allCerts.map(c => c.doc_hash);
    const merkleTree = new cryptoEngine.MerkleTree(hashes);

    allCerts.forEach((c, idx) => {
      db.updateCertificateMerkleInfo(c.id, merkleTree.getRoot(), idx);
    });

    console.log(`[CertiCrypt] Successfully seeded ${sampleCredentials.length} verifiable certificates.`);
    console.log(`[CertiCrypt] Initial Merkle Root: ${merkleTree.getRoot()}`);
  }
}

// Start Server
app.listen(PORT, async () => {
  await initializeSystem();
  console.log(`=======================================================`);
  console.log(`   CRYPTOGRAPHIC "PROOF OF SKILL" VERIFIER BACKEND     `);
  console.log(`   Listening at: http://localhost:${PORT}             `);
  console.log(`   API Endpoint: http://localhost:${PORT}/api         `);
  console.log(`=======================================================`);
});
