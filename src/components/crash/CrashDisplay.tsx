'use client';

import { useRef, useEffect, useState } from 'react';
import type { GamePhase } from '@/lib/crash/gameState';

interface CrashDisplayProps {
  phase: GamePhase;
  multiplier: number;
  crashPoint: number;
  bettingTimeLeft: number;
  multiplierHistory: number[];
}

export default function CrashDisplay({
  phase,
  multiplier,
  crashPoint,
  bettingTimeLeft,
  multiplierHistory,
}: CrashDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [speakiImage, setSpeakiImage] = useState<HTMLImageElement | null>(null);

  // 이미지 로드
  useEffect(() => {
    const img = new Image();
    img.src = '/speaki.png';
    img.onload = () => {
      setSpeakiImage(img);
    };
  }, []);

  // 그래프 렌더링
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // 배경 클리어
    ctx.fillStyle = '#0f0f1a';
    ctx.fillRect(0, 0, width, height);

    // 그리드 라인
    ctx.strokeStyle = '#1a1a2e';
    ctx.lineWidth = 1;

    // 수평 그리드
    for (let i = 1; i < 5; i++) {
      const y = height - (height * i) / 5;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // 수직 그리드
    for (let i = 1; i < 8; i++) {
      const x = (width * i) / 8;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    if (phase === 'RUNNING' || phase === 'CRASHED') {
      if (multiplierHistory.length < 2) return;

      // 배수 범위 계산 (최소 1.00 ~ 2.00, 동적으로 증가)
      const maxMultiplier = Math.max(2, ...multiplierHistory, multiplier) * 1.1;
      const minMultiplier = 1.0;

      // 색상 결정
      const color = phase === 'CRASHED'
        ? '#ef4444'
        : multiplier < 2
          ? '#22c55e'
          : multiplier < 5
            ? '#fbbf24'
            : '#ef4444';

      // 그라데이션 채우기 영역
      const gradient = ctx.createLinearGradient(0, height, 0, 0);
      gradient.addColorStop(0, `${color}00`);
      gradient.addColorStop(1, `${color}44`);

      ctx.beginPath();
      ctx.moveTo(0, height);

      // 곡선 그리기
      const pointCount = multiplierHistory.length;
      for (let i = 0; i < pointCount; i++) {
        const x = (i / Math.max(pointCount - 1, 1)) * width;
        const normalizedY = (multiplierHistory[i] - minMultiplier) / (maxMultiplier - minMultiplier);
        const y = height - (normalizedY * height * 0.85) - 10;

        if (i === 0) {
          ctx.lineTo(x, y);
        } else {
          // 부드러운 곡선을 위한 quadratic curve
          const prevX = ((i - 1) / Math.max(pointCount - 1, 1)) * width;
          const prevNormalizedY = (multiplierHistory[i - 1] - minMultiplier) / (maxMultiplier - minMultiplier);
          const prevY = height - (prevNormalizedY * height * 0.85) - 10;

          const cpX = (prevX + x) / 2;
          ctx.quadraticCurveTo(prevX, prevY, cpX, (prevY + y) / 2);

          if (i === pointCount - 1) {
            ctx.lineTo(x, y);
          }
        }
      }

      // 채우기 영역 완성
      ctx.lineTo(width, height);
      ctx.closePath();
      ctx.fillStyle = gradient;
      ctx.fill();

      // 곡선 라인 그리기
      ctx.beginPath();
      for (let i = 0; i < pointCount; i++) {
        const x = (i / Math.max(pointCount - 1, 1)) * width;
        const normalizedY = (multiplierHistory[i] - minMultiplier) / (maxMultiplier - minMultiplier);
        const y = height - (normalizedY * height * 0.85) - 10;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          const prevX = ((i - 1) / Math.max(pointCount - 1, 1)) * width;
          const prevNormalizedY = (multiplierHistory[i - 1] - minMultiplier) / (maxMultiplier - minMultiplier);
          const prevY = height - (prevNormalizedY * height * 0.85) - 10;

          const cpX = (prevX + x) / 2;
          ctx.quadraticCurveTo(prevX, prevY, cpX, (prevY + y) / 2);

          if (i === pointCount - 1) {
            ctx.lineTo(x, y);
          }
        }
      }

      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();

      // 현재 포인트에 speaki.png 이미지 그리기
      if (pointCount > 0 && phase === 'RUNNING') {
        const lastX = width;
        const lastNormalizedY = (multiplierHistory[pointCount - 1] - minMultiplier) / (maxMultiplier - minMultiplier);
        const lastY = height - (lastNormalizedY * height * 0.85) - 10;

        if (speakiImage) {
          // 이미지 크기 (40x40)
          const imgSize = 40;
          ctx.drawImage(
            speakiImage,
            lastX - imgSize - 5,
            lastY - imgSize / 2,
            imgSize,
            imgSize
          );
        } else {
          // 이미지가 로드되지 않았으면 원으로 대체
          ctx.beginPath();
          ctx.arc(lastX - 5, lastY, 12, 0, Math.PI * 2);
          ctx.fillStyle = `${color}44`;
          ctx.fill();

          ctx.beginPath();
          ctx.arc(lastX - 5, lastY, 6, 0, Math.PI * 2);
          ctx.fillStyle = color;
          ctx.fill();
        }
      }

      // Y축 라벨
      ctx.fillStyle = '#666';
      ctx.font = '11px monospace';
      ctx.textAlign = 'left';

      const labels = [1, 1.5, 2, 3, 5, 10].filter(v => v <= maxMultiplier);
      for (const label of labels) {
        const normalizedY = (label - minMultiplier) / (maxMultiplier - minMultiplier);
        const y = height - (normalizedY * height * 0.85) - 10;
        if (y > 15 && y < height - 10) {
          ctx.fillText(`${label.toFixed(2)}x`, 5, y + 4);
        }
      }
    }
  }, [phase, multiplier, multiplierHistory, speakiImage]);

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
      {/* Canvas 그래프 */}
      <canvas
        ref={canvasRef}
        width={400}
        height={300}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
        }}
      />

      {/* 메인 배수 표시 */}
      <div style={{
        fontSize: phase === 'CRASHED' ? '72px' : '64px',
        fontWeight: 'bold',
        color: content.color,
        textShadow: `0 0 30px ${content.color}66, 0 2px 4px rgba(0,0,0,0.5)`,
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
        textShadow: '0 1px 2px rgba(0,0,0,0.5)',
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
