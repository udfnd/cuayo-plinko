/**
 * Crash Game State Machine
 *
 * 상태: BETTING → RUNNING → CRASHED → NEXT_ROUND
 */

export type GamePhase = 'BETTING' | 'RUNNING' | 'CRASHED' | 'NEXT_ROUND';

export interface PlayerBet {
  amount: number;
  autoCashoutAt: number | null;  // null이면 수동 캐시아웃
  cashedOut: boolean;
  cashoutMultiplier: number | null;
}

export interface RoundResult {
  roundNumber: number;
  gameHash: string;
  crashPoint: number;
  playerBet: PlayerBet | null;
  payout: number;
  profit: number;
  timestamp: number;
}

export interface CrashGameState {
  phase: GamePhase;
  roundNumber: number;
  currentMultiplier: number;
  crashPoint: number;           // 미리 계산된 크래시 포인트
  gameHash: string;
  previousGameHash: string | null;
  commitHash: string;
  bettingTimeLeft: number;      // 베팅 남은 시간 (ms)
  playerBet: PlayerBet | null;
  history: RoundResult[];
  totalProfit: number;
}

/**
 * 초기 게임 상태 생성
 */
export function createInitialState(commitHash: string): CrashGameState {
  return {
    phase: 'BETTING',
    roundNumber: 1,
    currentMultiplier: 1.00,
    crashPoint: 1.00,
    gameHash: '',
    previousGameHash: null,
    commitHash,
    bettingTimeLeft: 3000,
    playerBet: null,
    history: [],
    totalProfit: 0,
  };
}

/**
 * 베팅 설정
 */
export function placeBet(
  state: CrashGameState,
  amount: number,
  autoCashoutAt: number | null
): CrashGameState {
  if (state.phase !== 'BETTING') {
    return state;
  }

  return {
    ...state,
    playerBet: {
      amount,
      autoCashoutAt,
      cashedOut: false,
      cashoutMultiplier: null,
    },
  };
}

/**
 * 베팅 취소
 */
export function cancelBet(state: CrashGameState): CrashGameState {
  if (state.phase !== 'BETTING') {
    return state;
  }

  return {
    ...state,
    playerBet: null,
  };
}

/**
 * 캐시아웃 처리
 */
export function cashOut(state: CrashGameState): CrashGameState {
  if (state.phase !== 'RUNNING' || !state.playerBet || state.playerBet.cashedOut) {
    return state;
  }

  return {
    ...state,
    playerBet: {
      ...state.playerBet,
      cashedOut: true,
      cashoutMultiplier: state.currentMultiplier,
    },
  };
}

/**
 * 라운드 시작 (BETTING → RUNNING)
 */
export function startRound(
  state: CrashGameState,
  gameHash: string,
  crashPoint: number
): CrashGameState {
  return {
    ...state,
    phase: 'RUNNING',
    gameHash,
    crashPoint,
    currentMultiplier: 1.00,
    bettingTimeLeft: 0,
  };
}

/**
 * 배수 업데이트
 */
export function updateMultiplier(
  state: CrashGameState,
  newMultiplier: number
): CrashGameState {
  if (state.phase !== 'RUNNING') {
    return state;
  }

  // 자동 캐시아웃 체크
  let updatedBet = state.playerBet;
  if (
    updatedBet &&
    !updatedBet.cashedOut &&
    updatedBet.autoCashoutAt &&
    newMultiplier >= updatedBet.autoCashoutAt
  ) {
    updatedBet = {
      ...updatedBet,
      cashedOut: true,
      cashoutMultiplier: updatedBet.autoCashoutAt,
    };
  }

  return {
    ...state,
    currentMultiplier: newMultiplier,
    playerBet: updatedBet,
  };
}

/**
 * 크래시 발생 (RUNNING → CRASHED)
 */
export function crashRound(state: CrashGameState): CrashGameState {
  if (state.phase !== 'RUNNING') {
    return state;
  }

  // 결과 계산
  let payout = 0;
  let profit = 0;

  if (state.playerBet) {
    if (state.playerBet.cashedOut && state.playerBet.cashoutMultiplier) {
      payout = state.playerBet.amount * state.playerBet.cashoutMultiplier;
      profit = payout - state.playerBet.amount;
    } else {
      // 캐시아웃 못함 - 전액 손실
      profit = -state.playerBet.amount;
    }
  }

  const result: RoundResult = {
    roundNumber: state.roundNumber,
    gameHash: state.gameHash,
    crashPoint: state.crashPoint,
    playerBet: state.playerBet,
    payout,
    profit,
    timestamp: Date.now(),
  };

  return {
    ...state,
    phase: 'CRASHED',
    currentMultiplier: state.crashPoint,
    history: [...state.history, result].slice(-20), // 최근 20개
    totalProfit: state.totalProfit + profit,
  };
}

/**
 * 다음 라운드 준비 (CRASHED → NEXT_ROUND → BETTING)
 */
export function prepareNextRound(
  state: CrashGameState,
  bettingDuration: number
): CrashGameState {
  return {
    ...state,
    phase: 'BETTING',
    roundNumber: state.roundNumber + 1,
    currentMultiplier: 1.00,
    previousGameHash: state.gameHash,
    bettingTimeLeft: bettingDuration,
    playerBet: null,
  };
}
