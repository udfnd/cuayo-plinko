/**
 * Hold'em Exchange - Card Definitions
 *
 * Standard 52-card deck without jokers
 */

// Card suits
export const SUITS = ['s', 'h', 'd', 'c'] as const; // spades, hearts, diamonds, clubs
export type Suit = typeof SUITS[number];

// Card ranks (2-14, where 14 = Ace)
export const RANKS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14] as const;
export type Rank = typeof RANKS[number];

// Card representation
export interface Card {
  rank: Rank;
  suit: Suit;
}

// Human-readable rank names
export const RANK_NAMES: Record<Rank, string> = {
  2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8', 9: '9', 10: 'T',
  11: 'J', 12: 'Q', 13: 'K', 14: 'A',
};

// Human-readable suit symbols
export const SUIT_SYMBOLS: Record<Suit, string> = {
  s: '♠', h: '♥', d: '♦', c: '♣',
};

// Suit colors for UI
export const SUIT_COLORS: Record<Suit, string> = {
  s: '#000', h: '#e74c3c', d: '#3498db', c: '#27ae60',
};

/**
 * Create a card from rank and suit
 */
export function createCard(rank: Rank, suit: Suit): Card {
  return { rank, suit };
}

/**
 * Convert card to string representation (e.g., "As" for Ace of Spades)
 */
export function cardToString(card: Card): string {
  return `${RANK_NAMES[card.rank]}${card.suit}`;
}

/**
 * Convert card to display string (e.g., "A♠")
 */
export function cardToDisplay(card: Card): string {
  return `${RANK_NAMES[card.rank]}${SUIT_SYMBOLS[card.suit]}`;
}

/**
 * Parse string to card (e.g., "As" -> Ace of Spades)
 */
export function parseCard(str: string): Card | null {
  if (str.length < 2) return null;

  const rankStr = str.slice(0, -1).toUpperCase();
  const suitStr = str.slice(-1).toLowerCase() as Suit;

  if (!SUITS.includes(suitStr)) return null;

  let rank: Rank | null = null;
  for (const [r, name] of Object.entries(RANK_NAMES)) {
    if (name === rankStr || name === rankStr.toUpperCase()) {
      rank = parseInt(r) as Rank;
      break;
    }
  }
  // Handle numeric ranks
  if (!rank && !isNaN(parseInt(rankStr))) {
    const numRank = parseInt(rankStr);
    if (numRank >= 2 && numRank <= 10) {
      rank = numRank as Rank;
    }
  }

  if (!rank) return null;
  return createCard(rank, suitStr);
}

/**
 * Compare two cards (for sorting)
 */
export function compareCards(a: Card, b: Card): number {
  if (a.rank !== b.rank) return b.rank - a.rank; // Higher rank first
  return SUITS.indexOf(a.suit) - SUITS.indexOf(b.suit);
}

/**
 * Check if two cards are equal
 */
export function cardsEqual(a: Card, b: Card): boolean {
  return a.rank === b.rank && a.suit === b.suit;
}

/**
 * Generate a unique numeric ID for a card (0-51)
 */
export function cardToId(card: Card): number {
  const rankIndex = RANKS.indexOf(card.rank);
  const suitIndex = SUITS.indexOf(card.suit);
  return rankIndex * 4 + suitIndex;
}

/**
 * Convert numeric ID back to card
 */
export function idToCard(id: number): Card {
  const rankIndex = Math.floor(id / 4);
  const suitIndex = id % 4;
  return createCard(RANKS[rankIndex], SUITS[suitIndex]);
}
