/**
 * 시드 기반 의사 난수 생성기 (PRNG)
 * xorshift32 알고리즘 사용
 */

// 문자열을 32비트 정수로 해싱 (djb2 알고리즘 변형)
function hashSeed(seed: string): number {
  let hash = 5381;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) + hash) ^ seed.charCodeAt(i);
    hash = hash >>> 0; // 부호 없는 32비트로 변환
  }
  // 0이 되지 않도록 보장 (xorshift는 0에서 동작 안함)
  return hash === 0 ? 1 : hash;
}

// xorshift32 PRNG
function xorshift32(state: number): number {
  state ^= state << 13;
  state ^= state >>> 17;
  state ^= state << 5;
  return state >>> 0;
}

export class SeededRandom {
  private state: number;

  constructor(seed: string) {
    this.state = hashSeed(seed);
  }

  // 0 이상 1 미만의 난수 생성
  next(): number {
    this.state = xorshift32(this.state);
    return this.state / 0xffffffff;
  }

  // 좌(-1) 또는 우(1) 방향 결정
  nextDirection(): -1 | 1 {
    return this.next() < 0.5 ? -1 : 1;
  }

  // 현재 상태 저장 (재현용)
  getState(): number {
    return this.state;
  }

  // 상태 복원
  setState(state: number): void {
    this.state = state;
  }
}

/**
 * 주어진 seed와 drop 횟수로 공의 경로 생성
 * @param seed - 시드 문자열
 * @param rows - 행 수
 * @param dropIndex - 몇 번째 드롭인지 (Auto 모드에서 사용)
 * @returns 각 행에서의 방향 배열
 */
export function generatePath(seed: string, rows: number, dropIndex: number = 0): number[] {
  // dropIndex를 seed에 포함시켜 매 드롭마다 다른 결과 생성
  const combinedSeed = `${seed}-drop-${dropIndex}`;
  const rng = new SeededRandom(combinedSeed);

  const path: number[] = [];
  for (let i = 0; i < rows; i++) {
    path.push(rng.nextDirection());
  }
  return path;
}

/**
 * 경로로부터 최종 슬롯 인덱스 계산
 * 시작점을 중앙(rows/2)으로 가정하고, 각 이동을 누적
 */
export function pathToSlotIndex(path: number[]): number {
  // 오른쪽으로 이동한 횟수 = 슬롯 인덱스
  // path에서 1(오른쪽)의 개수가 곧 최종 슬롯 인덱스
  return path.filter(d => d === 1).length;
}
