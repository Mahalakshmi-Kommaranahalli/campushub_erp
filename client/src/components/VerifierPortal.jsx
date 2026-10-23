import React, { useState, useRef } from 'react';
import { 
  UploadCloud, FileText, CheckCircle2, XCircle, AlertTriangle, 
  Shield, Hash, Key, ExternalLink, Download, RefreshCw, 
  Copy, Check, FileCode, ShieldAlert
} from 'lucide-react';
import confetti from 'canvas-confetti';

export default function VerifierPortal({ certificates, onRefreshStats }) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [certIdInput, setCertIdInput] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [activeStepIndex, setActiveStepIndex] = useState(-1);
  const [verificationResult, setVerificationResult] = useState(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const fileInputRef = useRef(null);

  // Quick test sample certificates
  const sampleCerts = [
    { 
      label: 'Alex Rivera (Honors)', 
      id: 'CERT-2026-9A4F-8201', 
      type: 'genuine', 
      desc: 'Valid MIT Cryptography Cert' 
    },
    { 
      label: 'Sarah Chen (Distinction)', 
      id: 'CERT-2026-3B1E-7740', 
      type: 'genuine', 
      desc: 'Valid MIT Blockchain Cert' 
    },
    { 
      label: 'Tampered Forgery Attack', 
      id: 'TAMPER_DEMO', 
      type: 'tamper', 
      desc: 'Grade changed from B+ to A+' 
    },
    { 
      label: 'Michael Vance (Revoked)', 
      id: 'CERT-2026-5F88-1293', 
      type: 'revoked', 
      desc: 'Revoked for transcript fraud' 
    }
  ];

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelected = (file) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.pdf') && !file.type.includes('pdf')) {
      alert('Please upload a valid PDF certificate file.');
      return;
    }
    setSelectedFile(file);
    setCertIdInput('');
    triggerVerification({ file });
  };

  const triggerVerification = async ({ file, certId, isTamperDemo }) => {
    setIsVerifying(true);
    setVerificationResult(null);
    setActiveStepIndex(0);

    // Simulated multi-stage verification pipeline animation
    const steps = [0, 1, 2, 3, 4];
    for (const step of steps) {
      setActiveStepIndex(step);
      await new Promise(r => setTimeout(r, 220));
    }

    try {
      if (isTamperDemo) {
        // Run tamper test against Alex Rivera's cert
        const res = await fetch('/api/certificates/tamper-test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            certificateId: 'CERT-2026-9A4F-8201',
            tamperedField: 'grade',
            tamperedValue: 'O+ (Forged 100% Top Rank)'
          })
        });
        const data = await res.json();
        
        setVerificationResult({
          status: 'TAMPERED',
          verdict: 'CRITICAL FRAUD ALERT: HASH MISMATCH',
          color: 'red',
          explanation: 'The certificate payload has been tampered with! The forged grade changed the SHA-256 hash completely, breaking the institutional digital signature.',
          certificate: {
            id: 'CERT-2026-9A4F-8201',
            student_name: 'Alex Rivera',
            course_name: 'Advanced Cryptography & Zero-Knowledge Proofs',
            grade: 'O+ (Forged 100% Top Rank) [ORIGINAL: A+ (Honors - 98.6%)]',
            institution_name: 'MIT Cybernetics & Applied Cryptography Consortium'
          },
          avalancheData: data.avalancheEffect,
          steps: [
            { name: 'Document SHA-256 Hashing', passed: true, details: `Tampered Hash: ${data.tampered.sha256Hash.substring(0, 18)}...` },
            { name: 'Database Registry Lookup', passed: true, details: 'Record found in MIT registry' },
            { name: 'Cryptographic Signature Verification', passed: false, details: 'FAIL: ECDSA point verification failed' },
            { name: 'Merkle Ledger Integrity Check', passed: false, details: 'FAIL: Leaf does not match signed root' },
            { name: 'Certificate Active Status', passed: false, details: 'UNTRUSTED - Forgery Detected' }
          ]
        });
      } else {
        let res;
        if (file) {
          const formData = new FormData();
          formData.append('certificateFile', file);
          res = await fetch('/api/certificates/verify', {
            method: 'POST',
            body: formData
          });
        } else {
          res = await fetch('/api/certificates/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ certificateId: certId })
          });
        }

        const data = await res.json();
        setVerificationResult(data);

        if (data.status === 'AUTHENTIC') {
          confetti({
            particleCount: 60,
            spread: 70,
            origin: { y: 0.6 }
          });
        }
      }

      if (onRefreshStats) onRefreshStats();
    } catch (err) {
      console.error('Verification error:', err);
      alert('Verification request failed. Ensure backend server is running.');
    } finally {
      setIsVerifying(false);
      setActiveStepIndex(5);
    }
  };

  const handleQuickTest = (sample) => {
    if (sample.id === 'TAMPER_DEMO') {
      setSelectedFile(null);
      setCertIdInput('TAMPER_ATTACK_DEMO');
      triggerVerification({ isTamperDemo: true });
    } else {
      setSelectedFile(null);
      setCertIdInput(sample.id);
      triggerVerification({ certId: sample.id });
    }
  };

  const copyVerifyLink = (id) => {
    const url = `${window.location.origin}/?verifyId=${encodeURIComponent(id)}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Title & Elevator Pitch */}
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
          <Shield size={13} />
          <span>ZERO-KNOWLEDGE / TAMPER-PROOF VERIFICATION PORTAL</span>
        </div>
        <h1 style={{
          fontFamily: 'Outfit, sans-serif',
          fontSize: '2.25rem',
          fontWeight: 800,
          lineHeight: 1.2,
          marginBottom: '0.75rem'
        }}>
          Instant Cryptographic Proof of Skill Verifier
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: 1.6 }}>
          Employers, admissions teams, and background check agencies can drop any digital certificate PDF. 
          Our cryptographic engine computes its <strong>SHA-256 digest</strong>, validates the 
          <strong>ECDSA P-256 digital signature</strong>, and verifies its position in the immutable <strong>Merkle Ledger</strong>.
        </p>
      </div>

      {/* Quick Test Demo Bar */}
      <div className="glass-card" style={{ padding: '1rem 1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.825rem', color: 'var(--text-muted)' }}>
            <FileCode size={16} color="#06b6d4" />
            <span style={{ fontWeight: 600, color: '#f1f5f9' }}>1-Click Evaluation Presets:</span>
            <span>Test instant verification scenarios</span>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {sampleCerts.map((sample) => (
              <button
                key={sample.id}
                onClick={() => handleQuickTest(sample)}
                disabled={isVerifying}
                className="btn btn-secondary"
                style={{
                  padding: '0.4rem 0.75rem',
                  fontSize: '0.75rem',
                  borderColor: sample.type === 'tamper' 
                    ? 'rgba(244, 63, 94, 0.4)' 
                    : sample.type === 'revoked' 
                    ? 'rgba(245, 158, 11, 0.4)' 
                    : 'rgba(16, 185, 129, 0.4)'
                }}
              >
                <span style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: sample.type === 'tamper' ? '#f43f5e' : sample.type === 'revoked' ? '#f59e0b' : '#10b981'
                }}></span>
                <span>{sample.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Drag & Drop Verifier Zone */}
      <div 
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current && fileInputRef.current.click()}
        className="glass-card"
        style={{
          padding: '2.5rem 1.5rem',
          textAlign: 'center',
          cursor: 'pointer',
          position: 'relative',
          overflow: 'hidden',
          borderColor: dragActive ? 'var(--cyan)' : 'var(--border-subtle)',
          boxShadow: dragActive ? '0 0 30px var(--cyan-glow)' : 'none',
          background: dragActive ? 'rgba(6, 182, 212, 0.08)' : 'var(--bg-card)',
          transition: 'all 0.2s ease'
        }}
      >
        {isVerifying && <div className="scanning-line"></div>}

        <input 
          ref={fileInputRef}
          type="file" 
          accept="application/pdf"
          style={{ display: 'none' }}
          onChange={(e) => e.target.files && handleFileSelected(e.target.files[0])}
        />

        <div style={{
          width: '68px',
          height: '68px',
          borderRadius: '1rem',
          background: 'rgba(6, 182, 212, 0.1)',
          border: '1px solid var(--border-cyan)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 1.25rem'
        }}>
          <UploadCloud size={32} color="#06b6d4" />
        </div>

        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.4rem' }}>
          {selectedFile ? `Selected: ${selectedFile.name}` : 'Drop Certificate PDF Document Here'}
        </h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.25rem' }}>
          Drag and drop the official certificate PDF, or click to browse files from your computer
        </p>

        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.65rem',
          padding: '0.35rem 0.85rem',
          background: 'rgba(15, 23, 42, 0.8)',
          borderRadius: '0.5rem',
          border: '1px solid var(--border-subtle)',
          fontSize: '0.75rem',
          color: 'var(--text-dim)'
        }}>
          <span>Supported: PDF (Official Verifiable Credentials)</span>
          <span>•</span>
          <span>Client-side SHA-256 Hashing Available</span>
        </div>
      </div>

      {/* Manual Certificate ID Input Search */}
      <div className="glass-card" style={{ padding: '1.25rem 1.5rem' }}>
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            if (certIdInput.trim()) triggerVerification({ certId: certIdInput.trim() });
          }}
          style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}
        >
          <div style={{ flex: '1 1 300px', position: 'relative' }}>
            <Hash size={16} color="var(--text-dim)" style={{ position: 'absolute', left: '12px', top: '13px' }} />
            <input
              type="text"
              value={certIdInput}
              onChange={(e) => setCertIdInput(e.target.value)}
              placeholder="Or enter Certificate Identifier (e.g. CERT-2026-9A4F-8201) or SHA-256 hash..."
              className="input-field"
              style={{ paddingLeft: '2.4rem' }}
            />
          </div>
          <button 
            type="submit" 
            disabled={isVerifying || !certIdInput.trim()}
            className="btn btn-primary"
          >
            {isVerifying ? <RefreshCw size={15} className="animate-spin" /> : <Shield size={15} />}
            <span>Verify Credential</span>
          </button>
        </form>
      </div>

      {/* Verification Stepper Flow (High-Tech Pipeline) */}
      {(isVerifying || verificationResult) && (
        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Shield size={18} color="#06b6d4" />
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700 }}>5-Stage Cryptographic Verification Pipeline</h4>
            </div>
            <span style={{ fontSize: '0.75rem', color: isVerifying ? '#38bdf8' : '#10b981', fontWeight: 600 }}>
              {isVerifying ? 'ANALYZING CRYPTOGRAPHIC PRIMITIVES...' : 'VERIFICATION COMPLETE'}
            </span>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '0.75rem'
          }}>
            {[
              { title: '1. Document Hashing', sub: 'SHA-256 Digest' },
              { title: '2. Registry Lookup', sub: 'Institutional DB' },
              { title: '3. Digital Signature', sub: 'ECDSA P-256 Curve' },
              { title: '4. Merkle Ledger', sub: 'Audit Root Proof' },
              { title: '5. Tamper Verdict', sub: 'Byte Integrity' }
            ].map((step, idx) => {
              const isCurrent = activeStepIndex === idx && isVerifying;
              const isDone = activeStepIndex > idx || (!isVerifying && verificationResult);
              const stepResult = verificationResult?.steps?.[idx];
              const isPassed = stepResult ? stepResult.passed : true;

              return (
                <div 
                  key={step.title}
                  style={{
                    background: isCurrent ? 'rgba(6, 182, 212, 0.15)' : 'rgba(9, 14, 28, 0.6)',
                    border: isCurrent 
                      ? '1px solid var(--cyan)' 
                      : isDone && !isPassed 
                      ? '1px solid var(--border-rose)' 
                      : isDone 
                      ? '1px solid var(--border-emerald)' 
                      : '1px solid var(--border-subtle)',
                    padding: '0.75rem',
                    borderRadius: '0.5rem',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#f1f5f9' }}>{step.title}</span>
                    {isCurrent ? (
                      <RefreshCw size={13} color="#06b6d4" className="animate-spin" />
                    ) : isDone && isPassed ? (
                      <CheckCircle2 size={14} color="#10b981" />
                    ) : isDone && !isPassed ? (
                      <XCircle size={14} color="#f43f5e" />
                    ) : (
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#475569' }}></span>
                    )}
                  </div>
                  <p style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                    {stepResult?.details || step.sub}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Verification Result Card */}
      {verificationResult && (
        <div 
          className="glass-card" 
          style={{
            padding: '2rem',
            border: verificationResult.status === 'AUTHENTIC'
              ? '1px solid var(--border-emerald)'
              : verificationResult.status === 'REVOKED'
              ? '1px solid var(--border-amber)'
              : '1px solid var(--border-rose)',
            boxShadow: verificationResult.status === 'AUTHENTIC'
              ? '0 0 35px var(--emerald-glow)'
              : verificationResult.status === 'REVOKED'
              ? '0 0 35px var(--amber-glow)'
              : '0 0 35px var(--rose-glow)'
          }}
        >
          {/* Header Banner */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
            paddingBottom: '1.5rem',
            borderBottom: '1px solid var(--border-subtle)',
            marginBottom: '1.5rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{
                width: '52px',
                height: '52px',
                borderRadius: '1rem',
                background: verificationResult.status === 'AUTHENTIC' 
                  ? 'rgba(16, 185, 129, 0.15)' 
                  : verificationResult.status === 'REVOKED'
                  ? 'rgba(245, 158, 11, 0.15)'
                  : 'rgba(244, 63, 94, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {verificationResult.status === 'AUTHENTIC' ? (
                  <CheckCircle2 size={32} color="#10b981" />
                ) : verificationResult.status === 'REVOKED' ? (
                  <AlertTriangle size={32} color="#f59e0b" />
                ) : (
                  <ShieldAlert size={32} color="#f43f5e" />
                )}
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                  <span className={`badge ${
                    verificationResult.status === 'AUTHENTIC' ? 'badge-emerald' : 
                    verificationResult.status === 'REVOKED' ? 'badge-amber' : 'badge-rose'
                  }`}>
                    {verificationResult.verdict}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                    Verified on {new Date().toLocaleTimeString()}
                  </span>
                </div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>
                  {verificationResult.explanation}
                </h3>
              </div>
            </div>

            {verificationResult.certificate && (
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <a 
                  href={`/api/certificates/${verificationResult.certificate.id}/download`} 
                  className="btn btn-emerald"
                  target="_blank"
                  rel="noreferrer"
                >
                  <Download size={14} />
                  <span>Download Official PDF</span>
                </a>
                <button
                  onClick={() => copyVerifyLink(verificationResult.certificate.id)}
                  className="btn btn-secondary"
                >
                  {copiedLink ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                  <span>{copiedLink ? 'Copied' : 'Share Proof'}</span>
                </button>
              </div>
            )}
          </div>

          {/* Certificate Credential Body */}
          {verificationResult.certificate && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '1.5rem',
              marginBottom: '1.5rem'
            }}>
              <div style={{ background: 'rgba(6, 9, 19, 0.6)', padding: '1.25rem', borderRadius: '0.75rem', border: '1px solid var(--border-subtle)' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Student Credential Holder
                </span>
                <h4 style={{ fontSize: '1.25rem', fontWeight: 700, marginTop: '0.25rem', color: '#f8fafc' }}>
                  {verificationResult.certificate.student_name}
                </h4>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  Identifier: <code style={{ color: '#38bdf8' }}>{verificationResult.certificate.student_id}</code>
                </p>
                <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-subtle)' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Accredited Institution</span>
                  <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#e2e8f0' }}>
                    {verificationResult.certificate.institution_name || 'MIT Cybernetics & Applied Cryptography Consortium'}
                  </p>
                </div>
              </div>

              <div style={{ background: 'rgba(6, 9, 19, 0.6)', padding: '1.25rem', borderRadius: '0.75rem', border: '1px solid var(--border-subtle)' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Demonstrated Skill / Qualification
                </span>
                <h4 style={{ fontSize: '1.15rem', fontWeight: 700, marginTop: '0.25rem', color: '#38bdf8' }}>
                  {verificationResult.certificate.course_name}
                </h4>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.5rem' }}>
                  <span style={{
                    background: 'rgba(16, 185, 129, 0.1)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    color: '#34d399',
                    padding: '0.25rem 0.65rem',
                    borderRadius: '0.35rem',
                    fontSize: '0.8rem',
                    fontWeight: 700
                  }}>
                    {verificationResult.certificate.grade}
                  </span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Issued: {verificationResult.certificate.issue_date}
                  </span>
                </div>
                <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-subtle)' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Certificate ID</span>
                  <p style={{ fontSize: '0.875rem', fontFamily: 'JetBrains Mono', color: '#cbd5e1' }}>
                    {verificationResult.certificate.id}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Avalanche Effect Box if Tampered */}
          {verificationResult.avalancheData && (
            <div style={{
              background: 'rgba(244, 63, 94, 0.08)',
              border: '1px solid var(--border-rose)',
              borderRadius: '0.75rem',
              padding: '1.25rem',
              marginBottom: '1.5rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <AlertTriangle size={18} color="#f43f5e" />
                <h5 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#fb7185' }}>
                  Strict Avalanche Criterion (SAC) Analysis - Cryptographic Divergence
                </h5>
              </div>
              <p style={{ fontSize: '0.8rem', color: '#fca5a5', lineHeight: 1.5, marginBottom: '0.75rem' }}>
                Because the document content was modified, the SHA-256 hashing algorithm caused an avalanche effect:
                <strong> {verificationResult.avalancheData.flippedBits} out of 256 bits ({verificationResult.avalancheData.percentageFlipped}%) </strong> 
                flipped, causing complete mathematical incompatibility with the institution's ECDSA digital signature.
              </p>
              <div style={{
                background: 'rgba(9, 14, 28, 0.8)',
                padding: '0.75rem',
                borderRadius: '0.5rem',
                fontFamily: 'JetBrains Mono',
                fontSize: '0.725rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.35rem'
              }}>
                <div>
                  <span style={{ color: '#94a3b8' }}>ORIGINAL SHA-256: </span>
                  <span style={{ color: '#34d399' }}>{verificationResult.avalancheData.hashA}</span>
                </div>
                <div>
                  <span style={{ color: '#94a3b8' }}>TAMPERED SHA-256: </span>
                  <span style={{ color: '#fb7185' }}>{verificationResult.avalancheData.hashB}</span>
                </div>
                <div style={{ color: '#cbd5e1', marginTop: '0.25rem' }}>
                  Hamming Distance: {verificationResult.avalancheData.hammingDistance} bits difference
                </div>
              </div>
            </div>
          )}

          {/* Cryptographic Audit Trail Details */}
          <div style={{
            background: 'rgba(4, 7, 15, 0.75)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '0.75rem',
            padding: '1.25rem',
            fontFamily: 'JetBrains Mono',
            fontSize: '0.75rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.75rem', color: '#38bdf8' }}>
              <Key size={14} />
              <span style={{ fontWeight: 700 }}>CRYPTOGRAPHIC INTEGRITY AUDIT TRAIL</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.75rem' }}>
              <div>
                <span style={{ color: '#64748b' }}>DOC SHA-256 HASH:</span>
                <p style={{ color: '#e2e8f0', wordBreak: 'break-all' }}>
                  {verificationResult.cryptographicProof?.hash || verificationResult.certificate?.doc_hash || verificationResult.computedHash}
                </p>
              </div>

              <div>
                <span style={{ color: '#64748b' }}>MERKLE ROOT ANCHOR:</span>
                <p style={{ color: '#e2e8f0', wordBreak: 'break-all' }}>
                  {verificationResult.cryptographicProof?.merkleRoot || verificationResult.certificate?.merkle_root || 'N/A'}
                </p>
              </div>

              <div>
                <span style={{ color: '#64748b' }}>ISSUER PUBLIC KEY FINGERPRINT:</span>
                <p style={{ color: '#e2e8f0', wordBreak: 'break-all' }}>
                  {verificationResult.cryptographicProof?.issuerFingerprint || verificationResult.certificate?.issuer_fingerprint || 'N/A'}
                </p>
              </div>

              <div>
                <span style={{ color: '#64748b' }}>ECDSA DIGITAL SIGNATURE (P-256):</span>
                <p style={{ color: '#34d399', wordBreak: 'break-all' }}>
                  {verificationResult.cryptographicProof?.signature 
                    ? `${verificationResult.cryptographicProof.signature.substring(0, 40)}... (VERIFIED)` 
                    : verificationResult.certificate?.signature 
                    ? `${verificationResult.certificate.signature.substring(0, 40)}...`
                    : 'INVALID'}
                </p>
              </div>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
