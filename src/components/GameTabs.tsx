'use client';

import Link from 'next/link';

interface GameTabsProps {
  currentGame: 'plinko' | 'crash' | 'holdem';
}

const GAMES = [
  { id: 'plinko', label: 'Plinko', href: '/plinko', gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
  { id: 'crash', label: 'Crash', href: '/crash', gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' },
  { id: 'holdem', label: 'Hold\'em', href: '/holdem', gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' },
] as const;

export default function GameTabs({ currentGame }: GameTabsProps) {
  return (
    <nav style={{
      display: 'flex',
      gap: '8px',
      marginBottom: '20px',
      padding: '8px',
      background: 'rgba(255, 255, 255, 0.05)',
      borderRadius: '12px',
    }}>
      {GAMES.map(game => (
        <Link
          key={game.id}
          href={game.href}
          style={{
            padding: '12px 24px',
            borderRadius: '8px',
            fontWeight: 'bold',
            fontSize: '14px',
            textDecoration: 'none',
            transition: 'all 0.2s ease',
            background: currentGame === game.id ? game.gradient : 'transparent',
            color: currentGame === game.id ? '#fff' : '#888',
            border: currentGame === game.id ? 'none' : '1px solid #444',
          }}
        >
          {game.label}
        </Link>
      ))}
    </nav>
  );
}
