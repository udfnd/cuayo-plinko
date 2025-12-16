'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { useAuth } from '@/components/auth';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface PlayerInfo {
  id: string;
  nickname: string;
  onlineAt: string;
}

export type CrashPhase = 'BETTING' | 'RUNNING' | 'CRASHED';

export interface CrashSyncState {
  serverTime: number;
  roundNumber: number;
  phase: CrashPhase;
  phaseStartTime: number;
  timeInPhase: number;
  roundSeed: string;
  crashPoint: number;
  currentMultiplier: number;
  bettingTimeLeft: number;
}

export interface UseCrashSyncResult {
  syncState: CrashSyncState;
  isConnected: boolean;
  players: PlayerInfo[];
  playerCount: number;
}

// 게임 에포크 (2024년 1월 1일)
const GAME_EPOCH = new Date('2024-01-01T00:00:00Z').getTime();

// Crash 게임 타이밍 - 고정 라운드 시간
const BETTING_DURATION = 10000;  // 베팅 10초
const RUNNING_DURATION = 15000;  // 러닝 15초 (고정)
const CRASHED_DURATION = 5000;   // 크래시 후 5초
const ROUND_DURATION = BETTING_DURATION + RUNNING_DURATION + CRASHED_DURATION; // 30초

// 배수 증가율 - 15초 동안 1.00x에서 최대 약 10x까지
const MULTIPLIER_GROWTH_RATE = 0.00015; // 초당 약 15%

// 시드 생성 - 서버 시간 기반으로 라운드마다 다른 시드
function generateSeed(roundNumber: number): string {
  return `crash-r${roundNumber}-seed`;
}

// 시드로부터 크래시 포인트 계산 (결정론적)
function calculateCrashPointFromSeed(seed: string): number {
  // 더 나은 해시 함수 - FNV-1a 변형
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  // 양수로 변환 후 0-1 범위
  const normalized = (hash >>> 0) / 0xFFFFFFFF;

  // 3% 확률로 1.00x (즉시 크래시)
  if (normalized < 0.03) {
    return 1.00;
  }

  // 지수 분포로 크래시 포인트 생성
  const adjustedNorm = (normalized - 0.03) / 0.97;

  // 역변환: crashPoint가 더 다양하게 분포되도록
  // 평균 약 2x, 최대 약 10x
  const crashPoint = Math.floor((99 / (1 - adjustedNorm * 0.90)) / 100 * 100) / 100;

  // 최대값 제한
  return Math.min(Math.max(crashPoint, 1.00), 10.00);
}

// 시간으로부터 현재 배수 계산 (지수 성장)
function calculateMultiplier(timeInRunning: number): number {
  const multiplier = Math.exp(timeInRunning * MULTIPLIER_GROWTH_RATE);
  return Math.floor(multiplier * 100) / 100;
}

// 크래시 포인트에 도달하는 시간 계산
function calculateCrashTime(crashPoint: number): number {
  if (crashPoint <= 1.00) return 0;
  return Math.log(crashPoint) / MULTIPLIER_GROWTH_RATE;
}

// 게임 상태 계산
function calculateGameState(serverTime: number): CrashSyncState {
  const elapsed = serverTime - GAME_EPOCH;
  const roundNumber = Math.floor(elapsed / ROUND_DURATION) + 1;
  const timeInRound = elapsed % ROUND_DURATION;

  const roundSeed = generateSeed(roundNumber);
  const crashPoint = calculateCrashPointFromSeed(roundSeed);
  const crashTime = calculateCrashTime(crashPoint);

  let phase: CrashPhase;
  let phaseStartTime: number;
  let timeInPhase: number;
  let currentMultiplier = 1.00;
  let bettingTimeLeft = 0;

  if (timeInRound < BETTING_DURATION) {
    // 베팅 페이즈
    phase = 'BETTING';
    phaseStartTime = serverTime - timeInRound;
    timeInPhase = timeInRound;
    bettingTimeLeft = BETTING_DURATION - timeInRound;
    currentMultiplier = 1.00;
  } else if (timeInRound < BETTING_DURATION + RUNNING_DURATION) {
    // 러닝 페이즈
    const runningTime = timeInRound - BETTING_DURATION;

    // 크래시 포인트에 도달했는지 확인
    const currentMult = calculateMultiplier(runningTime);

    if (currentMult >= crashPoint || runningTime >= crashTime) {
      // 크래시 발생
      phase = 'CRASHED';
      phaseStartTime = serverTime - (runningTime - crashTime);
      timeInPhase = runningTime - crashTime;
      currentMultiplier = crashPoint;
    } else {
      // 아직 러닝 중
      phase = 'RUNNING';
      phaseStartTime = serverTime - runningTime;
      timeInPhase = runningTime;
      currentMultiplier = currentMult;
    }
  } else {
    // 크래시 후 대기 (다음 라운드 준비)
    phase = 'CRASHED';
    phaseStartTime = serverTime - (timeInRound - BETTING_DURATION - Math.min(crashTime, RUNNING_DURATION));
    timeInPhase = timeInRound - BETTING_DURATION - Math.min(crashTime, RUNNING_DURATION);
    currentMultiplier = crashPoint;
  }

  return {
    serverTime,
    roundNumber,
    phase,
    phaseStartTime,
    timeInPhase,
    roundSeed,
    crashPoint,
    currentMultiplier,
    bettingTimeLeft,
  };
}

