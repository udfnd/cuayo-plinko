/**
 * Hold'em Exchange - Main Exports
 */

// Card types and utilities
export {
  type Card,
  type Rank,
  type Suit,
  SUITS,
  RANKS,
  RANK_NAMES,
  SUIT_SYMBOLS,
  SUIT_COLORS,
  createCard,
  cardToString,
  cardToDisplay,
  parseCard,
  compareCards,
  cardsEqual,
  cardToId,
  idToCard,
} from './cards';

// Deck management
export {
  SeededRandom,
  HoldemDeck,
  createFullDeck,
  shuffleDeck,
  removeCardsFromDeck,
  dealCards,
  dealHoldemExchange,
  type DealtHand,
} from './deck';

// Hand evaluation
export {
  HandRank,
  HAND_RANK_NAMES,
  evaluateHand,
  compareHands,
  determineWinners,
  type EvaluatedHand,
} from './evaluator';

// Equity calculation
export {
  EQUITY_CONFIG,
  calculateEquity,
  calculateEquityDetailed,
  getPreFlopEstimate,
  type HandEquity,
  type EquityResult,
} from './equity';

// Game state
export {
  PHASE_ORDER,
  createInitialState,
  startNewRound,
  advancePhase,
  updateEquities,
  placeBet,
  cancelBets,
  getVisibleBoard,
  getPhaseDisplayName,
  canBet,
  createStateFromSeed,
  type GamePhase,
  type Bet,
  type Settlement,
  type HoldemGameState,
} from './gameState';
