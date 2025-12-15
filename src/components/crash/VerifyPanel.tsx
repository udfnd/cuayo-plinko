'use client';

import { useState } from 'react';
import { calculateCrashPoint, getHmac } from '@/lib/crash/crashPoint';
import { SALT, HOUSE_EDGE_PERCENT } from '@/lib/crash/constants';

interface VerifyPanelProps {
  currentGameHash: string;
  previousGameHash: string | null;
  commitHash: string;
  lastCrashPoint: number | null;
}

export default function VerifyPanel({
  currentGameHash,
  previousGameHash,
  commitHash,
  lastCrashPoint,
}: VerifyPanelProps) {
  const [verifyHash, setVerifyHash] = useState('');
  const [verifyResult, setVerifyResult] = useState<{
    crashPoint: number;
    hmac: string;
    isValid: boolean;
  } | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const handleVerify = async () => {
    if (!verifyHash) return;

    setIsVerifying(true);
    try {
      const crashPoint = await calculateCrashPoint(verifyHash);
      const hmac = await getHmac(verifyHash);

      setVerifyResult({
        crashPoint,
        hmac,
        isValid: true,
      });
    } catch {
      setVerifyResult({
        crashPoint: 0,
        hmac: '',
        isValid: false,
      });
    }
    setIsVerifying(false);
  };

  return (
    <div style={{
      width: '100%',
      maxWidth: '600px',
      padding: '20px',
      background: '#1a1a2e',
      borderRadius: '12px',
      marginTop: '20px',
    }}>
      <h3 style={{ color: '#fff', marginBottom: '16px', fontSize: '18px' }}>
        Provably Fair Verification
      </h3>

      {/* 현재 정보 */}
      <div style={{
        display: 'grid',
        gap: '12px',
        marginBottom: '20px',
      }}>
        <div>
          <label style={{ color: '#888', fontSize: '12px' }}>Commit Hash (Public)</label>
          <div style={{
            padding: '8px 12px',
            background: '#0f0f1a',
            borderRadius: '6px',
            color: '#667eea',
            fontSize: '11px',
            fontFamily: 'monospace',
            wordBreak: 'break-all',
          }}>
            {commitHash || 'N/A'}
          </div>
        </div>

        <div>
          <label style={{ color: '#888', fontSize: '12px' }}>Previous Game Hash</label>
          <div style={{
            padding: '8px 12px',
            background: '#0f0f1a',
            borderRadius: '6px',
            color: '#22c55e',
            fontSize: '11px',
            fontFamily: 'monospace',
            wordBreak: 'break-all',
          }}>
            {previousGameHash || 'First round'}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <div style={{ flex: 1 }}>
            <label style={{ color: '#888', fontSize: '12px' }}>SALT (Public)</label>
            <div style={{
              padding: '8px 12px',
              background: '#0f0f1a',
              borderRadius: '6px',
              color: '#fbbf24',
              fontSize: '11px',
              fontFamily: 'monospace',
            }}>
              {SALT}
            </div>
          </div>
          <div>
            <label style={{ color: '#888', fontSize: '12px' }}>House Edge</label>
            <div style={{
              padding: '8px 12px',
              background: '#0f0f1a',
              borderRadius: '6px',
              color: '#ef4444',
              fontSize: '11px',
              fontFamily: 'monospace',
            }}>
              {HOUSE_EDGE_PERCENT}%
            </div>
          </div>
        </div>
      </div>

      {/* 검증 입력 */}
      <div style={{ marginBottom: '16px' }}>
        <label style={{ color: '#888', fontSize: '12px', marginBottom: '4px', display: 'block' }}>
          Enter Game Hash to Verify
        </label>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            value={verifyHash}
            onChange={(e) => setVerifyHash(e.target.value)}
            placeholder="Paste game hash here..."
            style={{
              flex: 1,
              padding: '12px',
              borderRadius: '8px',
              border: '1px solid #333',
              background: '#0f0f1a',
              color: '#fff',
              fontSize: '12px',
              fontFamily: 'monospace',
            }}
          />
          <button
            onClick={handleVerify}
            disabled={isVerifying || !verifyHash}
            style={{
              padding: '12px 24px',
              borderRadius: '8px',
              border: 'none',
              background: '#667eea',
              color: '#fff',
              fontSize: '14px',
              fontWeight: 'bold',
              cursor: verifyHash ? 'pointer' : 'not-allowed',
              opacity: verifyHash ? 1 : 0.5,
            }}
          >
            {isVerifying ? 'Verifying...' : 'Verify'}
          </button>
        </div>

        {/* 이전 해시로 빠른 검증 */}
        {previousGameHash && (
          <button
            onClick={() => setVerifyHash(previousGameHash)}
            style={{
              marginTop: '8px',
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1px solid #333',
              background: 'transparent',
              color: '#888',
              fontSize: '12px',
              cursor: 'pointer',
            }}
          >
            Use Previous Game Hash
          </button>
        )}
      </div>

      {/* 검증 결과 */}
      {verifyResult && (
        <div style={{
          padding: '16px',
          background: '#0f0f1a',
          borderRadius: '8px',
          border: `1px solid ${verifyResult.isValid ? '#22c55e' : '#ef4444'}`,
        }}>
          <div style={{ marginBottom: '12px' }}>
            <label style={{ color: '#888', fontSize: '12px' }}>Calculated Crash Point</label>
            <div style={{
              fontSize: '32px',
              fontWeight: 'bold',
              color: verifyResult.crashPoint < 2 ? '#ef4444' : '#22c55e',
            }}>
              {verifyResult.crashPoint.toFixed(2)}x
            </div>
          </div>

          <div>
            <label style={{ color: '#888', fontSize: '12px' }}>HMAC</label>
            <div style={{
              padding: '8px',
              background: '#1a1a2e',
              borderRadius: '4px',
              color: '#667eea',
              fontSize: '10px',
              fontFamily: 'monospace',
              wordBreak: 'break-all',
            }}>
              {verifyResult.hmac}
            </div>
          </div>

          {lastCrashPoint && verifyHash === previousGameHash && (
            <div style={{
              marginTop: '12px',
              padding: '8px',
              background: Math.abs(verifyResult.crashPoint - lastCrashPoint) < 0.01 ? '#22c55e22' : '#ef444422',
              borderRadius: '4px',
              textAlign: 'center',
              color: Math.abs(verifyResult.crashPoint - lastCrashPoint) < 0.01 ? '#22c55e' : '#ef4444',
              fontWeight: 'bold',
            }}>
              {Math.abs(verifyResult.crashPoint - lastCrashPoint) < 0.01
                ? 'Verified! Result matches.'
                : `Mismatch! Expected: ${lastCrashPoint.toFixed(2)}x`}
            </div>
          )}
        </div>
      )}

      {/* 알고리즘 설명 */}
      <div style={{
        marginTop: '16px',
        padding: '12px',
        background: '#0f0f1a',
        borderRadius: '8px',
        fontSize: '11px',
        color: '#666',
        lineHeight: '1.6',
      }}>
        <strong style={{ color: '#888' }}>How it works:</strong><br />
        1. HMAC = HMAC_SHA256(gameHash, SALT)<br />
        2. If HMAC mod {Math.floor(100 / HOUSE_EDGE_PERCENT)} == 0 → 1.00x (instant crash)<br />
        3. Otherwise: crashPoint = floor((100×2⁵² - h) / (2⁵² - h)) / 100<br />
        where h = first 13 hex chars of HMAC as integer
      </div>
    </div>
  );
}
