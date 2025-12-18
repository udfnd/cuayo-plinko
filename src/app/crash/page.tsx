'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import GameTabs from '@/components/GameTabs';
import CrashDisplay from '@/components/crash/CrashDisplay';
import BettingPanel from '@/components/crash/BettingPanel';
import CrashHistory from '@/components/crash/CrashHistory';
import { GameBalanceGuard } from '@/components/game';
import { useAuth } from '@/components/auth';
import { useCrashSync, type CrashPhase } from '@/lib/multiplayer';

// 라운드별 베팅 상태
interface RoundBet {
  roundNumber: number;
  amount: number;
  autoCashoutAt: number | null;
  cashedOut: boolean;
  cashoutMultiplier: number | null;
  settled: boolean;
}

// 히스토리 아이템
interface HistoryItem {
  roundNumber: number;
  crashPoint: number;
  bet?: {
    amount: number;
    cashedOut: boolean;
    multiplier: number | null;
    profit: number;
  };
}

export default function CrashPage() {
  const router = useRouter();
  const pathname = usePathname();
  const { profile, updateBalance, isLoading: isAuthLoading, isConfigured } = useAuth();
  const { syncState, isConnected, playerCount } = useCrashSync();

  const [roundBet, setRoundBet] = useState<RoundBet | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [totalProfit, setTotalProfit] = useState(0);
  const [multiplierHistory, setMultiplierHistory] = useState<number[]>([1.00]);
  // Hydration 불일치 방지: 마운트 후에만 동적 값 표시
  const [isMounted, setIsMounted] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastPhaseRef = useRef<CrashPhase | null>(null);
  const lastRoundRef = useRef<number>(0);
  const cashingOutRef = useRef<boolean>(false); // 캐시아웃 중복 방지

  // Hydration 불일치 방지
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // 사운드 효과
  const playSound = useCallback((type: 'running' | 'crash') => {
    if (type === 'running') {
      if (!audioRef.current) {
        audioRef.current = new Audio('/soundeffect.mp3');
        audioRef.current.loop = true;
        audioRef.current.volume = 0.5;
      }
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      const crashAudio = new Audio('/end.mp3');
      crashAudio.volume = 0.7;
      crashAudio.play().catch(() => {});
    }
  }, []);

  const stopSound = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  }, []);

  // 캐시아웃 (useEffect 전에 정의해야 함)
  const handleCashOut = useCallback(async () => {
    if (!roundBet) return;
    if (syncState.phase !== 'RUNNING') return;
    if (roundBet.cashedOut) return;

    // 중복 호출 방지 (ref로 즉시 체크)
    if (cashingOutRef.current) return;
    cashingOutRef.current = true;

    try {
      const payout = roundBet.amount * syncState.currentMultiplier;
      await updateBalance(payout);

      setRoundBet(prev => prev ? {
        ...prev,
        cashedOut: true,
        cashoutMultiplier: syncState.currentMultiplier,
      } : null);
    } finally {
      // 다음 라운드를 위해 리셋 (상태 업데이트 후)
      setTimeout(() => {
        cashingOutRef.current = false;
      }, 100);
    }
  }, [roundBet, syncState.phase, syncState.currentMultiplier, updateBalance]);

  // 페이즈 변경 감지
  useEffect(() => {
    const currentPhase = syncState.phase;
    const prevPhase = lastPhaseRef.current;
    const currentRound = syncState.roundNumber;
    const prevRound = lastRoundRef.current;

    // 페이즈 변경 시 효과
    if (prevPhase !== currentPhase) {
      if (currentPhase === 'RUNNING' && prevPhase === 'BETTING') {
        playSound('running');
        setMultiplierHistory([1.00]);
      } else if (currentPhase === 'CRASHED') {
        playSound('crash');
      } else if (currentPhase === 'BETTING') {
        stopSound();
      }
    }

    // 라운드 변경 시 베팅 초기화 및 히스토리 추가
    if (currentRound !== prevRound && prevRound > 0) {
      // 이전 라운드 정산 처리는 CRASHED 페이즈에서 이미 처리됨
      setRoundBet(null);
      // 캐시아웃 ref 리셋
      cashingOutRef.current = false;
    }

    lastPhaseRef.current = currentPhase;
    lastRoundRef.current = currentRound;
  }, [syncState.phase, syncState.roundNumber, playSound, stopSound]);

  // 배수 히스토리 업데이트
  useEffect(() => {
    if (syncState.phase !== 'RUNNING') return;

    setMultiplierHistory(prev => {
      const last = prev[prev.length - 1];
      if (Math.abs(last - syncState.currentMultiplier) > 0.01) {
        return [...prev, syncState.currentMultiplier];
      }
      return prev;
    });
  }, [syncState.currentMultiplier, syncState.phase]);

  // 자동 캐시아웃 체크
  useEffect(() => {
    if (!roundBet) return;
    if (syncState.phase !== 'RUNNING') return;
    if (roundBet.cashedOut || roundBet.settled) return;
    if (!roundBet.autoCashoutAt) return;

    if (syncState.currentMultiplier >= roundBet.autoCashoutAt) {
      handleCashOut();
    }
  }, [syncState.currentMultiplier, syncState.phase, roundBet, handleCashOut]);

  // 크래시 시 정산
  useEffect(() => {
    if (syncState.phase !== 'CRASHED') return;
    if (!roundBet || roundBet.settled) return;
    if (roundBet.roundNumber !== syncState.roundNumber) return;

    let profit = 0;
    if (roundBet.cashedOut && roundBet.cashoutMultiplier) {
      // 이미 캐시아웃했으면 이익은 이미 지급됨
      profit = roundBet.amount * roundBet.cashoutMultiplier - roundBet.amount;
    } else {
      // 캐시아웃 못하고 크래시 -> 손실
      profit = -roundBet.amount;
    }

    // 히스토리 추가
    setHistory(prev => [{
      roundNumber: syncState.roundNumber,
      crashPoint: syncState.crashPoint,
      bet: {
        amount: roundBet.amount,
        cashedOut: roundBet.cashedOut,
        multiplier: roundBet.cashoutMultiplier,
        profit,
      },
    }, ...prev].slice(0, 10));

    setTotalProfit(prev => prev + profit);
    setRoundBet(prev => prev ? { ...prev, settled: true } : null);
  }, [syncState.phase, syncState.roundNumber, syncState.crashPoint, roundBet]);

  // 베팅 핸들러
  const handlePlaceBet = useCallback(async (amount: number, autoCashoutAt: number | null) => {
    // 로그인 확인
    if (!profile) {
      router.push(`/auth/login?from=${encodeURIComponent(pathname)}`);
      return;
    }

    // 베팅 페이즈에서만 베팅 가능
    if (syncState.phase !== 'BETTING') {
      alert('베팅은 베팅 시간에만 가능합니다.');
      return;
    }

    if (profile.balance < amount) {
      alert('잔고가 부족합니다.');
      return;
    }

    const result = await updateBalance(-amount);
    if (!result.success) {
      alert('베팅 처리 중 오류가 발생했습니다.');
      return;
    }



    setRoundBet({
      roundNumber: syncState.roundNumber,
      amount,
      autoCashoutAt,
      cashedOut: false,
      cashoutMultiplier: null,
      settled: false,
    });
  }, [syncState.phase, syncState.roundNumber, profile, updateBalance, router, pathname]);

  // 베팅 취소
  const handleCancelBet = useCallback(async () => {
    if (!roundBet) return;
    if (syncState.phase !== 'BETTING') return;

    await updateBalance(roundBet.amount);
    setRoundBet(null);
  }, [roundBet, syncState.phase, updateBalance]);

  // 클린업
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // 베팅 패널용 상태 변환
  const playerBet = roundBet && roundBet.roundNumber === syncState.roundNumber ? {
    amount: roundBet.amount,
    autoCashoutAt: roundBet.autoCashoutAt,
    cashedOut: roundBet.cashedOut,
    cashoutMultiplier: roundBet.cashoutMultiplier,
  } : null;

  return (
    <main style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '20px',
    }}>
      <GameTabs currentGame="crash" />

      <header style={{ textAlign: 'center', marginBottom: '20px' }}>
        <h1 style={{
          fontSize: '28px',
          fontWeight: 'bold',
          background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          marginBottom: '8px',
        }}>
          크래시
        </h1>
        <p style={{ color: isConnected ? '#22c55e' : '#666', fontSize: '12px', marginTop: '4px' }}>
          {isConnected ? `온라인 (${playerCount || 1}명 접속)` : '로컬 모드'}
        </p>
      </header>

      <GameBalanceGuard requiredBalance={1}>
        <div style={{
          display: 'flex',
          gap: '20px',
          flexWrap: 'wrap',
          justifyContent: 'center',
          alignItems: 'flex-start',
        }}>
          <BettingPanel
            phase={syncState.phase}
            balance={profile?.balance ?? 0}
            isBalanceLoading={isAuthLoading || (!profile && isConfigured)}
            playerBet={playerBet}
            currentMultiplier={syncState.currentMultiplier}
            onPlaceBet={handlePlaceBet}
            onCancelBet={handleCancelBet}
            onCashOut={handleCashOut}
          />
          <CrashDisplay
            phase={syncState.phase}
            multiplier={syncState.currentMultiplier}
            crashPoint={syncState.phase === 'CRASHED' ? syncState.crashPoint : null}
            bettingTimeLeft={syncState.bettingTimeLeft}
            multiplierHistory={multiplierHistory}
          />
          <CrashHistory
            history={history.map(h => ({
              roundNumber: h.roundNumber,
              crashPoint: h.crashPoint,
              betAmount: h.bet?.amount,
              cashedOut: h.bet?.cashedOut,
              cashoutMultiplier: h.bet?.multiplier ?? undefined,
              profit: h.bet?.profit,
            }))}
            totalProfit={totalProfit}
          />
        </div>
      </GameBalanceGuard>

      <div style={{ marginTop: '20px', textAlign: 'center', color: '#888', fontSize: '12px' }}>
        {isMounted ? `라운드 #${syncState.roundNumber}` : '로딩 중...'}
      </div>
    </main>
  );
}
