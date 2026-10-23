import React, { useState } from 'react';
import { 
  PlusCircle, FileCheck, Download, Trash2, Search, 
  ExternalLink, Check, AlertOctagon, RefreshCw, Key
} from 'lucide-react';

export default function IssuerAdmin({ certificates, onCertificateIssued, onRefreshStats }) {
  const [formData, setFormData] = useState({
    student_name: '',
    student_id: '',
    course_name: '',
    grade: '',
    issue_date: new Date().toISOString().split('T')[0]
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [issuedCert, setIssuedCert] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [revokingCertId, setRevokingCertId] = useState(null);
  const [revocationReason, setRevocationReason] = useState('');

  // Course presets
  const coursePresets = [
    'Advanced Cryptography & Zero-Knowledge Proofs',
    'Applied Blockchain & Distributed Ledger Architecture',
    'Full-Stack Software Engineering & AppSec',
    'Machine Learning & AI Ethics Compliance',
    'Cloud Native Infrastructure & Cyber Defense'
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.student_name || !formData.student_id || !formData.course_name || !formData.grade) {
      alert('Please fill out all required fields.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/certificates/issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (data.success) {
        setIssuedCert(data.certificate);
        setFormData({
          student_name: '',
          student_id: '',
          course_name: '',
          grade: '',
          issue_date: new Date().toISOString().split('T')[0]
        });
        if (onCertificateIssued) onCertificateIssued();
        if (onRefreshStats) onRefreshStats();
      } else {
        alert(data.error || 'Failed to issue certificate.');
      }
    } catch (err) {
      console.error('Issuance error:', err);
      alert('Error communicating with backend.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRevoke = async () => {
    if (!revokingCertId) return;
    try {
      const res = await fetch(`/api/certificates/${revokingCertId}/revoke`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: revocationReason || 'Administrative revocation by Academic Dean' })
      });
      const data = await res.json();
      if (data.success) {
        setRevokingCertId(null);
        setRevocationReason('');
        if (onCertificateIssued) onCertificateIssued();
        if (onRefreshStats) onRefreshStats();
      } else {
        alert(data.error || 'Revocation failed.');
      }
    } catch (err) {
      console.error('Revocation error:', err);
    }
  };

  const filteredCerts = certificates.filter(c => {
    const matchesSearch = 
      c.student_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.student_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.course_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.id.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (filterStatus === 'ALL') return matchesSearch;
    return matchesSearch && c.status === filterStatus;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Title */}
      <div style={{ textAlign: 'center', maxWidth: '780px', margin: '0 auto' }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem',
          background: 'rgba(6, 182, 212, 0.1)',
          border: '1px solid var(--border-cyan)',
          padding: '0.35rem 0.85rem',
          borderRadius: '9999px',
          fontSize: '0.75rem',
          color: '#38bdf8',
          marginBottom: '0.75rem'
        }}>
          <Key size={13} />
          <span>INSTITUTIONAL ISSUING AUTHORITY & REGISTRY</span>
        </div>
        <h1 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '2.25rem', fontWeight: 800, marginBottom: '0.75rem' }}>
          Issue Verifiable Digital Certificates
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: 1.6 }}>
          Accredited educational institutions issue cryptographically signed credentials. 
          The backend automatically generates the <strong>SHA-256 hash</strong>, signs it with the institution's <strong>ECDSA P-256 private key</strong>, embeds a scannable QR code, and generates an official PDF document.
        </p>
      </div>

      {/* Issuance Form & Success Modal */}
      <div className="glass-card" style={{ padding: '1.75rem' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <PlusCircle size={18} color="#06b6d4" />
          <span>New Certificate Generation</span>
        </h3>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
            {/* Student Full Name */}
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: '0.35rem' }}>
                Student Full Name *
              </label>
              <input
                type="text"
                required
                value={formData.student_name}
                onChange={(e) => setFormData({ ...formData, student_name: e.target.value })}
                placeholder="e.g. Jordan Hayes"
                className="input-field"
              />
            </div>

            {/* Student Roll / ID */}
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: '0.35rem' }}>
                Student Identifier / Roll No *
              </label>
              <input
                type="text"
                required
                value={formData.student_id}
                onChange={(e) => setFormData({ ...formData, student_id: e.target.value })}
                placeholder="e.g. MIT-CS-2026-4401"
                className="input-field"
              />
            </div>

            {/* Course / Skill Title */}
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: '0.35rem' }}>
                Course / Skill Credential *
              </label>
              <input
                type="text"
                required
                value={formData.course_name}
                onChange={(e) => setFormData({ ...formData, course_name: e.target.value })}
                placeholder="e.g. Advanced Cryptography & Distributed Systems"
                className="input-field"
              />
            </div>

            {/* Grade / Performance */}
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: '0.35rem' }}>
                Performance / Grade *
              </label>
              <input
                type="text"
                required
                value={formData.grade}
                onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                placeholder="e.g. A+ (Honors - 98.2%)"
                className="input-field"
              />
            </div>

            {/* Issue Date */}
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: '0.35rem' }}>
                Date of Issuance
              </label>
              <input
                type="date"
                value={formData.issue_date}
                onChange={(e) => setFormData({ ...formData, issue_date: e.target.value })}
                className="input-field"
              />
            </div>
          </div>

          {/* Quick Course Presets */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.725rem', color: 'var(--text-dim)' }}>Quick Fill Presets:</span>
            {coursePresets.map((preset) => (
              <button
                type="button"
                key={preset}
                onClick={() => setFormData(f => ({ ...f, course_name: preset }))}
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '0.35rem',
                  padding: '0.2rem 0.5rem',
                  fontSize: '0.7rem',
                  color: 'var(--text-muted)',
                  cursor: 'pointer'
                }}
              >
                {preset.split(' ')[0]} {preset.split(' ')[1]}
              </button>
            ))}
          </div>

          <div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn btn-primary"
              style={{ width: '100%', maxWidth: '280px' }}
            >
              {isSubmitting ? <RefreshCw size={15} className="animate-spin" /> : <FileCheck size={15} />}
              <span>Issue Cryptographic Certificate</span>
            </button>
          </div>
        </form>

        {/* Issued Success Card */}
        {issuedCert && (
          <div style={{
            marginTop: '1.5rem',
            padding: '1.25rem',
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid var(--border-emerald)',
            borderRadius: '0.75rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                <span className="badge badge-emerald">ISSUED & CRYPTOGRAPHICALLY SIGNED</span>
                <span style={{ fontSize: '0.8rem', fontFamily: 'JetBrains Mono', color: '#cbd5e1' }}>{issuedCert.id}</span>
              </div>
              <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#f8fafc' }}>
                {issuedCert.student_name} — {issuedCert.course_name}
              </h4>
              <p style={{ fontSize: '0.75rem', fontFamily: 'JetBrains Mono', color: '#94a3b8', marginTop: '0.25rem' }}>
                SHA-256 Digest: {issuedCert.doc_hash}
              </p>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <a
                href={`/api/certificates/${issuedCert.id}/download`}
                target="_blank"
                rel="noreferrer"
                className="btn btn-emerald"
              >
                <Download size={14} />
                <span>Download Official PDF</span>
              </a>
              <button
                onClick={() => setIssuedCert(null)}
                className="btn btn-secondary"
              >
                <span>Dismiss</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Certificate Registry Table */}
      <div className="glass-card" style={{ padding: '1.5rem' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '1.25rem'
        }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>
              Institutional Credential Registry ({filteredCerts.length})
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              All issued certificates anchored in SQLite database and verified against the Merkle tree
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {/* Search Input */}
            <div style={{ position: 'relative' }}>
              <Search size={14} color="var(--text-dim)" style={{ position: 'absolute', left: '10px', top: '10px' }} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search student, course, ID..."
                className="input-field"
                style={{ paddingLeft: '2rem', paddingRight: '0.75rem', height: '34px', fontSize: '0.8rem' }}
              />
            </div>

            {/* Filter buttons */}
            <div style={{ display: 'flex', background: 'rgba(9, 14, 28, 0.7)', borderRadius: '0.4rem', border: '1px solid var(--border-subtle)', padding: '2px' }}>
              {['ALL', 'ACTIVE', 'REVOKED'].map((status) => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  style={{
                    background: filterStatus === status ? 'rgba(6, 182, 212, 0.2)' : 'transparent',
                    color: filterStatus === status ? '#38bdf8' : 'var(--text-dim)',
                    border: 'none',
                    padding: '0.2rem 0.6rem',
                    borderRadius: '0.3rem',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.825rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-dim)' }}>
                <th style={{ padding: '0.75rem 0.5rem', fontWeight: 600 }}>ID</th>
                <th style={{ padding: '0.75rem 0.5rem', fontWeight: 600 }}>Student</th>
                <th style={{ padding: '0.75rem 0.5rem', fontWeight: 600 }}>Course</th>
                <th style={{ padding: '0.75rem 0.5rem', fontWeight: 600 }}>Grade</th>
                <th style={{ padding: '0.75rem 0.5rem', fontWeight: 600 }}>SHA-256 Digest</th>
                <th style={{ padding: '0.75rem 0.5rem', fontWeight: 600 }}>Status</th>
                <th style={{ padding: '0.75rem 0.5rem', fontWeight: 600, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCerts.map((cert) => (
                <tr 
                  key={cert.id} 
                  style={{
                    borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                    transition: 'background 0.15s ease'
                  }}
                >
                  <td style={{ padding: '0.75rem 0.5rem', fontFamily: 'JetBrains Mono', fontSize: '0.75rem', color: '#38bdf8' }}>
                    {cert.id}
                  </td>
                  <td style={{ padding: '0.75rem 0.5rem' }}>
                    <div style={{ fontWeight: 600, color: '#f1f5f9' }}>{cert.student_name}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>{cert.student_id}</div>
                  </td>
                  <td style={{ padding: '0.75rem 0.5rem', color: '#cbd5e1' }}>
                    {cert.course_name}
                  </td>
                  <td style={{ padding: '0.75rem 0.5rem', fontWeight: 600, color: '#34d399' }}>
                    {cert.grade}
                  </td>
                  <td style={{ padding: '0.75rem 0.5rem', fontFamily: 'JetBrains Mono', fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                    {cert.doc_hash.substring(0, 16)}...
                  </td>
                  <td style={{ padding: '0.75rem 0.5rem' }}>
                    <span className={`badge ${cert.status === 'ACTIVE' ? 'badge-emerald' : 'badge-rose'}`}>
                      {cert.status}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                      <a
                        href={`/api/certificates/${cert.id}/download`}
                        target="_blank"
                        rel="noreferrer"
                        title="Download PDF"
                        className="btn btn-secondary"
                        style={{ padding: '0.3rem 0.5rem', fontSize: '0.75rem' }}
                      >
                        <Download size={13} />
                      </a>
                      {cert.status === 'ACTIVE' && (
                        <button
                          onClick={() => setRevokingCertId(cert.id)}
                          title="Revoke Certificate"
                          className="btn btn-danger"
                          style={{ padding: '0.3rem 0.5rem', fontSize: '0.75rem' }}
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredCerts.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-dim)' }}>
                    No certificates matched your search criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Revocation Modal */}
      {revokingCertId && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '1rem'
        }}>
          <div className="glass-card" style={{ maxWidth: '480px', width: '100%', padding: '1.75rem', borderColor: 'var(--border-rose)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <div style={{ background: 'rgba(244, 63, 94, 0.15)', padding: '0.5rem', borderRadius: '0.5rem' }}>
                <AlertOctagon size={24} color="#f43f5e" />
              </div>
              <div>
                <h4 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Confirm Credential Revocation</h4>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Target: {revokingCertId}</p>
              </div>
            </div>

            <p style={{ fontSize: '0.85rem', color: '#cbd5e1', lineHeight: 1.5, marginBottom: '1rem' }}>
              Revoking this certificate permanently marks it as invalid across all employers and verification portals.
            </p>

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: '0.35rem' }}>
                Official Revocation Reason *
              </label>
              <textarea
                rows={3}
                value={revocationReason}
                onChange={(e) => setRevocationReason(e.target.value)}
                placeholder="e.g. Fraudulent prerequisite transcripts reported by Academic Registrar"
                className="input-field"
                style={{ resize: 'none' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                onClick={() => setRevokingCertId(null)}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleRevoke}
                className="btn btn-danger"
              >
                Confirm Revocation
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
