/**
 * Hold'em Exchange - Game State Machine
 *
 * Manages game flow: PRE_DEAL → PRE_FLOP → FLOP → TURN → RIVER → SETTLE
 */

import { Card } from './cards';
import { dealHoldemExchange, DealtHand } from './deck';
import { evaluateHand, determineWinners, EvaluatedHand } from './evaluator';
import { calculateEquity, HandEquity } from './equity';

// Game phases
export type GamePhase =
  | 'PRE_DEAL'    // Before any cards revealed
  | 'PRE_FLOP'    // Hole cards revealed, no board
  | 'FLOP'        // 3 board cards revealed
  | 'TURN'        // 4 board cards revealed
  | 'RIVER'       // 5 board cards revealed
  | 'SETTLE';     // Results calculated, round complete

export const PHASE_ORDER: GamePhase[] = [
  'PRE_DEAL', 'PRE_FLOP', 'FLOP', 'TURN', 'RIVER', 'SETTLE'
];

// Bet on a hand
export interface Bet {
  handIndex: number;       // Which hand (0-3)
  stake: number;           // Amount bet
  odds: number;            // Odds at time of bet
  phase: GamePhase;        // Phase when bet was placed
}

// Settlement result
export interface Settlement {
  bet: Bet;
  won: boolean;
  isDeadHeat: boolean;     // Multiple winners
  deadHeatDivisor: number; // How many winners in dead heat
  payout: number;          // Total return (including stake if won)
  profit: number;          // Payout - stake
}

// Game state
export interface HoldemGameState {
  phase: GamePhase;
  seed: string;

  // Cards (all dealt upfront, revealed progressively)
  hands: [Card[], Card[], Card[], Card[]];
  board: Card[];

  // What's visible at current phase
  visibleHoleCards: boolean;
  visibleBoardCount: number;

  // Equity (recalculated each phase)
  equities: HandEquity[] | null;
  isCalculating: boolean;

  // Betting
  bets: Bet[];
  balance: number;

  // Results (only available at SETTLE)
  evaluatedHands: EvaluatedHand[] | null;
  winnerIndices: number[] | null;
  settlements: Settlement[] | null;

  // Round tracking
  roundNumber: number;
  totalProfit: number;
}

/**
 * Create default equities for PRE_DEAL (25% each)
 */
function createPreDealEquities(): HandEquity[] {
  return [0, 1, 2, 3].map((handIndex) => ({
    handIndex,
    winProbability: 0.25,
    tieProbability: 0,
    totalEquity: 0.25,
    fairOdds: 4.0,
  }));
}

/**
 * Create initial game state
 */
export function createInitialState(initialBalance: number = 1000): HoldemGameState {
  const dealt = dealHoldemExchange(Date.now());

  return {
    phase: 'PRE_DEAL',
    seed: dealt.seed,
    hands: dealt.hands as [Card[], Card[], Card[], Card[]],
    board: dealt.board,
    visibleHoleCards: false,
    visibleBoardCount: 0,
    equities: createPreDealEquities(), // 25% each at PRE_DEAL
    isCalculating: false,
    bets: [],
    balance: initialBalance,
    evaluatedHands: null,
    winnerIndices: null,
    settlements: null,
    roundNumber: 1,
    totalProfit: 0,
  };
}

/**
 * Start a new round with optional seed
 */
export function startNewRound(state: HoldemGameState, seed?: string): HoldemGameState {
  const dealt = dealHoldemExchange(seed ?? Date.now());

  return {
    ...state,
    phase: 'PRE_DEAL',
    seed: dealt.seed,
    hands: dealt.hands as [Card[], Card[], Card[], Card[]],
    board: dealt.board,
    visibleHoleCards: false,
    visibleBoardCount: 0,
    equities: createPreDealEquities(), // 25% each at PRE_DEAL
    isCalculating: false,
    bets: [],
    evaluatedHands: null,
    winnerIndices: null,
    settlements: null,
    roundNumber: state.roundNumber + 1,
  };
}

/**
 * Advance to next phase
 */
export function advancePhase(state: HoldemGameState): HoldemGameState {
  const currentIndex = PHASE_ORDER.indexOf(state.phase);
  if (currentIndex >= PHASE_ORDER.length - 1) {
    return state; // Already at SETTLE
  }

  const nextPhase = PHASE_ORDER[currentIndex + 1];

  let visibleHoleCards = state.visibleHoleCards;
  let visibleBoardCount = state.visibleBoardCount;

  switch (nextPhase) {
    case 'PRE_FLOP':
      visibleHoleCards = true;
      break;
    case 'FLOP':
      visibleBoardCount = 3;
      break;
    case 'TURN':
      visibleBoardCount = 4;
      break;
    case 'RIVER':
    case 'SETTLE':
      visibleBoardCount = 5;
      break;
  }

  const newState: HoldemGameState = {
    ...state,
    phase: nextPhase,
    visibleHoleCards,
    visibleBoardCount,
    equities: null, // Will be recalculated
    isCalculating: nextPhase !== 'PRE_DEAL' && nextPhase !== 'SETTLE',
  };

  // At SETTLE phase, evaluate final hands
  if (nextPhase === 'SETTLE') {
    return settleRound(newState);
  }

  return newState;
}

/**
 * Update equities after calculation
 */
