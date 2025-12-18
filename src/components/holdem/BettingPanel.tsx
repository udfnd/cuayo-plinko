'use client';

import { useState } from 'react';
import { GamePhase, Bet, Settlement, getPhaseDisplayName } from '@/lib/holdem';

interface BettingPanelProps {
  phase: GamePhase;
  balance: number;
  isBalanceLoading?: boolean;
  selectedHand: number | null;
  currentOdds: number | null;
  bets: Bet[];
  settlements: Settlement[] | null;
  onPlaceBet: (stake: number) => void;
  onCancelBets: () => void;
}

const QUICK_STAKES = [10, 25, 50, 100];

export default function BettingPanel({
  phase,
  balance,
  isBalanceLoading = false,
  selectedHand,
  currentOdds,
  bets,
  settlements,
  onPlaceBet,
  onCancelBets,
}: BettingPanelProps) {
  const [stake, setStake] = useState(10);

  // 베팅 가능 조건: SETTLE 페이즈가 아니고, 핸드가 선택되어 있어야 함
  const isHandSelected = selectedHand !== null;
  const isNotSettlePhase = phase !== 'SETTLE';
  const hasEnoughBalance = balance >= stake;
  const canBet = isNotSettlePhase && isHandSelected && hasEnoughBalance && !isBalanceLoading;

  const totalStaked = bets.reduce((sum, b) => sum + b.stake, 0);
  const totalProfit = settlements?.reduce((sum, s) => sum + s.profit, 0) ?? 0;

  // 버튼 비활성화 이유 메시지
  const getDisabledReason = () => {
    if (isBalanceLoading) return '로딩 중...';
    if (!isNotSettlePhase) return '정산 중...';
    if (!isHandSelected) return '핸드를 선택하세요';
    if (!hasEnoughBalance) return '잔고 부족';
    return null;
  };
  const disabledReason = getDisabledReason();

  return (
    <div style={{
      padding: 20,
      borderRadius: 12,
      background: 'rgba(255, 255, 255, 0.05)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      width: 280,
    }}>
      {/* Phase indicator */}
      <div style={{
        textAlign: 'center',
        marginBottom: 16,
        padding: '8px 16px',
        borderRadius: 8,
        background: phase === 'SETTLE' ? '#22c55e33' : '#667eea33',
        color: phase === 'SETTLE' ? '#22c55e' : '#667eea',
        fontWeight: 'bold',
        fontSize: 14,
      }}>
        {getPhaseDisplayName(phase)}
      </div>

      {/* 잔고 */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        marginBottom: 16,
        padding: 12,
        borderRadius: 8,
        background: 'rgba(0, 0, 0, 0.2)',
      }}>
        <span style={{ color: '#888' }}>잔고</span>
        <span style={{ color: '#fff', fontWeight: 'bold', fontSize: 18 }}>
          ${balance.toFixed(2)}
        </span>
      </div>

      {/* Betting section (not in SETTLE) */}
      {phase !== 'SETTLE' && (
        <>
          {/* 선택된 핸드 정보 */}
          <div style={{
            marginBottom: 12,
            padding: 12,
            borderRadius: 8,
            background: selectedHand !== null ? '#667eea22' : 'rgba(0, 0, 0, 0.1)',
          }}>
            {selectedHand !== null ? (
              <div>
                <div style={{ color: '#888', fontSize: 12, marginBottom: 4 }}>
                  선택됨: 핸드 {selectedHand + 1}
                </div>
                <div style={{ color: '#fbbf24', fontWeight: 'bold' }}>
                  배당: {currentOdds?.toFixed(2) ?? '-'}
                </div>
              </div>
            ) : (
              <div style={{ color: '#666', fontSize: 14, textAlign: 'center' }}>
                핸드를 클릭하여 베팅하세요
              </div>
            )}
          </div>

          {/* 베팅금 입력 */}
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', color: '#888', fontSize: 12, marginBottom: 4 }}>
              베팅금
            </label>
            <input
              type="number"
              value={stake}
              onChange={e => setStake(Math.max(1, Math.min(balance, Number(e.target.value))))}
              style={{
                width: '100%',
                padding: 12,
                borderRadius: 8,
                border: '1px solid #444',
                background: '#1a1a2e',
                color: '#fff',
                fontSize: 16,
              }}
            />
          </div>

          {/* Quick stake buttons */}
          <div style={{
            display: 'flex',
            gap: 8,
            marginBottom: 16,
          }}>
            {QUICK_STAKES.map(amount => (
              <button
                key={amount}
                onClick={() => setStake(Math.min(amount, balance))}
                style={{
                  flex: 1,
                  padding: '8px 0',
                  borderRadius: 6,
                  border: '1px solid #444',
                  background: stake === amount ? '#667eea' : 'transparent',
                  color: stake === amount ? '#fff' : '#888',
                  fontSize: 12,
                  cursor: 'pointer',
                }}
              >
                ${amount}
              </button>
            ))}
          </div>

          {/* 베팅 버튼 */}
          <button
            onClick={() => onPlaceBet(stake)}
            disabled={!canBet}
            style={{
              width: '100%',
              padding: 14,
              borderRadius: 8,
              border: 'none',
              background: canBet ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : '#333',
              color: '#fff',
              fontSize: 16,
              fontWeight: 'bold',
              cursor: canBet ? 'pointer' : 'not-allowed',
              marginBottom: 8,
            }}
          >
            {disabledReason || '베팅하기'}
          </button>
        </>
      )}

      {/* 현재 베팅 목록 */}
      {bets.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div style={{ color: '#888', fontSize: 12, marginBottom: 8 }}>
            활성 베팅
          </div>
          {bets.map((bet, i) => (
            <div key={i} style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: 8,
              borderRadius: 4,
              background: 'rgba(0, 0, 0, 0.2)',
              marginBottom: 4,
              fontSize: 12,
            }}>
              <span style={{ color: '#888' }}>
                핸드 {bet.handIndex + 1} @ {bet.odds.toFixed(2)}
              </span>
              <span style={{ color: '#fff' }}>
                ${bet.stake.toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* 정산 결과 */}
      {settlements && settlements.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div style={{ color: '#888', fontSize: 12, marginBottom: 8 }}>
            정산
          </div>
          {settlements.map((s, i) => (
            <div key={i} style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: 8,
              borderRadius: 4,
              background: s.won ? '#22c55e22' : '#ef444422',
              marginBottom: 4,
              fontSize: 12,
            }}>
              <span style={{ color: '#888' }}>
                핸드 {s.bet.handIndex + 1}
                {s.isDeadHeat && ' (데드히트)'}
              </span>
              <span style={{ color: s.won ? '#22c55e' : '#ef4444', fontWeight: 'bold' }}>
                {s.profit >= 0 ? '+' : ''}{s.profit.toFixed(2)}
              </span>
            </div>
          ))}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            padding: 8,
            marginTop: 8,
            borderTop: '1px solid #333',
          }}>
            <span style={{ color: '#888' }}>총 손익</span>
            <span style={{
              color: totalProfit >= 0 ? '#22c55e' : '#ef4444',
              fontWeight: 'bold',
              fontSize: 14,
            }}>
              {totalProfit >= 0 ? '+' : ''}{totalProfit.toFixed(2)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
