'use client';

import Link from 'next/link';

interface GameTabsProps {
  currentGame: 'plinko' | 'crash';
}

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
      <Link
        href="/plinko"
        style={{
          padding: '12px 32px',
          borderRadius: '8px',
          fontWeight: 'bold',
          fontSize: '16px',
          textDecoration: 'none',
          transition: 'all 0.2s ease',
          background: currentGame === 'plinko'
            ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
            : 'transparent',
          color: currentGame === 'plinko' ? '#fff' : '#888',
          border: currentGame === 'plinko' ? 'none' : '1px solid #444',
        }}
      >
        Plinko
      </Link>
      <Link
        href="/crash"
        style={{
          padding: '12px 32px',
          borderRadius: '8px',
          fontWeight: 'bold',
          fontSize: '16px',
          textDecoration: 'none',
          transition: 'all 0.2s ease',
          background: currentGame === 'crash'
            ? 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
            : 'transparent',
          color: currentGame === 'crash' ? '#fff' : '#888',
          border: currentGame === 'crash' ? 'none' : '1px solid #444',
        }}
      >
        Crash
      </Link>
    </nav>
  );
}
