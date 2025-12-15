/**
 * Hold'em Exchange - Deck Management
 *
 * Seeded random deck for reproducible results
 */

import { Card, RANKS, SUITS, createCard, cardToId } from './cards';

/**
 * Simple seeded PRNG (xorshift32)
 */
export class SeededRandom {
  private state: number;

  constructor(seed: string | number) {
    // Convert string seed to number via simple hash
    if (typeof seed === 'string') {
      let hash = 0;
      for (let i = 0; i < seed.length; i++) {
        hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
      }
      this.state = hash || 1;
    } else {
      this.state = seed || 1;
    }
    // Warm up
    for (let i = 0; i < 10; i++) this.next();
  }

  /**
   * Get next random number [0, 1)
   */
  next(): number {
    let x = this.state;
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    this.state = x;
    return (x >>> 0) / 0xFFFFFFFF;
  }

  /**
   * Get random integer [min, max]
   */
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  /**
   * Clone current state
   */
  clone(): SeededRandom {
    const cloned = new SeededRandom(1);
    cloned.state = this.state;
    return cloned;
  }
}

/**
 * Create a full 52-card deck
 */
export function createFullDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push(createCard(rank, suit));
    }
  }
  return deck;
}

/**
 * Fisher-Yates shuffle with seeded random
 */
export function shuffleDeck(deck: Card[], rng: SeededRandom): Card[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = rng.nextInt(0, i);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Remove specific cards from deck
 */
export function removeCardsFromDeck(deck: Card[], cardsToRemove: Card[]): Card[] {
  const removeIds = new Set(cardsToRemove.map(cardToId));
  return deck.filter(card => !removeIds.has(cardToId(card)));
}

/**
 * Deal cards from deck
 */
export function dealCards(deck: Card[], count: number): { dealt: Card[]; remaining: Card[] } {
  return {
    dealt: deck.slice(0, count),
    remaining: deck.slice(count),
  };
}

/**
 * Deck manager for Hold'em Exchange game
 */
export class HoldemDeck {
  private deck: Card[];
  private rng: SeededRandom;

  constructor(seed: string | number = Date.now()) {
    this.rng = new SeededRandom(seed);
    this.deck = shuffleDeck(createFullDeck(), this.rng);
  }

  /**
   * Deal a specific number of cards
   */
  deal(count: number): Card[] {
    const { dealt, remaining } = dealCards(this.deck, count);
    this.deck = remaining;
    return dealt;
  }

  /**
   * Get remaining deck size
   */
  get remaining(): number {
    return this.deck.length;
  }

  /**
   * Get remaining deck (for Monte Carlo simulation)
   */
  getRemainingDeck(): Card[] {
    return [...this.deck];
  }

  /**
   * Clone deck state
   */
  clone(): HoldemDeck {
    const cloned = new HoldemDeck(1);
    cloned.deck = [...this.deck];
    cloned.rng = this.rng.clone();
    return cloned;
  }
}

/**
 * Deal a complete Hold'em Exchange hand
 * Returns 4 hole card pairs + 5 board cards (13 total)
 */
export interface DealtHand {
  hands: [Card[], Card[], Card[], Card[]]; // 4 hands, each with 2 hole cards
  board: Card[]; // 5 community cards
  seed: string;
}

export function dealHoldemExchange(seed: string | number = Date.now()): DealtHand {
  const seedStr = String(seed);
  const deck = new HoldemDeck(seedStr);

  return {
    hands: [
      deck.deal(2),
      deck.deal(2),
      deck.deal(2),
      deck.deal(2),
    ],
    board: deck.deal(5),
    seed: seedStr,
  };
}