export function useCrashSync(): UseCrashSyncResult {
  const { profile } = useAuth();
  const [serverOffset, setServerOffset] = useState<number>(0);
  const [isConnected, setIsConnected] = useState(false);
  const [players, setPlayers] = useState<PlayerInfo[]>([]);

  // 초기 상태를 즉시 계산
  const [syncState, setSyncState] = useState<CrashSyncState>(() =>
    calculateGameState(Date.now())
  );

  const channelRef = useRef<RealtimeChannel | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null);
  const isMountedRef = useRef(true);

  // Supabase 클라이언트 초기화
  useEffect(() => {
    isMountedRef.current = true;

    if (isSupabaseConfigured()) {
      try {
        supabaseRef.current = createClient();
      } catch (e) {
        console.error('Failed to create Supabase client:', e);
        supabaseRef.current = null;
      }
    }

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // 서버 시간 동기화
  const syncServerTime = useCallback(async () => {
    if (!supabaseRef.current) return;

    try {
      const clientBefore = Date.now();
      const { data, error } = await supabaseRef.current.rpc('get_server_time');

      if (!isMountedRef.current) return;

      if (error) {
        console.warn('Server time sync failed:', error.message);
        return;
      }

      const clientAfter = Date.now();
      const roundTrip = clientAfter - clientBefore;
      const serverTime = new Date(data).getTime();
      const estimatedServerTime = serverTime + Math.floor(roundTrip / 2);
      const offset = estimatedServerTime - clientAfter;

      if (isMountedRef.current) {
        setServerOffset(offset);
      }
    } catch (e) {
      console.warn('Server time sync error:', e);
    }
  }, []);

  // 게임 상태 업데이트
  const updateGameState = useCallback(() => {
    if (!isMountedRef.current) return;

    const currentServerTime = Date.now() + serverOffset;
    const newState = calculateGameState(currentServerTime);
    setSyncState(newState);
  }, [serverOffset]);

  // 초기 시간 동기화
  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    const initTimeout = setTimeout(syncServerTime, 100);
    const syncInterval = setInterval(syncServerTime, 60000);

    return () => {
      clearTimeout(initTimeout);
      clearInterval(syncInterval);
    };
  }, [syncServerTime]);

  // 게임 상태 틱 (50ms 간격)
  useEffect(() => {
    updateGameState();
    timerRef.current = setInterval(updateGameState, 50);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [updateGameState]);

  // Presence 채널
  useEffect(() => {
    if (!supabaseRef.current || !profile) return;

    const supabase = supabaseRef.current;
    const channelName = `game:crash:presence`;

    const channel = supabase.channel(channelName, {
      config: {
        presence: { key: profile.id },
      },
    });

    channel.on('presence', { event: 'sync' }, () => {
      if (!isMountedRef.current) return;

      const presenceState = channel.presenceState();
      const playerList: PlayerInfo[] = [];

      Object.values(presenceState).forEach((presences) => {
        (presences as unknown as PlayerInfo[]).forEach((p) => {
          playerList.push(p);
        });
      });

      setPlayers(playerList);
    });

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED' && isMountedRef.current) {
        setIsConnected(true);
        await channel.track({
          id: profile.id,
          nickname: profile.nickname,
          onlineAt: new Date().toISOString(),
        });
      }
    });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [profile]);

  return {
    syncState,
    isConnected,
    players,
    playerCount: players.length,
  };
}
