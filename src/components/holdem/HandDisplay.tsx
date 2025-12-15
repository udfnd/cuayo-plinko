'use client';

import { Card, HandEquity, EvaluatedHand, HAND_RANK_NAMES } from '@/lib/holdem';
import CardDisplay from './CardDisplay';

interface HandDisplayProps {
  handIndex: number;
  cards: Card[];
  visible: boolean;
  equity: HandEquity | null;
  evaluatedHand: EvaluatedHand | null;
  isWinner: boolean;
  isSelected: boolean;
  onSelect: () => void;
  disabled: boolean;
}

const HAND_COLORS = ['#667eea', '#f5576c', '#22c55e', '#fbbf24'];
const HAND_LABELS = ['Hand 1', 'Hand 2', 'Hand 3', 'Hand 4'];

export default function HandDisplay({
  handIndex,
  cards,
  visible,
  equity,
  evaluatedHand,
  isWinner,
  isSelected,
  onSelect,
  disabled,
}: HandDisplayProps) {
  const color = HAND_COLORS[handIndex];

  return (
    <div
      onClick={disabled ? undefined : onSelect}
      style={{
        padding: 16,
        borderRadius: 12,
        background: isWinner
          ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.2) 0%, rgba(34, 197, 94, 0.1) 100%)'
          : isSelected
            ? `linear-gradient(135deg, ${color}33 0%, ${color}11 100%)`
            : 'rgba(255, 255, 255, 0.05)',
        border: isWinner
          ? '2px solid #22c55e'
          : isSelected
            ? `2px solid ${color}`
            : '1px solid rgba(255, 255, 255, 0.1)',
        cursor: disabled ? 'default' : 'pointer',
        transition: 'all 0.2s ease',
        opacity: disabled && !isWinner ? 0.7 : 1,
      }}
    >
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
      }}>
        <span style={{
          fontWeight: 'bold',
          fontSize: 16,
          color: color,
        }}>
          {HAND_LABELS[handIndex]}
        </span>
        {isWinner && (
          <span style={{
            padding: '4px 8px',
            borderRadius: 4,
            background: '#22c55e',
            color: '#fff',
            fontSize: 12,
            fontWeight: 'bold',
          }}>
            WINNER
          </span>
        )}
      </div>

      {/* Cards */}
      <div style={{
        display: 'flex',
        gap: 8,
        marginBottom: 12,
        justifyContent: 'center',
      }}>
        {cards.map((card, i) => (
          <CardDisplay
            key={i}
            card={visible ? card : null}
            faceDown={!visible}
            size="md"
          />
        ))}
      </div>

      {/* Hand rank (after SETTLE) */}
      {evaluatedHand && (
        <div style={{
          textAlign: 'center',
          marginBottom: 8,
          fontSize: 14,
          fontWeight: 'bold',
          color: isWinner ? '#22c55e' : '#888',
        }}>
          {evaluatedHand.rankName}
        </div>
      )}

      {/* Equity display */}
      {equity && (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: 14,
          color: '#888',
        }}>
          <div>
            <span style={{ color: '#fff', fontWeight: 'bold' }}>
              {(equity.totalEquity * 100).toFixed(1)}%
            </span>
            <span style={{ marginLeft: 4, fontSize: 12 }}>equity</span>
          </div>
          <div>
            <span style={{ color: '#fbbf24', fontWeight: 'bold' }}>
              {equity.fairOdds.toFixed(2)}x
            </span>
            <span style={{ marginLeft: 4, fontSize: 12 }}>odds</span>
          </div>
        </div>
      )}
    </div>
  );
}
