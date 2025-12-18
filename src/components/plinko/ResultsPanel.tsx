'use client';

import type { DropResult, Risk, Rows } from '@/types';
import { getAllSlotProbabilities, calculateExpectedValue, formatProbability } from '@/lib/plinko/probability';

interface ResultsPanelProps {
  lastResult: DropResult | null;
  history: DropResult[];
  rows: Rows;
  risk: Risk;
  totalProfit: number;
}

export default function ResultsPanel({
  lastResult,
  history,
  rows,
  risk,
  totalProfit,
}: ResultsPanelProps) {
  const probabilities = getAllSlotProbabilities(rows, risk);
  const expectedValue = calculateExpectedValue(rows, risk);

  return (
    <div style={{
      backgroundColor: '#1e1e2e',
      borderRadius: '12px',
      padding: '20px',
      width: '320px',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      maxHeight: '700px',
      overflow: 'hidden',
    }}>
      {/* 마지막 결과 */}
      <div style={{
        backgroundColor: '#2a2a3e',
        borderRadius: '8px',
        padding: '16px',
        textAlign: 'center',
      }}>
        <h3 style={{ color: '#888', margin: '0 0 8px 0', fontSize: '12px' }}>최근 결과</h3>
        {lastResult ? (
          <>
            <div style={{
              fontSize: '32px',
              fontWeight: 'bold',
              color: lastResult.multiplier >= 1 ? '#22c55e' : '#ef4444',
            }}>
              {lastResult.multiplier.toFixed(2)}×
            </div>
            <div style={{ color: '#aaa', fontSize: '14px', marginTop: '4px' }}>
              슬롯 #{lastResult.slotIndex} → ${lastResult.payout.toFixed(2)}
            </div>
          </>
        ) : (
          <div style={{ color: '#666', fontSize: '14px' }}>아직 드롭 기록이 없습니다</div>
        )}
      </div>

      {/* 총 수익 */}
      <div style={{
        backgroundColor: '#2a2a3e',
        borderRadius: '8px',
        padding: '12px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <span style={{ color: '#888', fontSize: '12px' }}>총 수익</span>
        <span style={{
          fontSize: '18px',
          fontWeight: 'bold',
          color: totalProfit >= 0 ? '#22c55e' : '#ef4444',
        }}>
          {totalProfit >= 0 ? '+' : ''}{totalProfit.toFixed(2)}
        </span>
      </div>

      {/* 기대값/EV 정보 */}
      <div style={{
        backgroundColor: '#2a2a3e',
        borderRadius: '8px',
        padding: '12px',
      }}>
        <h3 style={{ color: '#888', margin: '0 0 8px 0', fontSize: '12px' }}>기대값</h3>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: '#aaa', fontSize: '14px' }}>베팅당 EV:</span>
          <span style={{
            fontSize: '16px',
            fontWeight: 'bold',
            color: expectedValue >= 1 ? '#22c55e' : '#eab308',
          }}>
            {expectedValue.toFixed(4)}×
          </span>
        </div>
        <div style={{ color: '#666', fontSize: '11px', marginTop: '4px' }}>
          (하우스 엣지: {((1 - expectedValue) * 100).toFixed(2)}%)
        </div>
      </div>

      {/* 확률 분포 테이블 */}
      <div style={{
        backgroundColor: '#2a2a3e',
        borderRadius: '8px',
        padding: '12px',
        flex: 1,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}>
        <h3 style={{ color: '#888', margin: '0 0 8px 0', fontSize: '12px' }}>확률 분포</h3>
        <div style={{
          overflow: 'auto',
          flex: 1,
          fontSize: '11px',
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ color: '#666' }}>
                <th style={{ padding: '4px', textAlign: 'left' }}>슬롯</th>
                <th style={{ padding: '4px', textAlign: 'right' }}>확률</th>
                <th style={{ padding: '4px', textAlign: 'right' }}>배수</th>
                <th style={{ padding: '4px', textAlign: 'right' }}>EV</th>
              </tr>
            </thead>
            <tbody>
              {probabilities.map((p) => (
                <tr key={p.slotIndex} style={{ color: '#aaa' }}>
                  <td style={{ padding: '4px' }}>#{p.slotIndex}</td>
                  <td style={{ padding: '4px', textAlign: 'right', fontFamily: 'monospace' }}>
                    {formatProbability(p.probability)}
                  </td>
                  <td style={{
                    padding: '4px',
                    textAlign: 'right',
                    fontFamily: 'monospace',
                    color: p.multiplier >= 5 ? '#ef4444' : p.multiplier >= 1 ? '#eab308' : '#22c55e',
                  }}>
                    {p.multiplier.toFixed(2)}×
                  </td>
                  <td style={{ padding: '4px', textAlign: 'right', fontFamily: 'monospace' }}>
                    {(p.probability * p.multiplier).toFixed(4)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 히스토리 */}
      <div style={{
        backgroundColor: '#2a2a3e',
        borderRadius: '8px',
        padding: '12px',
        maxHeight: '150px',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}>
        <h3 style={{ color: '#888', margin: '0 0 8px 0', fontSize: '12px' }}>
          기록 (최근 {Math.min(history.length, 20)}개)
        </h3>
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '4px',
          overflow: 'auto',
        }}>
          {history.slice(-20).reverse().map((result) => (
            <div
              key={result.id}
              style={{
                padding: '4px 8px',
                backgroundColor: result.multiplier >= 1 ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                borderRadius: '4px',
                fontSize: '11px',
                color: result.multiplier >= 1 ? '#22c55e' : '#ef4444',
                fontFamily: 'monospace',
              }}
              title={`슬롯 #${result.slotIndex}, 수익: $${result.payout.toFixed(2)}`}
            >
              {result.multiplier.toFixed(2)}×
            </div>
          ))}
          {history.length === 0 && (
            <div style={{ color: '#666', fontSize: '12px' }}>아직 기록이 없습니다</div>
          )}
        </div>
      </div>
    </div>
  );
}
