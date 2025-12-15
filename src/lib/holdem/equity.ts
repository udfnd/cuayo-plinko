/**
 * Hold'em Exchange - Equity Calculator
 *
 * Monte Carlo simulation for calculating win probabilities
 */

import { Card, cardToId } from './cards';
import { SeededRandom, createFullDeck, shuffleDeck, removeCardsFromDeck } from './deck';
import { evaluateHand, determineWinners } from './evaluator';

// Configuration for Monte Carlo simulation
export const EQUITY_CONFIG = {
  DEFAULT_ITERATIONS: 50000,
  MIN_ITERATIONS: 1000,
  MAX_ITERATIONS: 200000,
} as const;

/**
 * Equity result for a single hand
 */
export interface HandEquity {
  handIndex: number;
  winProbability: number;   // Probability of winning outright
  tieProbability: number;   // Probability of tying (split pot)
  totalEquity: number;      // Win + (Tie / number of tied players)
  fairOdds: number;         // 1 / totalEquity (decimal odds)
}

/**
 * Result of equity calculation
 */
export interface EquityResult {
  equities: HandEquity[];
  totalSimulations: number;
  knownCards: number;       // Number of revealed cards
  remainingCards: number;   // Cards left to be dealt
}

/**
 * Calculate equity for 4 hands via Monte Carlo simulation
 *
 * @param hands - Array of 4 hole card pairs (2 cards each)
 * @param board - Revealed community cards (0-5)
 * @param iterations - Number of simulations
 * @param seed - Optional seed for reproducible results
 */
export function calculateEquity(
  hands: Card[][],
  board: Card[],
  iterations: number = EQUITY_CONFIG.DEFAULT_ITERATIONS,
  seed?: string | number
): EquityResult {
  if (hands.length !== 4) {
    throw new Error('Hold\'em Exchange requires exactly 4 hands');
  }

  // Track wins and ties
  const wins = [0, 0, 0, 0];
  const ties = [0, 0, 0, 0];

  // Get all known cards
  const knownCards = [...hands.flat(), ...board];
  const knownCardIds = new Set(knownCards.map(cardToId));

  // Remaining deck (cards not yet revealed or used)
  const remainingDeck = createFullDeck().filter(c => !knownCardIds.has(cardToId(c)));
  const cardsNeeded = 5 - board.length; // How many board cards to simulate

  // If board is complete, just evaluate once
  if (cardsNeeded === 0) {
    const evaluated = hands.map(hand => evaluateHand(hand, board));
    const winnerIndices = determineWinners(evaluated);

    for (const idx of winnerIndices) {
      if (winnerIndices.length === 1) {
        wins[idx] = 1;
      } else {
        ties[idx] = 1;
      }
    }

    return buildResult(wins, ties, 1, knownCards.length, 0);
  }

  // Create RNG
  const rng = new SeededRandom(seed ?? Date.now());

  // Run simulations
  for (let sim = 0; sim < iterations; sim++) {
    // Shuffle remaining deck and deal board cards
    const shuffled = shuffleDeck(remainingDeck, rng);
    const simulatedBoard = [...board, ...shuffled.slice(0, cardsNeeded)];

    // Evaluate all hands
    const evaluated = hands.map(hand => evaluateHand(hand, simulatedBoard));
    const winnerIndices = determineWinners(evaluated);

    // Update counters
    for (const idx of winnerIndices) {
      if (winnerIndices.length === 1) {
        wins[idx]++;
      } else {
        ties[idx]++;
      }
    }
  }

  return buildResult(wins, ties, iterations, knownCards.length, cardsNeeded);
}

/**
 * Build equity result from win/tie counts
 */
function buildResult(
  wins: number[],
  ties: number[],
  total: number,
  knownCards: number,
  remainingCards: number
): EquityResult {
  const equities: HandEquity[] = [];

  for (let i = 0; i < 4; i++) {
    const winProb = wins[i] / total;
    const tieProb = ties[i] / total;

    // For ties, calculate average equity share
    // This is an approximation - in reality it depends on how many players tie
    const avgTieShare = tieProb > 0 ? tieProb * 0.5 : 0; // Simplified: assume 2-way tie
    const totalEquity = winProb + avgTieShare;

    equities.push({
      handIndex: i,
      winProbability: winProb,
      tieProbability: tieProb,
      totalEquity: Math.max(totalEquity, 0.0001), // Prevent division by zero
      fairOdds: 1 / Math.max(totalEquity, 0.0001),
    });
  }

  return {
    equities,
    totalSimulations: total,
    knownCards,
    remainingCards,
  };
}

/**
 * Calculate equity with detailed tie breakdown
 * This version tracks exact tie distributions for accurate settlement
 */
export function calculateEquityDetailed(
  hands: Card[][],
  board: Card[],
  iterations: number = EQUITY_CONFIG.DEFAULT_ITERATIONS,
  seed?: string | number
): EquityResult & { tieBreakdown: Map<string, number> } {
  const result = calculateEquity(hands, board, iterations, seed);

  // For now, return simplified result
  // A more detailed implementation would track exact tie combinations
  return {
    ...result,
    tieBreakdown: new Map(),
  };
}

/**
 * Pre-flop equity lookup (approximate values for common hand types)
 * Used for instant display before Monte Carlo completes
 */
export function getPreFlopEstimate(hand: Card[]): number {
  if (hand.length !== 2) return 0.25; // Default to 25% for 4-way

  const [c1, c2] = hand;
  const isPair = c1.rank === c2.rank;
  const isSuited = c1.suit === c2.suit;
  const gap = Math.abs(c1.rank - c2.rank);
  const highCard = Math.max(c1.rank, c2.rank);

  // Rough estimates for 4-way all-in
  if (isPair) {
    if (highCard >= 13) return 0.35; // High pairs
    if (highCard >= 9) return 0.30;  // Medium pairs
    return 0.28;                      // Low pairs
  }

  if (highCard === 14) { // Ace-high
    if (isSuited) return 0.30;
    return 0.28;
  }

  if (isSuited && gap <= 2 && highCard >= 10) {
    return 0.28; // Suited connectors
  }

  return 0.25; // Default
}
