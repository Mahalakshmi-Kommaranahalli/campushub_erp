const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, 'cryptography.db');
const db = new Database(DB_PATH);

// Enable WAL mode for high concurrency & integrity
db.pragma('journal_mode = WAL');

// Initialize schema
db.exec(`
  CREATE TABLE IF NOT EXISTS institutions (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    public_key TEXT NOT NULL,
    fingerprint TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS certificates (
    id TEXT PRIMARY KEY,
    student_name TEXT NOT NULL,
    student_id TEXT NOT NULL,
    course_name TEXT NOT NULL,
    grade TEXT NOT NULL,
    institution_id TEXT NOT NULL,
    issue_date TEXT NOT NULL,
    doc_hash TEXT NOT NULL UNIQUE,
    signature TEXT NOT NULL,
    merkle_root TEXT,
    merkle_index INTEGER,
    status TEXT DEFAULT 'ACTIVE',
    revocation_reason TEXT,
    pdf_filename TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(institution_id) REFERENCES institutions(id)
  );

  CREATE TABLE IF NOT EXISTS verification_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    certificate_id TEXT,
    doc_hash TEXT NOT NULL,
    verification_status TEXT NOT NULL,
    details TEXT,
    client_ip TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_cert_hash ON certificates(doc_hash);
  CREATE INDEX IF NOT EXISTS idx_cert_id ON certificates(id);
  CREATE INDEX IF NOT EXISTS idx_verif_time ON verification_logs(timestamp);
`);

/**
 * Returns or creates the default issuing institution record.
 */
function getOrCreateInstitution(defaultData) {
  const existing = db.prepare('SELECT * FROM institutions LIMIT 1').get();
  if (existing) return existing;

  const insert = db.prepare(`
    INSERT INTO institutions (id, name, code, public_key, fingerprint)
    VALUES (@id, @name, @code, @public_key, @fingerprint)
  `);
  insert.run(defaultData);
  return db.prepare('SELECT * FROM institutions WHERE id = ?').get(defaultData.id);
}

/**
 * Inserts a newly issued certificate.
 */
function insertCertificate(cert) {
  const insert = db.prepare(`
    INSERT INTO certificates (
      id, student_name, student_id, course_name, grade,
      institution_id, issue_date, doc_hash, signature,
      merkle_root, merkle_index, status, revocation_reason, pdf_filename
    ) VALUES (
      @id, @student_name, @student_id, @course_name, @grade,
      @institution_id, @issue_date, @doc_hash, @signature,
      @merkle_root, @merkle_index, @status, @revocation_reason, @pdf_filename
    )
  `);
  insert.run({
    id: cert.id,
    student_name: cert.student_name,
    student_id: cert.student_id,
    course_name: cert.course_name,
    grade: cert.grade,
    institution_id: cert.institution_id,
    issue_date: cert.issue_date,
    doc_hash: cert.doc_hash,
    signature: cert.signature,
    merkle_root: cert.merkle_root || null,
    merkle_index: cert.merkle_index !== undefined ? cert.merkle_index : null,
    status: cert.status || 'ACTIVE',
    revocation_reason: cert.revocation_reason || null,
    pdf_filename: cert.pdf_filename || null
  });
  return getCertificateById(cert.id);
}

/**
 * Update Merkle Root & indices for certificates.
 */
function updateCertificateMerkleInfo(certId, merkleRoot, merkleIndex) {
  db.prepare(`
    UPDATE certificates 
    SET merkle_root = ?, merkle_index = ? 
    WHERE id = ?
  `).run(merkleRoot, merkleIndex, certId);
}

/**
 * Get certificate by ID.
 */
function getCertificateById(id) {
  return db.prepare(`
    SELECT c.*, i.name as institution_name, i.code as institution_code, i.public_key as issuer_public_key, i.fingerprint as issuer_fingerprint
    FROM certificates c
    JOIN institutions i ON c.institution_id = i.id
    WHERE c.id = ?
  `).get(id);
}

