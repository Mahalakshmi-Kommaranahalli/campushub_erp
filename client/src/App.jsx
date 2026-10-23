import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import VerifierPortal from './components/VerifierPortal';
import TamperPlayground from './components/TamperPlayground';
import IssuerAdmin from './components/IssuerAdmin';
import LedgerVault from './components/LedgerVault';
import { ShieldCheck, Award, AlertTriangle, Layers, Lock, Cpu } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('verifier');
  const [stats, setStats] = useState(null);
  const [institution, setInstitution] = useState(null);
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchGlobalData = async () => {
    try {
      const [statsRes, keysRes, certsRes] = await Promise.all([
        fetch('/api/stats'),
        fetch('/api/institution/keys'),
        fetch('/api/certificates')
      ]);

      const statsData = await statsRes.json();
      const keysData = await keysRes.json();
      const certsData = await certsRes.json();

      if (statsData.success) setStats(statsData.stats);
      if (keysData.success) setInstitution(keysData.institution);
      if (certsData.success) setCertificates(certsData.certificates);
    } catch (err) {
      console.error('Error fetching global application data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGlobalData();

    // Check if URL has ?verifyId=...
    const urlParams = new URLSearchParams(window.location.search);
    const verifyId = urlParams.get('verifyId');
    if (verifyId) {
      setActiveTab('verifier');
    }
  }, []);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top Navigation */}
      <Navbar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        stats={stats} 
        institution={institution} 
      />

      {/* Hero Stats Telemetry Ribbon */}
      <div style={{
        borderBottom: '1px solid var(--border-subtle)',
        background: 'rgba(9, 14, 28, 0.4)',
        padding: '0.75rem 1.5rem'
      }}>
        <div style={{
          maxWidth: '1280px',
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '1rem'
        }}>
          {/* Stat 1 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{ background: 'rgba(6, 182, 212, 0.12)', padding: '0.45rem', borderRadius: '0.4rem' }}>
              <Award size={18} color="#06b6d4" />
            </div>
            <div>
              <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#f8fafc' }}>
                {stats?.totalCerts ?? 3}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
                Issued Certificates
              </div>
            </div>
          </div>

          {/* Stat 2 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{ background: 'rgba(16, 185, 129, 0.12)', padding: '0.45rem', borderRadius: '0.4rem' }}>
              <ShieldCheck size={18} color="#10b981" />
            </div>
            <div>
              <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#34d399' }}>
                {stats?.activeCerts ?? 2}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
                Active & Untampered
              </div>
            </div>
          </div>

          {/* Stat 3 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{ background: 'rgba(244, 63, 94, 0.12)', padding: '0.45rem', borderRadius: '0.4rem' }}>
              <AlertTriangle size={18} color="#f43f5e" />
            </div>
            <div>
              <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#fb7185' }}>
                {stats?.tamperedFraudAlerts ?? 0}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
                Fraud Attempts Intercepted
              </div>
            </div>
          </div>

          {/* Stat 4 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{ background: 'rgba(99, 102, 241, 0.12)', padding: '0.45rem', borderRadius: '0.4rem' }}>
              <Layers size={18} color="#818cf8" />
            </div>
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#c7d2fe', fontFamily: 'JetBrains Mono' }}>
                {stats?.merkleRoot ? stats.merkleRoot.substring(0, 14) + '...' : '78e1c0c41a...'}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
                Merkle Root Ledger
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main style={{
        flex: 1,
        maxWidth: '1280px',
        width: '100%',
        margin: '0 auto',
        padding: '2.5rem 1.5rem'
      }}>
        {activeTab === 'verifier' && (
          <VerifierPortal 
            certificates={certificates} 
            onRefreshStats={fetchGlobalData} 
          />
        )}

        {activeTab === 'tamper-lab' && (
          <TamperPlayground 
            certificates={certificates} 
          />
        )}

        {activeTab === 'issuer' && (
          <IssuerAdmin 
            certificates={certificates} 
            onCertificateIssued={fetchGlobalData}
            onRefreshStats={fetchGlobalData}
          />
        )}

        {activeTab === 'ledger' && (
          <LedgerVault 
            institution={institution} 
          />
        )}
      </main>

      {/* Footer */}
      <footer style={{
        borderTop: '1px solid var(--border-subtle)',
        background: 'rgba(6, 9, 19, 0.9)',
        padding: '1.5rem',
        marginTop: 'auto',
        fontSize: '0.8rem',
        color: 'var(--text-dim)'
      }}>
        <div style={{
          maxWidth: '1280px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          <div>
            <strong style={{ color: '#cbd5e1' }}>CertiCrypt: Cryptographic Proof of Skill Verifier</strong>
            <p style={{ marginTop: '0.2rem' }}>
              Purely software-based enterprise architecture solving educational & credential fraud with SHA-256 and ECDSA P-256.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <span>FIPS 180-4 SHA-256</span>
            <span>•</span>
            <span>NIST P-256 ECDSA</span>
            <span>•</span>
            <span>Immutable Merkle Ledger</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
