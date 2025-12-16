'use client';

import { useState } from 'react';
import { GamePhase, PHASE_ORDER, getPhaseDisplayName } from '@/lib/holdem';

interface GameControlsProps {
  phase: GamePhase;
  isCalculating: boolean;
  roundNumber: number;
  seed: string;
  onAdvance: () => void;
  onNewRound: (seed?: string) => void;
  autoMode?: boolean;
  timeLeft?: number;
}

export default function GameControls({
  phase,
  isCalculating,
  roundNumber,
  seed,
  onAdvance,
  onNewRound,
  autoMode = false,
  timeLeft = 0,
}: GameControlsProps) {
  const [demoSeed, setDemoSeed] = useState('');
  const [showSeedInput, setShowSeedInput] = useState(false);

  const phaseIndex = PHASE_ORDER.indexOf(phase);
  const isLastPhase = phase === 'SETTLE';
  const nextPhase = !isLastPhase ? PHASE_ORDER[phaseIndex + 1] : null;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
      padding: 16,
      borderRadius: 12,
      background: 'rgba(255, 255, 255, 0.05)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      minWidth: 200,
    }}>
      {/* Round info */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <span style={{ color: '#888', fontSize: 14 }}>
          Round #{roundNumber}
        </span>
        <span style={{ color: '#666', fontSize: 12, fontFamily: 'monospace' }}>
          Seed: {seed.slice(0, 8)}...
        </span>
      </div>

      {/* Phase progress */}
      <div style={{
        display: 'flex',
        gap: 4,
        marginBottom: 8,
      }}>
        {PHASE_ORDER.map((p, i) => (
          <div
            key={p}
            style={{
              flex: 1,
              height: 4,
              borderRadius: 2,
              background: i <= phaseIndex ? '#667eea' : '#333',
              transition: 'background 0.3s ease',
            }}
          />
        ))}
      </div>

      {/* Auto mode indicator */}
      {autoMode && (
        <div style={{
          padding: '12px 16px',
          borderRadius: 8,
          background: 'rgba(34, 197, 94, 0.1)',
          border: '1px solid rgba(34, 197, 94, 0.3)',
          textAlign: 'center',
        }}>
          <div style={{ color: '#22c55e', fontSize: 12, marginBottom: 4 }}>
            자동 진행 모드
          </div>
          <div style={{ color: '#fff', fontSize: 14 }}>
            현재: <strong>{getPhaseDisplayName(phase)}</strong>
          </div>
          {!isLastPhase && nextPhase && (
            <div style={{ color: '#888', fontSize: 12, marginTop: 4 }}>
              → {getPhaseDisplayName(nextPhase)}
            </div>
          )}
          {isLastPhase && (
            <div style={{ color: '#888', fontSize: 12, marginTop: 4 }}>
              → 새 라운드
            </div>
          )}
        </div>
      )}

      {/* Manual mode buttons */}
      {!autoMode && (
        <>
          {!isLastPhase ? (
            <button
              onClick={onAdvance}
              disabled={isCalculating}
              style={{
                padding: '14px 24px',
                borderRadius: 8,
                border: 'none',
                background: isCalculating
                  ? '#444'
                  : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: '#fff',
                fontSize: 16,
                fontWeight: 'bold',
                cursor: isCalculating ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              {isCalculating ? (
                <>Calculating Odds...</>
              ) : (
                <>Deal {nextPhase && getPhaseDisplayName(nextPhase)} →</>
              )}
            </button>
          ) : (
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => onNewRound()}
                style={{
                  flex: 1,
                  padding: '14px 24px',
                  borderRadius: 8,
                  border: 'none',
                  background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                  color: '#fff',
                  fontSize: 16,
                  fontWeight: 'bold',
                  cursor: 'pointer',
                }}
              >
                New Round
              </button>
            </div>
          )}

          {/* Demo seed input toggle */}
          <button
            onClick={() => setShowSeedInput(!showSeedInput)}
            style={{
              padding: '8px 16px',
              borderRadius: 6,
              border: '1px solid #444',
              background: 'transparent',
              color: '#888',
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            {showSeedInput ? 'Hide Demo Controls' : 'Demo Mode'}
          </button>

          {/* Demo seed input */}
          {showSeedInput && (
            <div style={{
              padding: 12,
              borderRadius: 8,
              background: 'rgba(0, 0, 0, 0.2)',
            }}>
              <label style={{ display: 'block', color: '#888', fontSize: 12, marginBottom: 4 }}>
                Custom Seed (for reproducible demos)
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="text"
                  value={demoSeed}
                  onChange={e => setDemoSeed(e.target.value)}
                  placeholder="Enter seed..."
                  style={{
                    flex: 1,
                    padding: 8,
                    borderRadius: 6,
                    border: '1px solid #444',
                    background: '#1a1a2e',
                    color: '#fff',
                    fontSize: 14,
                  }}
                />
                <button
                  onClick={() => {
                    onNewRound(demoSeed || undefined);
                    setDemoSeed('');
                  }}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 6,
                    border: 'none',
                    background: '#667eea',
                    color: '#fff',
                    fontSize: 14,
                    cursor: 'pointer',
                  }}
                >
                  Start
                </button>
              </div>
              <div style={{ marginTop: 8, color: '#666', fontSize: 11 }}>
                Use same seed to replay exact same cards
              </div>
            </div>
          )}
        </>
      )}

      {/* Info */}
      <div style={{
        marginTop: 8,
        padding: 12,
        borderRadius: 8,
        background: 'rgba(0, 0, 0, 0.2)',
        fontSize: 11,
        color: '#666',
        lineHeight: 1.5,
      }}>
        {autoMode ? (
          <>
            <strong>팁:</strong> 각 단계마다 10초의 시간이 있습니다.
            핸드를 선택하고 현재 odds로 베팅하세요.
          </>
        ) : (
          <>
            <strong>Tip:</strong> Bet on a hand at any phase.
            Earlier bets lock in higher odds.
          </>
        )}
      </div>
    </div>
  );
}
