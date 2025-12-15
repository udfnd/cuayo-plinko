/**
 * Hold'em Exchange - Hand Evaluator Tests
 */

import { describe, it, expect } from 'vitest';
import {
  evaluateHand,
  compareHands,
  determineWinners,
  HandRank,
} from '../evaluator';
import { parseCard, Card } from '../cards';

// Helper to parse multiple cards
function parseCards(str: string): Card[] {
  return str.split(' ').map(s => parseCard(s)!);
}

describe('evaluateHand', () => {
  it('should detect royal flush', () => {
    const hole = parseCards('As Ks');
    const board = parseCards('Qs Js Ts 2h 3d');
    const result = evaluateHand(hole, board);

    expect(result.rank).toBe(HandRank.ROYAL_FLUSH);
    expect(result.rankName).toBe('Royal Flush');
  });

  it('should detect straight flush', () => {
    const hole = parseCards('9s 8s');
    const board = parseCards('7s 6s 5s 2h 3d');
    const result = evaluateHand(hole, board);

    expect(result.rank).toBe(HandRank.STRAIGHT_FLUSH);
    expect(result.kickers[0]).toBe(9); // 9-high straight flush
  });

  it('should detect four of a kind', () => {
    const hole = parseCards('As Ah');
    const board = parseCards('Ad Ac Ks 2h 3d');
    const result = evaluateHand(hole, board);

    expect(result.rank).toBe(HandRank.FOUR_OF_A_KIND);
    expect(result.kickers[0]).toBe(14); // Quad Aces
  });

  it('should detect full house', () => {
    const hole = parseCards('As Ah');
    const board = parseCards('Ad Ks Kh 2h 3d');
    const result = evaluateHand(hole, board);

    expect(result.rank).toBe(HandRank.FULL_HOUSE);
    expect(result.kickers[0]).toBe(14); // Aces full
    expect(result.kickers[1]).toBe(13); // of Kings
  });

  it('should detect flush', () => {
    const hole = parseCards('As 9s');
    const board = parseCards('7s 4s 2s Kh Qd');
    const result = evaluateHand(hole, board);

    expect(result.rank).toBe(HandRank.FLUSH);
  });

  it('should detect straight', () => {
    const hole = parseCards('9h 8d');
    const board = parseCards('7s 6c 5h 2h Kd');
    const result = evaluateHand(hole, board);

    expect(result.rank).toBe(HandRank.STRAIGHT);
    expect(result.kickers[0]).toBe(9); // 9-high straight
  });

  it('should detect wheel (A-2-3-4-5 straight)', () => {
    const hole = parseCards('Ah 2d');
    const board = parseCards('3s 4c 5h Kh Qd');
    const result = evaluateHand(hole, board);

    expect(result.rank).toBe(HandRank.STRAIGHT);
    expect(result.kickers[0]).toBe(5); // 5-high (wheel)
  });

  it('should detect three of a kind', () => {
    const hole = parseCards('As Ah');
    const board = parseCards('Ad Ks Qh 2h 3d');
    const result = evaluateHand(hole, board);

    expect(result.rank).toBe(HandRank.THREE_OF_A_KIND);
  });

  it('should detect two pair', () => {
    const hole = parseCards('As Ah');
    const board = parseCards('Ks Kh Qd 2h 3d');
    const result = evaluateHand(hole, board);

    expect(result.rank).toBe(HandRank.TWO_PAIR);
  });

  it('should detect one pair', () => {
    const hole = parseCards('As Ah');
    const board = parseCards('Ks Qh Jd 2h 3d');
    const result = evaluateHand(hole, board);

    expect(result.rank).toBe(HandRank.PAIR);
  });

  it('should detect high card', () => {
    const hole = parseCards('As Kh');
    const board = parseCards('Qs 9h 7d 2h 3d');
    const result = evaluateHand(hole, board);

    expect(result.rank).toBe(HandRank.HIGH_CARD);
  });
});

describe('compareHands', () => {
  it('should rank royal flush over straight flush', () => {
    const royal = evaluateHand(parseCards('As Ks'), parseCards('Qs Js Ts 2h 3d'));
    const sf = evaluateHand(parseCards('9s 8s'), parseCards('7s 6s 5s 2h 3d'));

    expect(compareHands(royal, sf)).toBe(1);
    expect(compareHands(sf, royal)).toBe(-1);
  });

  it('should compare same rank by kickers', () => {
    const aceHigh = evaluateHand(parseCards('As Kh'), parseCards('Qs 9h 7d 2h 3d'));
    const kingHigh = evaluateHand(parseCards('Kh Qh'), parseCards('Js 9h 7d 2h 3d'));

    expect(compareHands(aceHigh, kingHigh)).toBe(1);
  });

  it('should detect ties correctly', () => {
    const hand1 = evaluateHand(parseCards('As Kh'), parseCards('Qs Jh Td 2h 3d'));
    const hand2 = evaluateHand(parseCards('Ad Kc'), parseCards('Qs Jh Td 2h 3d'));

    // Same board, same rank cards = tie
    expect(compareHands(hand1, hand2)).toBe(0);
  });
});

describe('determineWinners', () => {
  it('should find single winner', () => {
    // Use non-overlapping cards
    const board = parseCards('7c 4d 2h 9s 3c');
    const hands = [
      evaluateHand(parseCards('As Ah'), board), // Pair of Aces - strongest
      evaluateHand(parseCards('Kd Kh'), board), // Pair of Kings
      evaluateHand(parseCards('Qd Qh'), board), // Pair of Queens
      evaluateHand(parseCards('Jd Jh'), board), // Pair of Jacks
    ];

    const winners = determineWinners(hands);
    expect(winners).toEqual([0]); // First hand wins with pair of Aces
  });

  it('should detect dead heat (tie)', () => {
    // All hands play the board straight Q-J-T-9-8
    const board = parseCards('Qc Jh Td 9c 8s');
    const hands = [
      evaluateHand(parseCards('2s 3h'), board), // Plays board straight
      evaluateHand(parseCards('2d 4c'), board), // Plays board straight
      evaluateHand(parseCards('2c 5h'), board), // Plays board straight
      evaluateHand(parseCards('2h 6c'), board), // Plays board straight
    ];

    const winners = determineWinners(hands);
    expect(winners.length).toBe(4); // All tie with board straight
  });

  it('should handle multiple ties correctly', () => {
    // All play the board
    const board = parseCards('As Ks Qs Js Ts');
    const hands = [
      evaluateHand(parseCards('2h 3h'), board),
      evaluateHand(parseCards('4h 5h'), board),
      evaluateHand(parseCards('6h 7h'), board),
      evaluateHand(parseCards('8h 9h'), board),
    ];

    const winners = determineWinners(hands);
    expect(winners).toEqual([0, 1, 2, 3]); // All win with royal flush on board
  });
});
