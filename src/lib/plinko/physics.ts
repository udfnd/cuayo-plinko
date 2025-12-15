/**
 * Custom Physics Engine for Plinko
 *
 * 시드 기반 재현 가능한 물리 시뮬레이션
 * - 중력, 충돌, 반발, 마찰 적용
 * - 핀과의 충돌 시 시드 기반 미세 변동으로 결과 결정
 */

import { SeededRandom } from '@/lib/prng';

// 물리 상수
export const PHYSICS = {
  GRAVITY: 0.4,           // 중력 가속도 (높을수록 빨리 떨어짐)
  RESTITUTION: 0.35,       // 반발 계수 (0~1)
  FRICTION: 0.99,         // 마찰/감쇠 계수
  BALL_RADIUS: 10,        // 공 반지름 (핀보다 충분히 커야 걸리지 않음)
  PEG_RADIUS: 4,          // 핀 반지름 (작을수록 걸릴 확률 감소)
  COLLISION_BIAS: 0.05,   // 충돌 시 시드 기반 방향 편향 강도 (낮을수록 가운데로 모임)
  MIN_VELOCITY: 0.1,      // 최소 속도 (이하면 정지)
  MAX_VELOCITY: 18,       // 최대 속도 제한
} as const;

// 2D 벡터 타입
export interface Vector2 {
  x: number;
  y: number;
}

// 물리 공 상태
export interface PhysicsBall {
  id: string;
  position: Vector2;
  velocity: Vector2;
  radius: number;
  active: boolean;
  settled: boolean;      // 슬롯에 안착했는지
  slotIndex: number;     // 최종 슬롯
  collisionCount: number; // 충돌 횟수 (시드 오프셋용)
  stuckFrames: number;   // 정체 프레임 카운터
  lastY: number;         // 이전 Y 위치 (정체 감지용)
}

// 핀 정보
export interface Peg {
  x: number;
  y: number;
  radius: number;
}

// 슬롯 정보
export interface Slot {
  x: number;
  width: number;
  y: number;
  index: number;
}

// 벡터 연산 유틸리티
export const Vec2 = {
  add: (a: Vector2, b: Vector2): Vector2 => ({ x: a.x + b.x, y: a.y + b.y }),
  sub: (a: Vector2, b: Vector2): Vector2 => ({ x: a.x - b.x, y: a.y - b.y }),
  mul: (v: Vector2, s: number): Vector2 => ({ x: v.x * s, y: v.y * s }),
  dot: (a: Vector2, b: Vector2): number => a.x * b.x + a.y * b.y,
  length: (v: Vector2): number => Math.sqrt(v.x * v.x + v.y * v.y),
  normalize: (v: Vector2): Vector2 => {
    const len = Vec2.length(v);
    return len > 0 ? { x: v.x / len, y: v.y / len } : { x: 0, y: 0 };
  },
  reflect: (v: Vector2, normal: Vector2): Vector2 => {
    const dot = Vec2.dot(v, normal);
    return Vec2.sub(v, Vec2.mul(normal, 2 * dot));
  },
  rotate: (v: Vector2, angle: number): Vector2 => {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return {
      x: v.x * cos - v.y * sin,
      y: v.x * sin + v.y * cos,
    };
  },
};

/**
 * 공-핀 충돌 검사 및 처리
 */
function handlePegCollision(
  ball: PhysicsBall,
  peg: Peg,
  rng: SeededRandom
): boolean {
  const dx = ball.position.x - peg.x;
  const dy = ball.position.y - peg.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const minDist = ball.radius + peg.radius;

  if (distance < minDist && distance > 0) {
    // 충돌 발생!

    // 1. 겹침 해소 (공을 밖으로 밀어냄)
    const overlap = minDist - distance;
    const normal: Vector2 = { x: dx / distance, y: dy / distance };
    ball.position.x += normal.x * overlap;
    ball.position.y += normal.y * overlap;

    // 2. 속도 반사
    const reflected = Vec2.reflect(ball.velocity, normal);

    // 3. 시드 기반 미세 변동 추가 (좌/우 편향)
    const bias = (rng.next() - 0.5) * 2 * PHYSICS.COLLISION_BIAS;
    const biasAngle = bias * Math.PI / 4; // 최대 ±45도 * bias
    const biasedVelocity = Vec2.rotate(reflected, biasAngle);

    // 4. 반발 계수 적용
    ball.velocity = Vec2.mul(biasedVelocity, PHYSICS.RESTITUTION);

    // 5. 속도 제한
    const speed = Vec2.length(ball.velocity);
    if (speed > PHYSICS.MAX_VELOCITY) {
      ball.velocity = Vec2.mul(Vec2.normalize(ball.velocity), PHYSICS.MAX_VELOCITY);
    }

    ball.collisionCount++;
    return true;
  }

  return false;
}

