'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import GameTabs from '@/components/GameTabs';
import CrashDisplay from '@/components/crash/CrashDisplay';
import BettingPanel from '@/components/crash/BettingPanel';
import CrashHistory from '@/components/crash/CrashHistory';
import VerifyPanel from '@/components/crash/VerifyPanel';
import {
  TIMING,
  MULTIPLIER,
  createHashChain,
  getNextGameHash,
  getCurrentGameHash,
  calculateCrashPoint,
  createInitialState,
  placeBet,
  cancelBet,
  cashOut,
  startRound,
  updateMultiplier,
  crashRound,
  prepareNextRound,
  type CrashGameState,
  type HashChain,
} from '@/lib/crash';

export default function CrashPage() {
  const [hashChain, setHashChain] = useState<HashChain | null>(null);
  const [gameState, setGameState] = useState<CrashGameState | null>(null);
  const [showVerify, setShowVerify] = useState(false);
  const [lastCrashPoint, setLastCrashPoint] = useState<number | null>(null);

  const animationRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const bettingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 게임 초기화
  useEffect(() => {
    const chain = createHashChain();
    setHashChain(chain);
    setGameState(createInitialState(chain.commitHash));
  }, []);

  // 배수 계산 함수 (시간 기반 지수 성장)
  const calculateMultiplier = useCallback((elapsedMs: number): number => {
    // exponential growth: 1.00 * e^(rate * time)
    const multiplier = Math.exp(MULTIPLIER.GROWTH_RATE * elapsedMs);
    return Math.floor(multiplier * 100) / 100;
  }, []);

  // 베팅 타이머 시작
  const startBettingPhase = useCallback(() => {
    if (!gameState || !hashChain) return;

    let timeLeft = TIMING.BETTING_DURATION;

    bettingTimerRef.current = setInterval(() => {
      timeLeft -= 100;
      setGameState(prev => prev ? { ...prev, bettingTimeLeft: Math.max(0, timeLeft) } : prev);

      if (timeLeft <= 0) {
        if (bettingTimerRef.current) {
          clearInterval(bettingTimerRef.current);
          bettingTimerRef.current = null;
        }
        startRunningPhase();
      }
    }, 100);
  }, [gameState, hashChain]);

  // 러닝 페이즈 시작
  const startRunningPhase = useCallback(async () => {
    if (!hashChain) return;

    const gameHash = getNextGameHash(hashChain);
    if (!gameHash) {
      console.error('Hash chain exhausted');
      return;
    }

    const crashPoint = await calculateCrashPoint(gameHash);

    setGameState(prev => {
      if (!prev) return prev;
      return startRound(prev, gameHash, crashPoint);
    });

    startTimeRef.current = performance.now();

    const animate = () => {
      const elapsed = performance.now() - startTimeRef.current;
      const currentMultiplier = calculateMultiplier(elapsed);

      setGameState(prev => {
        if (!prev || prev.phase !== 'RUNNING') return prev;

        // 크래시 체크
        if (currentMultiplier >= prev.crashPoint) {
          // 크래시!
          setLastCrashPoint(prev.crashPoint);
          const crashed = crashRound(prev);

          // 잠시 후 다음 라운드
          setTimeout(() => {
            setGameState(current => {
              if (!current) return current;
              return prepareNextRound(current, TIMING.BETTING_DURATION);
            });
            startBettingPhase();
          }, TIMING.CRASHED_DURATION);

          return crashed;
        }

        return updateMultiplier(prev, currentMultiplier);
      });

      // 계속 애니메이션
      setGameState(prev => {
        if (prev?.phase === 'RUNNING') {
          animationRef.current = requestAnimationFrame(animate);
        }
        return prev;
      });
    };

    animationRef.current = requestAnimationFrame(animate);
  }, [hashChain, calculateMultiplier, startBettingPhase]);

  // 첫 베팅 페이즈 시작
  useEffect(() => {
    if (gameState?.phase === 'BETTING' && gameState.roundNumber === 1) {
      startBettingPhase();
    }
  }, [gameState?.phase, gameState?.roundNumber, startBettingPhase]);

  // 클린업
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (bettingTimerRef.current) {
        clearInterval(bettingTimerRef.current);
      }
    };
  }, []);

  // 베팅 핸들러
  const handlePlaceBet = useCallback((amount: number, autoCashoutAt: number | null) => {
    setGameState(prev => prev ? placeBet(prev, amount, autoCashoutAt) : prev);
  }, []);

  const handleCancelBet = useCallback(() => {
    setGameState(prev => prev ? cancelBet(prev) : prev);
  }, []);

  const handleCashOut = useCallback(() => {
    setGameState(prev => prev ? cashOut(prev) : prev);
  }, []);

  if (!gameState || !hashChain) {
    return (
      <main style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div style={{ color: '#888' }}>Loading...</div>
      </main>
    );
  }

  return (
    <main style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '20px',
    }}>
      <GameTabs currentGame="crash" />

      <header style={{
        textAlign: 'center',
        marginBottom: '20px',
      }}>
        <h1 style={{
          fontSize: '28px',
          fontWeight: 'bold',
          background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          marginBottom: '8px',
        }}>
          Crash
        </h1>
        <p style={{
          color: '#666',
          fontSize: '14px',
        }}>
          Educational demo only - Not a gambling service
        </p>
      </header>

      {/* 게임 영역 */}
      <div style={{
        display: 'flex',
        gap: '20px',
        flexWrap: 'wrap',
        justifyContent: 'center',
        alignItems: 'flex-start',
      }}>
        <BettingPanel
          phase={gameState.phase}
          playerBet={gameState.playerBet}
          currentMultiplier={gameState.currentMultiplier}
          onPlaceBet={handlePlaceBet}
          onCancelBet={handleCancelBet}
          onCashOut={handleCashOut}
        />

        <CrashDisplay
          phase={gameState.phase}
          multiplier={gameState.currentMultiplier}
          crashPoint={gameState.crashPoint}
          bettingTimeLeft={gameState.bettingTimeLeft}
        />

        <CrashHistory
          history={gameState.history}
          totalProfit={gameState.totalProfit}
        />
      </div>

      {/* 라운드 정보 */}
      <div style={{
        marginTop: '20px',
        textAlign: 'center',
        color: '#888',
        fontSize: '12px',
      }}>
        Round #{gameState.roundNumber}
      </div>

      {/* Verify 토글 */}
      <button
        onClick={() => setShowVerify(!showVerify)}
        style={{
          marginTop: '20px',
          padding: '8px 16px',
          borderRadius: '6px',
          border: '1px solid #333',
          background: 'transparent',
          color: '#888',
          fontSize: '12px',
          cursor: 'pointer',
        }}
      >
        {showVerify ? 'Hide Verification' : 'Show Verification'}
      </button>

      {/* Verify 패널 */}
      {showVerify && (
        <VerifyPanel
          currentGameHash={gameState.gameHash}
          previousGameHash={gameState.previousGameHash}
          commitHash={gameState.commitHash}
          lastCrashPoint={lastCrashPoint}
        />
      )}

      <footer style={{
        marginTop: '30px',
        textAlign: 'center',
        color: '#555',
        fontSize: '12px',
      }}>
        <p>Custom implementation - Not copied from any gambling service</p>
      </footer>
    </main>
  );
}
