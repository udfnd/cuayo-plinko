'use client';

import { useState, useCallback } from 'react';
import type { Risk, Rows, GameSettings } from '@/types';

interface SettingsPanelProps {
  settings: GameSettings;
  onSettingsChange: (settings: GameSettings) => void;
  onDrop: () => void;
  onAuto: (count: number) => void;
  isAutoRunning: boolean;
  onStopAuto: () => void;
  maxBet?: number;
}

const ROWS_OPTIONS: Rows[] = [8, 12, 16];
const RISK_OPTIONS: { value: Risk; label: string }[] = [
  { value: 'low', label: '낮음' },
  { value: 'medium', label: '중간' },
  { value: 'high', label: '높음' },
];

export default function SettingsPanel({
  settings,
  onSettingsChange,
  onDrop,
  onAuto,
  isAutoRunning,
  onStopAuto,
  maxBet,
}: SettingsPanelProps) {
  const [autoCount, setAutoCount] = useState(10);

  const handleBetChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    let value = Math.max(0.01, parseFloat(e.target.value) || 0);
    if (maxBet !== undefined && value > maxBet) {
      value = maxBet;
    }
    onSettingsChange({ ...settings, bet: value });
  }, [settings, onSettingsChange, maxBet]);

  const handleRowsChange = useCallback((rows: Rows) => {
    onSettingsChange({ ...settings, rows });
  }, [settings, onSettingsChange]);

  const handleRiskChange = useCallback((risk: Risk) => {
    onSettingsChange({ ...settings, risk });
  }, [settings, onSettingsChange]);

  return (
    <div style={{
      backgroundColor: '#1e1e2e',
      borderRadius: '12px',
      padding: '20px',
      width: '280px',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
    }}>
      <h2 style={{ color: '#fff', margin: 0, fontSize: '18px' }}>설정</h2>

      {/* 베팅 금액 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <label style={{ color: '#aaa', fontSize: '12px' }}>베팅 금액</label>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            type="number"
            value={settings.bet}
            onChange={handleBetChange}
            min="0.01"
            step="0.1"
            disabled={isAutoRunning}
            style={{
              flex: 1,
              padding: '10px',
              backgroundColor: '#2a2a3e',
              border: '1px solid #3a3a5e',
              borderRadius: '6px',
              color: '#fff',
              fontSize: '14px',
            }}
          />
          <button
            onClick={() => onSettingsChange({ ...settings, bet: settings.bet / 2 })}
            disabled={isAutoRunning}
            style={{
              padding: '10px 12px',
              backgroundColor: '#3a3a5e',
              border: 'none',
              borderRadius: '6px',
              color: '#fff',
              cursor: 'pointer',
            }}
          >
            ½
          </button>
          <button
            onClick={() => onSettingsChange({ ...settings, bet: settings.bet * 2 })}
            disabled={isAutoRunning}
            style={{
              padding: '10px 12px',
              backgroundColor: '#3a3a5e',
              border: 'none',
              borderRadius: '6px',
              color: '#fff',
              cursor: 'pointer',
            }}
          >
            2×
          </button>
        </div>
      </div>

      {/* 행 수 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <label style={{ color: '#aaa', fontSize: '12px' }}>행 수</label>
        <div style={{ display: 'flex', gap: '8px' }}>
          {ROWS_OPTIONS.map(rows => (
            <button
              key={rows}
              onClick={() => handleRowsChange(rows)}
              disabled={isAutoRunning}
              style={{
                flex: 1,
                padding: '10px',
                backgroundColor: settings.rows === rows ? '#4f46e5' : '#3a3a5e',
                border: 'none',
                borderRadius: '6px',
                color: '#fff',
                cursor: 'pointer',
                fontWeight: settings.rows === rows ? 'bold' : 'normal',
              }}
            >
              {rows}
            </button>
          ))}
        </div>
      </div>

      {/* 위험도 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <label style={{ color: '#aaa', fontSize: '12px' }}>위험도</label>
        <div style={{ display: 'flex', gap: '8px' }}>
          {RISK_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => handleRiskChange(value)}
              disabled={isAutoRunning}
              style={{
                flex: 1,
                padding: '10px',
                backgroundColor: settings.risk === value ? '#4f46e5' : '#3a3a5e',
                border: 'none',
                borderRadius: '6px',
                color: '#fff',
                cursor: 'pointer',
                fontWeight: settings.risk === value ? 'bold' : 'normal',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* 드롭 버튼 */}
      <button
        onClick={onDrop}
        disabled={isAutoRunning}
        style={{
          padding: '14px',
          backgroundColor: '#22c55e',
          border: 'none',
          borderRadius: '8px',
          color: '#fff',
          fontSize: '16px',
          fontWeight: 'bold',
          cursor: 'pointer',
          marginTop: '8px',
        }}
      >
        공 떨어뜨리기
      </button>

      {/* 자동 드롭 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <label style={{ color: '#aaa', fontSize: '12px' }}>자동 드롭</label>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            type="number"
            value={autoCount}
            onChange={(e) => setAutoCount(Math.max(1, parseInt(e.target.value) || 1))}
            min="1"
            max="100"
            disabled={isAutoRunning}
            style={{
              width: '80px',
              padding: '10px',
              backgroundColor: '#2a2a3e',
              border: '1px solid #3a3a5e',
              borderRadius: '6px',
              color: '#fff',
              fontSize: '14px',
            }}
          />
          {isAutoRunning ? (
            <button
              onClick={onStopAuto}
              style={{
                flex: 1,
                padding: '10px',
                backgroundColor: '#ef4444',
                border: 'none',
                borderRadius: '6px',
                color: '#fff',
                cursor: 'pointer',
                fontWeight: 'bold',
              }}
            >
              정지
            </button>
          ) : (
            <button
              onClick={() => onAuto(autoCount)}
              style={{
                flex: 1,
                padding: '10px',
                backgroundColor: '#eab308',
                border: 'none',
                borderRadius: '6px',
                color: '#000',
                cursor: 'pointer',
                fontWeight: 'bold',
              }}
            >
              자동 ({autoCount}회)
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