/**
 * Get certificate by SHA-256 Hash.
 */
function getCertificateByHash(docHash) {
  return db.prepare(`
    SELECT c.*, i.name as institution_name, i.code as institution_code, i.public_key as issuer_public_key, i.fingerprint as issuer_fingerprint
    FROM certificates c
    JOIN institutions i ON c.institution_id = i.id
    WHERE LOWER(c.doc_hash) = LOWER(?)
  `).get(docHash);
}

/**
 * List all certificates with pagination/search.
 */
function getAllCertificates(search = '') {
  if (search) {
    const query = `%${search}%`;
    return db.prepare(`
      SELECT c.*, i.name as institution_name
      FROM certificates c
      JOIN institutions i ON c.institution_id = i.id
      WHERE c.id LIKE ? OR c.student_name LIKE ? OR c.student_id LIKE ? OR c.course_name LIKE ? OR c.doc_hash LIKE ?
      ORDER BY c.created_at DESC
    `).all(query, query, query, query, query);
  }
  return db.prepare(`
    SELECT c.*, i.name as institution_name
    FROM certificates c
    JOIN institutions i ON c.institution_id = i.id
    ORDER BY c.created_at DESC
  `).all();
}

/**
 * Revoke a certificate.
 */
function revokeCertificate(id, reason) {
  const res = db.prepare(`
    UPDATE certificates 
    SET status = 'REVOKED', revocation_reason = ? 
    WHERE id = ?
  `).run(reason, id);
  return res.changes > 0;
}

/**
 * Log a verification attempt.
 */
function logVerification(entry) {
  const insert = db.prepare(`
    INSERT INTO verification_logs (certificate_id, doc_hash, verification_status, details, client_ip)
    VALUES (@certificate_id, @doc_hash, @verification_status, @details, @client_ip)
  `);
  insert.run({
    certificate_id: entry.certificate_id || null,
    doc_hash: entry.doc_hash,
    verification_status: entry.verification_status,
    details: entry.details ? JSON.stringify(entry.details) : null,
    client_ip: entry.client_ip || '127.0.0.1'
  });
}

/**
 * Get recent verification audit logs.
 */
function getVerificationLogs(limit = 50) {
  return db.prepare(`
    SELECT v.*, c.student_name, c.course_name
    FROM verification_logs v
    LEFT JOIN certificates c ON v.certificate_id = c.id
    ORDER BY v.timestamp DESC
    LIMIT ?
  `).all(limit);
}

/**
 * Get aggregate statistics.
 */
function getStats() {
  const totalCerts = db.prepare('SELECT COUNT(*) as count FROM certificates').get().count;
  const activeCerts = db.prepare("SELECT COUNT(*) as count FROM certificates WHERE status = 'ACTIVE'").get().count;
  const revokedCerts = db.prepare("SELECT COUNT(*) as count FROM certificates WHERE status = 'REVOKED'").get().count;
  const totalVerifications = db.prepare('SELECT COUNT(*) as count FROM verification_logs').get().count;
  const authenticVerifications = db.prepare("SELECT COUNT(*) as count FROM verification_logs WHERE verification_status = 'AUTHENTIC'").get().count;
  const tamperedFraudAlerts = db.prepare("SELECT COUNT(*) as count FROM verification_logs WHERE verification_status = 'TAMPERED'").get().count;

  return {
    totalCerts,
    activeCerts,
    revokedCerts,
    totalVerifications,
    authenticVerifications,
    tamperedFraudAlerts
  };
}

module.exports = {
  db,
  getOrCreateInstitution,
  insertCertificate,
  updateCertificateMerkleInfo,
  getCertificateById,
  getCertificateByHash,
  getAllCertificates,
  revokeCertificate,
  logVerification,
  getVerificationLogs,
  getStats
};
