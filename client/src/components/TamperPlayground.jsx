import React, { useState, useEffect } from 'react';
import { AlertTriangle, Cpu, RefreshCw, ArrowRight, ShieldCheck, Zap } from 'lucide-react';

export default function TamperPlayground({ certificates }) {
  const [selectedCertId, setSelectedCertId] = useState('');
  const [tamperedField, setTamperedField] = useState('grade');
  const [tamperedValue, setTamperedValue] = useState('');
  const [analysisResult, setAnalysisResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (certificates && certificates.length > 0 && !selectedCertId) {
      const activeCert = certificates.find(c => c.status === 'ACTIVE') || certificates[0];
      setSelectedCertId(activeCert.id);
      setTamperedValue('A+ (100% Forged Grade)');
    }
  }, [certificates, selectedCertId]);

  const currentCert = certificates.find(c => c.id === selectedCertId);

  const runTamperSimulation = async () => {
    if (!selectedCertId || !tamperedValue) return;
    setIsLoading(true);

    try {
      const res = await fetch('/api/certificates/tamper-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          certificateId: selectedCertId,
          tamperedField,
          tamperedValue
        })
      });
      const data = await res.json();
      setAnalysisResult(data);
    } catch (err) {
      console.error('Tamper test error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedCertId && tamperedValue) {
      runTamperSimulation();
    }
  }, [selectedCertId, tamperedField, tamperedValue]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Title */}
      <div style={{ textAlign: 'center', maxWidth: '800px', margin: '0 auto' }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem',
          background: 'rgba(244, 63, 94, 0.1)',
          border: '1px solid var(--border-rose)',
          padding: '0.35rem 0.85rem',
          borderRadius: '9999px',
          fontSize: '0.75rem',
          color: '#fb7185',
          marginBottom: '0.75rem'
        }}>
          <Zap size={13} />
          <span>CRYPTOGRAPHIC FORGERY TESTBED & AVALANCHE VISUALIZER</span>
        </div>
        <h1 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '2.25rem', fontWeight: 800, marginBottom: '0.75rem' }}>
          Interactive Tamper Lab & Avalanche Effect
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: 1.6 }}>
          Experience the mathematical proof behind why digital certificates cannot be forged. 
          Modify even a single character in the student's name or grade, and witness how the 
          <strong> Strict Avalanche Criterion (SAC)</strong> of SHA-256 flips ~50% of the cryptographic bits, instantly breaking the institutional digital signature!
        </p>
      </div>

      {/* Control Panel */}
      <div className="glass-card" style={{ padding: '1.5rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Cpu size={16} color="#06b6d4" />
          <span>Tampering Simulator Controls</span>
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
          {/* Select Certificate */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: '0.35rem' }}>
              Target Certificate
            </label>
            <select
              value={selectedCertId}
              onChange={(e) => {
                setSelectedCertId(e.target.value);
                const c = certificates.find(x => x.id === e.target.value);
                if (c) {
                  setTamperedValue(tamperedField === 'grade' ? 'O+ (Forged Performance)' : `${c.student_name} (Hacked)`);
                }
              }}
              className="input-field"
            >
              {certificates.map(c => (
                <option key={c.id} value={c.id}>
                  {c.id} - {c.student_name} ({c.grade})
                </option>
              ))}
            </select>
          </div>

          {/* Select Field to Alter */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: '0.35rem' }}>
              Field to Forged / Alter
            </label>
            <select
              value={tamperedField}
              onChange={(e) => {
                setTamperedField(e.target.value);
                if (currentCert) {
                  setTamperedValue(e.target.value === 'grade' ? 'A+ (Forged Grade)' : `${currentCert.student_name} Fake`);
                }
              }}
              className="input-field"
            >
              <option value="grade">Grade / Marks Card Record</option>
              <option value="student_name">Student Name</option>
              <option value="course_name">Course / Degree Skill Title</option>
            </select>
          </div>

          {/* Malicious Value */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: '0.35rem' }}>
              Injected Forged Value
            </label>
            <input
              type="text"
              value={tamperedValue}
              onChange={(e) => setTamperedValue(e.target.value)}
              placeholder="e.g. A+ (100% Top Rank)"
              className="input-field"
            />
          </div>
        </div>

        {currentCert && (
          <div style={{
            marginTop: '1rem',
            padding: '0.75rem 1rem',
            background: 'rgba(6, 9, 19, 0.6)',
            borderRadius: '0.5rem',
            border: '1px solid var(--border-subtle)',
            fontSize: '0.8rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.5rem'
          }}>
            <div>
              <span style={{ color: 'var(--text-dim)' }}>Original Value: </span>
              <strong style={{ color: '#34d399' }}>{currentCert[tamperedField]}</strong>
            </div>
            <ArrowRight size={14} color="#64748b" />
            <div>
              <span style={{ color: 'var(--text-dim)' }}>Forged Injected: </span>
              <strong style={{ color: '#fb7185' }}>{tamperedValue || '(empty)'}</strong>
            </div>
          </div>
        )}
      </div>

      {/* Analysis Results Display */}
      {analysisResult && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Side-by-side Hash Comparison */}
          <div className="glass-card" style={{ padding: '1.5rem' }}>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '1rem' }}>
              SHA-256 Digest Comparison (Cryptographic Divergence)
            </h4>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {/* Genuine */}
              <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid var(--border-emerald)', borderRadius: '0.5rem', padding: '0.85rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#34d399' }}>AUTHENTIC INSTITUTIONAL HASH:</span>
                  <span className="badge badge-emerald">REGISTERED & SIGNED</span>
                </div>
                <code style={{ fontSize: '0.825rem', color: '#6ee7b7', wordBreak: 'break-all' }}>
                  {analysisResult.original.sha256Hash}
                </code>
              </div>

              {/* Tampered */}
              <div style={{ background: 'rgba(244, 63, 94, 0.08)', border: '1px solid var(--border-rose)', borderRadius: '0.5rem', padding: '0.85rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#fb7185' }}>TAMPERED / FORGED HASH:</span>
                  <span className="badge badge-rose">SIGNATURE INVALID</span>
                </div>
                <code style={{ fontSize: '0.825rem', color: '#fda4af', wordBreak: 'break-all' }}>
                  {analysisResult.tampered.sha256Hash}
                </code>
              </div>
            </div>
          </div>

          {/* 256-Bit Avalanche Grid Visualizer */}
          <div className="glass-card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
              <div>
                <h4 style={{ fontSize: '1rem', fontWeight: 700 }}>
                  256-Bit Avalanche Map (Bit Flips in Red)
                </h4>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Each square represents 1 bit in the SHA-256 output. Red squares highlight bits that flipped due to the tamper attempt.
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fb7185' }}>
                    {analysisResult.avalancheEffect.percentageFlipped}%
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                    {analysisResult.avalancheEffect.flippedBits} / 256 Bits Flipped
                  </div>
                </div>

                <div style={{
                  padding: '0.35rem 0.65rem',
                  borderRadius: '0.35rem',
                  background: 'rgba(244, 63, 94, 0.15)',
                  border: '1px solid var(--border-rose)',
                  fontSize: '0.75rem',
                  color: '#fda4af',
                  fontWeight: 600
                }}>
                  Hamming Distance: {analysisResult.avalancheEffect.hammingDistance}
                </div>
              </div>
            </div>

            {/* The 256-bit Grid */}
            <div className="bit-grid">
              {analysisResult.avalancheEffect.bitComparison.map((bit) => (
                <div
                  key={bit.index}
                  title={`Bit #${bit.index}: ${bit.isFlipped ? 'FLIPPED (' + bit.bitA + ' -> ' + bit.bitB + ')' : 'UNCHANGED (' + bit.bitA + ')'}`}
                  className={`bit-cell ${bit.isFlipped ? 'bit-flipped' : 'bit-same'}`}
                >
                  {bit.bitB}
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.75rem', fontSize: '0.75rem', color: 'var(--text-dim)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ width: '10px', height: '10px', background: '#f43f5e', borderRadius: '2px' }}></span>
                <span>Flipped Bit (Avalanche Effect)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ width: '10px', height: '10px', background: '#1e293b', borderRadius: '2px' }}></span>
                <span>Unchanged Bit</span>
              </div>
            </div>
          </div>

          {/* Cryptographic Verdict Card */}
          <div className="glass-card" style={{ padding: '1.5rem', background: 'rgba(244, 63, 94, 0.05)', borderColor: 'var(--border-rose)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
              <div style={{
                background: 'rgba(244, 63, 94, 0.15)',
                padding: '0.75rem',
                borderRadius: '0.5rem',
                border: '1px solid var(--border-rose)'
              }}>
                <AlertTriangle size={24} color="#f43f5e" />
              </div>
              <div>
                <h4 style={{ fontSize: '1rem', fontWeight: 800, color: '#fb7185', marginBottom: '0.35rem' }}>
                  Mathematical Verification Failure: Non-Repudiation Preserved
                </h4>
                <p style={{ fontSize: '0.85rem', color: '#e2e8f0', lineHeight: 1.6 }}>
                  When the verifier evaluates the altered document, the elliptic curve equation 
                  <code style={{ background: '#090e1a', padding: '0.15rem 0.35rem', borderRadius: '0.25rem', color: '#38bdf8' }}>
                    s⁻¹(e · G + r · Q) ≠ R
                  </code> fails completely. 
                  Because the hash changed by {analysisResult.avalancheEffect.percentageFlipped}%, 
                  an attacker cannot compute a matching signature without the institution's private key (ECDSA P-256 discrete logarithm problem).
                </p>
              </div>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
