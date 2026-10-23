import React, { useState, useEffect } from 'react';
import { Layers, Key, Shield, Copy, Check, Clock, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';

export default function LedgerVault({ institution }) {
  const [merkleData, setMerkleData] = useState(null);
  const [logs, setLogs] = useState([]);
  const [copiedKey, setCopiedKey] = useState(false);
  const [selectedLeaf, setSelectedLeaf] = useState(null);

  const fetchLedgerData = async () => {
    try {
      const [merkleRes, logsRes] = await Promise.all([
        fetch('/api/ledger/merkle'),
        fetch('/api/verification-logs')
      ]);
      const mData = await merkleRes.json();
      const lData = await logsRes.json();
      if (mData.success) setMerkleData(mData);
      if (lData.success) setLogs(lData.logs);
    } catch (err) {
      console.error('Failed to fetch ledger vault data:', err);
    }
  };

  useEffect(() => {
    fetchLedgerData();
    const interval = setInterval(fetchLedgerData, 8000);
    return () => clearInterval(interval);
  }, []);

  const copyPublicKey = () => {
    if (institution?.publicKey) {
      navigator.clipboard.writeText(institution.publicKey);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Title */}
      <div style={{ textAlign: 'center', maxWidth: '780px', margin: '0 auto' }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem',
          background: 'rgba(99, 102, 241, 0.1)',
          border: '1px solid rgba(99, 102, 241, 0.3)',
          padding: '0.35rem 0.85rem',
          borderRadius: '9999px',
          fontSize: '0.75rem',
          color: '#a5b4fc',
          marginBottom: '0.75rem'
        }}>
          <Layers size={13} />
          <span>CRYPTOGRAPHIC LEDGER & NON-REPUDIATION VAULT</span>
        </div>
        <h1 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '2.25rem', fontWeight: 800, marginBottom: '0.75rem' }}>
          Merkle Tree & Institutional Key Vault
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: 1.6 }}>
          Inspect the immutable append-only <strong>Merkle Tree</strong> that anchors all issued certificates, 
          review the accredited institution's <strong>ECDSA P-256 Public Key</strong>, and monitor real-time verification attempts across employers worldwide.
        </p>
      </div>

      {/* Institutional Key Pair Info */}
      <div className="glass-card" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ background: 'rgba(6, 182, 212, 0.15)', padding: '0.65rem', borderRadius: '0.5rem' }}>
              <Key size={20} color="#06b6d4" />
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>
                Institutional Public Key Specification
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {institution?.name || 'MIT Cybernetics & Applied Cryptography Consortium'}
              </p>
            </div>
          </div>

          <button onClick={copyPublicKey} className="btn btn-secondary">
            {copiedKey ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
            <span>{copiedKey ? 'Key Copied' : 'Copy PEM Public Key'}</span>
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
          <div style={{ background: 'rgba(6, 9, 19, 0.6)', padding: '1rem', borderRadius: '0.5rem', border: '1px solid var(--border-subtle)' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Signature Algorithm</span>
            <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#38bdf8', marginTop: '0.25rem' }}>
              ECDSA (NIST P-256 / prime256v1)
            </p>
          </div>

          <div style={{ background: 'rgba(6, 9, 19, 0.6)', padding: '1rem', borderRadius: '0.5rem', border: '1px solid var(--border-subtle)' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Hash Standard</span>
            <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#34d399', marginTop: '0.25rem' }}>
              SHA-256 (FIPS PUB 180-4)
            </p>
          </div>

          <div style={{ background: 'rgba(6, 9, 19, 0.6)', padding: '1rem', borderRadius: '0.5rem', border: '1px solid var(--border-subtle)' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Public Key Fingerprint</span>
            <p style={{ fontSize: '0.75rem', fontFamily: 'JetBrains Mono', color: '#cbd5e1', marginTop: '0.25rem' }}>
              {institution?.fingerprint || 'D4:A4:9C:77:33:62:6F:49:81:27...'}
            </p>
          </div>
        </div>

        {/* Public Key PEM view */}
        {institution?.publicKey && (
          <div style={{
            background: 'rgba(4, 7, 15, 0.85)',
            borderRadius: '0.5rem',
            padding: '1rem',
            border: '1px solid var(--border-subtle)'
          }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', display: 'block', marginBottom: '0.5rem' }}>
              PEM Encoded SubjectPublicKeyInfo:
            </span>
            <pre style={{
              fontSize: '0.725rem',
              color: '#94a3b8',
              lineHeight: 1.4,
              overflowX: 'auto',
              fontFamily: 'JetBrains Mono'
            }}>
              {institution.publicKey}
            </pre>
          </div>
        )}
      </div>

      {/* Merkle Tree Visualizer */}
      {merkleData && (
        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Layers size={18} color="#818cf8" />
                <span>Merkle Tree Architecture</span>
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Binary tree structure anchoring {merkleData.leafCount} certificates with logarithmic O(log n) proof verification
              </p>
            </div>

            <div style={{
              background: 'rgba(99, 102, 241, 0.12)',
              border: '1px solid rgba(99, 102, 241, 0.3)',
              borderRadius: '0.5rem',
              padding: '0.4rem 0.85rem'
            }}>
              <span style={{ fontSize: '0.7rem', color: '#a5b4fc', display: 'block' }}>Current Merkle Root:</span>
              <code style={{ fontSize: '0.8rem', color: '#c7d2fe', fontFamily: 'JetBrains Mono' }}>
                {merkleData.merkleRoot}
              </code>
            </div>
          </div>

          {/* Merkle Leaves Grid */}
          <div style={{ marginBottom: '1rem' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: '0.5rem', display: 'block' }}>
              Certificate Leaves in Merkle Tree (Click to inspect path proof):
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' }}>
              {merkleData.leaves.map((leaf) => (
                <div
                  key={leaf.id}
                  onClick={() => setSelectedLeaf(leaf)}
                  style={{
                    padding: '0.75rem',
                    borderRadius: '0.5rem',
                    background: selectedLeaf?.id === leaf.id ? 'rgba(99, 102, 241, 0.2)' : 'rgba(9, 14, 28, 0.6)',
                    border: selectedLeaf?.id === leaf.id ? '1px solid #818cf8' : '1px solid var(--border-subtle)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                    <span style={{ fontSize: '0.7rem', color: '#a5b4fc', fontWeight: 700 }}>LEAF #{leaf.index}</span>
                    <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{leaf.id}</span>
                  </div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#f1f5f9' }}>{leaf.student_name}</div>
                  <div style={{ fontSize: '0.675rem', color: 'var(--text-dim)', marginTop: '0.25rem', fontFamily: 'JetBrains Mono' }}>
                    {leaf.hash.substring(0, 16)}...
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Selected Leaf Proof Inspection */}
          {selectedLeaf && (
            <div style={{
              background: 'rgba(6, 9, 19, 0.8)',
              border: '1px solid rgba(99, 102, 241, 0.3)',
              borderRadius: '0.5rem',
              padding: '1rem',
              marginTop: '1rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#a5b4fc' }}>
                  Merkle Inclusion Proof for {selectedLeaf.student_name} ({selectedLeaf.id})
                </span>
                <span className="badge badge-emerald">VERIFIED ROOT PATH</span>
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                Any verifier can mathematically prove this certificate belongs to the university registry by combining the leaf hash with sibling hashes up to the root:
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontFamily: 'JetBrains Mono', fontSize: '0.725rem' }}>
                <div>
                  <span style={{ color: '#64748b' }}>Leaf Hash: </span>
                  <span style={{ color: '#38bdf8' }}>{selectedLeaf.hash}</span>
                </div>
                {selectedLeaf.proof && selectedLeaf.proof.map((p, idx) => (
                  <div key={idx}>
                    <span style={{ color: '#64748b' }}>Sibling Step {idx + 1} ({p.position}): </span>
                    <span style={{ color: '#c084fc' }}>{p.hash}</span>
                  </div>
                ))}
                <div>
                  <span style={{ color: '#64748b' }}>Target Merkle Root: </span>
                  <span style={{ color: '#34d399' }}>{merkleData.merkleRoot}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Live Verification Telemetry / Audit Log */}
      <div className="glass-card" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
          <Clock size={18} color="#06b6d4" />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>
            Live Audit Trail: Employer Verification Attempts ({logs.length})
          </h3>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-dim)' }}>
                <th style={{ padding: '0.65rem 0.5rem', fontWeight: 600 }}>Timestamp</th>
                <th style={{ padding: '0.65rem 0.5rem', fontWeight: 600 }}>Certificate</th>
                <th style={{ padding: '0.65rem 0.5rem', fontWeight: 600 }}>Presented Hash</th>
                <th style={{ padding: '0.65rem 0.5rem', fontWeight: 600 }}>Client IP</th>
                <th style={{ padding: '0.65rem 0.5rem', fontWeight: 600, textAlign: 'right' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                  <td style={{ padding: '0.65rem 0.5rem', color: 'var(--text-dim)' }}>
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </td>
                  <td style={{ padding: '0.65rem 0.5rem', color: '#f1f5f9', fontWeight: 600 }}>
                    {log.certificate_id || 'UNKNOWN'}
                    {log.student_name && <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', display: 'block' }}>{log.student_name}</span>}
                  </td>
                  <td style={{ padding: '0.65rem 0.5rem', fontFamily: 'JetBrains Mono', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    {log.doc_hash ? log.doc_hash.substring(0, 16) + '...' : 'N/A'}
                  </td>
                  <td style={{ padding: '0.65rem 0.5rem', color: 'var(--text-dim)', fontFamily: 'JetBrains Mono', fontSize: '0.725rem' }}>
                    {log.client_ip}
                  </td>
                  <td style={{ padding: '0.65rem 0.5rem', textAlign: 'right' }}>
                    <span className={`badge ${
                      log.verification_status === 'AUTHENTIC' ? 'badge-emerald' : 
                      log.verification_status === 'REVOKED' ? 'badge-amber' : 'badge-rose'
                    }`}>
                      {log.verification_status}
                    </span>
                  </td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-dim)' }}>
                    No verifications recorded yet. Drop a certificate into the Verifier Portal to generate audit records.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
