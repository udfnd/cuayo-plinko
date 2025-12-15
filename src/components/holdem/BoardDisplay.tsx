'use client';

import { Card } from '@/lib/holdem';
import CardDisplay from './CardDisplay';

interface BoardDisplayProps {
  board: Card[];
  visibleCount: number;
}

export default function BoardDisplay({ board, visibleCount }: BoardDisplayProps) {
  return (
    <div style={{
      padding: 20,
      borderRadius: 12,
      background: 'linear-gradient(135deg, rgba(34, 139, 34, 0.15) 0%, rgba(34, 139, 34, 0.05) 100%)',
      border: '1px solid rgba(34, 139, 34, 0.3)',
    }}>
      <div style={{
        textAlign: 'center',
        marginBottom: 12,
        fontSize: 14,
        fontWeight: 'bold',
        color: '#22c55e',
      }}>
        COMMUNITY CARDS
      </div>

      <div style={{
        display: 'flex',
        gap: 8,
        justifyContent: 'center',
        minHeight: 100,
      }}>
        {/* Flop (3 cards) */}
        <div style={{ display: 'flex', gap: 4 }}>
          {[0, 1, 2].map(i => (
            <CardDisplay
              key={i}
              card={i < visibleCount ? board[i] : null}
              faceDown={i >= visibleCount}
              size="lg"
            />
          ))}
        </div>

        {/* Gap */}
        <div style={{ width: 12 }} />

        {/* Turn */}
        <CardDisplay
          card={visibleCount > 3 ? board[3] : null}
          faceDown={visibleCount <= 3}
          size="lg"
        />

        {/* Gap */}
        <div style={{ width: 4 }} />

        {/* River */}
        <CardDisplay
          card={visibleCount > 4 ? board[4] : null}
          faceDown={visibleCount <= 4}
          size="lg"
        />
      </div>

      {/* Labels */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: 8,
        marginTop: 8,
        fontSize: 12,
        color: '#666',
      }}>
        <span style={{ width: 180, textAlign: 'center', color: visibleCount >= 3 ? '#22c55e' : '#444' }}>
          Flop
        </span>
        <span style={{ width: 72, textAlign: 'center', color: visibleCount >= 4 ? '#22c55e' : '#444' }}>
          Turn
        </span>
        <span style={{ width: 72, textAlign: 'center', color: visibleCount >= 5 ? '#22c55e' : '#444' }}>
          River
        </span>
      </div>
    </div>
  );
}
