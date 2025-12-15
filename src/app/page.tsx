'use client';

import { useState, useCallback, useRef } from 'react';
import type { GameSettings, DropResult, Ball } from '@/types';
import { generatePath, pathToSlotIndex } from '@/lib/prng';
import { getMultiplier } from '@/lib/multipliers';
import PlinkoBoard from '@/components/PlinkoBoard';
import SettingsPanel from '@/components/SettingsPanel';
import ResultsPanel from '@/components/ResultsPanel';

export default function Home() {
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

  const dropBall = useCallback(() => {
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
  }, [settings]);

  const handleBallComplete = useCallback((ball: Ball) => {
    const payout = settings.bet * ball.multiplier;
    const profit = payout - settings.bet;

    const result: DropResult = {
      id: ball.id,
      path: ball.path,
      slotIndex: ball.slotIndex,
      multiplier: ball.multiplier,
      payout,
      timestamp: Date.now(),
    };

    setLastResult(result);
    setHistory(prev => [...prev, result].slice(-100)); // 최대 100개 보관
    setTotalProfit(prev => prev + profit);
  }, [settings.bet]);

  const handleAuto = useCallback((count: number) => {
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
    }, 200); // 200ms 간격으로 드롭
  }, [dropBall]);

  const handleStopAuto = useCallback(() => {
    if (autoIntervalRef.current) {
      clearInterval(autoIntervalRef.current);
      autoIntervalRef.current = null;
    }
    setIsAutoRunning(false);
  }, []);

  const handleSettingsChange = useCallback((newSettings: GameSettings) => {
    // rows가 변경되면 drop count 리셋
    if (newSettings.rows !== settings.rows || newSettings.seed !== settings.seed) {
      dropCountRef.current = 0;
    }
    setSettings(newSettings);
  }, [settings.rows, settings.seed]);

  return (
    <main style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '20px',
    }}>
      {/* Header */}
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
          Plinko Demo
        </h1>
        <p style={{
          color: '#666',
          fontSize: '14px',
        }}>
          Educational demo only - Not a gambling service
        </p>
      </header>

      {/* Game Area */}
      <div style={{
        display: 'flex',
        gap: '20px',
        flexWrap: 'wrap',
        justifyContent: 'center',
        alignItems: 'flex-start',
      }}>
        {/* Settings Panel */}
        <SettingsPanel
          settings={settings}
          onSettingsChange={handleSettingsChange}
          onDrop={dropBall}
          onAuto={handleAuto}
          isAutoRunning={isAutoRunning}
          onStopAuto={handleStopAuto}
        />

        {/* Plinko Board */}
        <PlinkoBoard
          rows={settings.rows}
          risk={settings.risk}
          balls={balls}
          seed={settings.seed}
          onBallComplete={handleBallComplete}
        />

        {/* Results Panel */}
        <ResultsPanel
          lastResult={lastResult}
          history={history}
          rows={settings.rows}
          risk={settings.risk}
          totalProfit={totalProfit}
        />
      </div>

      {/* Footer */}
      <footer style={{
        marginTop: '30px',
        textAlign: 'center',
        color: '#555',
        fontSize: '12px',
      }}>
        <p>Seed: <code style={{ color: '#888', fontFamily: 'monospace' }}>{settings.seed}</code></p>
        <p style={{ marginTop: '4px' }}>
          Drop #{dropCountRef.current} | Rows: {settings.rows} | Risk: {settings.risk}
        </p>
        <p style={{ marginTop: '8px', color: '#444' }}>
          Custom multiplier tables - Not copied from any gambling service
        </p>
      </footer>
    </main>
  );
}
