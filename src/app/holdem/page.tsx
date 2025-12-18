'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import GameTabs from '@/components/GameTabs';
import HandDisplay from '@/components/holdem/HandDisplay';
import BoardDisplay from '@/components/holdem/BoardDisplay';
import BettingPanel from '@/components/holdem/BettingPanel';
import GameControls from '@/components/holdem/GameControls';
import { GameBalanceGuard } from '@/components/game';
import { useAuth } from '@/components/auth';
import { useServerSync, type PhaseConfig } from '@/lib/multiplayer';
import {
  createStateFromSeed,
  updateEquities,
  getVisibleBoard,
  calculateEquity,
  EQUITY_CONFIG,
  PHASE_ORDER,
  type HoldemGameState,
  type Bet,
  type Settlement,
} from '@/lib/holdem';

// 페이즈 설정 (각 페이즈별 지속 시간)
const HOLDEM_PHASES: PhaseConfig[] = [
  { name: 'PRE_DEAL', duration: 8000 },   // 8초
  { name: 'PRE_FLOP', duration: 10000 },  // 10초
  { name: 'FLOP', duration: 10000 },      // 10초
  { name: 'TURN', duration: 10000 },      // 10초
  { name: 'RIVER', duration: 10000 },     // 10초
  { name: 'SETTLE', duration: 7000 },     // 7초
];

// 베팅 정보 (라운드별로 관리)
interface RoundBets {
  roundNumber: number;
  bets: Bet[];
  settled: boolean;
  settlements: Settlement[] | null;
}

