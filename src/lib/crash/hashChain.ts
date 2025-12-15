/**
 * Hash Chain Management
 *
 * 해시 체인(커밋) 방식으로 게임 해시 생성
 * - 역순으로 사용하여 사전 예측 불가
 * - sha256(revealedGameHash) === previousGameHash 검증 가능
 */

import { sha256, simpleHash } from './hash';
import { HASH_CHAIN_LENGTH } from './constants';

export interface HashChain {
  chainSeed: string;      // 초기 시드 (비공개)
  commitHash: string;     // 헤드 해시 (공개)
  hashes: string[];       // 해시 체인 (역순 사용)
  currentIndex: number;   // 현재 인덱스
}

/**
 * 새 해시 체인 생성
 */
export function createHashChain(seed?: string): HashChain {
  // 랜덤 시드 생성 (또는 주어진 시드 사용)
  const chainSeed = seed || `cuayo-${Date.now()}-${Math.random().toString(36)}`;

  // 해시 체인 생성 (동기식 simpleHash 사용)
  const hashes: string[] = [];
  let current = chainSeed;

  for (let i = 0; i < HASH_CHAIN_LENGTH; i++) {
    current = simpleHash(current);
    hashes.push(current);
  }

  // 마지막 해시가 commitHash (헤드)
  const commitHash = hashes[hashes.length - 1];

  return {
    chainSeed,
    commitHash,
    hashes,
    currentIndex: HASH_CHAIN_LENGTH - 1,
  };
}

/**
 * 다음 게임 해시 가져오기 (역순)
 */
export function getNextGameHash(chain: HashChain): string | null {
  if (chain.currentIndex < 0) {
    return null; // 체인 소진
  }

  const hash = chain.hashes[chain.currentIndex];
  chain.currentIndex--;
  return hash;
}

/**
 * 현재 게임 해시 (소비하지 않고 조회)
 */
export function getCurrentGameHash(chain: HashChain): string | null {
  if (chain.currentIndex < 0) {
    return null;
  }
  return chain.hashes[chain.currentIndex];
}

/**
 * 이전 게임 해시 (검증용)
 */
export function getPreviousGameHash(chain: HashChain): string | null {
  const prevIndex = chain.currentIndex + 1;
  if (prevIndex >= HASH_CHAIN_LENGTH) {
    return null;
  }
  return chain.hashes[prevIndex];
}

/**
 * 해시 체인 검증
 * sha256(currentHash) === previousHash 인지 확인
 */
export async function verifyHashChain(
  currentHash: string,
  previousHash: string
): Promise<boolean> {
  const computed = await sha256(currentHash);
  return computed === previousHash;
}

/**
 * 남은 라운드 수
 */
export function getRemainingRounds(chain: HashChain): number {
  return chain.currentIndex + 1;
}
