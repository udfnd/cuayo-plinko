'use client';

import type { GamePhase } from '@/lib/crash/gameState';

interface CrashDisplayProps {
  phase: GamePhase;
  multiplier: number;
  crashPoint: number;
  bettingTimeLeft: number;
}

export default function CrashDisplay({
  phase,
  multiplier,
  crashPoint,
  bettingTimeLeft,
}: CrashDisplayProps) {
  const getDisplayContent = () => {
    switch (phase) {
      case 'BETTING':
        return {
          main: `${(bettingTimeLeft / 1000).toFixed(1)}s`,
          sub: 'Place your bets!',
          color: '#fbbf24',
        };
      case 'RUNNING':
        return {
          main: `${multiplier.toFixed(2)}x`,
          sub: 'RUNNING',
          color: multiplier < 2 ? '#22c55e' : multiplier < 5 ? '#fbbf24' : '#ef4444',
        };
      case 'CRASHED':
        return {
          main: `${crashPoint.toFixed(2)}x`,
          sub: 'CRASHED!',
          color: '#ef4444',
        };
      case 'NEXT_ROUND':
        return {
          main: 'Next Round',
          sub: 'Preparing...',
          color: '#888',
        };
      default:
        return {
          main: '---',
          sub: '',
          color: '#888',
        };
    }
  };

  const content = getDisplayContent();

  return (
    <div style={{
      width: '400px',
      height: '300px',
      background: 'linear-gradient(180deg, #1a1a2e 0%, #16213e 100%)',
      borderRadius: '16px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      overflow: 'hidden',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
    }}>
      {/* 배경 그래프 효과 */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: phase === 'RUNNING' ? `${Math.min(multiplier * 15, 80)}%` : '0%',
        background: `linear-gradient(180deg, transparent 0%, ${content.color}22 100%)`,
        transition: 'height 0.1s ease-out',
      }} />

      {/* 메인 배수 표시 */}
      <div style={{
        fontSize: phase === 'CRASHED' ? '72px' : '64px',
        fontWeight: 'bold',
        color: content.color,
        textShadow: `0 0 30px ${content.color}66`,
        zIndex: 1,
        animation: phase === 'CRASHED' ? 'shake 0.5s ease-in-out' : 'none',
      }}>
        {content.main}
      </div>

      {/* 상태 표시 */}
      <div style={{
        fontSize: '18px',
        color: content.color,
        marginTop: '8px',
        fontWeight: '600',
        letterSpacing: '2px',
        zIndex: 1,
      }}>
        {content.sub}
      </div>

      {/* 크래시 애니메이션 스타일 */}
      <style jsx>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
          20%, 40%, 60%, 80% { transform: translateX(5px); }
        }
      `}</style>
    </div>
  );
}