export default function HoldemPage() {
  const router = useRouter();
  const pathname = usePathname();
  const { profile, updateBalance, isConfigured, isLoading: isAuthLoading } = useAuth();
  const { syncState, isConnected, playerCount } = useServerSync('holdem', HOLDEM_PHASES);

  const [selectedHand, setSelectedHand] = useState<number | null>(null);
  const [roundBets, setRoundBets] = useState<RoundBets | null>(null);
  const [lastCalculatedPhase, setLastCalculatedPhase] = useState<string>('');
  // Hydration 불일치 방지: 마운트 후에만 시간 표시
  const [isMounted, setIsMounted] = useState(false);

  const equityCalculatedRef = useRef<string>('');

  // Hydration 불일치 방지
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // 서버 동기화 상태로부터 게임 상태 생성
  const serverGameState = useMemo(() => {
    return createStateFromSeed(syncState.seed, syncState.phaseIndex, syncState.roundNumber);
  }, [syncState.seed, syncState.phaseIndex, syncState.roundNumber]);

  // gameState를 serverGameState 기반으로 즉시 초기화
  const [gameState, setGameState] = useState<HoldemGameState>(() =>
    createStateFromSeed(syncState.seed, syncState.phaseIndex, syncState.roundNumber)
  );

  // 게임 상태 업데이트 (서버 상태 + 로컬 베팅)
  useEffect(() => {
    setGameState(prev => {
      // 베팅 정보 병합
      const bets = roundBets?.roundNumber === serverGameState.roundNumber
        ? roundBets.bets
        : [];

      // Settlement 정보 병합
      const settlements = roundBets?.roundNumber === serverGameState.roundNumber
        ? roundBets.settlements
        : null;

      // 이전 equities 유지 (계산 중이 아닐 때)
      const equities = prev?.phase === serverGameState.phase && prev?.equities
        ? prev.equities
        : serverGameState.equities;

      return {
        ...serverGameState,
        bets,
        settlements,
        equities,
        isCalculating: serverGameState.isCalculating && !equities,
      };
    });
  }, [serverGameState, roundBets]);

  // 라운드 변경 시 베팅 초기화
  useEffect(() => {
    setRoundBets(prev => {
      if (!prev || prev.roundNumber !== syncState.roundNumber) {
        return {
          roundNumber: syncState.roundNumber,
          bets: [],
          settled: false,
          settlements: null,
        };
      }
      return prev;
    });

    // 라운드 변경 시 선택 초기화
    setSelectedHand(null);
  }, [syncState.roundNumber]);

  // Equity 계산 (페이즈 변경 시)
  useEffect(() => {
    if (!gameState.isCalculating) return;

    const calcKey = `${gameState.seed}-${gameState.phase}`;
    if (equityCalculatedRef.current === calcKey) return;
    equityCalculatedRef.current = calcKey;

    const { hands, board, visibleBoardCount, visibleHoleCards } = gameState;

    if (!visibleHoleCards) {
      setGameState(prev => ({ ...prev, isCalculating: false }));
      return;
    }

    const timeoutId = setTimeout(() => {
      const visibleBoard = board.slice(0, visibleBoardCount);
      const result = calculateEquity(
        hands,
        visibleBoard,
        EQUITY_CONFIG.DEFAULT_ITERATIONS,
        gameState.seed
      );

      setGameState(prev => {
        if (prev.seed !== gameState.seed) return prev;
        return updateEquities(prev, result.equities);
      });
      setLastCalculatedPhase(gameState.phase);
    }, 50);

    return () => clearTimeout(timeoutId);
  }, [gameState.isCalculating, gameState.seed, gameState.phase, gameState.hands, gameState.board, gameState.visibleBoardCount, gameState.visibleHoleCards]);

  // SETTLE 페이즈에서 정산 처리
  useEffect(() => {
    if (gameState.phase !== 'SETTLE') return;
    if (!roundBets || roundBets.settled || roundBets.bets.length === 0) return;

    const winnerIndices = gameState.winnerIndices || [];
    const isDeadHeat = winnerIndices.length > 1;

    const settlements: Settlement[] = roundBets.bets.map(bet => {
      const won = winnerIndices.includes(bet.handIndex);
      const deadHeatDivisor = isDeadHeat && won ? winnerIndices.length : 1;

      let payout = 0;
      let profit = 0;

      if (won) {
        const winnings = bet.stake * (bet.odds - 1);
        const adjustedWinnings = winnings / deadHeatDivisor;
        payout = bet.stake + adjustedWinnings;
        profit = adjustedWinnings;
      } else {
        payout = 0;
        profit = -bet.stake;
      }

      return {
        bet,
        won,
        isDeadHeat: isDeadHeat && won,
        deadHeatDivisor,
        payout,
        profit,
      };
    });

    // 당첨금 지급 (비동기 처리)
    const processSettlement = async () => {
      const totalPayout = settlements.reduce((sum, s) => sum + s.payout, 0);
      if (totalPayout > 0) {
        await updateBalance(totalPayout);
      }

      setRoundBets(prev => prev ? {
        ...prev,
        settled: true,
        settlements,
      } : null);
    };

    processSettlement();
  }, [gameState.phase, gameState.winnerIndices, roundBets, updateBalance]);

  // 베팅 핸들러
  const handlePlaceBet = useCallback(async (stake: number) => {
    if (selectedHand === null) return;

    // 로그인 확인
    if (!profile) {
      router.push(`/auth/login?from=${encodeURIComponent(pathname)}`);
      return;
    }

    if (profile.balance < stake) {
      alert('잔고가 부족합니다.');
      return;
    }

    // SETTLE 페이즈에서는 베팅 불가
    if (gameState.phase === 'SETTLE') {
      alert('정산 중에는 베팅할 수 없습니다.');
      return;
    }

    const result = await updateBalance(-stake);

    if (!result.success) {
      alert('베팅 처리 중 오류가 발생했습니다.');
      return;
    }

    // Get current odds
    const equity = gameState.equities?.[selectedHand];
    const odds = equity?.fairOdds ?? 4.0;

    const newBet: Bet = {
      handIndex: selectedHand,
      stake,
      odds,
      phase: gameState.phase,
    };

    setRoundBets(prev => {
      if (!prev || prev.roundNumber !== syncState.roundNumber) {
        return {
          roundNumber: syncState.roundNumber,
          bets: [newBet],
          settled: false,
          settlements: null,
        };
      }
      return {
        ...prev,
        bets: [...prev.bets, newBet],
      };
    });
  }, [selectedHand, gameState.phase, gameState.equities, syncState.roundNumber, profile, updateBalance, router, pathname]);

  // 베팅 취소
  const handleCancelBets = useCallback(async () => {
    if (!roundBets || roundBets.settled || roundBets.bets.length === 0) return;

    const totalStake = roundBets.bets.reduce((sum, bet) => sum + bet.stake, 0);
    if (totalStake > 0) {
      await updateBalance(totalStake);
    }

    setRoundBets(prev => prev ? {
      ...prev,
      bets: [],
    } : null);
  }, [roundBets, updateBalance]);

  const visibleBoard = getVisibleBoard(gameState);
  const canSelectHand = gameState.phase !== 'SETTLE';
  const currentPhaseIndex = PHASE_ORDER.indexOf(gameState.phase);
  const phaseProgress = ((currentPhaseIndex + 1) / PHASE_ORDER.length) * 100;
  const timeLeftSeconds = Math.ceil(syncState.timeLeftInPhase / 1000);

  return (
    <main style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '20px',
    }}>
      <GameTabs currentGame="holdem" />

      <header style={{ textAlign: 'center', marginBottom: '20px' }}>
        <h1 style={{
          fontSize: '28px',
          fontWeight: 'bold',
          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          marginBottom: '8px',
        }}>
          홀덤 익스체인지
        </h1>
        <p style={{ color: isConnected ? '#22c55e' : '#666', fontSize: '12px', marginTop: '4px' }}>
          {isConnected ? `온라인 (${playerCount || 1}명 접속)` : '로컬 모드'}
        </p>
      </header>

      {/* 타이머 및 진행 상황 표시 */}
      <div style={{
        width: '100%',
        maxWidth: '600px',
        marginBottom: '20px',
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '8px',
        }}>
          <span style={{ color: '#888', fontSize: '14px' }}>
            라운드 #{gameState.roundNumber} - {gameState.phase}
          </span>
          <span style={{
            color: isMounted && timeLeftSeconds <= 3 ? '#ef4444' : '#22c55e',
            fontSize: '18px',
            fontWeight: 'bold',
          }}>
            {isMounted ? `${timeLeftSeconds}초` : '---'}
          </span>
        </div>
        <div style={{
          height: '4px',
          background: '#333',
          borderRadius: '2px',
          overflow: 'hidden',
        }}>
          <div style={{
            height: '100%',
            width: `${phaseProgress}%`,
            background: 'linear-gradient(90deg, #10b981, #059669)',
            transition: 'width 0.3s ease',
          }} />
        </div>
      </div>

      <GameBalanceGuard requiredBalance={1}>
        <div style={{
          display: 'flex',
          gap: '24px',
          flexWrap: 'wrap',
          justifyContent: 'center',
          alignItems: 'flex-start',
          maxWidth: '1200px',
        }}>
          {/* 베팅 패널 */}
          <BettingPanel
            phase={gameState.phase}
            balance={profile?.balance ?? 0}
            isBalanceLoading={isAuthLoading || (!profile && isConfigured)}
            selectedHand={selectedHand}
            currentOdds={selectedHand !== null ? gameState.equities?.[selectedHand]?.fairOdds ?? null : null}
            bets={roundBets?.bets || []}
            settlements={roundBets?.settlements || null}
            onPlaceBet={handlePlaceBet}
            onCancelBets={handleCancelBets}
          />

          {/* 카드 영역 */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
          }}>
            <BoardDisplay
              board={gameState.board}
              visibleCount={gameState.visibleBoardCount}
            />

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '16px',
            }}>
              {gameState.hands.map((hand, i) => (
                <HandDisplay
                  key={i}
                  handIndex={i}
                  cards={hand}
                  visible={gameState.visibleHoleCards}
                  equity={gameState.equities?.[i] ?? null}
                  evaluatedHand={gameState.evaluatedHands?.[i] ?? null}
                  isWinner={gameState.winnerIndices?.includes(i) ?? false}
                  isSelected={selectedHand === i}
                  onSelect={() => canSelectHand && setSelectedHand(i)}
                  disabled={!canSelectHand}
                />
              ))}
            </div>
          </div>

          {/* 게임 컨트롤 (자동 모드 표시) */}
          <GameControls
            phase={gameState.phase}
            isCalculating={gameState.isCalculating}
            roundNumber={gameState.roundNumber}
            seed={gameState.seed}
            onAdvance={() => {}}
            onNewRound={() => {}}
            autoMode={true}
            timeLeft={syncState.timeLeftInPhase}
          />
        </div>
      </GameBalanceGuard>

      {/* 안내 섹션 */}
      <div style={{
        marginTop: '30px',
        maxWidth: '600px',
        textAlign: 'center',
        color: '#666',
        fontSize: '13px',
        lineHeight: '1.6',
      }}>
        <p>
          <strong>데드히트:</strong> 여러 핸드가 동점이면 당첨금이 균등 분배됩니다.
        </p>
      </div>
    </main>
  );
}
