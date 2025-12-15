/**
 * Crash Game Constants
 *
 * 프로젝트 전용 상수 - 타 서비스 값 복제 금지
 */

// 프로젝트 전용 SALT (임의 설정)
export const SALT = 'cuayo-crash-demo-salt-2024';

// 하우스 엣지 (3%)
export const HOUSE_EDGE_PERCENT = 3;

// 라운드 타이밍 (ms)
export const TIMING = {
  BETTING_DURATION: 3000,    // 베팅 시간 3초
  CRASHED_DURATION: 2000,    // 크래시 후 결과 표시 2초
  NEXT_ROUND_DELAY: 500,     // 다음 라운드 전 대기
} as const;

// 배수 상승 속도
export const MULTIPLIER = {
  START: 1.00,               // 시작 배수
  UPDATE_INTERVAL: 50,       // 업데이트 간격 (ms)
  INCREMENT_INTERVAL: 50,    // 0.01 증가 간격 (ms) - 80ms마다 0.01 증가
} as const;

// 해시 체인 길이
export const HASH_CHAIN_LENGTH = 1000;