export function updateEquities(state: HoldemGameState, equities: HandEquity[]): HoldemGameState {
  return {
    ...state,
    equities,
    isCalculating: false,
  };
}

/**
 * Place a bet on a hand
 */
export function placeBet(
  state: HoldemGameState,
  handIndex: number,
  stake: number
): HoldemGameState {
  if (stake <= 0 || stake > state.balance) {
    return state;
  }
  if (handIndex < 0 || handIndex > 3) {
    return state;
  }
  if (state.phase === 'SETTLE') {
    return state;
  }

  // Get current odds
  const equity = state.equities?.[handIndex];
  const odds = equity?.fairOdds ?? 4.0; // Default to 4.0 (25% equity)

  const bet: Bet = {
    handIndex,
    stake,
    odds,
    phase: state.phase,
  };

  return {
    ...state,
    bets: [...state.bets, bet],
    balance: state.balance - stake,
  };
}

/**
 * Cancel all bets (before settlement)
 */
export function cancelBets(state: HoldemGameState): HoldemGameState {
  if (state.phase === 'SETTLE') {
    return state;
  }

  const totalStake = state.bets.reduce((sum, bet) => sum + bet.stake, 0);

  return {
    ...state,
    bets: [],
    balance: state.balance + totalStake,
  };
}

/**
 * Settle the round and calculate payouts
 */
function settleRound(state: HoldemGameState): HoldemGameState {
  // Evaluate all hands
  const evaluatedHands = state.hands.map(hand =>
    evaluateHand(hand, state.board)
  );

  // Determine winners
  const winnerIndices = determineWinners(evaluatedHands);
  const isDeadHeat = winnerIndices.length > 1;

  // Calculate settlements
  const settlements: Settlement[] = state.bets.map(bet => {
    const won = winnerIndices.includes(bet.handIndex);
    const deadHeatDivisor = isDeadHeat && won ? winnerIndices.length : 1;

    let payout = 0;
    let profit = 0;

    if (won) {
      // Dead heat rule: winnings divided by number of winners
      // Stake is returned in full, winnings are divided
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

  // Calculate final equities for display
  const finalEquities = calculateEquity(state.hands, state.board, 1);

  // Update balance with payouts
  const totalPayout = settlements.reduce((sum, s) => sum + s.payout, 0);
  const totalProfit = settlements.reduce((sum, s) => sum + s.profit, 0);

  return {
    ...state,
    phase: 'SETTLE',
    evaluatedHands,
    winnerIndices,
    settlements,
    equities: finalEquities.equities,
    isCalculating: false,
    balance: state.balance + totalPayout,
    totalProfit: state.totalProfit + totalProfit,
  };
}

/**
 * Get visible board cards for current phase
 */
export function getVisibleBoard(state: HoldemGameState): Card[] {
  return state.board.slice(0, state.visibleBoardCount);
}

/**
 * Get phase display name
 */
export function getPhaseDisplayName(phase: GamePhase): string {
  const names: Record<GamePhase, string> = {
    'PRE_DEAL': '프리딜',
    'PRE_FLOP': '프리플롭',
    'FLOP': '플롭',
    'TURN': '턴',
    'RIVER': '리버',
    'SETTLE': '정산',
  };
  return names[phase];
}

/**
 * Check if betting is allowed in current phase
 */
export function canBet(state: HoldemGameState): boolean {
  // PRE_DEAL betting allowed (blind bet at 25% odds)
  return state.phase !== 'SETTLE';
}

/**
 * Create game state from seed and phase index (for server-synced mode)
 */
export function createStateFromSeed(
  seed: string,
  phaseIndex: number,
  roundNumber: number
): HoldemGameState {
  const dealt = dealHoldemExchange(seed);
  const phase = PHASE_ORDER[Math.min(phaseIndex, PHASE_ORDER.length - 1)];

  let visibleHoleCards = false;
  let visibleBoardCount = 0;

  switch (phase) {
    case 'PRE_FLOP':
      visibleHoleCards = true;
      break;
    case 'FLOP':
      visibleHoleCards = true;
      visibleBoardCount = 3;
      break;
    case 'TURN':
      visibleHoleCards = true;
      visibleBoardCount = 4;
      break;
    case 'RIVER':
    case 'SETTLE':
      visibleHoleCards = true;
      visibleBoardCount = 5;
      break;
  }

  const state: HoldemGameState = {
    phase,
    seed,
    hands: dealt.hands as [Card[], Card[], Card[], Card[]],
    board: dealt.board,
    visibleHoleCards,
    visibleBoardCount,
    equities: phase === 'PRE_DEAL' ? createPreDealEquities() : null,
    isCalculating: phase !== 'PRE_DEAL' && phase !== 'SETTLE',
    bets: [],
    balance: 0, // Managed externally
    evaluatedHands: null,
    winnerIndices: null,
    settlements: null,
    roundNumber,
    totalProfit: 0,
  };

  // At SETTLE phase, evaluate final hands
  if (phase === 'SETTLE') {
    const evaluatedHands = state.hands.map(hand =>
      evaluateHand(hand, state.board)
    );
    const winnerIndices = determineWinners(evaluatedHands);
    const finalEquities = calculateEquity(state.hands, state.board, 1);

    return {
      ...state,
      evaluatedHands,
      winnerIndices,
      equities: finalEquities.equities,
      isCalculating: false,
    };
  }

  return state;
}

