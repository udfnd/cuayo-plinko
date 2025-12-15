/**
 * 독자 설계 배수표
 *
 * 설계 원칙:
 * 1. 대칭 구조 (가운데 기준)
 * 2. 가운데 = 안정적, 양끝 = 높은 배수
 * 3. Risk가 높을수록 양끝 배수 증가, 가운데 배수 감소
 * 4. 기대값(EV) ≈ 0.99 (1% 하우스 엣지)
 *
 * 주의: 이 배수표는 Stake와 동일하지 않은 독자적으로 설계된 값입니다.
 */

import type { Risk, Rows } from '@/types';

// 배수표 타입
type MultiplierTable = {
  [K in Rows]: {
    [R in Risk]: number[];
  };
};

/**
 * 원본 배수표 (대칭이므로 절반만 정의 후 미러링)
 * 각 배열은 왼쪽 끝부터 중앙까지의 배수
 */
const HALF_MULTIPLIERS: MultiplierTable = {
  8: {
    // 9개 슬롯 -> 5개 정의 (0~4)
    low: [2.5, 1.4, 1.1, 0.9, 0.8],
    medium: [5.0, 2.0, 1.2, 0.6, 0.4],
    high: [12.0, 3.5, 1.5, 0.3, 0.2],
  },
  12: {
    // 13개 슬롯 -> 7개 정의 (0~6)
    low: [4.0, 2.0, 1.5, 1.2, 1.0, 0.9, 0.8],
    medium: [15.0, 4.0, 2.0, 1.3, 0.8, 0.5, 0.3],
    high: [50.0, 10.0, 3.0, 1.5, 0.5, 0.2, 0.15],
  },
  16: {
    // 17개 슬롯 -> 9개 정의 (0~8)
    low: [6.0, 3.0, 2.0, 1.5, 1.2, 1.0, 0.9, 0.85, 0.8],
    medium: [30.0, 8.0, 3.5, 2.0, 1.3, 0.8, 0.5, 0.35, 0.25],
    high: [150.0, 25.0, 8.0, 3.0, 1.2, 0.4, 0.2, 0.15, 0.1],
  },
};

/**
 * 절반 배수 배열을 전체로 확장 (대칭)
 */
function expandToFull(half: number[]): number[] {
  const full = [...half];
  // 마지막 원소(중앙)를 제외하고 역순으로 추가
  for (let i = half.length - 2; i >= 0; i--) {
    full.push(half[i]);
  }
  return full;
}

/**
 * 이항 확률 계산 (nCr * 0.5^n)
 */
function binomialProbability(n: number, k: number): number {
  // nCk 계산
  let nCk = 1;
  for (let i = 0; i < k; i++) {
    nCk = nCk * (n - i) / (i + 1);
  }
  return nCk * Math.pow(0.5, n);
}

/**
 * 기대값 계산
 */
function calculateEV(multipliers: number[], rows: number): number {
  let ev = 0;
  for (let i = 0; i < multipliers.length; i++) {
    ev += binomialProbability(rows, i) * multipliers[i];
  }
  return ev;
}

/**
 * 배수표를 스케일링하여 목표 기대값에 맞춤
 */
function scaleMultipliers(multipliers: number[], rows: number, targetEV: number): number[] {
  const currentEV = calculateEV(multipliers, rows);
  const scale = targetEV / currentEV;
  return multipliers.map(m => Math.round(m * scale * 100) / 100);
}

// 전체 배수표 생성 (EV ≈ 0.99로 조정)
const TARGET_EV = 0.99; // 1% 하우스 엣지

const MULTIPLIERS: MultiplierTable = {
  8: {
    low: scaleMultipliers(expandToFull(HALF_MULTIPLIERS[8].low), 8, TARGET_EV),
    medium: scaleMultipliers(expandToFull(HALF_MULTIPLIERS[8].medium), 8, TARGET_EV),
    high: scaleMultipliers(expandToFull(HALF_MULTIPLIERS[8].high), 8, TARGET_EV),
  },
  12: {
    low: scaleMultipliers(expandToFull(HALF_MULTIPLIERS[12].low), 12, TARGET_EV),
    medium: scaleMultipliers(expandToFull(HALF_MULTIPLIERS[12].medium), 12, TARGET_EV),
    high: scaleMultipliers(expandToFull(HALF_MULTIPLIERS[12].high), 12, TARGET_EV),
  },
  16: {
    low: scaleMultipliers(expandToFull(HALF_MULTIPLIERS[16].low), 16, TARGET_EV),
    medium: scaleMultipliers(expandToFull(HALF_MULTIPLIERS[16].medium), 16, TARGET_EV),
    high: scaleMultipliers(expandToFull(HALF_MULTIPLIERS[16].high), 16, TARGET_EV),
  },
};

/**
 * 배수표 조회
 */
export function getMultipliers(rows: Rows, risk: Risk): number[] {
  return MULTIPLIERS[rows][risk];
}

/**
 * 특정 슬롯의 배수 조회
 */
export function getMultiplier(rows: Rows, risk: Risk, slotIndex: number): number {
  const multipliers = getMultipliers(rows, risk);
  if (slotIndex < 0 || slotIndex >= multipliers.length) {
    return 0;
  }
  return multipliers[slotIndex];
}

/**
 * 배수표의 실제 기대값 계산 (검증용)
 */
export function getExpectedValue(rows: Rows, risk: Risk): number {
  const multipliers = getMultipliers(rows, risk);
  return calculateEV(multipliers, rows);
}
