'use client';

import { useState } from 'react';

// 서버 동기화 모드와 호환되는 타입
type BettingPhase = 'BETTING' | 'RUNNING' | 'CRASHED' | 'NEXT_ROUND';

interface SimpleBet {
  amount: number;
  autoCashoutAt: number | null;
  cashedOut: boolean;
  cashoutMultiplier: number | null;
}

interface BettingPanelProps {
  phase: BettingPhase;
  playerBet: SimpleBet | null;
  currentMultiplier: number;
  onPlaceBet: (amount: number, autoCashoutAt: number | null) => void;
  onCancelBet: () => void;
  onCashOut: () => void;
}

export default function BettingPanel({
  phase,
  playerBet,
  currentMultiplier,
  onPlaceBet,
  onCancelBet,
  onCashOut,
}: BettingPanelProps) {
  const [betAmount, setBetAmount] = useState(1.00);
  const [autoCashout, setAutoCashout] = useState<string>('2.00');
  const [useAutoCashout, setUseAutoCashout] = useState(false);

  const handleBet = () => {
    const autoValue = useAutoCashout ? parseFloat(autoCashout) : null;
    onPlaceBet(betAmount, autoValue);
  };

  const canBet = phase === 'BETTING' && !playerBet;
  const canCancel = phase === 'BETTING' && playerBet;
  const canCashOut = phase === 'RUNNING' && playerBet && !playerBet.cashedOut;

  const potentialPayout = playerBet
    ? playerBet.cashedOut && playerBet.cashoutMultiplier
      ? playerBet.amount * playerBet.cashoutMultiplier
      : playerBet.amount * currentMultiplier
    : betAmount * currentMultiplier;

  return (
    <div style={{
      width: '280px',
      padding: '20px',
      background: '#1a1a2e',
      borderRadius: '12px',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
    }}>
      {/* Bet Amount */}
      <div>
        <label style={{ color: '#888', fontSize: '12px', marginBottom: '4px', display: 'block' }}>
          Bet Amount
        </label>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            type="number"
            value={betAmount}
            onChange={(e) => setBetAmount(parseFloat(e.target.value) || 0)}
            disabled={phase !== 'BETTING' || !!playerBet}
            style={{
              flex: 1,
              padding: '12px',
              borderRadius: '8px',
              border: '1px solid #333',
              background: '#0f0f1a',
              color: '#fff',
              fontSize: '16px',
            }}
            min={0.01}
            step={0.01}
          />
        </div>
        <div style={{ display: 'flex', gap: '4px', marginTop: '8px' }}>
          {[0.5, 1, 2, 5].map((preset) => (
            <button
              key={preset}
              onClick={() => setBetAmount(preset)}
              disabled={phase !== 'BETTING' || !!playerBet}
              style={{
                flex: 1,
                padding: '8px',
                borderRadius: '4px',
                border: 'none',
                background: betAmount === preset ? '#667eea' : '#2a2a4e',
                color: '#fff',
                cursor: phase === 'BETTING' && !playerBet ? 'pointer' : 'not-allowed',
                fontSize: '12px',
              }}
            >
              {preset}
            </button>
          ))}
        </div>
      </div>

      {/* Auto Cashout */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <input
            type="checkbox"
            checked={useAutoCashout}
            onChange={(e) => setUseAutoCashout(e.target.checked)}
            disabled={phase !== 'BETTING' || !!playerBet}
            style={{ cursor: 'pointer' }}
          />
          <label style={{ color: '#888', fontSize: '12px' }}>
            Auto Cashout
          </label>
        </div>
        {useAutoCashout && (
          <input
            type="number"
            value={autoCashout}
            onChange={(e) => setAutoCashout(e.target.value)}
            disabled={phase !== 'BETTING' || !!playerBet}
            placeholder="2.00"
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '8px',
              border: '1px solid #333',
              background: '#0f0f1a',
              color: '#fff',
              fontSize: '16px',
            }}
            min={1.01}
            step={0.01}
          />
        )}
      </div>

      {/* Action Button */}
      {canBet && (
        <button
          onClick={handleBet}
          style={{
            padding: '16px',
            borderRadius: '8px',
            border: 'none',
            background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
            color: '#fff',
            fontSize: '18px',
            fontWeight: 'bold',
            cursor: 'pointer',
          }}
        >
          Place Bet
        </button>
      )}

      {canCancel && (
        <button
          onClick={onCancelBet}
          style={{
            padding: '16px',
            borderRadius: '8px',
            border: 'none',
            background: '#ef4444',
            color: '#fff',
            fontSize: '18px',
            fontWeight: 'bold',
            cursor: 'pointer',
          }}
        >
          Cancel Bet
        </button>
      )}

      {canCashOut && (
        <button
          onClick={onCashOut}
          style={{
            padding: '16px',
            borderRadius: '8px',
            border: 'none',
            background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
            color: '#000',
            fontSize: '18px',
            fontWeight: 'bold',
            cursor: 'pointer',
          }}
        >
          Cash Out @ {currentMultiplier.toFixed(2)}x
        </button>
      )}

      {phase === 'RUNNING' && playerBet && playerBet.cashedOut && (
        <div style={{
          padding: '16px',
          borderRadius: '8px',
          background: '#22c55e22',
          border: '1px solid #22c55e',
          textAlign: 'center',
          color: '#22c55e',
          fontWeight: 'bold',
        }}>
          Cashed out @ {playerBet.cashoutMultiplier?.toFixed(2)}x
        </div>
      )}

      {phase === 'CRASHED' && playerBet && (
        <div style={{
          padding: '16px',
          borderRadius: '8px',
          background: playerBet.cashedOut ? '#22c55e22' : '#ef444422',
          border: `1px solid ${playerBet.cashedOut ? '#22c55e' : '#ef4444'}`,
          textAlign: 'center',
          color: playerBet.cashedOut ? '#22c55e' : '#ef4444',
          fontWeight: 'bold',
        }}>
          {playerBet.cashedOut
            ? `Won: ${(playerBet.amount * (playerBet.cashoutMultiplier || 1)).toFixed(2)}`
            : `Lost: ${playerBet.amount.toFixed(2)}`}
        </div>
      )}

      {/* Potential Payout */}
      {(phase === 'RUNNING' && playerBet && !playerBet.cashedOut) && (
        <div style={{
          textAlign: 'center',
          color: '#888',
          fontSize: '14px',
        }}>
          Potential: <span style={{ color: '#22c55e', fontWeight: 'bold' }}>
            {potentialPayout.toFixed(2)}
          </span>
        </div>
      )}
    </div>
  );
}
