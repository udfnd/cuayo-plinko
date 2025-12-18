'use client';

import { useState, useCallback, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import type { GameSettings, DropResult, Ball } from '@/types';
import { generatePath, pathToSlotIndex } from '@/lib/prng';
import { getMultiplier } from '@/lib/plinko/multipliers';
import PlinkoBoard from '@/components/plinko/PlinkoBoard';
import SettingsPanel from '@/components/plinko/SettingsPanel';
import ResultsPanel from '@/components/plinko/ResultsPanel';
import GameTabs from '@/components/GameTabs';
import { GameBalanceGuard } from '@/components/game';
import { useAuth } from '@/components/auth';

export default function PlinkoPage() {
  const router = useRouter();
  const pathname = usePathname();
  const { profile, updateBalance } = useAuth();

  const [settings, setSettings] = useState<GameSettings>({
    bet: 1.00,
    rows: 12,
    risk: 'medium',
    seed: 'demo-seed-123',
  });

  const [balls, setBalls] = useState<Ball[]>([]);
  const [history, setHistory] = useState<DropResult[]>([]);
  const [lastResult, setLastResult] = useState<DropResult | null>(null);
  const [totalProfit, setTotalProfit] = useState(0);
  const [isAutoRunning, setIsAutoRunning] = useState(false);

  const dropCountRef = useRef(0);
  const autoIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const dropBall = useCallback(async () => {
    // 로그인 확인
    if (!profile) {
      router.push(`/auth/login?from=${encodeURIComponent(pathname)}`);
      return;
    }

    // 잔고 확인
    if (profile.balance < settings.bet) {
      alert('잔고가 부족합니다.');
      return;
    }

    // 베팅 금액 차감
    const result = await updateBalance(-settings.bet);
    if (!result.success) {
      alert('베팅 처리 중 오류가 발생했습니다.');
      return;
    }

    const dropIndex = dropCountRef.current++;
    const path = generatePath(settings.seed, settings.rows, dropIndex);
    const slotIndex = pathToSlotIndex(path);
    const multiplier = getMultiplier(settings.rows, settings.risk, slotIndex);

    const ball: Ball = {
      id: `ball-${Date.now()}-${dropIndex}`,
      x: 0,
      y: 0,
      path,
      currentRow: -1,
      progress: 0,
      done: false,
      slotIndex,
      multiplier,
    };

    setBalls(prev => [...prev, ball]);
  }, [settings, profile, updateBalance, router, pathname]);

  const handleBallComplete = useCallback(async (ball: Ball) => {
    const payout = settings.bet * ball.multiplier;
    const profit = payout - settings.bet;

    // 당첨금 지급
    if (payout > 0) {
      await updateBalance(payout);
    }

    const result: DropResult = {
      id: ball.id,
      path: ball.path,
      slotIndex: ball.slotIndex,
      multiplier: ball.multiplier,
      payout,
      timestamp: Date.now(),
    };

    setLastResult(result);
    setHistory(prev => [...prev, result].slice(-100));
    setTotalProfit(prev => prev + profit);
  }, [settings.bet, updateBalance]);

  const handleAuto = useCallback((count: number) => {
    // 로그인 확인
    if (!profile) {
      router.push(`/auth/login?from=${encodeURIComponent(pathname)}`);
      return;
    }

    if (profile.balance < settings.bet) {
      alert('잔고가 부족합니다.');
      return;
    }

    setIsAutoRunning(true);
    let remaining = count;

    autoIntervalRef.current = setInterval(() => {
      if (remaining <= 0) {
        if (autoIntervalRef.current) {
          clearInterval(autoIntervalRef.current);
          autoIntervalRef.current = null;
        }
        setIsAutoRunning(false);
        return;
      }

      dropBall();
      remaining--;
    }, 500);
  }, [dropBall, profile, settings.bet, router, pathname]);

  const handleStopAuto = useCallback(() => {
    if (autoIntervalRef.current) {
      clearInterval(autoIntervalRef.current);
      autoIntervalRef.current = null;
    }
    setIsAutoRunning(false);
  }, []);

  const handleSettingsChange = useCallback((newSettings: GameSettings) => {
    // 베팅 금액이 잔고를 초과하지 않도록
    if (profile && newSettings.bet > profile.balance) {
      newSettings.bet = profile.balance;
    }

    if (newSettings.rows !== settings.rows || newSettings.seed !== settings.seed) {
      dropCountRef.current = 0;
    }
    setSettings(newSettings);
  }, [settings.rows, settings.seed, profile]);

  return (
    <main style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '20px',
    }}>
      <GameTabs currentGame="plinko" />

      <header style={{
        textAlign: 'center',
        marginBottom: '20px',
      }}>
        <h1 style={{
          fontSize: '28px',
          fontWeight: 'bold',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          marginBottom: '8px',
        }}>
          플링코
        </h1>
      </header>

      <GameBalanceGuard requiredBalance={settings.bet}>
        <div style={{
          display: 'flex',
          gap: '20px',
          flexWrap: 'wrap',
          justifyContent: 'center',
          alignItems: 'flex-start',
        }}>
          <SettingsPanel
            settings={settings}
            onSettingsChange={handleSettingsChange}
            onDrop={dropBall}
            onAuto={handleAuto}
            isAutoRunning={isAutoRunning}
            onStopAuto={handleStopAuto}
            maxBet={profile?.balance || 0}
          />

          <PlinkoBoard
            rows={settings.rows}
            risk={settings.risk}
            balls={balls}
            seed={settings.seed}
            onBallComplete={handleBallComplete}
          />

          <ResultsPanel
            lastResult={lastResult}
            history={history}
            rows={settings.rows}
            risk={settings.risk}
            totalProfit={totalProfit}
          />
        </div>
      </GameBalanceGuard>

    </main>
  );
}
