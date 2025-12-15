/**
 * Hold'em Exchange - Hand Evaluator
 *
 * Evaluates poker hands and compares them
 */

import { Card, Rank, Suit, compareCards } from './cards';

// Hand rankings (higher = better)
export enum HandRank {
  HIGH_CARD = 1,
  PAIR = 2,
  TWO_PAIR = 3,
  THREE_OF_A_KIND = 4,
  STRAIGHT = 5,
  FLUSH = 6,
  FULL_HOUSE = 7,
  FOUR_OF_A_KIND = 8,
  STRAIGHT_FLUSH = 9,
  ROYAL_FLUSH = 10,
}

export const HAND_RANK_NAMES: Record<HandRank, string> = {
  [HandRank.HIGH_CARD]: 'High Card',
  [HandRank.PAIR]: 'Pair',
  [HandRank.TWO_PAIR]: 'Two Pair',
  [HandRank.THREE_OF_A_KIND]: 'Three of a Kind',
  [HandRank.STRAIGHT]: 'Straight',
  [HandRank.FLUSH]: 'Flush',
  [HandRank.FULL_HOUSE]: 'Full House',
  [HandRank.FOUR_OF_A_KIND]: 'Four of a Kind',
  [HandRank.STRAIGHT_FLUSH]: 'Straight Flush',
  [HandRank.ROYAL_FLUSH]: 'Royal Flush',
};

// Evaluated hand result
export interface EvaluatedHand {
  rank: HandRank;
  rankName: string;
  kickers: Rank[]; // For tiebreaking (highest first)
  score: number; // Numeric score for easy comparison
}

/**
 * Get rank counts from cards
 */
function getRankCounts(cards: Card[]): Map<Rank, number> {
  const counts = new Map<Rank, number>();
  for (const card of cards) {
    counts.set(card.rank, (counts.get(card.rank) || 0) + 1);
  }
  return counts;
}

/**
 * Get suit counts from cards
 */
function getSuitCounts(cards: Card[]): Map<Suit, Card[]> {
  const suits = new Map<Suit, Card[]>();
  for (const card of cards) {
    if (!suits.has(card.suit)) suits.set(card.suit, []);
    suits.get(card.suit)!.push(card);
  }
  return suits;
}

/**
 * Check for straight (returns highest card rank or null)
 */
function findStraight(ranks: Rank[]): Rank | null {
  const uniqueRanks = [...new Set(ranks)].sort((a, b) => b - a);

  // Check for A-2-3-4-5 (wheel)
  if (uniqueRanks.includes(14) && uniqueRanks.includes(2) &&
      uniqueRanks.includes(3) && uniqueRanks.includes(4) && uniqueRanks.includes(5)) {
    return 5; // 5-high straight
  }

  // Check for regular straights
  for (let i = 0; i <= uniqueRanks.length - 5; i++) {
    let isStraight = true;
    for (let j = 0; j < 4; j++) {
      if (uniqueRanks[i + j] - uniqueRanks[i + j + 1] !== 1) {
        isStraight = false;
        break;
      }
    }
    if (isStraight) return uniqueRanks[i];
  }

  return null;
}

/**
 * Find flush cards (5+ cards of same suit)
 */
function findFlush(cards: Card[]): Card[] | null {
  const suits = getSuitCounts(cards);
  for (const [, suitCards] of suits) {
    if (suitCards.length >= 5) {
      return suitCards.sort(compareCards).slice(0, 5);
    }
  }
  return null;
}

/**
 * Calculate numeric score for hand comparison
 * Score format: RRKKKKK where R = hand rank, K = kickers
 */
function calculateScore(rank: HandRank, kickers: Rank[]): number {
  let score = rank * 10000000000;
  for (let i = 0; i < kickers.length && i < 5; i++) {
    score += kickers[i] * Math.pow(15, 4 - i);
  }
  return score;
}

/**
 * Evaluate best 5-card hand from 7 cards (2 hole + 5 board)
 */
