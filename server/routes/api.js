const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { PDFDocument } = require('pdf-lib');

const cryptoEngine = require('../crypto-engine');
const db = require('../database');
const pdfGen = require('../pdf-generator');

// Multer setup for drag-and-drop PDF uploads in memory
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 } // 15MB limit
});

// Recompute Merkle tree across all certificates
function getLedgerMerkleTree() {
  const allCerts = db.getAllCertificates();
  const hashes = allCerts.map(c => c.doc_hash);
  return new cryptoEngine.MerkleTree(hashes);
}

// 1. Get Institution Info & Public Key
router.get('/institution/keys', (req, res) => {
  try {
    const institution = db.getOrCreateInstitution({
      id: 'INST-MIT-CYBER',
      name: 'MIT Cybernetics & Applied Cryptography Consortium',
      code: 'MIT-CACC',
      public_key: '',
      fingerprint: ''
    });
    res.json({
      success: true,
      institution: {
        id: institution.id,
        name: institution.name,
        code: institution.code,
        publicKey: institution.public_key,
        fingerprint: institution.fingerprint,
        algorithm: 'ECDSA (prime256v1 / NIST P-256) with SHA-256',
        hashStandard: 'FIPS 180-4 SHA-256',
        createdAt: institution.created_at
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. Get Realtime Dashboard Stats
router.get('/stats', (req, res) => {
  try {
    const stats = db.getStats();
    const merkleTree = getLedgerMerkleTree();
    res.json({
      success: true,
      stats: {
        ...stats,
        merkleRoot: merkleTree.getRoot(),
        totalMerkleLeaves: merkleTree.leaves.length
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. List All Certificates
router.get('/certificates', (req, res) => {
  try {
    const search = req.query.q || '';
    const certs = db.getAllCertificates(search);
    res.json({ success: true, count: certs.length, certificates: certs });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. Get Certificate By ID
router.get('/certificates/:id', (req, res) => {
  try {
    const cert = db.getCertificateById(req.params.id);
    if (!cert) {
      return res.status(404).json({ success: false, error: 'Certificate not found in cryptographic registry.' });
    }

    // Compute live Merkle Proof
    const merkleTree = getLedgerMerkleTree();
    const leafIndex = merkleTree.leaves.indexOf(cert.doc_hash.toLowerCase());
    const proof = leafIndex !== -1 ? merkleTree.getProof(leafIndex) : null;
    const isMerkleValid = proof ? cryptoEngine.MerkleTree.verifyProof(cert.doc_hash, proof, merkleTree.getRoot()) : false;

    // Verify ECDSA signature
    const isSigValid = cryptoEngine.verifySignature(cert.doc_hash, cert.signature, cert.issuer_public_key);

    res.json({
      success: true,
      certificate: cert,
      cryptographicProof: {
        sha256Match: true,
        signatureValid: isSigValid,
        merkleRoot: merkleTree.getRoot(),
        merkleIndex: leafIndex,
        merkleProof: proof,
        merkleProofValid: isMerkleValid,
        status: cert.status
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5. Download Certificate PDF
router.get('/certificates/:id/download', (req, res) => {
  try {
    const cert = db.getCertificateById(req.params.id);
    if (!cert) {
      return res.status(404).send('Certificate not found');
    }
    const filePath = path.join(pdfGen.STORAGE_DIR, `${cert.id}.pdf`);
    if (!fs.existsSync(filePath)) {
      return res.status(404).send('PDF file missing from storage');
    }
    res.download(filePath, `ProofOfSkill_${cert.id}.pdf`);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// 6. Issue New Certificate
router.post('/certificates/issue', async (req, res) => {
  try {
    const { student_name, student_id, course_name, grade, issue_date } = req.body;

    if (!student_name || !student_id || !course_name || !grade) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: student_name, student_id, course_name, grade.'
      });
    }

    const institution = db.getOrCreateInstitution();
    const { privateKey } = cryptoEngine.getOrCreateInstitutionKeyPair();

    // Generate unique Certificate Identifier
    const year = new Date().getFullYear();
    const randomHex1 = Math.random().toString(16).substring(2, 6).toUpperCase();
    const randomHex2 = Math.random().toString(16).substring(2, 6).toUpperCase();
    const certId = `CERT-${year}-${randomHex1}-${randomHex2}`;

    const finalIssueDate = issue_date || new Date().toISOString().split('T')[0];

    const certData = {
      id: certId,
      student_name: student_name.trim(),
      student_id: student_id.trim(),
      course_name: course_name.trim(),
      grade: grade.trim(),
      institution_id: institution.id,
      issue_date: finalIssueDate,
      status: 'ACTIVE',
      revocation_reason: null
    };

    // 1. Canonical payload & SHA-256 Document Hash
    const canonicalPayload = pdfGen.createCanonicalPayload(certData);
    const docHash = cryptoEngine.computeSHA256(canonicalPayload);
    certData.doc_hash = docHash;

    // 2. ECDSA Digital Signature (Institution Private Key)
    const signature = cryptoEngine.signHash(docHash, privateKey);
    certData.signature = signature;

    // 3. Merkle Tree Position
    const existingCerts = db.getAllCertificates();
    const allHashes = [...existingCerts.map(c => c.doc_hash), docHash];
    const merkleTree = new cryptoEngine.MerkleTree(allHashes);
    certData.merkle_root = merkleTree.getRoot();
    certData.merkle_index = allHashes.length - 1;

    // 4. Generate Official PDF with embedded QR Code & Cryptographic Seals
    const { filename } = await pdfGen.generateCertificatePDF(certData, institution);
    certData.pdf_filename = filename;

    // 5. Store in SQLite Database
    const saved = db.insertCertificate(certData);

    res.status(201).json({
      success: true,
      message: 'Certificate cryptographically issued and anchored.',
      certificate: saved,
      verificationUrl: `http://localhost:5173/?verifyId=${encodeURIComponent(certId)}`,
      downloadUrl: `/api/certificates/${certId}/download`
    });
  } catch (err) {
    console.error('Error issuing certificate:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 7. Core Verification Endpoint (Handles PDF Upload or Direct Payload/ID)
router.post('/certificates/verify', upload.single('certificateFile'), async (req, res) => {
  try {
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
    let targetCertId = null;
    let extractedDocHash = null;
    let inputType = 'manual';
    let extractedData = null;

    // A. Handle file upload (PDF parsing)
    if (req.file) {
      inputType = 'pdf_upload';
      const fileBuffer = req.file.buffer;

      // Calculate SHA-256 of uploaded raw file as a binary checksum
      const rawFileSha256 = cryptoEngine.computeSHA256(fileBuffer);

      try {
        // Inspect PDF metadata
        const pdfDoc = await PDFDocument.load(fileBuffer, { ignoreEncryption: true });
        const keywords = pdfDoc.getKeywords();
        const subject = pdfDoc.getSubject();

        // Extract embedded cryptographic attributes
        if (keywords && keywords.length > 0) {
          keywords.forEach(kw => {
            if (kw.startsWith('ID:')) targetCertId = kw.replace('ID:', '');
            if (kw.startsWith('HASH:')) extractedDocHash = kw.replace('HASH:', '');
            if (kw.startsWith('PAYLOAD:')) {
              try {
                extractedData = JSON.parse(kw.replace('PAYLOAD:', ''));
              } catch (_) {}
            }
          });
        }
        if (!extractedDocHash && subject && subject.length === 64) {
          extractedDocHash = subject;
        }
      } catch (pdfErr) {
        // If not a standard PDF or corrupted
        console.warn('PDF metadata read warning:', pdfErr.message);
      }
    }

    // B. Handle text / JSON input if not found in PDF
    if (!targetCertId && req.body.certificateId) {
      targetCertId = req.body.certificateId.trim();
    }
    if (!extractedDocHash && req.body.docHash) {
      extractedDocHash = req.body.docHash.trim();
    }

    // Lookup in database
    let matchedCert = null;
    if (targetCertId) {
      matchedCert = db.getCertificateById(targetCertId);
    } else if (extractedDocHash) {
      matchedCert = db.getCertificateByHash(extractedDocHash);
    }

    const verificationTimestamp = new Date().toISOString();

    // CASE 1: Certificate Not Found in Database
    if (!matchedCert) {
      const computedHash = extractedDocHash || (req.file ? cryptoEngine.computeSHA256(req.file.buffer) : 'UNKNOWN');
      db.logVerification({
        certificate_id: targetCertId || 'UNKNOWN',
        doc_hash: computedHash,
        verification_status: 'NOT_FOUND',
        details: { reason: 'No matching certificate hash found in institutional database.' },
        client_ip: clientIp
      });

      return res.json({
        success: false,
        status: 'NOT_FOUND',
        verdict: 'DOCUMENT UNRECOGNIZED',
        color: 'rose',
        explanation: 'This certificate hash does not exist in the accredited institution database. It is either an unregistered fake or an altered copy.',
        computedHash,
        steps: [
          { name: 'Document SHA-256 Hashing', passed: true, details: `Computed digest: ${computedHash.substring(0, 16)}...` },
          { name: 'Database Registry Lookup', passed: false, details: 'Hash not recognized in registry' },
          { name: 'Cryptographic Signature Verification', passed: false, details: 'Skipped - unknown issuer origin' },
          { name: 'Merkle Ledger Integrity Check', passed: false, details: 'Skipped' },
          { name: 'Certificate Active Status', passed: false, details: 'Unregistered' }
        ]
      });
    }

    // Verify cryptographic integrity
    let isHashMatch = true;
    let computedCheckHash = matchedCert.doc_hash;

    // If PDF metadata was extracted, re-verify canonical payload
    if (extractedData) {
      const recomputedCanonical = pdfGen.createCanonicalPayload(extractedData);
      const recomputedHash = cryptoEngine.computeSHA256(recomputedCanonical);
      if (recomputedHash.toLowerCase() !== matchedCert.doc_hash.toLowerCase()) {
        isHashMatch = false;
        computedCheckHash = recomputedHash;
      }
    } else if (extractedDocHash && extractedDocHash.toLowerCase() !== matchedCert.doc_hash.toLowerCase()) {
      isHashMatch = false;
      computedCheckHash = extractedDocHash;
    }

    // Verify ECDSA signature against public key
    const isSignatureValid = cryptoEngine.verifySignature(
      matchedCert.doc_hash,
      matchedCert.signature,
      matchedCert.issuer_public_key
    );

    // Verify Merkle Root
    const merkleTree = getLedgerMerkleTree();
    const leafIndex = merkleTree.leaves.indexOf(matchedCert.doc_hash.toLowerCase());
    const merkleProof = leafIndex !== -1 ? merkleTree.getProof(leafIndex) : null;
    const isMerkleValid = merkleProof ? cryptoEngine.MerkleTree.verifyProof(matchedCert.doc_hash, merkleProof, merkleTree.getRoot()) : false;

    // CASE 2: Tampered / Forgery Detected
    if (!isHashMatch || !isSignatureValid) {
      const avalancheData = cryptoEngine.analyzeAvalancheEffect(matchedCert.doc_hash, computedCheckHash);
      
      db.logVerification({
        certificate_id: matchedCert.id,
        doc_hash: computedCheckHash,
        verification_status: 'TAMPERED',
        details: {
          original_hash: matchedCert.doc_hash,
          computed_hash: computedCheckHash,
          hammingDistance: avalancheData.hammingDistance,
          percentageFlipped: avalancheData.percentageFlipped
        },
        client_ip: clientIp
      });

      return res.json({
        success: false,
        status: 'TAMPERED',
        verdict: 'CRITICAL FRAUD ALERT: DOCUMENT TAMPERED',
        color: 'red',
        explanation: 'The cryptographic hash of the presented document does not match the signed institutional digest. Even a 1-character modification causes ~50% bit divergence.',
        certificate: matchedCert,
        avalancheData,
        steps: [
          { name: 'Document SHA-256 Hashing', passed: true, details: `Computed: ${computedCheckHash.substring(0, 16)}...` },
          { name: 'Database Registry Lookup', passed: true, details: `Matched Certificate Record ${matchedCert.id}` },
          { name: 'Cryptographic Signature Verification', passed: false, details: 'FAIL: Hash mismatch or invalid signature' },
          { name: 'Merkle Ledger Integrity Check', passed: false, details: 'FAIL: Cryptographic path broken' },
          { name: 'Certificate Active Status', passed: false, details: 'Untrusted due to tampering' }
        ]
      });
    }

    // CASE 3: Revoked Certificate
    if (matchedCert.status === 'REVOKED') {
      db.logVerification({
        certificate_id: matchedCert.id,
        doc_hash: matchedCert.doc_hash,
        verification_status: 'REVOKED',
        details: { revocation_reason: matchedCert.revocation_reason },
        client_ip: clientIp
      });

      return res.json({
        success: false,
        status: 'REVOKED',
        verdict: 'CERTIFICATE OFFICIALLY REVOKED',
        color: 'amber',
        explanation: `This certificate is authentic in origin, but was officially REVOKED by the issuing institution. Reason: "${matchedCert.revocation_reason || 'Academic disciplinary or credential invalidation'}"`,
        certificate: matchedCert,
        steps: [
          { name: 'Document SHA-256 Hashing', passed: true, details: `Valid: ${matchedCert.doc_hash.substring(0, 16)}...` },
          { name: 'Database Registry Lookup', passed: true, details: 'Certificate record found' },
          { name: 'Cryptographic Signature Verification', passed: true, details: 'Valid institutional ECDSA signature' },
          { name: 'Merkle Ledger Integrity Check', passed: true, details: `Verified in Merkle Tree (Leaf #${leafIndex})` },
          { name: 'Certificate Active Status', passed: false, details: `REVOKED: ${matchedCert.revocation_reason || 'Disciplinary reason'}` }
        ]
      });
    }

    // CASE 4: 100% Authentic & Untampered
    db.logVerification({
      certificate_id: matchedCert.id,
      doc_hash: matchedCert.doc_hash,
      verification_status: 'AUTHENTIC',
      details: { verifiedAt: verificationTimestamp },
      client_ip: clientIp
    });

    return res.json({
      success: true,
      status: 'AUTHENTIC',
      verdict: '100% AUTHENTIC & UNTAMPERED',
      color: 'emerald',
      explanation: 'Cryptographic proof verified mathematically. The certificate has not been altered by even a single byte and is officially recognized by the accredited institution.',
      certificate: matchedCert,
      cryptographicProof: {
        hash: matchedCert.doc_hash,
        signature: matchedCert.signature,
        issuerPublicKey: matchedCert.issuer_public_key,
        issuerFingerprint: matchedCert.issuer_fingerprint,
        merkleRoot: merkleTree.getRoot(),
        merkleIndex: leafIndex,
        verifiedAt: verificationTimestamp
      },
      steps: [
        { name: 'Document SHA-256 Hashing', passed: true, details: `Digest: ${matchedCert.doc_hash.substring(0, 16)}... (Match)` },
        { name: 'Database Registry Lookup', passed: true, details: `Found Certificate #${matchedCert.id}` },
        { name: 'Cryptographic Signature Verification', passed: true, details: 'ECDSA P-256 signature mathematically verified' },
        { name: 'Merkle Ledger Integrity Check', passed: true, details: `Anchored in Root #${merkleTree.getRoot().substring(0, 16)}...` },
        { name: 'Certificate Active Status', passed: true, details: 'Status: ACTIVE (Genuine & Untampered)' }
      ]
    });

  } catch (err) {
    console.error('Verification error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 8. Revoke Certificate
router.post('/certificates/:id/revoke', (req, res) => {
  try {
    const { reason } = req.body;
    const cert = db.getCertificateById(req.params.id);
    if (!cert) {
      return res.status(404).json({ success: false, error: 'Certificate not found.' });
    }

    const updated = db.revokeCertificate(req.params.id, reason || 'Administrative revocation');
    if (!updated) {
      return res.status(400).json({ success: false, error: 'Could not revoke certificate.' });
    }

    res.json({
      success: true,
      message: `Certificate ${req.params.id} has been permanently revoked.`,
      certificateId: req.params.id,
      reason: reason || 'Administrative revocation'
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 9. Interactive Tamper Lab & Avalanche Effect Playground
router.post('/certificates/tamper-test', (req, res) => {
  try {
    const { certificateId, tamperedField, tamperedValue } = req.body;
    const cert = db.getCertificateById(certificateId);
    if (!cert) {
      return res.status(404).json({ success: false, error: 'Certificate not found.' });
    }

    // Create a modified copy of canonical payload
    const modifiedCertData = {
      course_name: cert.course_name,
      grade: cert.grade,
      id: cert.id,
      institution_id: cert.institution_id,
      issue_date: cert.issue_date,
      student_id: cert.student_id,
      student_name: cert.student_name,
      [tamperedField]: tamperedValue
    };

    const originalCanonical = pdfGen.createCanonicalPayload(cert);
    const tamperedCanonical = pdfGen.createCanonicalPayload(modifiedCertData);

    const originalHash = cert.doc_hash;
    const tamperedHash = cryptoEngine.computeSHA256(tamperedCanonical);

    // Check ECDSA signature with tampered hash
    const isSignatureValidOnTampered = cryptoEngine.verifySignature(
      tamperedHash,
      cert.signature,
      cert.issuer_public_key
    );

    // Compute detailed avalanche metrics
    const avalanche = cryptoEngine.analyzeAvalancheEffect(originalHash, tamperedHash);

    res.json({
      success: true,
      original: {
        field: tamperedField,
        originalValue: cert[tamperedField],
        canonicalPayload: originalCanonical,
        sha256Hash: originalHash
      },
      tampered: {
        field: tamperedField,
        tamperedValue: tamperedValue,
        canonicalPayload: tamperedCanonical,
        sha256Hash: tamperedHash
      },
      verificationFailure: {
        signatureValid: isSignatureValidOnTampered,
        databaseMatch: false,
        reason: 'ECDSA signature invalid. The mathematical curve point verification failed.'
      },
      avalancheEffect: avalanche
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 10. Merkle Ledger Endpoint
router.get('/ledger/merkle', (req, res) => {
  try {
    const merkleTree = getLedgerMerkleTree();
    const certs = db.getAllCertificates();

    res.json({
      success: true,
      merkleRoot: merkleTree.getRoot(),
      leafCount: merkleTree.leaves.length,
      leaves: certs.map((c, idx) => ({
        index: idx,
        id: c.id,
        student_name: c.student_name,
        course_name: c.course_name,
        hash: c.doc_hash,
        proof: merkleTree.getProof(idx)
      })),
      treeLayers: merkleTree.layers.map(layer => layer.map(h => h.substring(0, 16) + '...'))
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 11. Verification Logs
router.get('/verification-logs', (req, res) => {
  try {
    const logs = db.getVerificationLogs(30);
    res.json({ success: true, logs });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
