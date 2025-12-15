export type Risk = 'low' | 'medium' | 'high';
export type Rows = 8 | 12 | 16;

export interface GameSettings {
  bet: number;
  rows: Rows;
  risk: Risk;
  seed: string;
}

export interface DropResult {
  id: string;
  path: number[];      // 각 행에서의 방향 (-1: 왼쪽, 1: 오른쪽)
  slotIndex: number;   // 최종 슬롯 인덱스 (0 ~ rows)
  multiplier: number;
  payout: number;
  timestamp: number;
}

export interface Ball {
  id: string;
  x: number;
  y: number;
  path: number[];
  currentRow: number;
  progress: number;  // 0~1 (현재 행에서의 진행도)
  done: boolean;
  slotIndex: number;
  multiplier: number;
}

export interface SlotProbability {
  slotIndex: number;
  probability: number;
  multiplier: number;
}
