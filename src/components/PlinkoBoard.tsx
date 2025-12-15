'use client';

import { useRef, useEffect, useCallback, useState } from 'react';
import type { Ball, Rows, Risk } from '@/types';
import { getMultipliers, getMultiplier } from '@/lib/multipliers';
import {
  PhysicsBall,
  Peg,
  Slot,
  PHYSICS,
  updatePhysics,
  createPhysicsBall,
  createBallRng,
} from '@/lib/physics';
import { SeededRandom } from '@/lib/prng';

interface PlinkoBoardProps {
  rows: Rows;
  risk: Risk;
  balls: Ball[];
  seed: string;
  onBallComplete: (ball: Ball) => void;
}

// 보드 레이아웃 상수
const CANVAS_WIDTH = 600;
const CANVAS_HEIGHT = 700;
const SLOT_HEIGHT = 40;
const BALL_IMAGE_SIZE = 28; // 이미지 크기

// 색상
const COLORS = {
  background: '#1a1a2e',
  peg: '#5a5a7a',
  pegHighlight: '#7a7a9a',
  ball: '#ff6b6b',
  ballHighlight: '#ff8a8a',
  slotBorder: '#2a2a4e',
  slotMultiplierLow: '#22c55e',
  slotMultiplierMid: '#eab308',
  slotMultiplierHigh: '#ef4444',
  trail: 'rgba(255, 107, 107, 0.15)',
};

