'use client';

import { Card, RANK_NAMES, SUIT_SYMBOLS, SUIT_COLORS } from '@/lib/holdem';

interface CardDisplayProps {
  card: Card | null;
  faceDown?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const SIZES = {
  sm: { width: 40, height: 56, fontSize: 14 },
  md: { width: 56, height: 78, fontSize: 18 },
  lg: { width: 72, height: 100, fontSize: 24 },
};

export default function CardDisplay({ card, faceDown = false, size = 'md' }: CardDisplayProps) {
  const { width, height, fontSize } = SIZES[size];

  if (faceDown || !card) {
    return (
      <div style={{
        width,
        height,
        borderRadius: 6,
        background: 'linear-gradient(135deg, #2c3e50 0%, #1a252f 100%)',
        border: '2px solid #34495e',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
      }}>
        <div style={{
          width: width - 12,
          height: height - 12,
          borderRadius: 4,
          border: '1px solid #4a6278',
          background: 'repeating-linear-gradient(45deg, #2c3e50, #2c3e50 4px, #34495e 4px, #34495e 8px)',
        }} />
      </div>
    );
  }

  const color = SUIT_COLORS[card.suit];
  const isRed = card.suit === 'h' || card.suit === 'd';

  return (
    <div style={{
      width,
      height,
      borderRadius: 6,
      background: '#fff',
      border: '1px solid #ddd',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
      position: 'relative',
      color: isRed ? '#e74c3c' : '#2c3e50',
    }}>
      {/* Top left corner */}
      <div style={{
        position: 'absolute',
        top: 4,
        left: 4,
        fontSize: fontSize * 0.7,
        fontWeight: 'bold',
        lineHeight: 1,
      }}>
        <div>{RANK_NAMES[card.rank]}</div>
        <div style={{ fontSize: fontSize * 0.6 }}>{SUIT_SYMBOLS[card.suit]}</div>
      </div>

      {/* Center suit */}
      <div style={{
        fontSize: fontSize * 1.5,
        color: isRed ? '#e74c3c' : '#2c3e50',
      }}>
        {SUIT_SYMBOLS[card.suit]}
      </div>

      {/* Bottom right corner (upside down) */}
      <div style={{
        position: 'absolute',
        bottom: 4,
        right: 4,
        fontSize: fontSize * 0.7,
        fontWeight: 'bold',
        lineHeight: 1,
        transform: 'rotate(180deg)',
      }}>
        <div>{RANK_NAMES[card.rank]}</div>
        <div style={{ fontSize: fontSize * 0.6 }}>{SUIT_SYMBOLS[card.suit]}</div>
      </div>
    </div>
  );
}
