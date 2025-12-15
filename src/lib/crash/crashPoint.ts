/**
 * Crash Point Calculation
 *
 * CLAUDE.md 3.2절 알고리즘 기반 독자 구현
 */

import { SALT, HOUSE_EDGE_PERCENT } from './constants';
import { hmacSha256, isDivisible } from './hash';

/**
 * crashPoint 계산 (비동기)
 *
 * @param gameHash - 라운드별 게임 해시
 * @returns crashPoint (소수점 둘째자리, 예: 2.35)
 */
export async function calculateCrashPoint(gameHash: string): Promise<number> {
  // 1. HMAC 계산: HMAC_SHA256(key = gameHash, message = SALT)
  const hmac = await hmacSha256(gameHash, SALT);

  // 2. 즉시 크래시(1.00x) 판정
  const hs = Math.floor(100 / HOUSE_EDGE_PERCENT); // 100 / 3 = 33
  if (isDivisible(hmac, hs)) {
    return 1.00;
  }

  // 3. crashPoint 계산
  // h = int(hmac[0:13], 16) - 13 hex chars = 52 bits
  const h = parseInt(hmac.substring(0, 13), 16);

  // e = 2^52
  const e = Math.pow(2, 52);

  // crashPoint = floor((100*e - h) / (e - h)) / 100
  const crashPoint = Math.floor((100 * e - h) / (e - h)) / 100;

  return crashPoint;
}

/**
 * crashPoint 검증 (Verify용)
 *
 * @param gameHash - 게임 해시
 * @param expectedCrashPoint - 예상 crashPoint
 * @returns 일치 여부
 */
export async function verifyCrashPoint(
  gameHash: string,
  expectedCrashPoint: number
): Promise<boolean> {
  const calculated = await calculateCrashPoint(gameHash);
  return Math.abs(calculated - expectedCrashPoint) < 0.01;
}

/**
 * HMAC 값 반환 (디버그/검증용)
 */
export async function getHmac(gameHash: string): Promise<string> {
  return hmacSha256(gameHash, SALT);
}
