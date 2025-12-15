'use client';

import { useState, useEffect, useCallback } from 'react';
import GameTabs from '@/components/GameTabs';
import HandDisplay from '@/components/holdem/HandDisplay';
import BoardDisplay from '@/components/holdem/BoardDisplay';
import BettingPanel from '@/components/holdem/BettingPanel';
import GameControls from '@/components/holdem/GameControls';
import {
  createInitialState,
  startNewRound,
  advancePhase,
  updateEquities,
  placeBet,
  cancelBets,
  getVisibleBoard,
  calculateEquity,
  EQUITY_CONFIG,
  type HoldemGameState,
} from '@/lib/holdem';

export default function HoldemPage() {
  const [gameState, setGameState] = useState<HoldemGameState | null>(null);
  const [selectedHand, setSelectedHand] = useState<number | null>(null);

  // Initialize game
  useEffect(() => {
    setGameState(createInitialState(1000));
  }, []);

  // Calculate equity when phase changes
  useEffect(() => {
    if (!gameState || !gameState.isCalculating) return;

    const { hands, board, visibleBoardCount, visibleHoleCards } = gameState;

    // Only calculate if hole cards are visible
    if (!visibleHoleCards) {
      setGameState(prev => prev ? { ...prev, isCalculating: false } : null);
      return;
    }

    // Run Monte Carlo in a timeout to prevent UI freeze
    const timeoutId = setTimeout(() => {
      const visibleBoard = board.slice(0, visibleBoardCount);
      const result = calculateEquity(
        hands,
        visibleBoard,
        EQUITY_CONFIG.DEFAULT_ITERATIONS,
        gameState.seed
      );

      setGameState(prev => prev ? updateEquities(prev, result.equities) : null);
    }, 50);

    return () => clearTimeout(timeoutId);
  }, [gameState?.phase, gameState?.isCalculating]);

  // Handle phase advance
  const handleAdvance = useCallback(() => {
    setGameState(prev => prev ? advancePhase(prev) : null);
  }, []);

  // Handle new round
  const handleNewRound = useCallback((seed?: string) => {
    setSelectedHand(null);
    setGameState(prev => prev ? startNewRound(prev, seed) : null);
  }, []);

  // Handle bet placement
  const handlePlaceBet = useCallback((stake: number) => {
    if (selectedHand === null) return;
    setGameState(prev => prev ? placeBet(prev, selectedHand, stake) : null);
  }, [selectedHand]);

  // Handle bet cancellation
  const handleCancelBets = useCallback(() => {
    setGameState(prev => prev ? cancelBets(prev) : null);
  }, []);

  if (!gameState) {
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

  const visibleBoard = getVisibleBoard(gameState);
  const canSelectHand = gameState.phase !== 'SETTLE'; // PRE_DEAL betting allowed (blind bet)

  return (
    <main style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '20px',
    }}>
      <GameTabs currentGame="holdem" />

      <header style={{
        textAlign: 'center',
        marginBottom: '20px',
      }}>
        <h1 style={{
          fontSize: '28px',
          fontWeight: 'bold',
          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          marginBottom: '8px',
        }}>
          Hold&apos;em Exchange
        </h1>
        <p style={{
          color: '#666',
          fontSize: '14px',
        }}>
          Educational demo only - Not a gambling service
        </p>
      </header>

      {/* Main game area */}
      <div style={{
        display: 'flex',
        gap: '24px',
        flexWrap: 'wrap',
        justifyContent: 'center',
        alignItems: 'flex-start',
        maxWidth: '1200px',
      }}>
        {/* Left column - Betting */}
        <BettingPanel
          phase={gameState.phase}
          balance={gameState.balance}
          selectedHand={selectedHand}
          currentOdds={selectedHand !== null ? gameState.equities?.[selectedHand]?.fairOdds ?? null : null}
          bets={gameState.bets}
          settlements={gameState.settlements}
          onPlaceBet={handlePlaceBet}
          onCancelBets={handleCancelBets}
        />

        {/* Center column - Cards */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
        }}>
          {/* Board */}
          <BoardDisplay
            board={gameState.board}
            visibleCount={gameState.visibleBoardCount}
          />

          {/* Hands grid */}
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

        {/* Right column - Controls */}
        <GameControls
          phase={gameState.phase}
          isCalculating={gameState.isCalculating}
          roundNumber={gameState.roundNumber}
          seed={gameState.seed}
          onAdvance={handleAdvance}
          onNewRound={handleNewRound}
        />
      </div>

      {/* Info section */}
      <div style={{
        marginTop: '30px',
        maxWidth: '600px',
        textAlign: 'center',
        color: '#666',
        fontSize: '13px',
        lineHeight: '1.6',
      }}>
        <p>
          <strong>How to play:</strong> Click &quot;Deal&quot; to reveal cards through each street.
          Select a hand and place a bet at the current fair odds.
          If your hand wins, you&apos;re paid at the locked-in odds.
        </p>
        <p style={{ marginTop: '8px' }}>
          <strong>Dead Heat:</strong> If multiple hands tie, winnings are divided equally among winners.
        </p>
      </div>

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