/**
 * 벽 충돌 처리
 */
function handleWallCollision(
  ball: PhysicsBall,
  leftBound: number,
  rightBound: number
): void {
  // 왼쪽 벽
  if (ball.position.x - ball.radius < leftBound) {
    ball.position.x = leftBound + ball.radius;
    ball.velocity.x = Math.abs(ball.velocity.x) * PHYSICS.RESTITUTION;
  }

  // 오른쪽 벽
  if (ball.position.x + ball.radius > rightBound) {
    ball.position.x = rightBound - ball.radius;
    ball.velocity.x = -Math.abs(ball.velocity.x) * PHYSICS.RESTITUTION;
  }
}

/**
 * 슬롯 도달 검사
 */
function checkSlotArrival(
  ball: PhysicsBall,
  slots: Slot[],
  bottomY: number
): void {
  if (ball.position.y >= bottomY && !ball.settled) {
    ball.settled = true;
    ball.active = false;

    // 어느 슬롯에 떨어졌는지 계산
    for (const slot of slots) {
      if (ball.position.x >= slot.x && ball.position.x < slot.x + slot.width) {
        ball.slotIndex = slot.index;
        // 슬롯 중앙으로 위치 조정
        ball.position.x = slot.x + slot.width / 2;
        break;
      }
    }

    ball.velocity = { x: 0, y: 0 };
  }
}

/**
 * 물리 시뮬레이션 한 스텝 업데이트
 * @returns 충돌이 발생했는지 여부
 */
export function updatePhysics(
  ball: PhysicsBall,
  pegs: Peg[],
  slots: Slot[],
  bounds: { left: number; right: number; bottom: number },
  rng: SeededRandom
): boolean {
  if (!ball.active || ball.settled) return false;

  // 1. 중력 적용
  ball.velocity.y += PHYSICS.GRAVITY;

  // 2. 마찰/감쇠 적용
  ball.velocity = Vec2.mul(ball.velocity, PHYSICS.FRICTION);

  // 3. 위치 업데이트
  ball.position = Vec2.add(ball.position, ball.velocity);

  // 4. 핀 충돌 처리 (모든 핀과 검사)
  let hasCollision = false;
  for (const peg of pegs) {
    if (handlePegCollision(ball, peg, rng)) {
      hasCollision = true;
    }
  }

  // 5. 벽 충돌 처리
  handleWallCollision(ball, bounds.left, bounds.right);

  // 6. 슬롯 도달 검사
  checkSlotArrival(ball, slots, bounds.bottom);

  // 7. 속도가 너무 작으면 정지 (수평만, 수직은 중력으로 계속)
  if (Math.abs(ball.velocity.x) < PHYSICS.MIN_VELOCITY) {
    ball.velocity.x = 0;
  }

  // 8. 정체 감지 및 탈출 처리
  const yMovement = Math.abs(ball.position.y - ball.lastY);
  if (yMovement < 0.5 && ball.position.y < bounds.bottom - 50) {
    // 거의 움직이지 않음 - 정체 카운터 증가
    ball.stuckFrames++;

    if (ball.stuckFrames > 30) {
      // 30프레임 이상 정체 시 옆으로 밀어냄
      const pushDirection = rng.next() > 0.5 ? 1 : -1;
      ball.velocity.x += pushDirection * 3;
      ball.velocity.y += 2;
      ball.stuckFrames = 0;
    }
  } else {
    ball.stuckFrames = 0;
  }
  ball.lastY = ball.position.y;

  return hasCollision;
}

/**
 * 새 물리 공 생성
 */
export function createPhysicsBall(
  id: string,
  startX: number,
  startY: number,
  initialVelocity?: Vector2
): PhysicsBall {
  return {
    id,
    position: { x: startX, y: startY },
    velocity: initialVelocity || { x: 0, y: 0 },
    radius: PHYSICS.BALL_RADIUS,
    active: true,
    settled: false,
    slotIndex: -1,
    collisionCount: 0,
    stuckFrames: 0,
    lastY: startY,
  };
}

/**
 * 시드 기반 RNG 생성 (공 ID + 드롭 인덱스 기반)
 */
export function createBallRng(seed: string, ballId: string): SeededRandom {
  return new SeededRandom(`${seed}-physics-${ballId}`);
}