export default function PlinkoBoard({ rows, risk, balls, seed, onBallComplete }: PlinkoBoardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const physicsBallsRef = useRef<Map<string, { ball: PhysicsBall; rng: SeededRandom; originalBall: Ball; rotation: number }>>(new Map());
  const isAnimatingRef = useRef<boolean>(false);
  const pegsRef = useRef<Peg[]>([]);
  const slotsRef = useRef<Slot[]>([]);
  const trailsRef = useRef<Map<string, Array<{ x: number; y: number; alpha: number }>>>(new Map());
  const ballImageRef = useRef<HTMLImageElement | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const audioPoolRef = useRef<HTMLAudioElement[]>([]);
  const audioIndexRef = useRef(0);

  // 이미지 로드
  useEffect(() => {
    const img = new Image();
    img.src = '/speaki.png';
    img.onload = () => {
      ballImageRef.current = img;
      setImageLoaded(true);
    };
    img.onerror = () => {
      console.warn('Failed to load ball image, using fallback');
      ballImageRef.current = null;
    };
  }, []);

  // 오디오 풀 생성 (여러 사운드를 동시에 재생하기 위해)
  useEffect(() => {
    const poolSize = 10;
    const pool: HTMLAudioElement[] = [];
    for (let i = 0; i < poolSize; i++) {
      const audio = new Audio('/soundeffect.mp3');
      audio.volume = 0.3;
      pool.push(audio);
    }
    audioPoolRef.current = pool;

    return () => {
      pool.forEach(audio => {
        audio.pause();
        audio.src = '';
      });
    };
  }, []);

  // 충돌 사운드 재생
  const playCollisionSound = useCallback(() => {
    const pool = audioPoolRef.current;
    if (pool.length === 0) return;

    const audio = pool[audioIndexRef.current];
    audioIndexRef.current = (audioIndexRef.current + 1) % pool.length;

    // 이미 재생 중이면 처음부터 다시 재생
    audio.currentTime = 0;
    audio.play().catch(() => {
      // 자동 재생 정책으로 인한 에러 무시
    });
  }, []);

  // 레이아웃 계산
  const getLayout = useCallback(() => {
    const topPadding = 60;
    const bottomPadding = SLOT_HEIGHT + 20;
    const sidePadding = 60;

    const boardHeight = CANVAS_HEIGHT - topPadding - bottomPadding;
    const boardWidth = CANVAS_WIDTH - sidePadding * 2;

    const rowHeight = boardHeight / rows;
    const pegSpacingX = boardWidth / rows;

    return {
      topPadding,
      bottomPadding,
      sidePadding,
      boardHeight,
      boardWidth,
      rowHeight,
      pegSpacingX,
    };
  }, [rows]);

  // 핀 위치 계산 및 캐시
  const updatePegs = useCallback(() => {
    const layout = getLayout();
    const pegs: Peg[] = [];

    for (let row = 0; row < rows; row++) {
      const numPegs = row + 2; // 각 행에 row+2개의 핀
      const rowWidth = layout.pegSpacingX * (numPegs - 1);
      const startX = CANVAS_WIDTH / 2 - rowWidth / 2;

      for (let col = 0; col < numPegs; col++) {
        pegs.push({
          x: startX + col * layout.pegSpacingX,
          y: layout.topPadding + row * layout.rowHeight,
          radius: PHYSICS.PEG_RADIUS,
        });
      }
    }

    pegsRef.current = pegs;
    return pegs;
  }, [rows, getLayout]);

  // 슬롯 위치 계산 및 캐시
  const updateSlots = useCallback(() => {
    const layout = getLayout();
    const numSlots = rows + 1;
    const slots: Slot[] = [];

    const totalWidth = layout.pegSpacingX * rows;
    const startX = CANVAS_WIDTH / 2 - totalWidth / 2;
    const slotWidth = layout.pegSpacingX;
    const slotY = CANVAS_HEIGHT - layout.bottomPadding;

    for (let i = 0; i < numSlots; i++) {
      slots.push({
        x: startX + i * slotWidth - slotWidth / 2,
        width: slotWidth,
        y: slotY,
        index: i,
      });
    }

    slotsRef.current = slots;
    return slots;
  }, [rows, getLayout]);

  // 캔버스 그리기
  const draw = useCallback((ctx: CanvasRenderingContext2D) => {
    const multipliers = getMultipliers(rows, risk);
    const layout = getLayout();

    // 배경
    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // 공 궤적(트레일) 그리기
    trailsRef.current.forEach((trail) => {
      for (const point of trail) {
        if (point.alpha <= 0) continue;
        ctx.fillStyle = `rgba(255, 107, 107, ${point.alpha * 0.3})`;
        ctx.beginPath();
        ctx.arc(point.x, point.y, PHYSICS.BALL_RADIUS * 0.5 * point.alpha, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    // 핀 그리기
    for (const peg of pegsRef.current) {
      // 핀 그림자
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.beginPath();
      ctx.arc(peg.x + 1, peg.y + 1, peg.radius, 0, Math.PI * 2);
      ctx.fill();

      // 핀 본체
      const gradient = ctx.createRadialGradient(
        peg.x - 1, peg.y - 1, 0,
        peg.x, peg.y, peg.radius
      );
      gradient.addColorStop(0, COLORS.pegHighlight);
      gradient.addColorStop(1, COLORS.peg);
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(peg.x, peg.y, peg.radius, 0, Math.PI * 2);
      ctx.fill();
    }

    // 슬롯 그리기
    for (let i = 0; i < slotsRef.current.length; i++) {
      const slot = slotsRef.current[i];
      const multiplier = multipliers[i];

      // 슬롯 배경
      ctx.fillStyle = COLORS.slotBorder;
      ctx.fillRect(slot.x, slot.y, slot.width, SLOT_HEIGHT);

      // 슬롯 테두리
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 1;
      ctx.strokeRect(slot.x, slot.y, slot.width, SLOT_HEIGHT);

      // 배수에 따른 색상
      let textColor = COLORS.slotMultiplierMid;
      if (multiplier >= 5) textColor = COLORS.slotMultiplierHigh;
      else if (multiplier < 1) textColor = COLORS.slotMultiplierLow;

      // 배수 텍스트
      ctx.fillStyle = textColor;
      ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(
        multiplier.toFixed(2) + 'x',
        slot.x + slot.width / 2,
        slot.y + SLOT_HEIGHT / 2
      );
    }

    // 공(이미지) 그리기
    physicsBallsRef.current.forEach(({ ball, rotation }) => {
      const { x, y } = ball.position;
      const img = ballImageRef.current;

      if (img && imageLoaded) {
        // 이미지 그림자
        ctx.save();
        ctx.globalAlpha = 0.3;
        ctx.drawImage(
          img,
          x - BALL_IMAGE_SIZE / 2 + 3,
          y - BALL_IMAGE_SIZE / 2 + 3,
          BALL_IMAGE_SIZE,
          BALL_IMAGE_SIZE
        );
        ctx.restore();

        // 이미지 본체 (회전 적용)
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rotation);
        ctx.drawImage(
          img,
          -BALL_IMAGE_SIZE / 2,
          -BALL_IMAGE_SIZE / 2,
          BALL_IMAGE_SIZE,
          BALL_IMAGE_SIZE
        );
        ctx.restore();
      } else {
        // 이미지 로드 전 또는 실패 시 원형 폴백
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.beginPath();
        ctx.arc(x + 3, y + 3, ball.radius, 0, Math.PI * 2);
        ctx.fill();

        const gradient = ctx.createRadialGradient(
          x - ball.radius * 0.3, y - ball.radius * 0.3, 0,
          x, y, ball.radius
        );
        gradient.addColorStop(0, COLORS.ballHighlight);
        gradient.addColorStop(0.7, COLORS.ball);
        gradient.addColorStop(1, '#cc5555');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, ball.radius, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    // 드롭 포인트 표시
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(CANVAS_WIDTH / 2, 0);
    ctx.lineTo(CANVAS_WIDTH / 2, layout.topPadding - 20);
    ctx.stroke();
    ctx.setLineDash([]);

    // 드롭 화살표
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.beginPath();
    ctx.moveTo(CANVAS_WIDTH / 2, layout.topPadding - 15);
    ctx.lineTo(CANVAS_WIDTH / 2 - 8, layout.topPadding - 25);
    ctx.lineTo(CANVAS_WIDTH / 2 + 8, layout.topPadding - 25);
    ctx.closePath();
    ctx.fill();

  }, [rows, risk, getLayout, imageLoaded]);

  // 애니메이션 루프
  const startAnimation = useCallback(() => {
    if (isAnimatingRef.current) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    isAnimatingRef.current = true;
    const layout = getLayout();

    const bounds = {
      left: layout.sidePadding - 10,
      right: CANVAS_WIDTH - layout.sidePadding + 10,
      bottom: CANVAS_HEIGHT - layout.bottomPadding,
    };

    const animate = () => {
      let hasActiveBalls = false;

      // 물리 업데이트
      physicsBallsRef.current.forEach((entry, id) => {
        const { ball, rng, originalBall } = entry;
        if (!ball.active) return;
        hasActiveBalls = true;

        // 물리 시뮬레이션 업데이트
        updatePhysics(ball, pegsRef.current, slotsRef.current, bounds, rng);

        // 속도에 따른 회전 업데이트
        entry.rotation += ball.velocity.x * 0.05;

        // 트레일 업데이트
        let trail = trailsRef.current.get(id);
        if (!trail) {
          trail = [];
          trailsRef.current.set(id, trail);
        }
        trail.push({ x: ball.position.x, y: ball.position.y, alpha: 1 });

        // 트레일 페이드 아웃
        for (let i = trail.length - 1; i >= 0; i--) {
          trail[i].alpha -= 0.05;
          if (trail[i].alpha <= 0) {
            trail.splice(i, 1);
          }
        }

        // 슬롯에 안착했으면 완료 처리
        if (ball.settled && !originalBall.done) {
          originalBall.done = true;
          originalBall.slotIndex = ball.slotIndex;
          originalBall.multiplier = getMultiplier(rows, risk, ball.slotIndex);

          // 완료 콜백 호출
          setTimeout(() => onBallComplete(originalBall), 0);
        }
      });

      // 완료된 공 정리 (잠시 후)
      physicsBallsRef.current.forEach(({ ball }, id) => {
        if (ball.settled) {
          setTimeout(() => {
            physicsBallsRef.current.delete(id);
            trailsRef.current.delete(id);
          }, 500);
        }
      });

      draw(ctx);

      if (hasActiveBalls || physicsBallsRef.current.size > 0) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        isAnimatingRef.current = false;
      }
    };

    animationRef.current = requestAnimationFrame(animate);
  }, [rows, risk, getLayout, draw, onBallComplete]);

  // 레이아웃 업데이트
  useEffect(() => {
    updatePegs();
    updateSlots();
  }, [rows, updatePegs, updateSlots]);

  // 초기 렌더링
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    draw(ctx);
  }, [rows, risk, draw]);

  // 새로운 공 추가
  useEffect(() => {
    const currentIds = new Set(physicsBallsRef.current.keys());

    for (const ball of balls) {
      if (currentIds.has(ball.id)) continue;
      if (ball.done) continue;

      // 새 물리 공 생성
      const layout = getLayout();
      const startX = CANVAS_WIDTH / 2;
      const startY = layout.topPadding - 30;

      const physicsBall = createPhysicsBall(ball.id, startX, startY, { x: 0, y: 2 });
      const rng = createBallRng(seed, ball.id);

      physicsBallsRef.current.set(ball.id, {
        ball: physicsBall,
        rng,
        originalBall: ball,
        rotation: 0,
      });

      // 공이 드롭될 때 사운드 재생
      playCollisionSound();

      startAnimation();
    }
  }, [balls, seed, getLayout, startAnimation, playCollisionSound]);

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      cancelAnimationFrame(animationRef.current);
      isAnimatingRef.current = false;
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_WIDTH}
      height={CANVAS_HEIGHT}
      style={{
        borderRadius: '12px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
      }}
    />
  );
}
