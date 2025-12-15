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
  const [multiplierHistory, setMultiplierHistory] = useState<number[]>([]);

  const bettingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const multiplierTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hashChainRef = useRef<HashChain | null>(null);
  const isRunningRef = useRef<boolean>(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const crashPointRef = useRef<number>(1.00);
  const gameHashRef = useRef<string>('');
  const startBettingTimerRef = useRef<() => void>(() => {});

  // 사운드 시작
  const startSound = useCallback(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio('/soundeffect.mp3');
      audioRef.current.loop = true;
      audioRef.current.volume = 0.5;
    }
    audioRef.current.currentTime = 0;
    audioRef.current.play().catch(() => {
      // 자동 재생 차단 시 무시
    });
  }, []);

  // 사운드 정지
  const stopSound = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  }, []);

  // 배수 타이머 정지
  const stopMultiplierTimer = useCallback(() => {
    if (multiplierTimerRef.current) {
      clearInterval(multiplierTimerRef.current);
      multiplierTimerRef.current = null;
    }
    stopSound();
  }, [stopSound]);

  // 러닝 페이즈 시작
  const startRunningPhase = useCallback(async () => {
    const chain = hashChainRef.current;
    if (!chain || isRunningRef.current) return;

    isRunningRef.current = true;

    const gameHash = getNextGameHash(chain);
    if (!gameHash) {
      console.error('Hash chain exhausted');
      isRunningRef.current = false;
      return;
    }

    const crashPoint = await calculateCrashPoint(gameHash);
    crashPointRef.current = crashPoint;
    gameHashRef.current = gameHash;

    // 게임 상태 초기화
    setGameState(prev => {
      if (!prev) return prev;
      return startRound(prev, gameHash, crashPoint);
    });

    // 히스토리 초기화
    setMultiplierHistory([1.00]);

    // 사운드 시작
    startSound();

    // 현재 배수 (로컬 변수로 관리)
    let currentMultiplier = 1.00;

    // 크래시 사운드 재생 함수
    const playCrashSound = () => {
      const crashAudio = new Audio('/end.mp3');
      crashAudio.volume = 0.7;
      crashAudio.play().catch(() => {});
    };

    // setInterval로 정확히 INCREMENT_INTERVAL마다 증가
    multiplierTimerRef.current = setInterval(() => {
      // 2.00x 이상일 경우 지수적으로 증가량 증가
      let increment = 0.01;
      if (currentMultiplier >= 2.00) {
        // 지수적 증가: 2.00x 이후 증가량이 점점 커짐
        // 예: 2.00x에서 0.01, 3.00x에서 0.02, 5.00x에서 0.04 ...
        increment = 0.01 * Math.pow(1.5, (currentMultiplier - 2) / 2);
        increment = Math.min(increment, 0.5); // 최대 0.5 제한
      }

      currentMultiplier = Math.round((currentMultiplier + increment) * 100) / 100;

      // 크래시 체크
      if (currentMultiplier >= crashPointRef.current) {
        // 타이머 정지
        stopMultiplierTimer();
        isRunningRef.current = false;

        // 크래시 사운드 재생
        playCrashSound();

        setLastCrashPoint(crashPointRef.current);

        // 상태 업데이트 (크래시)
        setGameState(prev => {
          if (!prev) return prev;
          return crashRound(updateMultiplier(prev, crashPointRef.current));
        });

        // 히스토리에 최종 값 추가
        setMultiplierHistory(prev => [...prev, crashPointRef.current]);

        // 다음 라운드 준비
        setTimeout(() => {
          setGameState(current => {
            if (!current) return current;
            return prepareNextRound(current, TIMING.BETTING_DURATION);
          });
          startBettingTimerRef.current();
        }, TIMING.CRASHED_DURATION);

        return;
      }

      // 상태 업데이트
      setGameState(prev => {
        if (!prev || prev.phase !== 'RUNNING') {
          stopMultiplierTimer();
          isRunningRef.current = false;
          return prev;
        }
        return updateMultiplier(prev, currentMultiplier);
      });

      // 히스토리 업데이트
      setMultiplierHistory(prev => [...prev, currentMultiplier]);

    }, MULTIPLIER.INCREMENT_INTERVAL);

  }, [startSound, stopMultiplierTimer]);

  // 베팅 타이머 시작 함수
  const startBettingTimer = useCallback(() => {
    // 이미 타이머가 있으면 정리
    if (bettingTimerRef.current) {
      clearInterval(bettingTimerRef.current);
      bettingTimerRef.current = null;
    }

    let timeLeft = TIMING.BETTING_DURATION;

    // 초기 시간 설정
    setGameState(prev => prev ? { ...prev, bettingTimeLeft: timeLeft } : prev);

    bettingTimerRef.current = setInterval(() => {
      timeLeft -= 100;

      if (timeLeft <= 0) {
        if (bettingTimerRef.current) {
          clearInterval(bettingTimerRef.current);
          bettingTimerRef.current = null;
        }
        setGameState(prev => prev ? { ...prev, bettingTimeLeft: 0 } : prev);
        startRunningPhase();
      } else {
        setGameState(prev => prev ? { ...prev, bettingTimeLeft: timeLeft } : prev);
      }
    }, 100);
  }, [startRunningPhase]);

  // startBettingTimer를 ref에 할당 (순환 참조 해결)
  useEffect(() => {
    startBettingTimerRef.current = startBettingTimer;
  }, [startBettingTimer]);

  // 게임 초기화
  useEffect(() => {
    const chain = createHashChain();
    hashChainRef.current = chain;
    setHashChain(chain);
    setGameState(createInitialState(chain.commitHash));
  }, []);

  // 첫 베팅 페이즈 시작
  useEffect(() => {
    if (gameState?.phase === 'BETTING' && gameState.roundNumber === 1 && !bettingTimerRef.current) {
      startBettingTimer();
    }
  }, [gameState?.phase, gameState?.roundNumber, startBettingTimer]);

  // 클린업
  useEffect(() => {
    return () => {
      if (bettingTimerRef.current) {
        clearInterval(bettingTimerRef.current);
      }
      if (multiplierTimerRef.current) {
        clearInterval(multiplierTimerRef.current);
      }
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
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
          multiplierHistory={multiplierHistory}
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
