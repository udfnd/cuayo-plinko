/**
 * 확률 분포 및 기대값 계산
 */

import type { Risk, Rows, SlotProbability } from '@/types';
import { getMultipliers } from './multipliers';

/**
 * 이항계수 nCk 계산
 */
function binomialCoefficient(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  if (k === 0 || k === n) return 1;

  // 대칭성 활용: nCk = nC(n-k)
  if (k > n - k) {
    k = n - k;
  }

  let result = 1;
  for (let i = 0; i < k; i++) {
    result = result * (n - i) / (i + 1);
  }
  return result;
}

/**
 * 각 슬롯에 도달할 확률 계산
 * 슬롯 인덱스 k에 도달할 확률 = nCk * 0.5^n
 * (n번 중 k번 오른쪽으로 갈 확률)
 */
export function getSlotProbability(rows: number, slotIndex: number): number {
  return binomialCoefficient(rows, slotIndex) * Math.pow(0.5, rows);
}

/**
 * 모든 슬롯의 확률 배열 반환
 */
export function getAllSlotProbabilities(rows: Rows, risk: Risk): SlotProbability[] {
  const multipliers = getMultipliers(rows, risk);
  const numSlots = rows + 1;

  const probabilities: SlotProbability[] = [];
  for (let i = 0; i < numSlots; i++) {
    probabilities.push({
      slotIndex: i,
      probability: getSlotProbability(rows, i),
      multiplier: multipliers[i],
    });
  }

  return probabilities;
}

/**
 * 기대값 계산
 * EV = Σ (P(slot_i) × multiplier_i)
 */
export function calculateExpectedValue(rows: Rows, risk: Risk): number {
  const probabilities = getAllSlotProbabilities(rows, risk);

  let ev = 0;
  for (const p of probabilities) {
    ev += p.probability * p.multiplier;
  }

  return ev;
}

/**
 * 확률을 백분율 문자열로 변환
 */
export function formatProbability(probability: number): string {
  // 매우 작은 확률은 과학적 표기법 사용
  if (probability < 0.0001) {
    return (probability * 100).toExponential(2) + '%';
  }
  return (probability * 100).toFixed(4) + '%';
}

/**
 * 분산 계산 (선택적)
 */
export function calculateVariance(rows: Rows, risk: Risk): number {
  const probabilities = getAllSlotProbabilities(rows, risk);
  const ev = calculateExpectedValue(rows, risk);

  let variance = 0;
  for (const p of probabilities) {
    variance += p.probability * Math.pow(p.multiplier - ev, 2);
  }

  return variance;
}

/**
 * 표준편차 계산
 */
export function calculateStdDev(rows: Rows, risk: Risk): number {
  return Math.sqrt(calculateVariance(rows, risk));
}
