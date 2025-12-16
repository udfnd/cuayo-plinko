'use client';

// 서버 동기화 모드용 간소화된 히스토리 타입
interface SimpleHistoryItem {
  roundNumber: number;
  crashPoint: number;
  betAmount?: number;
  cashedOut?: boolean;
  cashoutMultiplier?: number;
  profit?: number;
}

interface CrashHistoryProps {
  history: SimpleHistoryItem[];
  totalProfit: number;
}

export default function CrashHistory({ history, totalProfit }: CrashHistoryProps) {
  return (
    <div style={{
      width: '280px',
      padding: '20px',
      background: '#1a1a2e',
      borderRadius: '12px',
    }}>
      {/* 총 수익 */}
      <div style={{
        marginBottom: '16px',
        padding: '12px',
        background: totalProfit >= 0 ? '#22c55e22' : '#ef444422',
        borderRadius: '8px',
        textAlign: 'center',
      }}>
        <div style={{ color: '#888', fontSize: '12px', marginBottom: '4px' }}>
          Total Profit
        </div>
        <div style={{
          fontSize: '24px',
          fontWeight: 'bold',
          color: totalProfit >= 0 ? '#22c55e' : '#ef4444',
        }}>
          {totalProfit >= 0 ? '+' : ''}{totalProfit.toFixed(2)}
        </div>
      </div>

      {/* 최근 크래시 배수들 */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ color: '#888', fontSize: '12px', marginBottom: '8px' }}>
          Recent Crashes
        </div>
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '6px',
        }}>
          {history.slice(0, 15).map((result) => (
            <div
              key={result.roundNumber}
              style={{
                padding: '4px 8px',
                borderRadius: '4px',
                background: result.crashPoint < 2 ? '#ef444433' : '#22c55e33',
                color: result.crashPoint < 2 ? '#ef4444' : '#22c55e',
                fontSize: '12px',
                fontWeight: 'bold',
              }}
            >
              {result.crashPoint.toFixed(2)}x
            </div>
          ))}
          {history.length === 0 && (
            <div style={{ color: '#666', fontSize: '12px' }}>
              No history yet
            </div>
          )}
        </div>
      </div>

      {/* 상세 히스토리 */}
      <div>
        <div style={{ color: '#888', fontSize: '12px', marginBottom: '8px' }}>
          Your Results
        </div>
        <div style={{
          maxHeight: '200px',
          overflowY: 'auto',
        }}>
          {history.filter(r => r.betAmount !== undefined).map((result) => (
            <div
              key={result.roundNumber}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '8px',
                borderRadius: '4px',
                background: '#0f0f1a',
                marginBottom: '4px',
              }}
            >
              <div>
                <div style={{ color: '#888', fontSize: '10px' }}>
                  Round #{result.roundNumber}
                </div>
                <div style={{ color: '#fff', fontSize: '12px' }}>
                  {result.crashPoint.toFixed(2)}x
                  {result.cashedOut && result.cashoutMultiplier && (
                    <span style={{ color: '#22c55e', marginLeft: '4px' }}>
                      @{result.cashoutMultiplier.toFixed(2)}x
                    </span>
                  )}
                </div>
              </div>
              <div style={{
                color: (result.profit ?? 0) >= 0 ? '#22c55e' : '#ef4444',
                fontWeight: 'bold',
                fontSize: '14px',
              }}>
                {(result.profit ?? 0) >= 0 ? '+' : ''}{(result.profit ?? 0).toFixed(2)}
              </div>
            </div>
          ))}
          {history.filter(r => r.betAmount !== undefined).length === 0 && (
            <div style={{ color: '#666', fontSize: '12px', textAlign: 'center', padding: '16px' }}>
              No bets placed yet
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