export function evaluateHand(holeCards: Card[], boardCards: Card[]): EvaluatedHand {
  const allCards = [...holeCards, ...boardCards];
  if (allCards.length < 5) {
    throw new Error('Need at least 5 cards to evaluate');
  }

  const sorted = [...allCards].sort(compareCards);
  const rankCounts = getRankCounts(sorted);

  // Group by count
  const quads: Rank[] = [];
  const trips: Rank[] = [];
  const pairs: Rank[] = [];
  const singles: Rank[] = [];

  for (const [rank, count] of rankCounts) {
    if (count === 4) quads.push(rank);
    else if (count === 3) trips.push(rank);
    else if (count === 2) pairs.push(rank);
    else singles.push(rank);
  }

  quads.sort((a, b) => b - a);
  trips.sort((a, b) => b - a);
  pairs.sort((a, b) => b - a);
  singles.sort((a, b) => b - a);

  // Check for flush
  const flushCards = findFlush(sorted);
  const hasFlush = flushCards !== null;

  // Check for straight
  const ranks = sorted.map(c => c.rank);
  const straightHigh = findStraight(ranks);
  const hasStraight = straightHigh !== null;

  // Check for straight flush
  if (hasFlush) {
    const flushRanks = flushCards!.map(c => c.rank);
    const sfHigh = findStraight(flushRanks);
    if (sfHigh !== null) {
      const isRoyal = sfHigh === 14;
      return {
        rank: isRoyal ? HandRank.ROYAL_FLUSH : HandRank.STRAIGHT_FLUSH,
        rankName: isRoyal ? HAND_RANK_NAMES[HandRank.ROYAL_FLUSH] : HAND_RANK_NAMES[HandRank.STRAIGHT_FLUSH],
        kickers: [sfHigh],
        score: calculateScore(isRoyal ? HandRank.ROYAL_FLUSH : HandRank.STRAIGHT_FLUSH, [sfHigh]),
      };
    }
  }

  // Four of a kind
  if (quads.length > 0) {
    const kicker = [...trips, ...pairs, ...singles].sort((a, b) => b - a)[0];
    return {
      rank: HandRank.FOUR_OF_A_KIND,
      rankName: HAND_RANK_NAMES[HandRank.FOUR_OF_A_KIND],
      kickers: [quads[0], kicker],
      score: calculateScore(HandRank.FOUR_OF_A_KIND, [quads[0], kicker]),
    };
  }

  // Full house
  if (trips.length > 0 && (trips.length > 1 || pairs.length > 0)) {
    const tripRank = trips[0];
    const pairRank = trips.length > 1 ? trips[1] : pairs[0];
    return {
      rank: HandRank.FULL_HOUSE,
      rankName: HAND_RANK_NAMES[HandRank.FULL_HOUSE],
      kickers: [tripRank, pairRank],
      score: calculateScore(HandRank.FULL_HOUSE, [tripRank, pairRank]),
    };
  }

  // Flush
  if (hasFlush) {
    const kickers = flushCards!.map(c => c.rank);
    return {
      rank: HandRank.FLUSH,
      rankName: HAND_RANK_NAMES[HandRank.FLUSH],
      kickers,
      score: calculateScore(HandRank.FLUSH, kickers),
    };
  }

  // Straight
  if (hasStraight) {
    return {
      rank: HandRank.STRAIGHT,
      rankName: HAND_RANK_NAMES[HandRank.STRAIGHT],
      kickers: [straightHigh!],
      score: calculateScore(HandRank.STRAIGHT, [straightHigh!]),
    };
  }

  // Three of a kind
  if (trips.length > 0) {
    const kickers = [trips[0], ...singles.slice(0, 2)];
    return {
      rank: HandRank.THREE_OF_A_KIND,
      rankName: HAND_RANK_NAMES[HandRank.THREE_OF_A_KIND],
      kickers,
      score: calculateScore(HandRank.THREE_OF_A_KIND, kickers),
    };
  }

  // Two pair
  if (pairs.length >= 2) {
    const kicker = pairs.length > 2 ? pairs[2] : singles[0];
    const kickers = [pairs[0], pairs[1], kicker];
    return {
      rank: HandRank.TWO_PAIR,
      rankName: HAND_RANK_NAMES[HandRank.TWO_PAIR],
      kickers,
      score: calculateScore(HandRank.TWO_PAIR, kickers),
    };
  }

  // One pair
  if (pairs.length === 1) {
    const kickers = [pairs[0], ...singles.slice(0, 3)];
    return {
      rank: HandRank.PAIR,
      rankName: HAND_RANK_NAMES[HandRank.PAIR],
      kickers,
      score: calculateScore(HandRank.PAIR, kickers),
    };
  }

  // High card
  const kickers = singles.slice(0, 5);
  return {
    rank: HandRank.HIGH_CARD,
    rankName: HAND_RANK_NAMES[HandRank.HIGH_CARD],
    kickers,
    score: calculateScore(HandRank.HIGH_CARD, kickers),
  };
}

/**
 * Compare two evaluated hands
 * Returns: 1 if a wins, -1 if b wins, 0 if tie
 */
export function compareHands(a: EvaluatedHand, b: EvaluatedHand): number {
  if (a.score > b.score) return 1;
  if (a.score < b.score) return -1;
  return 0;
}

/**
 * Determine winners from multiple hands
 * Returns array of winner indices (multiple if tie)
 */
export function determineWinners(hands: EvaluatedHand[]): number[] {
  if (hands.length === 0) return [];

  let maxScore = hands[0].score;
  let winners = [0];

  for (let i = 1; i < hands.length; i++) {
    if (hands[i].score > maxScore) {
      maxScore = hands[i].score;
      winners = [i];
    } else if (hands[i].score === maxScore) {
      winners.push(i);
    }
  }

  return winners;
}
