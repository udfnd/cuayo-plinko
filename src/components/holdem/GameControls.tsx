'use client';

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
  onAdvance,
  onNewRound,
  autoMode = false,
}: GameControlsProps) {
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
      {/* 라운드 정보 */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      }}>
        <span style={{ color: '#888', fontSize: 14 }}>
          라운드 #{roundNumber}
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

      {/* 수동 모드 버튼 */}
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
                <>배당 계산 중...</>
              ) : (
                <>{nextPhase && getPhaseDisplayName(nextPhase)} 딜 →</>
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
                새 라운드
              </button>
            </div>
          )}
        </>
      )}

      {/* 팁 */}
      <div style={{
        marginTop: 8,
        padding: 12,
        borderRadius: 8,
        background: 'rgba(0, 0, 0, 0.2)',
        fontSize: 11,
        color: '#666',
        lineHeight: 1.5,
      }}>
        <strong>팁:</strong> 어느 단계에서나 핸드에 베팅할 수 있습니다.
        초반 베팅이 더 높은 배당을 받습니다.
      </div>
    </div>
  );
}
